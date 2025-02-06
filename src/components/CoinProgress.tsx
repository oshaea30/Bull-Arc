import React from "react";
import { ExternalLink, TrendingUp, Users, DollarSign } from "lucide-react";
import { TokenPriceChart } from "./TokenPriceChart";

interface CoinProgressProps {
  coin: {
    name: string;
    symbol: string;
    address: string;
    createdAt: string;
    progress: number;
    holders: number;
    volume: number;
    currentPrice: number;
    poolId?: string;
  };
}

export function CoinProgress({ coin }: CoinProgressProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const solscanUrl = `https://solscan.io/token/${coin.address}?cluster=devnet&utm_source=cryptopump`;

  return (
    <div className="space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {coin.name} ({coin.symbol})
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Created {new Date(coin.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Current Price
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ${coin.currentPrice.toFixed(6)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
          <div className="mt-1 relative pt-1">
            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
              <div
                style={{ width: `${coin.progress}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
              />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
              {coin.progress}%
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Holders</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {coin.holders.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Volume</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            ${coin.volume.toLocaleString()}
          </p>
        </div>
      </div>

      {coin.poolId && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Price Chart
          </h4>
          <TokenPriceChart tokenAddress={coin.address} poolId={coin.poolId} />
        </div>
      )}

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Token Address
        </p>
        <p className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
          {coin.address}
        </p>
      </div>
    </div>
  );
}
