
import React from 'react';
import { MarketIndex } from '../types';

interface MarketCardProps {
  index: MarketIndex;
}

const MarketCard: React.FC<MarketCardProps> = ({ index }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 hover:shadow-md transition-shadow">
      <div className="text-slate-500 text-sm mb-1">{index.name}</div>
      <div className={`text-2xl font-bold ${index.isUp ? 'text-red-500' : 'text-green-600'}`}>
        {index.value}
      </div>
      <div className={`text-sm mt-1 flex items-center space-x-2 ${index.isUp ? 'text-red-500' : 'text-green-600'}`}>
        <span>{index.isUp ? '▲' : '▼'} {index.change}</span>
        <span>({index.changePercent})</span>
      </div>
    </div>
  );
};

export default MarketCard;
