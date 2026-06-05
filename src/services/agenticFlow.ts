import { useAppStore, Page, Chapter } from '../store';

let resolvePause: (() => void) | null = null;
let rejectPause: ((reason?: any) => void) | null = null;
let isFlowStopped = false;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const checkStopped = () => {
  if (isFlowStopped) throw new Error('Agentic Flow Stopped by User');
};

const pauseForReview = async (previousStep: string, nextStep: string) => {
  const store = useAppStore.getState();
  if (!store.reviewStepByStep) return;

  store.setAgenticFlowState({
    isPaused: true,
    reviewMessage: `Previous Step: ${previousStep}\nNext Step: ${nextStep}\nDo you want to continue?`
  });

  await new Promise<void>((resolve, reject) => {
    resolvePause = resolve;
    rejectPause = reject;
  });

  store.setAgenticFlowState({ isPaused: false, reviewMessage: '' });
};

export const continueAgenticFlow = () => {
  if (resolvePause) {
    resolvePause();
    resolvePause = null;
    rejectPause = null;
  }
};

export const cancelAgenticFlow = () => {
  if (rejectPause) {
    rejectPause(new Error("Flow cancelled by user during review"));
    resolvePause = null;
    rejectPause = null;
  }
};

export const stopAgenticFlow = () => {
  isFlowStopped = true;
  cancelAgenticFlow();
  const store = useAppStore.getState();
  store.setAgenticFlowState({ isRunning: false, isPaused: false });
  store.setIsProcessRunning(false);
};

const executeStep = async (
  stepNumber: number,
  stepName: string,
  action: () => Promise<void> | void
) => {
  const store = useAppStore.getState();
  const config = store.globalSettings.agenticFlowConfig;
  const stepKey = `step${stepNumber}` as keyof typeof config;
  
  if (!config || !config[stepKey] || !config[stepKey].enabled) {
    store.addTraceLog(`[AgenticFlow] Step ${stepNumber} skipped: ${stepName}`);
    return;
  }

  checkStopped();
  store.setAgenticFlowState({ currentStep: stepNumber });
  store.addTraceLog(`[AgenticFlow] Executing Step ${stepNumber}: ${stepName}`);
  
  // Apply model overrides if defined in config
  if (config[stepKey].modelId) {
    if ([1, 4].includes(stepNumber)) {
      store.setTextModel(config[stepKey].modelId!);
      store.addTraceLog(`[AgenticFlow] Set Text Model to ${config[stepKey].modelId}`);
    } else if ([7, 10, 12].includes(stepNumber)) {
      store.setImageModel(config[stepKey].modelId!);
      store.addTraceLog(`[AgenticFlow] Set Image Model to ${config[stepKey].modelId}`);
    }
  }

  await action();
  
  store.addTraceLog(`[AgenticFlow] Completed Step ${stepNumber}`);
};

const ensureTabAndHandlers = async (tabId: string, handlerKeys: string[]) => {
  const store = useAppStore.getState();
  if (store.activeTab !== tabId) {
    store.setActiveTab(tabId);
    // Give React time to render the new tab and register its handlers
    await wait(500); 
  }
  
  const handlers = store.generationHandlers[tabId];
  if (!handlers) {
    throw new Error(`Handlers for tab ${tabId} not registered.`);
  }

  for (const key of handlerKeys) {
    if (!handlers[key]) {
      throw new Error(`Handler ${key} not found on tab ${tabId}.`);
    }
  }
  return handlers;
};

export const startAgenticFlow = async () => {
  const store = useAppStore.getState();
  const chapterName = store.chapterForAgenticFlow;
  
  if (!chapterName) {
    alert("Please enter a valid Chapter Name for Agentic Flow.");
    return;
  }

  isFlowStopped = false;
  store.setAgenticFlowState({
    isRunning: true,
    isPaused: false,
    currentStep: 0,
    logs: [],
    reviewMessage: ''
  });
  store.setIsProcessRunning(true);

  try {
    // We expect the selected chapter to already match the name
    let targetChapter: Chapter | undefined = store.chapters.find(c => c.title === chapterName);
    
    // Step 1 - Select Text Model (Gemini 3.1 Pro)
    await pauseForReview("Initialization", "Step 1: Select Text Model");
    await executeStep(1, "Select Text Model (Gemini 3.1 Pro)", async () => {
      // Handled automatically by executeStep model override
      await wait(500); // Wait for selection to complete visually
    });

    // Step 2 - Generate Chapters Content
    await pauseForReview("Step 1", "Step 2: Generate Chapter Content");
    await executeStep(2, "Generate Chapter Content", async () => {
      const handlers = await ensureTabAndHandlers('chapters', ['handleGenerateChapterContent']);
      // We must find the chapter object
      targetChapter = useAppStore.getState().chapters.find(c => c.title === chapterName);
      if (!targetChapter) throw new Error("Target chapter not found in state");
      await handlers.handleGenerateChapterContent(targetChapter);
    });

    // Re-fetch chapter in case it was modified
    targetChapter = useAppStore.getState().chapters.find(c => c.title === chapterName);
    if (!targetChapter) throw new Error("Target chapter not found after generation");

    // Step 3 - On page tab, ensure Dropdown has correct chapter
    await pauseForReview("Step 2", "Step 3: Switch to Pages Tab and select chapter");
    await executeStep(3, "Select Chapter in Pages Tab", async () => {
      const storeState = useAppStore.getState();
      if (storeState.activeTab !== 'pages') {
        storeState.setActiveTab('pages');
        await wait(500);
      }
      storeState.setSelectedChapterId(targetChapter!.id);
      await wait(500); // wait for pages to load
    });

    // Step 4 - Select Text Model (Gemini 3.1 Flash Lite)
    await pauseForReview("Step 3", "Step 4: Select Text Model");
    await executeStep(4, "Select Text Model (Gemini 3.1 Flash Lite)", async () => {
      await wait(500);
    });

    // Step 5 - Generate Page Text
    await pauseForReview("Step 4", "Step 5: Generate Page Text");
    await executeStep(5, "Generate Page Text", async () => {
      const handlers = await ensureTabAndHandlers('pages', ['handleGeneratePageText']);
      await handlers.handleGeneratePageText();
    });

    // Step 6 - Generate Image Prompts
    await pauseForReview("Step 5", "Step 6: Generate Image Prompts");
    await executeStep(6, "Generate Image Prompts", async () => {
      const handlers = await ensureTabAndHandlers('pages', ['handleGenerateImagePrompts']);
      await handlers.handleGenerateImagePrompts();
    });

    // Step 7 - Select Image Model (Gemini 2.5 Flash Image)
    await pauseForReview("Step 6", "Step 7: Select Image Model");
    await executeStep(7, "Select Image Model (Gemini 2.5 Flash Image)", async () => {
      await wait(500);
    });

    // Step 8 - Generate Page Images
    await pauseForReview("Step 7", "Step 8: Generate Page Images");
    await executeStep(8, "Generate Page Images", async () => {
      const handlers = await ensureTabAndHandlers('pages', ['handleGeneratePageImages']);
      await handlers.handleGeneratePageImages();
    });

    // Step 9 - Optimize Text for All
    await pauseForReview("Step 8", "Step 9: Optimize Text for All");
    await executeStep(9, "Optimize Text for All", async () => {
      const handlers = await ensureTabAndHandlers('pages', ['handleOptimizeTextForAll']);
      await handlers.handleOptimizeTextForAll();
    });

    // Step 10 - Select Image Model (Gemini 3.1 Flash Image)
    await pauseForReview("Step 9", "Step 10: Select Image Model");
    await executeStep(10, "Select Image Model (Gemini 3.1 Flash Image)", async () => {
      await wait(500);
    });

    // Step 11 - Generate 2 Camera Angles
    await pauseForReview("Step 10", "Step 11: Generate 2 Camera Angles");
    await executeStep(11, "Generate 2 Camera Angles", async () => {
      const handlers = await ensureTabAndHandlers('pages', ['handleGenerate2CameraAngles']);
      await handlers.handleGenerate2CameraAngles();
    });

    // Step 12 - Select Image Model (Gemini 2.5 Flash Image)
    await pauseForReview("Step 11", "Step 12: Select Image Model");
    await executeStep(12, "Select Image Model (Gemini 2.5 Flash Image)", async () => {
      await wait(500);
    });

    // Step 13 - Generate Close Ups
    await pauseForReview("Step 12", "Step 13: Generate Close Ups");
    await executeStep(13, "Generate Close Ups", async () => {
      const handlers = await ensureTabAndHandlers('pages', ['handleGenerateCloseUps']);
      await handlers.handleGenerateCloseUps();
    });

    // Step 14 - Generate All Voices
    await pauseForReview("Step 13", "Step 14: Generate All Voices");
    await executeStep(14, "Generate All Voices", async () => {
      const handlers = await ensureTabAndHandlers('pages', ['handleGenerateAllVoices']);
      await handlers.handleGenerateAllVoices();
    });

    store.addTraceLog("[AgenticFlow] Process completed successfully.");
    alert("Agentic Story Generation completed successfully.");

  } catch (error: any) {
    if (error.message === 'Agentic Flow Stopped by User' || error.message === 'Flow cancelled by user during review') {
      store.addTraceLog(`[AgenticFlow] Process aborted: ${error.message}`);
    } else {
      console.error(error);
      store.addTraceLog(`[AgenticFlow] Error: ${error.message}`);
      alert(`Agentic Flow Error: ${error.message}`);
    }
  } finally {
    isFlowStopped = false;
    store.setAgenticFlowState({ isRunning: false, isPaused: false });
    store.setIsProcessRunning(false);
  }
};
