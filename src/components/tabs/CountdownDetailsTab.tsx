import React, { useState } from 'react';
import { useAppStore, CountdownItem, Category } from '../../store';
import { generateJson } from '../../services/gemini';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, Plus } from 'lucide-react';

export const CountdownDetailsTab: React.FC = () => {
  const { 
    productResearch, textModel, 
    countdownItems, setCountdownItems, 
    categories, setCategories, 
    guidingPrompt, setGuidingPrompt,
    setStatus, addErrorLog 
  } = useAppStore();
  
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!productResearch.researchDump) {
      alert('Please provide a Product Research Dump in the first tab.');
      return;
    }

    setIsGenerating(true);
    setStatus(true, 10, 'Generating countdown items and categories...');
    try {
      const prompt = `Read the following Product Research dump for ${productResearch.productName} - ${productResearch.productDescription}.
      
INSTRUCTIONS:
1. Identify and extract ALL distinct products mentioned in the research dump. DO NOT SKIP ANY. Assign them a score (from 0 to 10) based on the research. Sort the products in descending order by their score.
2. Identify and explicitly list exactly 4-7 review criteria/categories based on the dump (e.g. Performance, Design, Value). For each category, provide a name, a 20-word description, and a 20-word explanation of "how we score" it. YOU MUST PROVIDE THESE CATEGORIES.
3. Ensure your output strictly adheres to the requested JSON schema, containing both the 'items' array and 'categories' array.
${guidingPrompt ? `\nADDITIONAL GUIDING PROMPT FROM USER:\n${guidingPrompt}` : ''}

Research Dump:
${productResearch.researchDump}`;

      const schema = {
        type: "OBJECT",
        properties: {
          items: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING", description: "The name of the product" },
                score: { type: "NUMBER", description: "The overall score from 0 to 10" },
              },
              required: ["name", "score"]
            }
          },
          categories: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                description: { type: "STRING", description: "20 words category description" },
                howWeScore: { type: "STRING", description: "20 words how we score" }
              },
              required: ["name", "description", "howWeScore"]
            }
          }
        },
        required: ["items", "categories"]
      };

      const result = await generateJson<{
        items: {name: string, score: number}[],
        categories: {name: string, description: string, howWeScore: string}[]
      }>(
        prompt, 
        schema, 
        "You are an expert product reviewer assistant.", 
        textModel
      );

      const rawItems = result.items || [];
      const newItems = rawItems.map(item => ({
        id: uuidv4(),
        name: item.name,
        score: item.score
      }));
      newItems.sort((a, b) => b.score - a.score);

      const rawCategories = result.categories || [];
      const newCategories = rawCategories.map(cat => ({
        id: uuidv4(),
        name: cat.name,
        description: cat.description,
        howWeScore: cat.howWeScore
      }));

      setCountdownItems(newItems);
      setCategories(newCategories);
      setStatus(false, 100, 'Details generated successfully.');
    } catch (e: any) {
      console.error(e);
      addErrorLog('Failed to generate countdown details', e.message);
      setStatus(false, 0, 'Error generating details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateItem = (id: string, updates: Partial<CountdownItem>) => {
    setCountdownItems(countdownItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id: string) => {
    setCountdownItems(countdownItems.filter(item => item.id !== id));
  };

  const addItem = () => {
    setCountdownItems([...countdownItems, { id: uuidv4(), name: 'New Product', score: 0 }]);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(categories.map(cat => cat.id === id ? { ...cat, ...updates } : cat));
  };

  const removeCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const addCategory = () => {
    setCategories([...categories, { id: uuidv4(), name: 'New Category', description: '', howWeScore: '' }]);
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-semibold text-gray-900">Countdown Details</h2>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate Countdown Details'}
        </button>
      </div>

      <div className="bg-white p-4 rounded border border-gray-300 shadow-sm shrink-0">
        <label className="block text-gray-700 font-bold mb-2">Guiding Prompt (Optional)</label>
        <textarea
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-y text-gray-900"
          rows={3}
          placeholder="e.g. Only extract laptops that cost over $1000 and ensure one of the categories is 'Portability'."
          value={guidingPrompt}
          onChange={(e) => setGuidingPrompt(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-8 mt-4">
        {/* Items Section */}
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">Countdown Items</h3>
            <button onClick={addItem} className="flex items-center gap-1 text-sm bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">
              <Plus size={16} /> Add Item
            </button>
          </div>
          
          <div className="flex flex-col space-y-2">
            {countdownItems.length === 0 ? (
              <p className="text-gray-600 italic">No countdown items generated yet.</p>
            ) : (
              countdownItems.map((item, index) => (
                <div key={item.id} className="bg-white p-4 rounded border border-gray-300 flex flex-col gap-2 relative">
                  <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center gap-2 mr-6">
                    <span className="text-gray-600 font-bold w-6">#{index + 1}</span>
                    <input 
                      className="flex-grow p-1 border-b border-gray-300 focus:border-blue-500 outline-none font-medium text-gray-900" 
                      value={item.name} 
                      onChange={(e) => updateItem(item.id, { name: e.target.value })} 
                    />
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        className="w-16 p-1 border-b border-gray-300 focus:border-blue-500 outline-none text-blue-600 font-bold text-center" 
                        value={item.score} 
                        onChange={(e) => updateItem(item.id, { score: parseFloat(e.target.value) || 0 })} 
                      />
                      <span className="text-gray-500">/10</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Categories Section */}
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">Review Categories</h3>
            <button onClick={addCategory} className="flex items-center gap-1 text-sm bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">
              <Plus size={16} /> Add Category
            </button>
          </div>
          
          <div className="flex flex-col space-y-2">
            {categories.length === 0 ? (
              <p className="text-gray-600 italic">No categories generated yet.</p>
            ) : (
              categories.map((cat, index) => (
                <div key={cat.id} className="bg-white p-4 rounded border border-gray-300 flex flex-col gap-2 relative">
                  <button onClick={() => removeCategory(cat.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                  <div className="flex flex-col gap-2 mr-6">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-bold">{index + 1}.</span>
                      <input 
                        className="flex-grow p-1 border-b border-gray-300 focus:border-blue-500 outline-none font-medium text-gray-900" 
                        value={cat.name} 
                        onChange={(e) => updateCategory(cat.id, { name: e.target.value })} 
                        placeholder="Category Name"
                      />
                    </div>
                    <input 
                      className="w-full p-1 border-b border-gray-300 focus:border-blue-500 outline-none text-sm text-gray-700" 
                      value={cat.description} 
                      onChange={(e) => updateCategory(cat.id, { description: e.target.value })} 
                      placeholder="20 word description"
                    />
                    <input 
                      className="w-full p-1 border-b border-gray-300 focus:border-blue-500 outline-none text-sm text-gray-700" 
                      value={cat.howWeScore} 
                      onChange={(e) => updateCategory(cat.id, { howWeScore: e.target.value })} 
                      placeholder="How we score"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
