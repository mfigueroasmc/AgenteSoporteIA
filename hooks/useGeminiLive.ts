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
  description: 'Display a list of proposed technical solutions to the user on the screen.',
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

const getSystemInstruction = (email: string) => `
ROL: Eres el asistente virtual de voz de Sistemas Modulares de Computación Spa (SMC Spa).
TONO: Profesional, claro, sin emoticones.
CONTEXTO:
- Correo del usuario registrado: ${email}

FLUJO OBLIGATORIO:
1. SALUDO: Inicia inmediatamente con: "Hola, le habla el asistente virtual de Sistemas Modulares de Computación Spa. ¿En qué puedo ayudarle hoy?".
2. MUNICIPALIDAD: Pregunta "¿Para poder ayudarle, ¿podría indicarme el nombre de su Municipalidad?". ESPERA RESPUESTA. Llama a 'updateCaseDetails' con la municipalidad.
3. SISTEMA: Pregunta "Gracias. ¿Qué sistema de SMC está utilizando? Por ejemplo: Contabilidad, Adquisiciones, Inventario, etc.". ESPERA RESPUESTA. Llama a 'updateCaseDetails' con el sistema.
4. ERROR: Pregunta "Perfecto. Ahora indíqueme por favor el error o requerimiento que necesita resolver.". ESPERA RESPUESTA. Llama a 'updateCaseDetails' con el problema.
5. SUGERENCIAS: Analiza el problema. Genera 2-4 sugerencias técnicas inteligentes. Llama a 'proposeSolutions'. Explica las soluciones verbalmente.
6. TICKET: Llama a 'createTicket' con el estado (ej. "Pendiente"). Lee el código de ticket generado (la herramienta te lo devolverá).
7. CIERRE: Pregunta "¿Desea recibir una copia del ticket en su correo electrónico ${email}?".

REGLAS:
- NO avances de paso sin la respuesta del usuario.
- Si falta información, pregúntala antes de avanzar.
- Siempre usa las tools para mantener la pantalla actualizada.
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
          tools: [{ functionDeclarations: [updateCaseDetailsTool, proposeSolutionsTool, createTicketTool] }],
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
                  const now = new Date();
                  
                  // Format: SMC-AAAA-MMDD-HHMM-XXX
                  const year = now.getFullYear();
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  const day = String(now.getDate()).padStart(2, '0');
                  const hours = String(now.getHours()).padStart(2, '0');
                  const minutes = String(now.getMinutes()).padStart(2, '0');
                  const randomCode = Math.floor(Math.random() * 900) + 100;
                  const ticketCode = `SMC-${year}-${month}${day}-${hours}${minutes}-${randomCode}`;

                  setCaseData(prev => ({
                    ...prev,
                    status: args.status,
                    ticketCode: ticketCode
                  }));
                  
                  // Return the code so the model can read it
                  result = { ticketCode: ticketCode }; 
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