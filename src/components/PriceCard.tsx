import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { CryptoData } from '../types';

interface PriceCardProps {
  crypto: CryptoData;
  onClick: () => void;
}

export function PriceCard({ crypto, onClick }: PriceCardProps) {
  const isPositive = crypto.price_change_percentage_24h >= 0;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl 
                 transition-shadow cursor-pointer border border-gray-100 dark:border-gray-700"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{crypto.name}</h3>
        <span className="text-gray-500 dark:text-gray-400 uppercase">{crypto.symbol}</span>
      </div>
      
      <div className="flex justify-between items-end">
        <div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${crypto.current_price.toLocaleString()}
          </p>
          <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span className="font-medium">
              {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Volume</p>
          <p className="font-medium text-gray-700 dark:text-gray-300">
            ${crypto.total_volume.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}