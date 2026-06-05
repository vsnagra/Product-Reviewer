import React from 'react';
import { useAppStore } from '../../store';

export const ProductResearchTab: React.FC = () => {
  const { productResearch, setProductResearch } = useAppStore();

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900">Product Research</h2>

      <div className="flex flex-col space-y-4 max-w-4xl">
        <div className="flex flex-col">
          <label className="text-gray-700 mb-1 text-sm font-medium">Product Category / Name</label>
          <input
            type="text"
            className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500"
            value={productResearch.productName}
            onChange={(e) => setProductResearch({ productName: e.target.value })}
            placeholder="e.g. Best Gaming Laptops 2026"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-gray-700 mb-1 text-sm font-medium">Product Description</label>
          <input
            type="text"
            className="p-2 rounded bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-500"
            value={productResearch.productDescription}
            onChange={(e) => setProductResearch({ productDescription: e.target.value })}
            placeholder="e.g. A comparison of top gaming laptops based on performance and price."
          />
        </div>

        <div className="flex flex-col flex-grow">
          <label className="text-gray-700 mb-1 text-sm font-medium">Product Research Dump</label>
          <textarea
            className="p-3 rounded bg-white border border-gray-300 text-gray-900 h-96 font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
            value={productResearch.researchDump}
            onChange={(e) => setProductResearch({ researchDump: e.target.value })}
            placeholder="Paste raw research details, specs, and reviews here..."
          />
        </div>
      </div>
    </div>
  );
};
