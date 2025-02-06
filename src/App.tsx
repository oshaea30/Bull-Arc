import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Search,
  Moon,
  Sun,
  Plus,
  Home,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "./components/WalletButton";
import { BurnerWalletBanner } from "./components/BurnerWalletBanner";
import { HomePage } from "./pages/HomePage";
import TrendingPage from "./pages/TrendingPage";
import { CreateCoin } from "./components/CreateCoin";
import { Toaster } from "react-hot-toast";
import Portfolio from "./pages/Portfolio";
import logo from "./assets/images/2.svg";
import { validateConfig } from "./config";
import Router from "./Router";

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("darkMode");
    return savedMode ? JSON.parse(savedMode) : false;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateCoin, setShowCreateCoin] = useState(false);
  const { connected } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      validateConfig();
    } catch (error) {
      console.error("Configuration Error:", error);
      // You might want to show this in the UI or handle it differently in production
      if (import.meta.env.DEV) {
        alert(
          "Missing required environment variables. Check the console for details."
        );
      }
    }
  }, []);

  const NavLink = ({
    to,
    icon: Icon,
    text,
  }: {
    to: string;
    icon: React.ElementType;
    text: string;
  }) => {
    const isActive = location.pathname === to;

    return (
      <Link
        to={to}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                  ${
                    isActive
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
      >
        <Icon size={20} />
        <span className="hidden md:inline">{text}</span>
      </Link>
    );
  };

  return (
    <div
      className={`min-h-screen ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}
    >
      <Toaster position="top-right" />
      <BurnerWalletBanner />
      <nav className="bg-white dark:bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center">
                <img src={logo} alt="Bull Arc" className="h-16 w-auto" />
              </Link>
              <div className="hidden sm:flex items-center gap-2 ml-6">
                <NavLink to="/" icon={Home} text="Home" />
                <NavLink to="/portfolio" icon={Wallet} text="Portfolio" />
                <NavLink to="/trending" icon={TrendingUp} text="Trending" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              {connected && (
                <button
                  onClick={() => {
                    setShowCreateCoin(true);
                    navigate("/create");
                  }}
                  className="flex items-center h-10 px-4 text-sm font-medium
                           bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]
                           dark:from-[#6366F1] dark:to-[#8B5CF6]
                           text-white rounded-lg transition-all duration-200
                           hover:opacity-90 focus:outline-none focus:ring-2 
                           focus:ring-blue-500 focus:ring-offset-2"
                >
                  <div className="flex items-center gap-2">
                    <Plus size={20} className="stroke-2" />
                    <span className="hidden sm:block">Create Coin</span>
                  </div>
                </button>
              )}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search cryptocurrencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                           dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 
                           focus:ring-blue-500"
                />
              </div>
              <WalletButton />
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {darkMode ? (
                  <Sun className="text-gray-200" />
                ) : (
                  <Moon className="text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<HomePage searchTerm={searchTerm} />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/trending" element={<TrendingPage />} />
          <Route
            path="/create"
            element={
              connected ? (
                <div className="space-y-6">
                  <button
                    onClick={() => {
                      setShowCreateCoin(false);
                      navigate(-1);
                    }}
                    className="text-blue-600 dark:text-blue-400 font-medium"
                  >
                    ← Back
                  </button>
                  <CreateCoin />
                </div>
              ) : (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Connect your wallet to create coins
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">
                    You need to connect your Solana wallet to create meme coins
                  </p>
                  <WalletButton />
                </div>
              )
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
