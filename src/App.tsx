import React, { useEffect } from 'react';
import { useAppStore } from './store';
import { fetchAvailableModels } from './services/gemini';
import { TopBar } from './components/TopBar';
import { StatusBar } from './components/StatusBar';
import { ProductResearchTab } from './components/tabs/ProductResearchTab';
import { CountdownDetailsTab } from './components/tabs/CountdownDetailsTab';
import { ScenesTab } from './components/tabs/ScenesTab';
import { GlobalSettingsTab } from './components/tabs/GlobalSettingsTab';
import { cn } from './lib/utils';

type TabId = 'product-research' | 'countdown-details' | 'scenes' | 'global';

export default function App() {
  const activeTab = useAppStore(state => state.activeTab);
  const setActiveTab = useAppStore(state => state.setActiveTab);

  const setAvailableModels = useAppStore(state => state.setAvailableModels);
  
  useEffect(() => {
    fetchAvailableModels().then(({ textModels, imageModels }) => {
      if (textModels.length > 0 && imageModels.length > 0) {
        setAvailableModels(textModels, imageModels);
      }
    });
  }, [setAvailableModels]);

  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError(...args);
      const message = args.map(a => typeof a === 'object' ? (a instanceof Error ? a.message : JSON.stringify(a)) : String(a)).join(' ');
      const details = args.map(a => a instanceof Error ? a.stack : '').filter(Boolean).join('\n');
      useAppStore.getState().addErrorLog(message, details);
    };

    const handleError = (event: ErrorEvent) => {
      useAppStore.getState().addErrorLog(event.message, event.error?.stack);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const details = reason instanceof Error ? reason.stack : '';
      useAppStore.getState().addErrorLog(`Unhandled Rejection: ${message}`, details);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const tabs = [
    { id: 'product-research', label: 'Product Research' },
    { id: 'countdown-details', label: 'Countdown Details' },
    { id: 'scenes', label: 'Scenes' },
    { id: 'global', label: 'Global Settings' },
  ] as const;

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <TopBar />
      <StatusBar />
      
      <div className="flex border-b border-gray-200 bg-white px-4 overflow-x-auto shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={cn(
              "px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap outline-none",
              activeTab === tab.id 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-grow overflow-hidden relative bg-gray-50">
        {activeTab === 'product-research' && <ProductResearchTab />}
        {activeTab === 'countdown-details' && <CountdownDetailsTab />}
        {activeTab === 'scenes' && <ScenesTab />}
        {activeTab === 'global' && <GlobalSettingsTab />}
      </div>
    </div>
  );
}
