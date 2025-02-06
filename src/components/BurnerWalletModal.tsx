import React, { useState } from 'react';
import { X, AlertCircle, Clock, Download, Copy } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BurnerWalletAdapter } from '../context/BurnerWalletAdapter';

interface BurnerWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BurnerWalletModal({ isOpen, onClose, onSuccess }: BurnerWalletModalProps) {
  const { select } = useWallet();
  const [isCreating, setIsCreating] = useState(false);
  const [walletKeys, setWalletKeys] = useState<{ publicKey: string; secretKey: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCreateBurner = async () => {
    try {
      setIsCreating(true);
      const burnerWallet = new BurnerWalletAdapter();
      const keys = await burnerWallet.createWallet();
      setWalletKeys(keys);
      
      // Select the burner wallet adapter
      await select('Burner');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to create burner wallet:', error);
      alert('Failed to create wallet. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadKeys = () => {
    if (!walletKeys) return;

    const data = JSON.stringify(walletKeys, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `burner-wallet-${walletKeys.publicKey.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyKeys = async () => {
    if (!walletKeys) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(walletKeys, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy keys:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 
                   dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>

        <div className="space-y-6">
          {!walletKeys ? (
            <>
              <div className="space-y-4">
                <h2 className="text-2xl font-bold dark:text-white">Create Burner Wallet</h2>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-900 
                              rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="text-yellow-600 dark:text-yellow-500 shrink-0 mt-1" size={20} />
                    <div className="space-y-2">
                      <p className="text-sm text-yellow-600 dark:text-yellow-500 font-medium">
                        Important: This is a temporary wallet
                      </p>
                      <ul className="text-sm text-yellow-600 dark:text-yellow-500 space-y-1 list-disc list-inside">
                        <li>Expires in 24 hours</li>
                        <li>Only for testing and small transactions</li>
                        <li>Back up your keys immediately</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Clock size={16} />
                  <span>Wallet will automatically expire in 24 hours</span>
                </div>
              </div>

              <button
                onClick={handleCreateBurner}
                disabled={isCreating}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                         font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating Wallet...' : 'Create Burner Wallet'}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <h2 className="text-2xl font-bold dark:text-white">Backup Your Keys</h2>
                
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 
                              rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="text-red-600 dark:text-red-500 shrink-0 mt-1" size={20} />
                    <div className="space-y-1">
                      <p className="text-sm text-red-600 dark:text-red-500 font-medium">
                        Save your keys now!
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-500">
                        If you lose these keys, you cannot recover your wallet or any funds in it.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium dark:text-white">Wallet Keys</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyKeys}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 
                                 dark:hover:text-blue-300"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={handleDownloadKeys}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 
                                 dark:hover:text-blue-300"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                      {JSON.stringify(walletKeys, null, 2)}
                    </pre>
                  </div>
                  
                  {copied && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Copied to clipboard!
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                         font-medium transition-colors"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}