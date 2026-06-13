import React, { useState, useEffect } from 'react';
import { useAppStore, SceneNode, SceneSubNode, MediaData } from '../../store';
import { generateJson, generateImage } from '../../services/gemini';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, RefreshCw, Wand2, Upload, Video, Play, Image as ImageIcon } from 'lucide-react';
import { AssetManager } from '../../services/AssetManager';

export const ScenesTab: React.FC = () => {
  const { 
    sceneNodes, setSceneNodes, countdownItems, categories, productResearch, textModel, 
    setStatus, addErrorLog, updateSceneNode, updateSceneSubNode 
  } = useAppStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedSubNodeId, setSelectedSubNodeId] = useState<string | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!sceneNodes || sceneNodes.length === 0) return;
        
        // Flatten the tree to a single navigable list
        const flatList: {nodeId: string, subNodeId: string | null}[] = [];
        sceneNodes.forEach(node => {
          flatList.push({ nodeId: node.id, subNodeId: null });
          node.subNodes.forEach(sub => {
            flatList.push({ nodeId: node.id, subNodeId: sub.id });
          });
        });

        const currentIndex = flatList.findIndex(
          item => item.nodeId === selectedNodeId && item.subNodeId === selectedSubNodeId
        );

        let newIndex = currentIndex;
        if (e.key === 'ArrowUp') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        } else if (e.key === 'ArrowDown') {
          newIndex = currentIndex < flatList.length - 1 ? currentIndex + 1 : flatList.length - 1;
        }

        if (newIndex !== currentIndex) {
          setSelectedNodeId(flatList[newIndex].nodeId);
          setSelectedSubNodeId(flatList[newIndex].subNodeId);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sceneNodes, selectedNodeId, selectedSubNodeId]);

  const handleGenerateContent = async () => {
    if (countdownItems.length === 0) {
      alert("Please generate countdown details in the previous tab first.");
      return;
    }
    if (categories.length === 0) {
      alert("No categories defined. Please generate or add categories in the Countdown Details tab.");
      return;
    }
    
    setIsGenerating(true);
    setStatus(true, 10, 'Generating scenes content...');
    
    try {
      const newNodes: SceneNode[] = [];
      
      for (let i = 0; i < countdownItems.length; i++) {
        const item = countdownItems[i];
        setStatus(true, 10 + Math.floor((i / countdownItems.length) * 80), `Generating content for ${item.name}...`);
        
        const prompt = `Based on the product research dump for ${productResearch.productName}:
Research Dump:
${productResearch.researchDump}

Generate the detailed review content for the product "${item.name}".
Evaluate this product against the following specific categories:
${categories.map(c => `- ${c.name}: ${c.description} (How we score: ${c.howWeScore})`).join('\n')}

Return a JSON structure with the following exact schema:`;

        const schema = {
          type: "OBJECT",
          properties: {
            itemName: { type: "STRING" },
            modelName: { type: "STRING" },
            manufacturer: { type: "STRING" },
            launchDate: { type: "STRING" },
            generalDescription: { type: "STRING", description: "20 words general description" },
            categories: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING", description: "Must match one of the requested category names exactly." },
                  details: { type: "STRING" },
                  performanceSpecifications: { type: "STRING", description: "Performance specifications for that category" },
                  reviewsSummary: { type: "STRING", description: "Summary of reviews for that category" },
                  score: { type: "NUMBER" }
                },
                required: ["name", "details", "performanceSpecifications", "reviewsSummary", "score"]
              }
            },
            summary: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                detail: { type: "STRING" },
                scoreSummary: { type: "NUMBER" }
              },
              required: ["name", "detail", "scoreSummary"]
            }
          },
          required: ["itemName", "modelName", "manufacturer", "launchDate", "generalDescription", "categories", "summary"]
        };

        const result = await generateJson<any>(prompt, schema, "You are an expert product reviewer script writer.", textModel);

        const subNodes: SceneSubNode[] = [];
        
        result.categories.forEach((cat: any) => {
          const globalCat = categories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
          subNodes.push({
            id: uuidv4(),
            type: 'category',
            name: cat.name,
            description: globalCat ? globalCat.description : "No description provided",
            howWeScore: globalCat ? globalCat.howWeScore : "No scoring criteria provided",
            details: cat.details,
            performanceSpecifications: cat.performanceSpecifications || "",
            reviewsSummary: cat.reviewsSummary || "",
            score: cat.score,
            image1: {}, image2: {}, image3: {}, image4: {}, video1: {}, video2: {}
          });
        });
        
        subNodes.push({
          id: uuidv4(),
          type: 'summary',
          name: result.summary.name || "Summary",
          description: "Summary of the product",
          howWeScore: "Overall aggregation",
          details: result.summary.detail,
          score: result.summary.scoreSummary,
          image1: {}, image2: {}, image3: {}, image4: {}, video1: {}, video2: {}
        });

        newNodes.push({
          id: uuidv4(),
          countdownItemId: item.id,
          itemName: result.itemName,
          modelName: result.modelName,
          manufacturer: result.manufacturer,
          launchDate: result.launchDate,
          generalDescription: result.generalDescription,
          subNodes: subNodes,
          mediaPlaceholders: Array.from({ length: 6 }, () => ({}))
        });
      }
      
      setSceneNodes(newNodes);
      if (newNodes.length > 0) {
        setSelectedNodeId(newNodes[0].id);
        setSelectedSubNodeId(null);
      }
      setStatus(false, 100, 'Scenes generated successfully.');
    } catch (e: any) {
      console.error(e);
      addErrorLog('Failed to generate scenes content', e.message);
      setStatus(false, 0, 'Error generating scenes.');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedNode = sceneNodes.find(n => n.id === selectedNodeId);
  const selectedSubNode = selectedNode?.subNodes.find(s => s.id === selectedSubNodeId);

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">Scenes</h2>
        <button
          onClick={handleGenerateContent}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
        >
          {isGenerating ? 'Generating Content...' : 'Generate Content'}
        </button>
      </div>

      <div className="flex flex-grow overflow-hidden bg-white border border-gray-300 rounded-lg">
        {/* Left Sidebar (Index) */}
        <div className="w-1/4 border-r border-gray-300 bg-gray-50 overflow-y-auto">
          {sceneNodes.map(node => (
            <div key={node.id} className="flex flex-col">
              <div 
                className={`px-4 py-3 cursor-pointer font-bold border-b border-gray-300 transition-colors ${selectedNodeId === node.id && selectedSubNodeId === null ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-200'}`}
                onClick={() => { setSelectedNodeId(node.id); setSelectedSubNodeId(null); }}
              >
                {node.itemName}
              </div>
              <div className="flex flex-col">
                {node.subNodes.map(sub => (
                  <div 
                    key={sub.id} 
                    className={`pl-8 pr-4 py-2 cursor-pointer text-sm border-b border-gray-300 transition-colors ${selectedNodeId === node.id && selectedSubNodeId === sub.id ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-200'}`}
                    onClick={() => { setSelectedNodeId(node.id); setSelectedSubNodeId(sub.id); }}
                  >
                    └ {sub.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Content Area */}
        <div className="w-3/4 p-6 overflow-y-auto bg-white">
          {!selectedNode ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              Select a node to view details
            </div>
          ) : selectedSubNodeId === null ? (
            <NodeDetailsEditor node={selectedNode} />
          ) : selectedSubNode ? (
            <SubNodeDetailsEditor node={selectedNode} subNode={selectedSubNode} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

const NodeDetailsEditor: React.FC<{node: SceneNode}> = ({ node }) => {
  const { updateSceneNode, setStatus, addErrorLog } = useAppStore();
  const [searchQuery, setSearchQuery] = React.useState(node.itemName);
  const [isSearching, setIsSearching] = React.useState(false);

  // Sync search query if item name changes
  React.useEffect(() => {
    setSearchQuery(node.itemName);
  }, [node.id, node.itemName]);

  const handleChange = (field: keyof SceneNode, value: string) => {
    updateSceneNode(node.id, { [field]: value });
  };

  const handleNodeSearch = async () => {
    if (!searchQuery.trim()) {
      alert("Please enter a query.");
      return;
    }
    setIsSearching(true);
    setStatus(true, 10, 'Searching images on DuckDuckGo...');
    try {
      const res = await fetch('http://localhost:3012/api/search-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }
      
      const json = await res.json();
      if (json.urls && json.urls.length > 0) {
        const urls = json.urls;
        
        // Select starting offsets: 1st (0), 4th (3), 7th (6), 10th (9), 13th (12), 15th (14)
        const indices = [0, 3, 6, 9, 12, 14];
        
        const newPlaceholders = Array.from({ length: 6 }).map((_, placeholderIdx) => {
          const targetIndex = indices[placeholderIdx];
          const selectedIndex = targetIndex < urls.length ? targetIndex : (urls.length > 0 ? urls.length - 1 : 0);
          const imageUrl = urls.length > 0 ? urls[selectedIndex] : undefined;
          
          return {
            searchQuery: searchQuery,
            imageUrl: imageUrl,
            imageHistory: urls,
            imageHistoryIndex: selectedIndex
          };
        });
        
        updateSceneNode(node.id, { mediaPlaceholders: newPlaceholders });
        setStatus(false, 100, 'Images loaded successfully across all placeholders.');
      } else {
        alert("No images found on DuckDuckGo.");
        setStatus(false, 100, "No images found.");
      }
    } catch (e: any) {
      console.error(e);
      addErrorLog(`DuckDuckGo node search failed`, e.message);
      setStatus(false, 0, 'Search Error');
      alert(`Error searching: ${e.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-300 pb-2">Item Node Details</h3>
      
      {Object.entries({
        itemName: "Item Name",
        modelName: "Model Name",
        manufacturer: "Manufacturer",
        launchDate: "Model Launch Date",
      }).map(([key, label]) => (
        <div key={key} className="flex flex-col">
          <label className="text-gray-400 text-sm mb-1">{label}</label>
          <input
            className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500"
            value={(node as any)[key]}
            onChange={(e) => handleChange(key as keyof SceneNode, e.target.value)}
          />
        </div>
      ))}
      
      <div className="flex flex-col">
        <label className="text-gray-400 text-sm mb-1">General Description</label>
        <textarea
          className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 h-24"
          value={node.generalDescription}
          onChange={(e) => handleChange('generalDescription', e.target.value)}
        />
      </div>

      <div className="flex flex-col border bg-blue-50 p-4 rounded-lg border-blue-200 mt-6 gap-2">
        <label className="text-gray-900 font-bold text-sm">Search Node Images (Applies to all 6 placeholders)</label>
        <div className="flex space-x-2">
          <input
            type="text"
            className="p-2 rounded bg-white border border-gray-300 text-gray-900 text-sm flex-grow focus:outline-none focus:border-blue-500 font-medium"
            placeholder="Enter search query..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            onClick={handleNodeSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold flex items-center justify-center disabled:opacity-50 min-w-[120px] transition-colors"
          >
            {isSearching ? 'Searching...' : 'Search DDG'}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Searches DuckDuckGo and distributes results: 1st image in Placeholder 1, 4th in Placeholder 2, 7th in Placeholder 3, 10th in Placeholder 4, 13th in Placeholder 5, and 15th in Placeholder 6.
        </p>
      </div>

      <h4 className="text-lg font-bold text-gray-900 mt-8 border-b border-gray-300 pb-2">Media Placeholders</h4>
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, index) => {
          const placeholders = node.mediaPlaceholders || Array.from({ length: 6 }, () => ({}));
          const data = placeholders[index] || {};
          
          return (
            <ItemMediaPlaceholder
              key={index}
              index={index}
              node={node}
              data={data}
              onChange={(updatedData) => {
                const newPlaceholders = [...placeholders];
                newPlaceholders[index] = updatedData;
                updateSceneNode(node.id, { mediaPlaceholders: newPlaceholders });
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

const SubNodeDetailsEditor: React.FC<{node: SceneNode, subNode: SceneSubNode}> = ({ node, subNode }) => {
  const { updateSceneSubNode } = useAppStore();

  const handleChange = (field: keyof SceneSubNode, value: string | number) => {
    updateSceneSubNode(node.id, subNode.id, { [field]: value });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-300 pb-2">
        {subNode.type === 'category' ? 'Category Sub-node Details' : 'Summary Sub-node Details'}
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-gray-400 text-sm mb-1">Name</label>
          <input
            className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500"
            value={subNode.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-gray-400 text-sm mb-1">Score</label>
          <input
            type="number"
            className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500"
            value={subNode.score}
            onChange={(e) => handleChange('score', parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-col">
        <label className="text-gray-400 text-sm mb-1">Description (20 words)</label>
        <textarea
          className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 h-20"
          value={subNode.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-gray-400 text-sm mb-1">How We Score (20 words)</label>
        <textarea
          className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 h-20"
          value={subNode.howWeScore}
          onChange={(e) => handleChange('howWeScore', e.target.value)}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-gray-400 text-sm mb-1">Details</label>
        <textarea
          className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 h-32"
          value={subNode.details}
          onChange={(e) => handleChange('details', e.target.value)}
        />
      </div>

      {subNode.type === 'category' && (
        <>
          <div className="flex flex-col">
            <label className="text-gray-400 text-sm mb-1">Performance Specifications</label>
            <textarea
              className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 h-24"
              value={subNode.performanceSpecifications || ''}
              onChange={(e) => handleChange('performanceSpecifications', e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-gray-400 text-sm mb-1">Summary of Reviews</label>
            <textarea
              className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500 h-24"
              value={subNode.reviewsSummary || ''}
              onChange={(e) => handleChange('reviewsSummary', e.target.value)}
            />
          </div>
        </>
      )}

      <h4 className="text-lg font-bold text-gray-900 mt-8 border-b border-gray-300 pb-2">Media Placeholders</h4>
      <div className="grid grid-cols-2 gap-6">
        <MediaSection type="image" label="Image 1" data={subNode.image1} onChange={(val) => handleChange('image1', val)} />
        <MediaSection type="image" label="Image 2" data={subNode.image2} onChange={(val) => handleChange('image2', val)} />
        <MediaSection type="image" label="Image 3" data={subNode.image3} onChange={(val) => handleChange('image3', val)} />
        <MediaSection type="image" label="Image 4" data={subNode.image4} onChange={(val) => handleChange('image4', val)} />
        
        <MediaSection type="video" label="Video 1" data={subNode.video1} onChange={(val) => handleChange('video1', val)} referenceImage={subNode.image1.imageUrl} subNodeId={subNode.id} />
        <MediaSection type="video" label="Video 2" data={subNode.video2} onChange={(val) => handleChange('video2', val)} referenceImage={subNode.image1.imageUrl} subNodeId={subNode.id} />
      </div>
    </div>
  );
};

const MediaSection: React.FC<{
  type: 'image' | 'video',
  label: string,
  data: MediaData,
  onChange: (val: MediaData) => void,
  referenceImage?: string,
  subNodeId?: string
}> = ({ type, label, data, onChange, referenceImage, subNodeId }) => {
  const { globalSettings, setStatus, addErrorLog, addTraceLog } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    if (!data.imagePrompt) return;
    setIsProcessing(true);
    setStatus(true, 10, `Generating ${label}...`);
    try {
      const url = await generateImage(data.imagePrompt, data.referenceImageUrl ? [data.referenceImageUrl] : undefined);
      const newHistory = [...(data.imageHistory || []), url];
      onChange({ 
        ...data, 
        imageUrl: url,
        imageHistory: newHistory,
        imageHistoryIndex: newHistory.length - 1
      });
      setStatus(false, 100, `${label} generated.`);
    } catch (e: any) {
      addErrorLog(`Failed to generate ${label}`, e.message);
      setStatus(false, 0, 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrevImage = () => {
    if (data.imageHistory && data.imageHistoryIndex !== undefined && data.imageHistoryIndex > 0) {
      const newIndex = data.imageHistoryIndex - 1;
      onChange({ ...data, imageUrl: data.imageHistory[newIndex], imageHistoryIndex: newIndex });
    }
  };

  const handleNextImage = () => {
    if (data.imageHistory && data.imageHistoryIndex !== undefined && data.imageHistoryIndex < data.imageHistory.length - 1) {
      const newIndex = data.imageHistoryIndex + 1;
      onChange({ ...data, imageUrl: data.imageHistory[newIndex], imageHistoryIndex: newIndex });
    }
  };

  const handleSearchReference = async () => {
    if (!data.imagePrompt) {
      alert("Please enter a prompt to search.");
      return;
    }
    setIsProcessing(true);
    setStatus(true, 10, `Searching reference for ${label}...`);
    try {
      const res = await fetch('http://localhost:3012/api/search-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: data.imagePrompt })
      });
      const json = await res.json();
      if (json.url) {
        onChange({ ...data, referenceImageUrl: json.url });
        setPreviewImage(json.url);
        setStatus(false, 100, 'Found reference image.');
      } else {
        setStatus(false, 100, 'No reference image found.');
      }
    } catch (e: any) {
      addErrorLog('Search failed', e.message);
      setStatus(false, 0, 'Search Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('media', file);
      try {
        const res = await fetch('http://localhost:3012/api/upload', {
          method: 'POST',
          body: formData
        });
        const json = await res.json();
        onChange({ ...data, referenceImageUrl: json.url });
        setPreviewImage(json.url);
      } catch (e: any) {
        addErrorLog('Upload reference failed', e.message);
      }
    }
  };

  const handlePushToVeo = async () => {
    if (!data.videoPrompt) {
      alert("Please enter a video prompt.");
      return;
    }
    setIsProcessing(true);
    setStatus(true, 10, `Sending ${label} to Veo...`);
    try {
      const res = await fetch('http://localhost:3002/api/push-to-veo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pages: [{
            id: subNodeId,
            prompt: data.videoPrompt,
            imageUrl: referenceImage,
            useImage: !!referenceImage
          }],
          chromeProfilePath: globalSettings.veoChromeProfilePath,
          chromeExecutablePath: globalSettings.veoChromeExecutablePath
        })
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.substring(6));
                if (eventData.event === 'video_downloaded') {
                  onChange({ ...data, videoUrl: eventData.url });
                  setStatus(false, 100, 'Video downloaded!');
                } else if (eventData.event === 'error') {
                  throw new Error(eventData.message);
                } else {
                  addTraceLog(`Veo Event: ${eventData.event}`);
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch (e: any) {
      addErrorLog(`Failed to push ${label} to Veo`, e.message);
      setStatus(false, 0, 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('media', file);
      
      try {
        const res = await fetch('http://localhost:3012/api/upload', {
          method: 'POST',
          body: formData
        });
        const json = await res.json();
        if (type === 'image') {
          const newHistory = [...(data.imageHistory || []), json.url];
          onChange({ 
            ...data, 
            imageUrl: json.url,
            imageHistory: newHistory,
            imageHistoryIndex: newHistory.length - 1
          });
        } else {
          onChange({ ...data, videoUrl: json.url });
        }
      } catch (e: any) {
        addErrorLog('Upload failed', e.message);
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded border border-gray-300 flex flex-col space-y-3 relative">
      <div className="flex justify-between items-center">
        <span className="text-gray-900 font-bold">{label}</span>
        <div className="flex space-x-2">
          {type === 'image' && (
            <button onClick={handleGenerateImage} disabled={isProcessing} className="p-1 bg-blue-600 hover:bg-blue-700 rounded text-white" title="Generate">
              <Wand2 size={16} />
            </button>
          )}
          {type === 'video' && (
            <button onClick={handlePushToVeo} disabled={isProcessing} className="p-1 bg-purple-600 hover:bg-purple-700 rounded text-white" title="Push to Veo">
              <Video size={16} />
            </button>
          )}
          <label className="p-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 cursor-pointer" title="Upload">
            <Upload size={16} />
            <input type="file" className="hidden" accept={type === 'image' ? 'image/*' : 'video/*'} onChange={handleUpload} />
          </label>
          <button 
            onClick={() => onChange({ ...data, [type === 'image' ? 'imageUrl' : 'videoUrl']: undefined })} 
            className="p-1 bg-red-600 hover:bg-red-700 rounded text-white" title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {type === 'image' && (
        <div className="flex flex-col space-y-2">
          <textarea
            className="p-2 rounded bg-gray-50 border border-gray-300 text-gray-900 text-sm h-20"
            placeholder="Image Prompt..."
            value={data.imagePrompt || ''}
            onChange={(e) => onChange({ ...data, imagePrompt: e.target.value })}
          />
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-500 font-semibold">Ref Image:</span>
            {data.referenceImageUrl ? (
              <button onClick={() => setPreviewImage(data.referenceImageUrl!)} className="text-blue-600 hover:underline">Preview</button>
            ) : (
              <span className="text-gray-400">None</span>
            )}
            <button onClick={handleSearchReference} disabled={isProcessing} className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-800">Search Internet</button>
            <label className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-gray-800 cursor-pointer">
              Upload
              <input type="file" className="hidden" accept="image/*" onChange={handleUploadReference} />
            </label>
            {data.referenceImageUrl && (
               <button onClick={() => onChange({ ...data, referenceImageUrl: undefined })} className="text-red-500 hover:underline">Clear</button>
            )}
          </div>
        </div>
      )}
      
      {type === 'video' && (
        <textarea
          className="p-2 rounded bg-gray-50 border border-gray-300 text-gray-900 text-sm h-20"
          placeholder="Video Prompt..."
          value={data.videoPrompt || ''}
          onChange={(e) => onChange({ ...data, videoPrompt: e.target.value })}
        />
      )}

      {type === 'video' && (
        <div className="flex space-x-2">
          <input
            type="number"
            placeholder="Speed"
            className="w-1/2 p-2 rounded bg-gray-50 border border-gray-300 text-gray-900 text-sm"
            value={data.pageVideoSpeedMultiplier || ''}
            onChange={(e) => onChange({ ...data, pageVideoSpeedMultiplier: parseFloat(e.target.value) })}
          />
          <input
            type="number"
            placeholder="Cutoff (s)"
            className="w-1/2 p-2 rounded bg-gray-50 border border-gray-300 text-gray-900 text-sm"
            value={data.pageVideoCutoffSecs || ''}
            onChange={(e) => onChange({ ...data, pageVideoCutoffSecs: parseFloat(e.target.value) })}
          />
        </div>
      )}

      <div className="flex-grow flex items-center justify-center bg-gray-100 rounded border border-gray-300 overflow-hidden relative h-32">
        {type === 'image' && (data.imageUrl || data.referenceImageUrl) ? (
          <>
            <img 
              src={data.imageUrl || data.referenceImageUrl} 
              className={`max-w-full max-h-full object-contain cursor-pointer ${!data.imageUrl ? 'opacity-60' : ''}`} 
              onClick={() => setPreviewImage(data.imageUrl || data.referenceImageUrl!)} 
            />
            {!data.imageUrl && data.referenceImageUrl && (
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                Reference Image
              </div>
            )}
            {data.imageHistory && data.imageHistory.length > 1 && (
              <div className="absolute bottom-2 right-2 flex space-x-1 bg-black/50 rounded p-1">
                 <button onClick={handlePrevImage} disabled={data.imageHistoryIndex === 0} className="text-white px-2 disabled:opacity-30">&lt;</button>
                 <span className="text-white text-xs px-1">{(data.imageHistoryIndex || 0) + 1} / {data.imageHistory.length}</span>
                 <button onClick={handleNextImage} disabled={data.imageHistoryIndex === data.imageHistory.length - 1} className="text-white px-2 disabled:opacity-30">&gt;</button>
              </div>
            )}
          </>
        ) : type === 'video' && data.videoUrl ? (
          <video src={data.videoUrl} className="max-w-full max-h-full" controls loop muted />
        ) : (
          <span className="text-gray-400">No Media</span>
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white text-2xl font-bold p-2 bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/80" onClick={() => setPreviewImage(null)}>&times;</button>
        </div>
      )}
    </div>
  );
};

const ItemMediaPlaceholder: React.FC<{
  index: number,
  node: SceneNode,
  data: MediaData,
  onChange: (val: MediaData) => void
}> = ({ index, node, data, onChange }) => {
  const { setStatus, addErrorLog } = useAppStore();
  const [isSearching, setIsSearching] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Default query to node.itemName if not set
  const query = data.searchQuery !== undefined ? data.searchQuery : node.itemName;

  const handleSearch = async () => {
    if (!query.trim()) {
      alert("Please enter a search query.");
      return;
    }
    setIsSearching(true);
    setStatus(true, 10, `Searching images for Placeholder ${index + 1}...`);
    try {
      const res = await fetch('http://localhost:3012/api/search-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }
      
      const json = await res.json();
      if (json.urls && json.urls.length > 0) {
        onChange({
          ...data,
          searchQuery: query,
          imageUrl: json.urls[0],
          imageHistory: json.urls,
          imageHistoryIndex: 0
        });
        setStatus(false, 100, `Found images for Placeholder ${index + 1}.`);
      } else {
        alert("No images found on DuckDuckGo.");
        setStatus(false, 100, "No images found.");
      }
    } catch (e: any) {
      console.error(e);
      addErrorLog(`Search failed for Placeholder ${index + 1}`, e.message);
      setStatus(false, 0, 'Search Error');
      alert(`Error searching: ${e.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePrevImage = () => {
    if (data.imageHistory && data.imageHistoryIndex !== undefined && data.imageHistoryIndex > 0) {
      const newIndex = data.imageHistoryIndex - 1;
      onChange({ ...data, imageUrl: data.imageHistory[newIndex], imageHistoryIndex: newIndex });
    }
  };

  const handleNextImage = () => {
    if (data.imageHistory && data.imageHistoryIndex !== undefined && data.imageHistory.length > 0 && data.imageHistoryIndex < data.imageHistory.length - 1) {
      const newIndex = data.imageHistoryIndex + 1;
      onChange({ ...data, imageUrl: data.imageHistory[newIndex], imageHistoryIndex: newIndex });
    }
  };

  const handleDelete = () => {
    if (!data.imageUrl) return;
    
    // Remove the current image from history if it exists there
    const history = data.imageHistory || [];
    const indexToDelete = data.imageHistoryIndex !== undefined ? data.imageHistoryIndex : history.indexOf(data.imageUrl);
    
    let newHistory = [...history];
    if (indexToDelete !== -1) {
      newHistory.splice(indexToDelete, 1);
    }
    
    if (newHistory.length === 0) {
      // If the only image is deleted
      onChange({
        ...data,
        imageUrl: undefined,
        imageHistory: [],
        imageHistoryIndex: undefined
      });
    } else {
      // Load previous or next image
      const newIndex = indexToDelete < newHistory.length ? indexToDelete : newHistory.length - 1;
      onChange({
        ...data,
        imageUrl: newHistory[newIndex],
        imageHistory: newHistory,
        imageHistoryIndex: newIndex
      });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('media', file);
      
      try {
        setStatus(true, 30, "Uploading image...");
        const res = await fetch('http://localhost:3012/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        
        const json = await res.json();
        const history = data.imageHistory || [];
        const newHistory = [...history, json.url];
        
        onChange({
          ...data,
          searchQuery: query,
          imageUrl: json.url,
          imageHistory: newHistory,
          imageHistoryIndex: newHistory.length - 1
        });
        setStatus(false, 100, "Upload successful.");
      } catch (e: any) {
        console.error(e);
        addErrorLog('Upload failed', e.message);
        setStatus(false, 0, 'Upload Error');
        alert(`Upload failed: ${e.message}`);
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded border border-gray-300 flex flex-col space-y-3 relative">
      <div className="flex justify-between items-center">
        <span className="text-gray-900 font-bold">Placeholder {index + 1}</span>
        <div className="flex space-x-2">
          <label className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 cursor-pointer flex items-center justify-center" title="Upload">
            <Upload size={16} />
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
          </label>
          <button 
            onClick={handleDelete} 
            disabled={!data.imageUrl}
            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" 
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <label className="text-gray-400 text-xs mb-0.5">Search Query</label>
        <div className="flex space-x-2">
          <input
            type="text"
            className="p-2 rounded bg-gray-50 border border-gray-300 text-gray-900 text-sm flex-grow focus:outline-none focus:border-blue-500"
            placeholder="Search query..."
            value={query}
            onChange={(e) => onChange({ ...data, searchQuery: e.target.value })}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold flex items-center justify-center disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center bg-gray-100 rounded border border-gray-300 overflow-hidden relative h-32">
        {data.imageUrl ? (
          <>
            <img 
              src={data.imageUrl} 
              className="max-w-full max-h-full object-contain cursor-pointer" 
              onClick={() => setPreviewImage(data.imageUrl!)} 
            />
            {data.imageHistory && data.imageHistory.length > 1 && (
              <div className="absolute bottom-2 right-2 flex space-x-1 bg-black/60 rounded p-1 items-center">
                 <button 
                   onClick={handlePrevImage} 
                   disabled={data.imageHistoryIndex === 0} 
                   className="text-white px-2 disabled:opacity-30 hover:text-blue-300 font-bold"
                 >
                   &lt;
                 </button>
                 <span className="text-white text-xs px-1 select-none font-semibold">
                   {(data.imageHistoryIndex || 0) + 1} / {data.imageHistory.length}
                 </span>
                 <button 
                   onClick={handleNextImage} 
                   disabled={data.imageHistoryIndex === data.imageHistory.length - 1} 
                   className="text-white px-2 disabled:opacity-30 hover:text-blue-300 font-bold"
                 >
                   &gt;
                 </button>
              </div>
            )}
          </>
        ) : (
          <span className="text-gray-400">No Image</span>
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white text-2xl font-bold p-2 bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/80" onClick={() => setPreviewImage(null)}>&times;</button>
        </div>
      )}
    </div>
  );
};
