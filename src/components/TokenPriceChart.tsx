import React, { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Chart } from "./Chart";
import { PriceService } from "../services/priceService";
import { ChartData } from "../types";

interface TokenPriceChartProps {
  tokenAddress: string;
  poolId: string;
}

export function TokenPriceChart({
  tokenAddress,
  poolId,
}: TokenPriceChartProps) {
  const { connection } = useConnection();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [priceChange24h, setPriceChange24h] = useState<number>(0);
  const [volume24h, setVolume24h] = useState<number>(0);

  useEffect(() => {
    const priceService = PriceService.getInstance();

    // Start tracking price
    priceService.startTracking(connection, tokenAddress, poolId, () => {
      // Update chart data when price changes
      setChartData(priceService.getChartData(tokenAddress));
      setPriceChange24h(priceService.get24hPriceChange(tokenAddress));
      setVolume24h(priceService.get24hVolume(tokenAddress));
    });

    // Initial data load
    setChartData(priceService.getChartData(tokenAddress));
    setPriceChange24h(priceService.get24hPriceChange(tokenAddress));
    setVolume24h(priceService.get24hVolume(tokenAddress));

    // Cleanup
    return () => {
      priceService.stopTracking(tokenAddress);
    };
  }, [connection, tokenAddress, poolId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Price Change (24h)
          </p>
          <p
            className={`text-lg font-semibold ${
              priceChange24h >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {priceChange24h >= 0 ? "+" : ""}
            {priceChange24h.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Volume (24h)
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            ${volume24h.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        {chartData.length > 0 ? (
          <Chart data={chartData} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">
              Waiting for price data...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
