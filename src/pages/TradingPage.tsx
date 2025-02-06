import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Chart } from "../components/Chart";
import { PriceCard } from "../components/PriceCard";
import { CryptoData, ChartData } from "../types";
import { tradingService } from "../services/tradingService";
import { toast } from "react-hot-toast";

export const TradingPage: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [balance, setBalance] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);

  // Initialize demo account
  useEffect(() => {
    const userId = "demo-user"; // In a real app, this would come from authentication
    tradingService.initializeAccount(userId);
    setBalance(tradingService.getBalance(userId));
  }, []);

  // Update position when symbol changes
  useEffect(() => {
    if (symbol) {
      const userId = "demo-user";
      setPosition(tradingService.getPosition(userId, symbol));
    }
  }, [symbol]);

  // Simulated price data - in a real app, this would come from an API
  useEffect(() => {
    // Simulate real-time price updates
    const interval = setInterval(() => {
      const currentPrice = cryptoData?.current_price || 1000;
      const randomChange = (Math.random() - 0.5) * (currentPrice * 0.02); // 2% max change
      const newPrice = currentPrice + randomChange;

      setCryptoData((prev) =>
        prev
          ? {
              ...prev,
              current_price: newPrice,
              price_change_percentage_24h: (randomChange / currentPrice) * 100,
            }
          : {
              id: symbol || "btc",
              symbol: symbol || "BTC",
              name: "Bitcoin",
              current_price: newPrice,
              price_change_percentage_24h: 0,
              market_cap: 1000000000,
              total_volume: 50000000,
            }
      );

      setChartData((prev) =>
        [
          ...prev,
          {
            time: new Date().toISOString(),
            value: newPrice,
          },
        ].slice(-100)
      ); // Keep last 100 data points
    }, 3000);

    return () => clearInterval(interval);
  }, [symbol, cryptoData?.current_price]);

  const handleTrade = () => {
    if (!amount || !cryptoData) return;

    const userId = "demo-user";
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const result = tradingService.executeTrade(
      userId,
      cryptoData,
      parsedAmount,
      orderType === "buy"
    );

    if (result.success) {
      toast.success(result.message);
      setBalance(tradingService.getBalance(userId));
      setPosition(tradingService.getPosition(userId, cryptoData.symbol));
      setAmount("");
    } else {
      toast.error(result.message);
    }
  };

  if (!cryptoData) {
    return (
      <div className="flex justify-center items-center h-96">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {cryptoData.name} ({cryptoData.symbol.toUpperCase()})
            </h2>
            <PriceCard crypto={cryptoData} onClick={() => {}} />
          </div>
          <div className="h-[400px]">
            <Chart data={chartData} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Your Balance
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${balance.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Position: {position} {cryptoData.symbol.toUpperCase()}
            </p>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Trade {cryptoData.symbol.toUpperCase()}
          </h3>

          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setOrderType("buy")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                  orderType === "buy"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setOrderType("sell")}
                className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                  orderType === "sell"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                Sell
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount ({cryptoData.symbol.toUpperCase()})
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                         dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 
                         focus:ring-blue-500"
                placeholder="0.00"
                min="0"
                step="0.000001"
              />
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total:{" "}
              {amount
                ? (parseFloat(amount) * cryptoData.current_price).toFixed(2)
                : "0.00"}{" "}
              USD
            </div>

            <button
              onClick={handleTrade}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
                orderType === "buy"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {orderType === "buy" ? "Buy" : "Sell"}{" "}
              {cryptoData.symbol.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
