import React from 'react';

interface SolutionsCardProps {
  solutions: string[];
}

const SolutionsCard: React.FC<SolutionsCardProps> = ({ solutions }) => {
  if (solutions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6 transform transition-all duration-500 ease-out animate-fade-in-up">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-amber-100 rounded-lg mr-3">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-800">Soluciones Sugeridas</h3>
      </div>
      <ul className="space-y-3">
        {solutions.map((sol, idx) => (
          <li key={idx} className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 font-bold rounded-full text-xs mr-3 mt-0.5">
              {idx + 1}
            </span>
            <span className="text-gray-700 text-sm leading-relaxed">{sol}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SolutionsCard;
