import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { generateJson } from '../../services/gemini';
import { v4 as uuidv4 } from 'uuid';

export const CountdownDetailsTab: React.FC = () => {
  const { productResearch, textModel, countdownItems, setCountdownItems, setStatus, addErrorLog } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!productResearch.researchDump) {
      alert('Please provide a Product Research Dump in the first tab.');
      return;
    }

    setIsGenerating(true);
    setStatus(true, 10, 'Generating countdown details...');
    try {
      const prompt = `Read the following Product Research dump for ${productResearch.productName} - ${productResearch.productDescription}.
Identify the top products mentioned, and assign them a score (from 0 to 10) based on the research provided.
Sort the products in descending order by their score.
      
Research Dump:
${productResearch.researchDump}`;

      const schema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "The name of the product" },
            score: { type: "NUMBER", description: "The overall score from 0 to 10" },
          },
          required: ["name", "score"]
        }
      };

      const result = await generateJson<{name: string, score: number}[]>(
        prompt, 
        schema, 
        "You are an expert product reviewer assistant.", 
        textModel
      );

      const newItems = result.map(item => ({
        id: uuidv4(),
        name: item.name,
        score: item.score
      }));

      // Sort by score descending just in case the LLM didn't
      newItems.sort((a, b) => b.score - a.score);

      setCountdownItems(newItems);
      setStatus(false, 100, 'Countdown details generated successfully.');
    } catch (e: any) {
      console.error(e);
      addErrorLog('Failed to generate countdown details', e.message);
      setStatus(false, 0, 'Error generating details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">Countdown Details</h2>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate Countdown Details'}
        </button>
      </div>

      <div className="flex flex-col space-y-2 overflow-y-auto">
        {countdownItems.length === 0 ? (
          <p className="text-gray-600 italic">No countdown items generated yet.</p>
        ) : (
          countdownItems.map((item, index) => (
            <div key={item.id} className="bg-white p-4 rounded border border-gray-300 flex justify-between items-center">
              <div>
                <span className="text-gray-600 font-bold mr-4">#{index + 1}</span>
                <span className="text-lg font-medium text-gray-900">{item.name}</span>
              </div>
              <div className="text-blue-600 font-bold text-xl">
                Score: {item.score}/10
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
