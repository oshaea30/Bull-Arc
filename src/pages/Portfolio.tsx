import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getPortfolioTokens } from "../services/portfolioService";
import { PortfolioToken } from "../types/token";
import { tokenStorageService } from "../services/tokenStorageService";
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";

// Utility functions
const formatNumber = (num: number, decimals: number = 2) => {
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + "K";
  return num.toFixed(decimals);
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(price);
};

// Base components
const TokenImage = ({ token }: { token: PortfolioToken }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (token.metadata?.uri) {
      fetch(token.metadata.uri)
        .then((res) => res.json())
        .then((data) => {
          if (data.image) {
            setImageUrl(data.image);
          }
        })
        .catch((err) => {
          console.error("Failed to load token metadata:", err);
          setError(true);
        });
    }
  }, [token.metadata?.uri]);

  if (error || !imageUrl) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
        {token.metadata.symbol.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={token.metadata.name}
      className="w-10 h-10 rounded-full object-cover"
      onError={() => setError(true)}
    />
  );
};

// Add WalletMenu component
const WalletMenu = ({
  publicKey,
  disconnect,
}: {
  publicKey: PublicKey;
  disconnect: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg 
                 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 
                 focus:ring-offset-2 focus:ring-blue-500"
      >
        <span className="truncate max-w-[120px]">
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
          <div className="py-1" role="menu">
            <button
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 
                       hover:bg-gray-100 dark:hover:bg-gray-700"
              role="menuitem"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface TokenCardProps {
  token: PortfolioToken;
  onExpand: () => void;
  isExpanded: boolean;
}

const TokenCard = ({ token, onExpand, isExpanded }: TokenCardProps) => {
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [tokenDetails, setTokenDetails] = useState<{
    price?: number;
    value?: number;
  } | null>(null);

  const handleExpandClick = async () => {
    if (!isExpanded && !tokenDetails) {
      setIsLoadingDetails(true);
      try {
        // Here we would load the token details
        // For now just simulate a delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setTokenDetails({
          price: token.stats?.price || 0,
          value: (token.stats?.price || 0) * token.amount,
        });
      } catch (error) {
        console.error("Failed to load token details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    }
    onExpand();
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer"
      onClick={handleExpandClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <TokenImage token={token} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {token.metadata.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {token.metadata.symbol}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoadingDetails ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          ) : (
            <ChevronRight
              className={`w-5 h-5 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          )}
        </div>
      </div>

      {isExpanded && tokenDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Balance
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatNumber(token.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatPrice(tokenDetails.price || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Value</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatPrice(tokenDetails.value || 0)}
              </p>
            </div>
          </div>
          {token.explorerUrl && (
            <div className="mt-4 flex justify-end">
              <a
                href={token.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                         rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="View on Explorer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface TokenMetadataExtended {
  name: string;
  symbol: string;
  uri?: string | null;
  description?: string;
  image?: string;
}

interface PortfolioTokenExtended extends PortfolioToken {
  metadata: TokenMetadataExtended;
}

export default function Portfolio() {
  const { connection } = useConnection();
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const [tokens, setTokens] = useState<PortfolioTokenExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const loadBasicPortfolioInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!publicKey || !connected) {
        setTokens([]);
        return;
      }

      const tokenAccounts = await getPortfolioTokens(connection, publicKey);

      // Process each token with proper error handling
      const processedTokens = await Promise.all(
        tokenAccounts.map(async (token) => {
          try {
            // Try to fetch metadata
            const metadata = await fetch(token.metadata?.uri || "");
            let tokenData = { ...token } as PortfolioTokenExtended;

            if (metadata.ok) {
              try {
                const json = await metadata.json();
                tokenData.metadata = {
                  ...tokenData.metadata,
                  name: json.name || tokenData.metadata.name,
                  symbol: json.symbol || tokenData.metadata.symbol,
                  description: json.description,
                  image: json.image,
                };
              } catch (e) {
                console.warn(
                  `Failed to parse metadata for token ${token.mint.toString()}`
                );
              }
            }

            return tokenData;
          } catch (e) {
            console.warn(
              `Failed to load metadata for token ${token.mint.toString()}`
            );
            return token as PortfolioTokenExtended;
          }
        })
      );

      setTokens(processedTokens);
    } catch (err) {
      console.error("Failed to load portfolio:", err);
      if (err instanceof Error && err.name === "WalletDisconnectedError") {
        setError("Wallet disconnected. Please reconnect your wallet.");
        setTokens([]);
      } else {
        setError("Failed to load portfolio. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, connected]);

  useEffect(() => {
    if (connected && publicKey && !isReconnecting) {
      loadBasicPortfolioInfo();
    } else {
      setTokens([]);
      setError(null);
    }
  }, [connected, publicKey, loadBasicPortfolioInfo, isReconnecting]);

  // Handle connection state changes
  useEffect(() => {
    if (!connected && !connecting) {
      setTokens([]);
      setError("Wallet disconnected. Please reconnect your wallet.");
    } else if (connecting) {
      setIsReconnecting(true);
    } else if (connected) {
      setIsReconnecting(false);
      setError(null);
    }
  }, [connected, connecting]);

  // Add a loading skeleton component
  const TokenSkeleton = () => (
    <div className="py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors -mx-6 px-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="text-right">
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="text-right">
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!connected || !publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          {connecting ? "Connecting Wallet..." : "Connect Your Wallet"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
          {connecting
            ? "Please wait while we connect to your wallet..."
            : "Please connect your wallet to view your portfolio"}
        </p>
        {error && (
          <div className="text-red-500 dark:text-red-400 text-sm mt-2 text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Your Portfolio
          </h1>
          {tokens.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {tokens.length} {tokens.length === 1 ? "token" : "tokens"} found
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 self-end sm:self-auto">
          <button
            onClick={() => loadBasicPortfolioInfo()}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh portfolio"
          >
            <RefreshCw
              className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
          <WalletMenu publicKey={publicKey} disconnect={() => {}} />
        </div>
      </div>

      {error && (
        <div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                     rounded-lg p-4 mb-6 text-red-700 dark:text-red-400 text-sm"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <TokenSkeleton key={i} />
          ))}
        </div>
      ) : tokens.length > 0 ? (
        <div className="space-y-4">
          {tokens.map((token) => (
            <TokenCard
              key={token.mint.toString()}
              token={token}
              isExpanded={expandedTokenId === token.mint.toString()}
              onExpand={() =>
                setExpandedTokenId(
                  expandedTokenId === token.mint.toString()
                    ? null
                    : token.mint.toString()
                )
              }
            />
          ))}
        </div>
      ) : !error ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No tokens found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              Your portfolio is empty. Once you acquire tokens, they will appear
              here.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
