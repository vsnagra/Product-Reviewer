import React from 'react';
import { useAppStore } from '../store';
import { Save, FolderOpen } from 'lucide-react';

export function TopBar() {
  const { exportState, importState, loadParsedState, imageModel, textModel, availableTextModels, availableImageModels, setImageModel, setTextModel } = useAppStore();

  const handleSave = async () => {
    try {
      if (!('showSaveFilePicker' in window)) {
        alert("Your browser does not support the File System Access API needed for this feature. Please use Chrome or Edge.");
        return;
      }

      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: 'product-reviewer-project.json',
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] },
        }],
      });

      const writable = await fileHandle.createWritable();
      const blob = await exportState();
      await writable.write(blob);
      await writable.close();
      
      alert("Project saved successfully!");
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Save failed", err);
      }
    }
  };

  const handleLoad = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const text = await file.text();
            try {
              const data = JSON.parse(text);
              await loadParsedState(data);
              alert("Project loaded successfully!");
            } catch (parseErr: any) {
              console.error("JSON Parse failed", parseErr);
              alert(`JSON Parse Error: ${parseErr.message}`);
            }
          } catch (err: any) {
            console.error("Load failed", err);
            alert(`Failed to read file. Details: ${err.message}`);
          }
        }
      };
      input.click();
    } catch (err) {
      console.error("Load setup failed", err);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white text-gray-900 border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-blue-600">Product Reviewer App</h1>
        <div className="flex items-center gap-4 ml-8">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Image Model:</label>
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
              className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500"
            >
              {availableImageModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <label className="text-sm text-gray-600">Text Model:</label>
            <select
              value={textModel}
              onChange={(e) => setTextModel(e.target.value)}
              className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500"
            >
              {availableTextModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 relative z-50">
        <button 
          onClick={handleLoad}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-sm transition-colors"
          title="Load single JSON file"
        >
          <FolderOpen size={16} /> Load Project
        </button>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-500 rounded text-sm transition-colors"
          title="Save as single JSON file"
        >
          <Save size={16} /> Save Project
        </button>
      </div>
    </div>
  );
}
