import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Rocket,
  Shield,
  Coins,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PriceCard } from "../components/PriceCard";
import { Chart } from "../components/Chart";
import { getFeaturedCoins } from "../services/cryptoService";
import type { CryptoData, ChartData } from "../types";
import discordLogo from "../assets/images/discord-mark-white.svg";

const mockChartData: ChartData[] = Array.from({ length: 100 }, (_, i) => ({
  time: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  value: 50000 + Math.random() * 20000,
}));

const features = [
  {
    icon: Rocket,
    title: "Launch Your Token",
    description:
      "Create and deploy your token in minutes with our easy-to-use platform",
    gradient: "from-purple-500 to-blue-500",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description:
      "Built on Solana for lightning-fast transactions and maximum security",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Coins,
    title: "Fair Launch",
    description:
      "Transparent tokenomics and fair distribution for all participants",
    gradient: "from-cyan-500 to-green-500",
  },
];

const statistics = [
  {
    label: "Total Volume",
    value: "$420M+",
    description: "Total trading volume",
    gradient: "from-purple-500 to-blue-500",
  },
  {
    label: "Active Users",
    value: "50K+",
    description: "Monthly active traders",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    label: "Tokens Created",
    value: "1000+",
    description: "Successful launches",
    gradient: "from-cyan-500 to-green-500",
  },
  {
    label: "Average ROI",
    value: "250%",
    description: "For completed curves",
    gradient: "from-green-500 to-yellow-500",
  },
];

export function HomePage({ searchTerm }: { searchTerm: string }) {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);
  const [featuredCoins, setFeaturedCoins] = useState<CryptoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { connected } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await getFeaturedCoins();
        setFeaturedCoins(data);
        setError(null);
      } catch (err) {
        setError("Failed to load cryptocurrency data");
        console.error("Error fetching featured coins:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredCoins = featuredCoins.filter(
    (crypto) =>
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedCrypto) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedCrypto(null)}
          className="text-blue-600 dark:text-blue-400 font-medium"
        >
          ← Back to all cryptocurrencies
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold dark:text-white">
                {selectedCrypto.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 uppercase">
                {selectedCrypto.symbol}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold dark:text-white">
                ${selectedCrypto.current_price.toLocaleString()}
              </p>
              <p
                className={`text-lg font-medium ${
                  selectedCrypto.price_change_percentage_24h >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {selectedCrypto.price_change_percentage_24h >= 0 ? "+" : ""}
                {selectedCrypto.price_change_percentage_24h.toFixed(2)}%
              </p>
            </div>
          </div>
          <Chart data={mockChartData} containerClassName="w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section with animated gradient background */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-purple-700 p-8 md:p-12">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30 animate-gradient-x"></div>

        {/* Floating shapes */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-12 h-12 bg-white/5 rounded-lg transform rotate-45 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${15 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>

        <div className="relative text-center space-y-6 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            Launch Your Token on{" "}
            <span className="relative">
              <span className="relative z-10">Solana</span>
              <span className="absolute bottom-0 left-0 w-full h-3 bg-blue-400/30 -rotate-2"></span>
            </span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            The most powerful and intuitive platform for creating and launching
            tokens on the Solana blockchain
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate("/create")}
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg
                       hover:bg-blue-50 transform hover:scale-105 transition-all duration-200
                       shadow-lg hover:shadow-xl"
            >
              Create Token
            </button>
            <button
              onClick={() => navigate("/trending")}
              className="px-8 py-4 bg-blue-500/20 text-white rounded-xl font-bold text-lg
                       hover:bg-blue-500/30 backdrop-blur-sm transform hover:scale-105
                       transition-all duration-200 border border-white/20"
            >
              View Trending
            </button>
          </div>
        </div>
      </div>

      {/* Featured Coins */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="text-yellow-500" size={24} />
            <h2 className="text-2xl font-bold dark:text-white">
              Featured Tokens
            </h2>
          </div>
          <a
            href="/trending"
            className="group flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all
            <ChevronRight
              size={16}
              className="transform group-hover:translate-x-1 transition-transform"
            />
          </a>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 dark:text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoins.map((crypto) => (
              <PriceCard
                key={crypto.id}
                crypto={crypto}
                onClick={() => setSelectedCrypto(crypto)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Statistics Section */}
      <div className="relative py-12">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-3xl" />
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {statistics.map((stat) => (
              <div
                key={stat.label}
                className="group hover:scale-105 transition-all duration-300"
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
                  {/* Gradient background that shows on hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 
                                group-hover:opacity-5 transition-opacity duration-300`}
                  />
                  <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </dt>
                  <dd className="mt-2">
                    <span
                      className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                                   bg-clip-text text-transparent"
                    >
                      {stat.value}
                    </span>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {stat.description}
                    </p>
                  </dd>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12">
        <h2 className="text-3xl font-bold text-center mb-12 dark:text-white">
          Why Choose{" "}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Bull Arc
          </span>
          ?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group hover:scale-105 transition-all duration-300"
            >
              <div className="relative h-full bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg overflow-hidden">
                {/* Gradient background that shows on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 
                              group-hover:opacity-5 transition-opacity duration-300`}
                />

                <div className="relative z-10">
                  <div className="mb-6 relative">
                    <div
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} 
                                  flex items-center justify-center transform -rotate-6 
                                  group-hover:rotate-0 transition-transform duration-300`}
                    >
                      <feature.icon className="text-white w-8 h-8" />
                    </div>
                  </div>
                  <h3
                    className="text-xl font-bold mb-3 dark:text-white group-hover:text-blue-600 
                               dark:group-hover:text-blue-400 transition-colors"
                  >
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-purple-700/90 rounded-3xl" />
        <div
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80')] 
                      bg-cover bg-center opacity-10 rounded-3xl"
        />

        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8 max-w-6xl mx-auto px-8">
          <div className="flex-1 space-y-6 text-white">
            <h2 className="text-3xl md:text-4xl font-bold">
              Join Our <span className="text-white">Discord</span> Community
            </h2>
            <p className="text-lg text-blue-100 max-w-xl">
              Connect with the Bull Arc community, get early access to new
              features, and stay updated on the latest developments. Join
              thousands of creators shaping the future of Solana tokens!
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <a
                href="https://discord.gg/your-invite-link"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 text-lg font-medium text-white 
                         bg-[#5865F2] rounded-xl hover:bg-[#4752C4] transform hover:scale-105 
                         transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <img src={discordLogo} alt="Discord" className="w-5 h-5" />
                Join Discord
              </a>
              <span className="text-blue-200">
                🚀 Join our growing community!
              </span>
            </div>
          </div>

          <div className="relative flex-1 flex justify-center">
            <div className="w-72 h-72 relative">
              <div className="absolute inset-0 rounded-full bg-[#5865F2]/20 blur-3xl animate-pulse" />
              <div className="absolute inset-4 rounded-full bg-[#5865F2]/30 blur-2xl animate-pulse delay-100" />
              <div className="absolute inset-8 rounded-full bg-[#5865F2]/40 blur-xl animate-pulse delay-200" />
              <div className="absolute inset-0 flex items-center justify-center">
                <img src={discordLogo} alt="Discord" className="w-24 h-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
