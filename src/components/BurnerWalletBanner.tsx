import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BurnerWalletAdapter } from '../context/BurnerWalletAdapter';

export function BurnerWalletBanner() {
  const { wallet } = useWallet();
  const [timeLeft, setTimeLeft] = useState('');
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    if (!(wallet?.adapter instanceof BurnerWalletAdapter)) return;

    const updateTime = () => {
      const remaining = wallet.adapter.getTimeRemaining();
      if (remaining <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [wallet]);

  if (!(wallet?.adapter instanceof BurnerWalletAdapter) || !showBanner) {
    return null;
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50">
      <div className="bg-yellow-500 text-yellow-900">
        <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p className="font-medium text-sm">
                Burner Wallet Active — Expires in {timeLeft}
              </p>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="rounded-md p-1 hover:bg-yellow-600/20 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}