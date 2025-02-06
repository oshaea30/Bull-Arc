import React, { useState, useEffect } from 'react';
import { X, AlertCircle, ExternalLink } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletIcon } from './WalletIcon';
import { walletOptions, detectWallet } from '../config/wallets';
import { BurnerWalletModal } from './BurnerWalletModal';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { select, wallets } = useWallet();
  const [detectedWallets, setDetectedWallets] = useState<Record<string, boolean>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [showBurnerModal, setShowBurnerModal] = useState(false);

  const isStackBlitz = window.location.hostname.includes('stackblitz.io');

  useEffect(() => {
    const checkWallets = () => {
      const detected: Record<string, boolean> = {};
      walletOptions.forEach(option => {
        detected[option.name] = detectWallet(option.name);
      });
      setDetectedWallets(detected);
    };

    checkWallets();
    window.addEventListener('focus', checkWallets);
    const interval = setInterval(checkWallets, 1000);

    return () => {
      window.removeEventListener('focus', checkWallets);
      clearInterval(interval);
    };
  }, []);

  if (!isOpen) return null;

  const handleSelectWallet = async (option: typeof walletOptions[0]) => {
    try {
      if (option.isBurner) {
        setShowBurnerModal(true);
        return;
      }

      if (isStackBlitz) {
        window.open(option.installUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      const isDetected = detectWallet(option.name);
      if (!isDetected) {
        window.open(option.installUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      setIsConnecting(true);

      const wallet = wallets.find(w => w.adapter.name === option.adapter);
      if (!wallet) {
        console.error('Wallet adapter not found');
        return;
      }

      try {
        await select(option.adapter);
        onClose();
      } catch (error: any) {
        if (error?.name === 'WalletConnectionError') {
          console.warn('Wallet connection error:', error.message);
          return;
        }
        if (error?.message?.includes('User rejected')) {
          console.warn('User rejected connection');
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Failed to select wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#14151A] text-white rounded-xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-300"
          >
            <X size={20} />
          </button>

          <h2 className="text-2xl font-bold mb-6">
            Connect a wallet on Solana
          </h2>

          {isStackBlitz && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-400 shrink-0 mt-1" size={20} />
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">
                    You're viewing this app in StackBlitz's preview environment. To connect a real wallet:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-gray-300 space-y-1">
                    <li>Open this app in a new tab</li>
                    <li>Install a Solana wallet (Phantom or Solflare)</li>
                    <li>Return to connect your wallet</li>
                  </ol>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mt-2"
                  >
                    Open in new tab
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
              <div className="space-y-3">
                {walletOptions.map((option) => {
                  const isDetected = detectedWallets[option.name];
                  
                  return (
                    <button
                      key={option.name}
                      onClick={() => handleSelectWallet(option)}
                      disabled={isConnecting}
                      className={`w-full flex items-center justify-between p-3 rounded-lg
                             bg-[#1C1D22] hover:bg-[#2A2B31] transition-colors duration-200
                             ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {option.iconUrl ? (
                          <img 
                            src={option.iconUrl} 
                            alt={`${option.name} icon`}
                            className="w-8 h-8"
                          />
                        ) : (
                          <WalletIcon size={16} className="w-8 h-8" />
                        )}
                        <div className="text-left">
                          <span className="font-medium block">{option.name}</span>
                          {!isDetected && !option.isBurner && (
                            <span className="text-xs text-gray-400">Click to install</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm ${isDetected ? 'text-green-400' : 'text-gray-400'}`}>
                        {option.isBurner ? 'Create New' : (isDetected ? 'Detected' : 'Not Installed')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BurnerWalletModal
        isOpen={showBurnerModal}
        onClose={() => {
          setShowBurnerModal(false);
          onClose();
        }}
        onSuccess={() => {
          setShowBurnerModal(false);
          onClose();
        }}
      />
    </>
  );
}