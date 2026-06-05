import React from 'react';
import { useAppStore } from '../store';

export function StatusBar() {
  const { isGenerating, progressPercent, statusText } = useAppStore();

  if (!isGenerating) return null;

  return (
    <div className="bg-gray-100 border-b border-gray-300 p-2 flex flex-col gap-2 shrink-0">
      <div className="flex justify-between text-app-body text-gray-700">
        <span>{statusText}</span>
        <span>{Math.round(progressPercent)}%</span>
      </div>
      <div className="w-full bg-white rounded-full h-2">
        <div 
          className="bg-blue-500 text-white h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>
    </div>
  );
}
