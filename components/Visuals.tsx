import React from 'react';

export const FractionCircle: React.FC<{ value: number }> = ({ value }) => {
  // Value between 0 and 1
  const degrees = value * 360;
  return (
    <div className="flex flex-col items-center p-4">
      <div 
        className="w-32 h-32 rounded-full border-4 border-brand-600 bg-brand-100 relative overflow-hidden"
        style={{
          background: `conic-gradient(#4ade80 ${degrees}deg, #e5e7eb ${degrees}deg)`
        }}
      ></div>
      <span className="mt-2 font-bold text-gray-700">{value} ({value * 100}%)</span>
    </div>
  );
};

export const NumberLine: React.FC<{ highlight: number }> = ({ highlight }) => {
  return (
    <div className="w-full h-24 flex flex-col justify-center items-center p-4">
      <div className="relative w-full h-1 bg-gray-800 rounded">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <div key={tick} className="absolute w-0.5 h-4 bg-gray-800" style={{ left: `${tick * 100}%`, top: '-6px' }}>
            <span className="absolute top-6 -translate-x-1/2 text-xs font-bold">{tick}</span>
          </div>
        ))}
        <div 
          className="absolute w-4 h-4 bg-brand-500 rounded-full border-2 border-white shadow transition-all duration-500 top-1/2 -translate-y-1/2"
          style={{ left: `${highlight * 100}%` }}
        />
      </div>
    </div>
  );
};

export const Blocks: React.FC<{ count: number }> = ({ count }) => {
  return (
    <div className="flex flex-wrap gap-2 p-4 justify-center">
      {Array.from({ length: Math.min(count, 20) }).map((_, i) => (
        <div key={i} className="w-10 h-10 bg-fun-blue rounded border-b-4 border-blue-700 shadow animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
};
