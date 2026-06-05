import React from 'react';
import { useAppStore } from '../store';

export function ModelSelect() {
  const { textModel, setTextModel, availableTextModels } = useAppStore();
  
  return (
    <select
      value={textModel}
      onChange={(e) => setTextModel(e.target.value)}
      className="px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-900 text-app-body h-[42px] focus:outline-none focus:border-blue-500"
    >
      {availableTextModels.map(model => (
        <option key={model} value={model}>{model}</option>
      ))}
    </select>
  );
}
