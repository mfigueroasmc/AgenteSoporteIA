
import React from 'react';
import { CaseData } from '../types';

interface SidePanelProps {
  email: string;
  caseData: CaseData;
}

const SidePanel: React.FC<SidePanelProps> = ({ email, caseData }) => {
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-full animate-fade-in">
      <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Resumen del Caso
        </h2>
      </div>

      <div className="p-6 space-y-6 flex-grow overflow-y-auto custom-scroll flex flex-col">
        
        {/* Info Grid */}
        <div className="space-y-4 flex-grow">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Correo Electrónico</label>
            <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100 flex items-center justify-between">
              <span className="truncate">{email}</span>
              {caseData.emailStatus === 'sent' && (
                <span className="flex-shrink-0 text-green-500" title="Correo enviado">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              {caseData.emailStatus === 'sending' && (
                <span className="flex-shrink-0 text-blue-500 animate-spin" title="Enviando...">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                </span>
              )}
            </div>
            {caseData.emailStatus === 'sent' && (
               <p className="text-[10px] text-green-600 mt-1 flex items-center">
                 Enviado por: <span className="font-semibold ml-1">soporte@smc.cl</span>
               </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Municipalidad</label>
            <div className={`text-sm font-medium p-2 rounded border transition-colors duration-300 ${caseData.municipality ? 'bg-white border-gray-200 text-gray-900' : 'bg-gray-50 border-gray-100 text-gray-400 italic'}`}>
              {caseData.municipality || "Esperando información..."}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sistema</label>
            <div className={`text-sm font-medium p-2 rounded border transition-colors duration-300 ${caseData.system ? 'bg-white border-gray-200 text-gray-900' : 'bg-gray-50 border-gray-100 text-gray-400 italic'}`}>
              {caseData.system || "Esperando información..."}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Error / Requerimiento</label>
            <div className={`text-sm font-medium p-2 rounded border min-h-[60px] transition-colors duration-300 ${caseData.problem ? 'bg-white border-gray-200 text-gray-900' : 'bg-gray-50 border-gray-100 text-gray-400 italic'}`}>
              {caseData.problem || "Esperando descripción..."}
            </div>
          </div>
          
          {/* Solutions List in Panel (Placed strictly below Error) */}
          {caseData.solutions && caseData.solutions.length > 0 && (
             <div className="animate-fade-in-up">
               <label className="block text-xs font-semibold text-amber-600 uppercase mb-1">Soluciones Propuestas</label>
               <ul className="text-sm space-y-2 mt-1">
                 {caseData.solutions.map((sol, i) => (
                   <li key={i} className="flex items-start text-gray-700 bg-amber-50 p-2 rounded border border-amber-100">
                     <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-[10px] font-bold mr-2 mt-0.5">
                       {i + 1}
                     </span>
                     <span>{sol}</span>
                   </li>
                 ))}
               </ul>
             </div>
          )}
        </div>

        {/* Ticket Code Highlight - Moved to bottom */}
        {caseData.ticketCode ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center animate-fade-in-up mt-6">
            <p className="text-xs text-blue-600 uppercase font-semibold tracking-wider mb-1">Código de Ticket</p>
            <p className="text-xl font-mono font-bold text-blue-800">{caseData.ticketCode}</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg p-4 text-center mt-6">
             <p className="text-xs text-gray-400 uppercase font-semibold">Código Pendiente</p>
          </div>
        )}

      </div>

      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase">Estado</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            caseData.status ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
          }`}>
            {caseData.status || "En Proceso"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
