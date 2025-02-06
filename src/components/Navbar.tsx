import { Link } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Home, Wallet, TrendingUp, Search } from "lucide-react";
import logo from "../assets/images/2.svg";

export function Navbar() {
  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img
                src={logo}
                alt="Bull Arc Logo"
                className="h-12 w-auto object-contain"
                style={{ maxWidth: "150px" }}
              />
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-1">
              <Link
                to="/"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Home size={20} />
                <span>Home</span>
              </Link>
              <Link
                to="/portfolio"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Wallet size={20} />
                <span>Portfolio</span>
              </Link>
              <Link
                to="/trending"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <TrendingUp size={20} />
                <span>Trending</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Create Coin Button */}
            <Link
              to="/create"
              className="flex items-center px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg font-medium transition-colors"
            >
              <span className="mr-1">+</span> Create Coin
            </Link>

            {/* Search Bar */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search cryptocurrencies"
                className="pl-10 pr-4 py-2 w-64 rounded-lg border border-gray-200 dark:border-gray-700 
                         dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 
                         focus:ring-blue-500"
              />
            </div>

            {/* Wallet Button */}
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
