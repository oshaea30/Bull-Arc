import React from 'react';
import { Sparkles } from 'lucide-react';

interface TrendingCoin {
  name: string;
  symbol: string;
  change: string;
  volume: string;
  positive: boolean;
}

const trendingCoins: TrendingCoin[] = [
  {
    name: "Bonk",
    symbol: "BONK",
    change: "+42.69%",
    volume: "$12,420,000",
    positive: true
  },
  {
    name: "Myro",
    symbol: "MYRO",
    change: "+89.34%",
    volume: "$8,234,567",
    positive: true
  },
  {
    name: "Book of Meme",
    symbol: "BOME",
    change: "+156.42%",
    volume: "$4,201,337",
    positive: true
  }
];

export function TrendingSection() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="text-yellow-500" size={20} />
        <h2 className="text-xl font-bold dark:text-white">Trending Now</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trendingCoins.map((coin) => (
          <div
            key={coin.symbol}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
          >
            <div>
              <h3 className="font-bold dark:text-white">{coin.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">${coin.symbol}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold ${
                coin.positive ? 'text-green-500' : 'text-red-500'
              }`}>
                {coin.change}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Vol: {coin.volume}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}