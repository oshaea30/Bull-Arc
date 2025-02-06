import React from 'react';
import { Check, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WalletSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export function WalletSuccessModal({ isOpen, onClose, walletAddress }: WalletSuccessModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const solscanUrl = `https://solscan.io/account/${walletAddress}?cluster=devnet`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 w-full max-w-md relative">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Wallet Created Successfully!
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Your new Solana wallet is ready to use
          </p>
          
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Wallet Address
            </p>
            <p className="font-mono text-xs text-gray-600 dark:text-gray-400 break-all">
              {walletAddress}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={solscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 
                       dark:text-blue-400 hover:text-blue-500"
            >
              View on Solscan
              <ExternalLink size={16} />
            </a>
            
            <button
              onClick={onClose}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm 
                       font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none 
                       focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}