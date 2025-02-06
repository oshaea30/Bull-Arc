import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Wallet, ChevronDown, LogOut } from "lucide-react";
import { WalletModal } from "./WalletModal";
import { GetStartedModal } from "./GetStartedModal";

export function WalletButton() {
  const { connected, publicKey, disconnect, connecting, select } = useWallet();
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Log wallet connection status changes
    console.log("Wallet connection status:", {
      connected,
      connecting,
      publicKey: publicKey?.toString(),
    });
  }, [connected, connecting, publicKey]);

  const handleConnect = async () => {
    try {
      setError(null);
      setShowGetStarted(true);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setShowMenu(false);
      console.log("Wallet disconnected successfully");
    } catch (err) {
      console.error("Failed to disconnect wallet:", err);
      setError(
        err instanceof Error ? err.message : "Failed to disconnect wallet"
      );
    }
  };

  if (connecting) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 text-base font-medium text-white 
                  bg-blue-400 rounded-lg h-10 cursor-wait"
      >
        <Wallet className="w-4 h-4 animate-spin" />
        Connecting...
      </button>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-4 py-2 text-base font-medium text-white 
                  bg-blue-600 hover:bg-blue-700 rounded-lg h-10 transition-colors duration-200"
        >
          <Wallet className="w-4 h-4" />
          <span>
            {publicKey.toString().slice(0, 4)}...
            {publicKey.toString().slice(-4)}
          </span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
            <div className="py-1" role="menu">
              <button
                onClick={handleDisconnect}
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
  }

  return (
    <>
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 px-4 py-2 text-base font-medium text-white 
                  bg-blue-600 hover:bg-blue-700 rounded-lg h-10 transition-colors duration-200"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>

      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}

      <GetStartedModal
        isOpen={showGetStarted}
        onClose={() => setShowGetStarted(false)}
        onViewOptions={() => {
          setShowGetStarted(false);
          setShowWalletModal(true);
        }}
      />

      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </>
  );
}
