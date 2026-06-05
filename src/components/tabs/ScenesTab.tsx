import React, { useState, useEffect } from 'react';
import { useAppStore, SceneNode, SceneSubNode, MediaData } from '../../store';
import { generateJson, generateImage } from '../../services/gemini';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, RefreshCw, Wand2, Upload, Video, Play, Image as ImageIcon } from 'lucide-react';
import { AssetManager } from '../../services/AssetManager';

export const ScenesTab: React.FC = () => {
  const { 
    sceneNodes, setSceneNodes, countdownItems, productResearch, textModel, 
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
Identify 3 main review categories (e.g., Performance, Design, Value).
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
                  name: { type: "STRING" },
                  description: { type: "STRING", description: "20 words category description" },
                  howWeScore: { type: "STRING", description: "20 words how we score" },
                  details: { type: "STRING" },
                  score: { type: "NUMBER" }
                },
                required: ["name", "description", "howWeScore", "details", "score"]
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
          subNodes.push({
            id: uuidv4(),
            type: 'category',
            name: cat.name,
            description: cat.description,
            howWeScore: cat.howWeScore,
            details: cat.details,
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
          subNodes: subNodes
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
  const { updateSceneNode } = useAppStore();

  const handleChange = (field: keyof SceneNode, value: string) => {
    updateSceneNode(node.id, { [field]: value });
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

  const handleGenerateImage = async () => {
    if (!data.imagePrompt) return;
    setIsProcessing(true);
    setStatus(true, 10, `Generating ${label}...`);
    try {
      const url = await generateImage(data.imagePrompt);
      onChange({ ...data, imageUrl: url });
      setStatus(false, 100, `${label} generated.`);
    } catch (e: any) {
      addErrorLog(`Failed to generate ${label}`, e.message);
      setStatus(false, 0, 'Error');
    } finally {
      setIsProcessing(false);
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
          onChange({ ...data, imageUrl: json.url });
        } else {
          onChange({ ...data, videoUrl: json.url });
        }
      } catch (e: any) {
        addErrorLog('Upload failed', e.message);
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded border border-gray-300 flex flex-col space-y-3">
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
        <textarea
          className="p-2 rounded bg-gray-50 border border-gray-300 text-gray-900 text-sm h-20"
          placeholder="Image Prompt..."
          value={data.imagePrompt || ''}
          onChange={(e) => onChange({ ...data, imagePrompt: e.target.value })}
        />
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

      <div className="flex-grow flex items-center justify-center bg-gray-100 rounded border border-gray-300 overflow-hidden min-h-[150px]">
        {type === 'image' && data.imageUrl ? (
          <img src={data.imageUrl} className="max-w-full max-h-full object-contain" />
        ) : type === 'video' && data.videoUrl ? (
          <video src={data.videoUrl} className="max-w-full max-h-full" controls loop muted />
        ) : (
          <span className="text-gray-400">No Media</span>
        )}
      </div>
    </div>
  );
};
