import React from 'react';
import { useAppStore } from '../../store';

export const GlobalSettingsTab: React.FC = () => {
  const { globalSettings, setGlobalSettings } = useAppStore();

  return (
    <div className="h-full flex flex-col p-4 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900 border-b border-gray-300 pb-2">Global Settings</h2>

      <div className="space-y-4 max-w-2xl">
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
    </div>
  );
};
