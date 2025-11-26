import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { arrayBufferToBase64, decodeAudioData, float32ToInt16, base64ToUint8Array } from '../utils/audioUtils';
import { TicketData, ConnectionState, CaseData } from '../types';

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

// Define tools
const updateCaseDetailsTool: FunctionDeclaration = {
  name: 'updateCaseDetails',
  description: 'Update the case information on the screen as the user provides it.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      municipality: { type: Type.STRING, description: 'Name of the municipality.' },
      system: { type: Type.STRING, description: 'The software system being used.' },
      problem: { type: Type.STRING, description: 'Description of the reported error or requirement.' }
    }
  }
};

const proposeSolutionsTool: FunctionDeclaration = {
  name: 'proposeSolutions',
  description: 'Display a list of proposed technical solutions to the user on the screen. MUST be called before creating a ticket.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      solutions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of 2-4 brief technical solutions.'
      }
    },
    required: ['solutions']
  }
};

const createTicketTool: FunctionDeclaration = {
  name: 'createTicket',
  description: 'Generate the final support ticket code and set the status.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, description: 'Current status of the case (e.g., Pendiente, Resuelta, Derivada).' }
    },
    required: ['status']
  }
};

const sendEmailTool: FunctionDeclaration = {
  name: 'sendEmail',
  description: 'Trigger the action to send the ticket details and solutions to the user email.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirmed: { type: Type.BOOLEAN, description: 'True if the user explicitly confirmed they want the email.' }
    },
    required: ['confirmed']
  }
};

const getSystemInstruction = (email: string) => `
ROL: Eres el asistente virtual de voz de Sistemas Modulares de Computación Spa (SMC Spa).
TONO: Profesional, claro, sin emoticones.
CONTEXTO:
- Correo del usuario: ${email}
- Remitente del sistema: soporte@smc.cl

FLUJO OBLIGATORIO Y SECUENCIAL:
Tu objetivo es recolectar datos, mostrar soluciones EN PANTALLA y generar un ticket EN PANTALLA.

1. SALUDO INICIAL: "Hola, le habla el asistente virtual de Sistemas Modulares de Computación Spa. ¿En qué puedo ayudarle hoy?"

2. OBTENER MUNICIPALIDAD (PRIORIDAD ALTA):
   - Inmediatamente después del saludo, interrumpe amablemente si es necesario y pregunta: "Para poder ayudarle, por favor indíqueme primero el nombre de su Municipalidad".
   - Espera la respuesta. EJECUTA 'updateCaseDetails' con la municipalidad.

3. OBTENER SISTEMA:
   - Solo cuando tengas la Municipalidad, pregunta: "¿Qué sistema de SMC está utilizando? (Ej: Contabilidad, Inventario, etc.)".
   - Espera la respuesta. EJECUTA 'updateCaseDetails' con el sistema.

4. OBTENER ERROR:
   - Solo cuando tengas Municipalidad y Sistema, pregunta: "Perfecto. Ahora indíqueme por favor el error o requerimiento".
   - Espera la respuesta. EJECUTA 'updateCaseDetails' con el problema.

5. SUGERIR SOLUCIONES (OBLIGATORIO):
   - Analiza el problema descrito.
   - Genera 2 a 4 soluciones técnicas breves.
   - **IMPORTANTE:** DEBES EJECUTAR la tool 'proposeSolutions' para que el usuario las vea en su pantalla.
   - Lee las soluciones al usuario verbalmente.

6. GENERAR TICKET (OBLIGATORIO):
   - Una vez propuestas las soluciones, EJECUTA la tool 'createTicket' con el estado del caso.
   - El sistema generará un código (Formato RE + 6 dígitos).
   - LEE el código generado al usuario: "Su ticket ha sido generado con el código [código]".

7. CIERRE Y CORREO:
   - Pregunta: "¿Desea recibir una copia del ticket y las soluciones en su correo ${email}?".
   - Si responde SÍ: Ejecuta 'sendEmail'. Confirma: "Enviando correo desde soporte@smc.cl".
   - Si responde NO: Despídete cordialmente.

REGLAS DE ORO:
- NO TE SALTES PASOS.
- DEBES USAR LAS TOOLS para que la información aparezca visualmente en la aplicación. Si no usas la tool 'proposeSolutions', el usuario no verá las soluciones.
- Si el usuario da información desordenada, ordénala y llama a las tools correspondientes.
`;

interface UseGeminiLiveReturn {
  connectionState: ConnectionState;
  connect: (email: string) => Promise<void>;
  disconnect: () => void;
  caseData: CaseData;
  volume: number;
}

export const useGeminiLive = (): UseGeminiLiveReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [caseData, setCaseData] = useState<CaseData>({});
  const [volume, setVolume] = useState(0);
  const userEmailRef = useRef<string>('');

  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const cleanup = useCallback(() => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
    setVolume(0);
  }, []);

  const disconnect = useCallback(() => {
    setConnectionState('disconnected');
    cleanup();
  }, [cleanup]);

  const connect = useCallback(async (email: string) => {
    if (!process.env.API_KEY) {
      alert("API Key not found in environment variables.");
      return;
    }

    userEmailRef.current = email;

    try {
      setConnectionState('connecting');
      setCaseData({}); // Reset case data

      // Initialize Audio Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const config = {
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemInstruction(email),
          tools: [{ functionDeclarations: [updateCaseDetailsTool, proposeSolutionsTool, createTicketTool, sendEmailTool] }],
        },
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: async () => {
            console.log('Session opened');
            setConnectionState('connected');
            
            try {
              streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
              if (!inputAudioContextRef.current) return;

              const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
              sourceNodeRef.current = source;
              
              const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = processor;

              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Calculate volume
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                setVolume(prev => Math.max(0.1, prev * 0.8 + rms * 2));

                const pcm16 = float32ToInt16(inputData);
                const base64Data = arrayBufferToBase64(pcm16.buffer);

                sessionPromiseRef.current?.then(session => {
                  session.sendRealtimeInput({
                    media: {
                      mimeType: 'audio/pcm;rate=16000',
                      data: base64Data
                    }
                  });
                });
              };

              source.connect(processor);
              processor.connect(inputAudioContextRef.current.destination);

            } catch (err) {
              console.error("Microphone error:", err);
              disconnect();
              setConnectionState('error');
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
               const ctx = audioContextRef.current;
               const buffer = await decodeAudioData(base64ToUint8Array(audioData), ctx, 24000, 1);
               
               const source = ctx.createBufferSource();
               source.buffer = buffer;
               source.connect(ctx.destination);
               
               const currentTime = ctx.currentTime;
               if (nextStartTimeRef.current < currentTime) {
                 nextStartTimeRef.current = currentTime;
               }
               
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += buffer.duration;
            }

            if (message.toolCall) {
              const functionResponses = [];
              for (const fc of message.toolCall.functionCalls) {
                console.log("Tool call:", fc.name, fc.args);
                let result: any = { status: 'ok' };

                if (fc.name === 'updateCaseDetails') {
                  const args = fc.args as any;
                  setCaseData(prev => ({
                    ...prev,
                    ...args
                  }));
                  result = { result: 'Case details updated on screen.' };
                } 
                else if (fc.name === 'proposeSolutions') {
                  const args = fc.args as any;
                  setCaseData(prev => ({
                    ...prev,
                    solutions: args.solutions
                  }));
                  result = { result: 'Solutions displayed.' };
                } 
                else if (fc.name === 'createTicket') {
                  const args = fc.args as any;
                  
                  // Generate RE + 6 digit number
                  const random6Digits = Math.floor(100000 + Math.random() * 900000);
                  const ticketCode = `RE${random6Digits}`;

                  setCaseData(prev => ({
                    ...prev,
                    status: args.status,
                    ticketCode: ticketCode
                  }));
                  
                  // Return the code so the model can read it
                  result = { ticketCode: ticketCode }; 
                }
                else if (fc.name === 'sendEmail') {
                  // Simulate email sending logic
                  setCaseData(prev => ({ ...prev, emailStatus: 'sending' }));
                  
                  // Mock sending process
                  setTimeout(() => {
                    console.log(`[SIMULATION] Email sent to ${userEmailRef.current} from soporte@smc.cl with solutions.`);
                    setCaseData(prev => ({ ...prev, emailStatus: 'sent' }));
                  }, 2000);

                  result = { result: `Email sending initiated to ${userEmailRef.current} from soporte@smc.cl` };
                }

                functionResponses.push({
                  id: fc.id,
                  name: fc.name,
                  response: result
                });
              }

              sessionPromiseRef.current?.then(session => {
                session.sendToolResponse({ functionResponses });
              });
            }
          },
          onclose: () => {
            console.log("Session closed");
            setConnectionState('disconnected');
          },
          onerror: (err) => {
            console.error("Session error:", err);
            setConnectionState('error');
            cleanup();
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setConnectionState('error');
      cleanup();
    }
  }, [cleanup, disconnect]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { connectionState, connect, disconnect, caseData, volume };
};