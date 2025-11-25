import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  volume: number; // 0 to ~1
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, volume }) => {
  const bars = 5;
  
  return (
    <div className="flex items-center justify-center gap-1.5 h-16">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-2.5 rounded-full transition-all duration-100 ease-in-out ${
            isActive ? 'bg-blue-500' : 'bg-gray-300'
          }`}
          style={{
            height: isActive 
              ? `${Math.max(15, Math.min(100, 20 + volume * 100 * (Math.random() * 0.5 + 0.8)))}%` 
              : '15%'
          }}
        />
      ))}
    </div>
  );
};

export default Visualizer;
