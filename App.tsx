import React, { useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import Visualizer from './components/Visualizer';
import SolutionsCard from './components/SolutionsCard';
import SidePanel from './components/SidePanel';
import TicketCard from './components/TicketCard';

const App: React.FC = () => {
  const { connectionState, connect, disconnect, caseData, volume } = useGeminiLive();
  const [email, setEmail] = useState('');
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = async () => {
    if (!email || !email.includes('@')) {
      alert("Por favor ingrese un correo electrónico válido.");
      return;
    }
    setHasStarted(true);
    await connect(email);
  };

  const isActive = connectionState === 'connected';

  // Initial Email Entry Screen
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <div className="h-8 w-8 bg-blue-700 rounded-md flex items-center justify-center text-white font-bold text-xs mr-3">
              SMC
            </div>
            <h1 className="text-xl font-semibold text-gray-800">Soporte Virtual</h1>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Bienvenido</h2>
              <p className="text-gray-500 mt-2">
                Asistente de voz de Sistemas Modulares de Computación Spa.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="ejemplo@municipalidad.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                />
              </div>

              <button
                onClick={handleStart}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
              >
                <span>Iniciar Asistente</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
            
            <p className="mt-6 text-xs text-center text-gray-400">
              Al continuar, acepta los términos de servicio de SMC Spa.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Main Active Session Screen
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <header className="bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-700 rounded-md flex items-center justify-center text-white font-bold text-xs">
              SMC
            </div>
            <h1 className="text-xl font-semibold text-gray-800 tracking-tight">
              Soporte Virtual <span className="text-blue-600">Inteligente</span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{email}</p>
              <p className="text-xs text-green-500 flex items-center justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>
                En línea
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 gap-4 h-[calc(100vh-4rem)]">
        
        {/* Left Column: Visualizer & Active Interaction */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative overflow-y-auto">
          
          {caseData.ticketCode ? (
            /* Final Ticket View - Shows Solutions and Code prominently */
            <div className="flex-grow flex items-center justify-center h-full">
              <div className="w-full max-w-2xl">
                 <TicketCard ticket={{
                   email: email,
                   municipality: caseData.municipality || 'No especificada',
                   system: caseData.system || 'No especificado',
                   problem: caseData.problem || 'No detallado',
                   solutions: caseData.solutions || [],
                   status: caseData.status || 'Emitido',
                   ticketCode: caseData.ticketCode,
                   createdAt: new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})
                 }} />
                 <div className="mt-8 text-center">
                    <button
                      onClick={disconnect}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full transition-colors"
                    >
                      Cerrar sesión
                    </button>
                 </div>
              </div>
            </div>
          ) : (
            /* Active Conversation View */
            <div className="flex-grow flex flex-col items-center justify-center min-h-[300px]">
               {/* Status Badge */}
               <div className={`mb-8 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition-colors ${
                 connectionState === 'connected' ? 'bg-blue-50 text-blue-600' :
                 connectionState === 'connecting' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
               }`}>
                 {connectionState === 'connected' ? 'Escuchando' : 
                  connectionState === 'connecting' ? 'Conectando...' : 'Desconectado'}
               </div>

               {/* Visualizer */}
               <div className="mb-12 transform scale-150">
                  <Visualizer isActive={isActive} volume={volume} />
               </div>

               {/* Dynamic Suggestions Overlay (Intermediate step before Ticket) */}
               {caseData.solutions && caseData.solutions.length > 0 && (
                 <div className="w-full max-w-lg">
                   <SolutionsCard solutions={caseData.solutions} />
                 </div>
               )}
               
               {/* Controls */}
                <div className="mt-12 flex justify-center">
                   {connectionState === 'connected' ? (
                      <button
                        onClick={disconnect}
                        className="flex items-center px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-full transition-colors font-medium shadow-sm"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Finalizar Llamada
                      </button>
                   ) : (
                      <button
                        onClick={() => connect(email)}
                        className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-colors font-medium"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reconectar
                      </button>
                   )}
                </div>
            </div>
          )}

        </div>

        {/* Right Column: Persistent Side Panel Summary */}
        <div className="w-full md:w-96 flex-shrink-0 h-full hidden md:block">
           <SidePanel email={email} caseData={caseData} />
        </div>

      </main>
    </div>
  );
};

export default App;