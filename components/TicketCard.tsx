import React from 'react';
import { TicketData } from '../types';

interface TicketCardProps {
  ticket: TicketData;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  return (
    <div className="bg-white rounded-xl shadow-xl border-l-4 border-blue-600 p-6 animate-fade-in-up">
      <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Ticket de Soporte</h2>
          <p className="text-sm text-gray-500">Generado el: {ticket.createdAt}</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-600 uppercase font-semibold tracking-wider mb-1">Código</p>
          <p className="text-xl font-mono font-bold text-blue-800 tracking-tight">{ticket.ticketCode}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Municipalidad</p>
          <p className="text-gray-800 font-medium">{ticket.municipality}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Sistema</p>
          <p className="text-gray-800 font-medium">{ticket.system}</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Problema Reportado</p>
        <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-red-800 text-sm">
          {ticket.problem}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Soluciones Propuestas</p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          {ticket.solutions.map((sol, i) => (
            <li key={i}>{sol}</li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <div>
           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
             {ticket.status}
           </span>
        </div>
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Enviar copia por correo
        </button>
      </div>
    </div>
  );
};

export default TicketCard;
