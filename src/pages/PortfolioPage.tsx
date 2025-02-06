import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  tokenStorageService,
  StoredToken,
} from "../services/tokenStorageService";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

export const PortfolioPage: React.FC = () => {
  const [tokens, setTokens] = useState<StoredToken[]>([]);
  const { connection } = useConnection();
  const wallet = useWallet();

  useEffect(() => {
    // Load created tokens
    const storedTokens = tokenStorageService.getTokens();
    setTokens(storedTokens);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Your Created Tokens
        </h2>

        {tokens.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You haven't created any tokens yet
            </p>
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 border border-transparent 
                       text-sm font-medium rounded-md shadow-sm text-white 
                       bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 
                       focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Token
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tokens.map((token) => (
              <div
                key={token.mint}
                className="py-4 hover:bg-gray-50 dark:hover:bg-gray-700 
                         transition-colors -mx-6 px-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                      {token.name} ({token.symbol})
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Created: {new Date(token.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Price: {token.currentPrice} SOL
                    </p>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {token.address.slice(0, 8)}...{token.address.slice(-8)}
                      </span>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(token.address)
                        }
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Copy address"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 ml-4">
                    {token.bullxPoolAddress ? (
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-green-600 dark:text-green-400 flex items-center text-sm">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          BullX Pool Enabled
                        </span>
                        <div className="flex gap-2">
                          <a
                            href={`https://explorer.solana.com/address/${token.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            Explorer
                          </a>
                          <a
                            href={`https://bullx.io/token/${token.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                          >
                            Trade
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-gray-500 dark:text-gray-400 flex items-center text-sm">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          No BullX Pool
                        </span>
                        <a
                          href={`https://explorer.solana.com/address/${token.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          Explorer
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
