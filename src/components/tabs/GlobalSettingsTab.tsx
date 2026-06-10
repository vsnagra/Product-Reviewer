import React from 'react';
import { useAppStore } from '../../store';

export const GlobalSettingsTab: React.FC = () => {
  const { globalSettings, setGlobalSettings, llmLogs, clearLlmLogs } = useAppStore();

  const textLogs = llmLogs.filter(log => log.type === 'text');
  const imageLogs = llmLogs.filter(log => log.type === 'image');

  const renderLogCard = (log: any) => (
    <div key={log.id} className="bg-white border border-gray-300 rounded p-4 shadow-sm mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
        <span className={`text-xs font-bold px-2 py-1 rounded ${log.response?.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {log.response?.error ? 'ERROR' : 'SUCCESS'}
        </span>
      </div>
      
      <details className="mb-2">
        <summary className="cursor-pointer text-sm font-semibold text-blue-600 select-none">View Request</summary>
        <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto">
          <pre className="text-xs text-gray-800 font-mono">{JSON.stringify(log.request, null, 2)}</pre>
        </div>
      </details>

      <details>
        <summary className="cursor-pointer text-sm font-semibold text-purple-600 select-none">View Response</summary>
        <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto">
          {typeof log.response === 'string' ? (
            <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">{log.response}</pre>
          ) : (
            <pre className="text-xs text-gray-800 font-mono">{JSON.stringify(log.response, null, 2)}</pre>
          )}
        </div>
      </details>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-4 space-y-6 overflow-y-auto">
      <h2 className="text-2xl font-semibold text-gray-900 border-b border-gray-300 pb-2">Global Settings</h2>

      <div className="space-y-4 max-w-2xl shrink-0">
        <h3 className="text-lg font-medium text-gray-900">Veo Automation Config</h3>
        
        <div className="flex flex-col">
          <label className="text-gray-600 text-sm mb-1">Chrome Profile Path</label>
          <input
            type="text"
            className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500"
            value={globalSettings.veoChromeProfilePath || ''}
            onChange={(e) => setGlobalSettings({ veoChromeProfilePath: e.target.value })}
            placeholder="C:\Users\username\AppData\Local\Google\Chrome\User Data\Profile 5"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-gray-600 text-sm mb-1">Chrome Executable Path</label>
          <input
            type="text"
            className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500"
            value={globalSettings.veoChromeExecutablePath || ''}
            onChange={(e) => setGlobalSettings({ veoChromeExecutablePath: e.target.value })}
            placeholder="C:\Program Files\Google\Chrome\Application\chrome.exe"
          />
        </div>
      </div>

      <div className="border-t border-gray-300 pt-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-medium text-gray-900">LLM Debug Logs</h3>
          <button 
            onClick={clearLlmLogs}
            className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded"
          >
            Clear Logs
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col">
            <h4 className="text-lg font-semibold text-gray-700 mb-2 border-b border-gray-200 pb-1">Text LLM Logs</h4>
            <div className="flex-1 min-h-[400px] bg-gray-100 rounded border border-gray-300 p-2 overflow-y-auto max-h-[800px]">
              {textLogs.length === 0 ? (
                <p className="text-gray-500 text-sm text-center mt-4">No text requests yet.</p>
              ) : (
                textLogs.map(renderLogCard)
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <h4 className="text-lg font-semibold text-gray-700 mb-2 border-b border-gray-200 pb-1">Image LLM Logs</h4>
            <div className="flex-1 min-h-[400px] bg-gray-100 rounded border border-gray-300 p-2 overflow-y-auto max-h-[800px]">
              {imageLogs.length === 0 ? (
                <p className="text-gray-500 text-sm text-center mt-4">No image requests yet.</p>
              ) : (
                imageLogs.map(renderLogCard)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
