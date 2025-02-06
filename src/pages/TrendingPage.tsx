import React, { useState, useEffect } from "react";
import { Clock, TrendingUp, DollarSign } from "lucide-react";
import {
  getRecentTokens,
  getTopGainers,
  getMostActive,
  TrendingToken,
} from "../services/trendingService";

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const RETRY_DELAY = 10 * 1000; // 10 seconds

function TrendingPage() {
  const [recentTokens, setRecentTokens] = useState<TrendingToken[]>([]);
  const [topGainers, setTopGainers] = useState<TrendingToken[]>([]);
  const [mostActive, setMostActive] = useState<TrendingToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTrendingData = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      console.log("Fetching trending data...");
      const [recent, gainers, active] = await Promise.all([
        getRecentTokens(),
        getTopGainers(),
        getMostActive(),
      ]);

      console.log("Received data:", { recent, gainers, active });

      setRecentTokens(recent);
      setTopGainers(gainers);
      setMostActive(active);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading trending data:", error);
      setError(
        "Failed to load trending data. Please check your internet connection and try again."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadTrendingData();
  }, []);

  // Set up refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true);
      loadTrendingData(false);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    if (!isRefreshing && !isLoading) {
      setIsRefreshing(true);
      loadTrendingData(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(price);
  };

  const formatPercent = (percent: number) => {
    const formatted = percent.toFixed(2);
    const isPositive = percent >= 0;
    return (
      <span className={isPositive ? "text-green-500" : "text-red-500"}>
        {isPositive ? "+" : ""}
        {formatted}%
      </span>
    );
  };

  const TokenRow = ({ token }: { token: TrendingToken }) => (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
      <div className="flex items-center gap-4">
        <img
          src={token.image}
          alt={token.name}
          className="w-10 h-10 rounded-full"
          onError={(e) => {
            e.currentTarget.src = `https://via.placeholder.com/40/4F46E5/FFFFFF?text=${token.symbol.charAt(
              0
            )}`;
          }}
        />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {token.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {token.symbol}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
          <p className="font-semibold">{formatPrice(token.price)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">24h</p>
          <p className="font-semibold">{formatPercent(token.priceChange24h)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Volume</p>
          <p className="font-semibold">{formatPrice(token.volume24h)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Market Cap</p>
          <p className="font-semibold">{formatPrice(token.marketCap)}</p>
        </div>
        <a
          href={`https://www.coingecko.com/en/coins/${token.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-blue-500 hover:text-blue-600 transition-colors"
          title="View on CoinGecko"
        >
          <DollarSign className="w-4 h-4" />
        </a>
      </div>
    </div>
  );

  const Section = ({
    title,
    icon,
    tokens,
  }: {
    title: string;
    icon: React.ReactNode;
    tokens: TrendingToken[];
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            {icon}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
        </div>
        {isRefreshing && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Refreshing...
          </div>
        )}
      </div>
      <div className="space-y-2">
        {tokens.map((token) => (
          <TokenRow key={token.id} token={token} />
        ))}
        {tokens.length === 0 && !isLoading && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            No tokens found
          </p>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-gray-500 dark:text-gray-400">
                Loading trending tokens...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => loadTrendingData()}
            className="mt-2 text-sm text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200"
          >
            Try again
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Trending Tokens
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="text-blue-500 hover:text-blue-600 disabled:opacity-50"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <Section
        title="Recently Added"
        icon={<Clock className="w-5 h-5 text-blue-500" />}
        tokens={recentTokens}
      />

      <Section
        title="Top Gainers"
        icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
        tokens={topGainers}
      />

      <Section
        title="Most Active"
        icon={<DollarSign className="w-5 h-5 text-blue-500" />}
        tokens={mostActive}
      />
    </div>
  );
}

export default TrendingPage;
