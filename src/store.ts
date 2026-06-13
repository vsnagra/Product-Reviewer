import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface ProductResearch {
  productName: string;
  productDescription: string;
  researchDump: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  howWeScore: string;
}

export interface CountdownItem {
  id: string;
  name: string;
  score: number;
}

export interface MediaData {
  imageUrl?: string;
  imageHistory?: string[];
  imageHistoryIndex?: number;
  referenceImageUrl?: string;
  imagePrompt?: string;
  videoUrl?: string;
  videoPrompt?: string;
  pageVideoSpeedMultiplier?: number;
  pageVideoCutoffSecs?: number;
  searchQuery?: string;
}

export interface SceneSubNode {
  id: string;
  type: 'category' | 'summary';
  name: string;
  description: string;
  howWeScore: string;
  details: string;
  performanceSpecifications?: string;
  reviewsSummary?: string;
  score: number;
  image1: MediaData;
  image2: MediaData;
  image3: MediaData;
  image4: MediaData;
  video1: MediaData;
  video2: MediaData;
}

export interface SceneNode {
  id: string;
  countdownItemId: string;
  itemName: string;
  modelName: string;
  manufacturer: string;
  launchDate: string;
  generalDescription: string;
  subNodes: SceneSubNode[];
  mediaPlaceholders?: MediaData[];
}

export interface GlobalSettings {
  modelId: string;
  veoChromeProfilePath?: string;
  veoChromeExecutablePath?: string;
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  message: string;
  details?: string;
}

export interface LLMLog {
  id: string;
  timestamp: string;
  type: 'text' | 'image';
  request: any;
  response: any;
}

export interface AppState {
  imageModel: string;
  setImageModel: (model: string) => void;
  textModel: string;
  setTextModel: (model: string) => void;

  availableTextModels: string[];
  availableImageModels: string[];
  setAvailableModels: (textModels: string[], imageModels: string[]) => void;

  globalSettings: GlobalSettings;
  setGlobalSettings: (settings: Partial<GlobalSettings>) => void;

  errorLogs: ErrorLog[];
  addErrorLog: (message: string, details?: string) => void;
  clearErrorLogs: () => void;

  llmLogs: LLMLog[];
  addLlmLog: (type: 'text' | 'image', request: any, response: any) => void;
  clearLlmLogs: () => void;

  traceLogs: string[];
  addTraceLog: (log: string) => void;
  clearTraceLogs: () => void;

  isGenerating: boolean;
  progressPercent: number;
  statusText: string;
  setStatus: (isGenerating: boolean, percent: number, text: string) => void;
  setIsProcessRunning: (isRunning: boolean) => void;

  activeTab: string;
  setActiveTab: (tabId: string) => void;

  productResearch: ProductResearch;
  setProductResearch: (data: Partial<ProductResearch>) => void;

  guidingPrompt: string;
  setGuidingPrompt: (prompt: string) => void;

  countdownItems: CountdownItem[];
  setCountdownItems: (items: CountdownItem[]) => void;

  categories: Category[];
  setCategories: (categories: Category[]) => void;

  sceneNodes: SceneNode[];
  setSceneNodes: (nodes: SceneNode[]) => void;
  updateSceneNode: (nodeId: string, data: Partial<SceneNode>) => void;
  updateSceneSubNode: (nodeId: string, subNodeId: string, data: Partial<SceneSubNode>) => void;

  exportState: () => Promise<Blob>;
  importState: (json: string) => Promise<void>;
  loadParsedState: (state: Partial<AppState>) => Promise<void>;
}

const defaultMediaData = (): MediaData => ({});

const defaultGlobalSettings: GlobalSettings = {
  modelId: 'inworld-tts-1.5-max',
  veoChromeProfilePath: "C:\\Users\\vsnag\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 5",
  veoChromeExecutablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
};

export const useAppStore = create<AppState>((set, get) => ({
  imageModel: 'gemini-2.5-flash-image',
  setImageModel: (model) => set({ imageModel: model }),
  textModel: 'gemini-3.1-flash-lite',
  setTextModel: (model) => set({ textModel: model }),

  availableTextModels: ['gemini-3.1-pro-preview', 'gemini-3.1-flash-preview', 'gemini-3.1-flash-lite', 'gemini-2.5-pro', 'gemini-2.5-flash'],
  availableImageModels: ['gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image'],
  setAvailableModels: (textModels, imageModels) => set({ availableTextModels: textModels, availableImageModels: imageModels }),

  globalSettings: (() => {
    try {
      const stored = localStorage.getItem('globalSettings');
      const parsed = stored ? JSON.parse(stored) : {};
      return { ...defaultGlobalSettings, ...parsed };
    } catch {
      return defaultGlobalSettings;
    }
  })(),
  setGlobalSettings: (settings) => set((state) => {
    const newSettings = { ...state.globalSettings, ...settings };
    try {
      localStorage.setItem('globalSettings', JSON.stringify(newSettings));
    } catch (e: any) {
      console.warn("Could not save global settings", e);
    }
    return { globalSettings: newSettings };
  }),

  errorLogs: [],
  addErrorLog: (message, details) => set((state) => ({
    errorLogs: [
      { id: uuidv4(), timestamp: new Date().toISOString(), message, details },
      ...state.errorLogs
    ]
  })),
  clearErrorLogs: () => set({ errorLogs: [] }),

  llmLogs: [],
  addLlmLog: (type, request, response) => set((state) => ({
    llmLogs: [
      { id: uuidv4(), timestamp: new Date().toISOString(), type, request, response },
      ...state.llmLogs
    ]
  })),
  clearLlmLogs: () => set({ llmLogs: [] }),

  traceLogs: [],
  addTraceLog: (log) => set((state) => ({
    traceLogs: [`[${new Date().toISOString()}] ${log}`, ...state.traceLogs]
  })),
  clearTraceLogs: () => set({ traceLogs: [] }),

  isGenerating: false,
  progressPercent: 0,
  statusText: '',
  setStatus: (isGenerating, percent, text) => set({ isGenerating, progressPercent: percent, statusText: text }),
  setIsProcessRunning: (isRunning) => set({ isGenerating: isRunning }),

  activeTab: 'product-research',
  setActiveTab: (tabId) => set({ activeTab: tabId }),

  productResearch: {
    productName: '',
    productDescription: '',
    researchDump: ''
  },
  setProductResearch: (data) => set((state) => ({
    productResearch: { ...state.productResearch, ...data }
  })),

  guidingPrompt: '',
  setGuidingPrompt: (prompt) => set({ guidingPrompt: prompt }),

  countdownItems: [],
  setCountdownItems: (items) => set({ countdownItems: items }),

  categories: [],
  setCategories: (categories) => set({ categories }),

  sceneNodes: [],
  setSceneNodes: (nodes) => set({ sceneNodes: nodes }),
  updateSceneNode: (nodeId, data) => set((state) => ({
    sceneNodes: state.sceneNodes.map(node => node.id === nodeId ? { ...node, ...data } : node)
  })),
  updateSceneSubNode: (nodeId, subNodeId, data) => set((state) => ({
    sceneNodes: state.sceneNodes.map(node => {
      if (node.id !== nodeId) return node;
      return {
        ...node,
        subNodes: node.subNodes.map(sub => sub.id === subNodeId ? { ...sub, ...data } : sub)
      };
    })
  })),

  exportState: async () => {
    const { AssetManager } = await import('./services/AssetManager');
    const resolveAndSaveMediaDeep = async (obj: any): Promise<any> => {
      if (!obj) return obj;
      if (typeof obj === 'string') {
        const filename = AssetManager.getFilenameFromUrl(obj);
        if (filename) return `asset://${filename}`;
        
        const isBlobOrData = obj.startsWith('data:') || obj.startsWith('blob:');
        const isHttpOrPath = obj.startsWith('http://') || obj.startsWith('https://') || obj.startsWith('/');
        
        if (isBlobOrData || isHttpOrPath) {
          try {
            const savedUrl = await AssetManager.saveMedia(obj);
            const newFilename = AssetManager.getFilenameFromUrl(savedUrl);
            if (newFilename) return `asset://${newFilename}`;
          } catch (e) {
            console.warn("Failed to save media during export", e);
          }
        }
        return obj;
      }
      if (Array.isArray(obj)) return Promise.all(obj.map(item => resolveAndSaveMediaDeep(item)));
      if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key of Object.keys(obj)) newObj[key] = await resolveAndSaveMediaDeep(obj[key]);
        return newObj;
      }
      return obj;
    };

    const state = get();
    // Deep clone and strip imageHistory & imageHistoryIndex from mediaPlaceholders of each Item Node
    const cleanNodes = state.sceneNodes.map(node => ({
      ...node,
      mediaPlaceholders: node.mediaPlaceholders?.map(placeholder => {
        const cleanPlaceholder = { ...placeholder };
        delete cleanPlaceholder.imageHistory;
        delete cleanPlaceholder.imageHistoryIndex;
        return cleanPlaceholder;
      })
    }));

    const rest = {
      imageModel: state.imageModel,
      textModel: state.textModel,
      globalSettings: state.globalSettings,
      productResearch: state.productResearch,
      guidingPrompt: state.guidingPrompt,
      countdownItems: state.countdownItems,
      categories: state.categories,
      sceneNodes: cleanNodes
    };

    const processedData = await resolveAndSaveMediaDeep(rest);
    return new Blob([JSON.stringify(processedData, null, 2)], { type: 'application/json' });
  },

  importState: async (json) => {
    try {
      const data = JSON.parse(json);
      get().loadParsedState(data);
    } catch (e: any) {
      console.error("Failed to import state", e);
      alert(`Failed to load file. Invalid format. Details: ${e.message}`);
    }
  },

  loadParsedState: async (data) => {
    const { AssetManager } = await import('./services/AssetManager');
    const resolveMediaDeep = async (obj: any): Promise<any> => {
      if (!obj) return obj;
      if (typeof obj === 'string') {
        const isAsset = obj.startsWith('asset://');
        const hasMediaExt = /\.(png|jpg|jpeg|wav|mp3|mp4)$/i.test(obj);
        if (isAsset || hasMediaExt) return await AssetManager.resolveFilenameToUrl(obj);
      }
      if (Array.isArray(obj)) return Promise.all(obj.map(item => resolveMediaDeep(item)));
      if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key of Object.keys(obj)) newObj[key] = await resolveMediaDeep(obj[key]);
        return newObj;
      }
      return obj;
    };

    const resolvedData = await resolveMediaDeep(data);
    set((state) => ({
      ...resolvedData,
      globalSettings: { ...state.globalSettings, ...(resolvedData.globalSettings || {}) },
      isGenerating: false,
      progressPercent: 0,
      statusText: '',
    }));
  }
}));
