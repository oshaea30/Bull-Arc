import React, { useState, useCallback, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, ExternalLink } from 'lucide-react';
import { BurnerWalletModal } from './BurnerWalletModal';
import { WalletSuccessModal } from './WalletSuccessModal';

export function BurnerWallet() {
  const { connected, select } = useWallet();
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    // Check if burner wallet exists in localStorage
    const walletData = localStorage.getItem('burnerWallet');
    if (walletData) {
      const { publicKey } = JSON.parse(walletData);
      setWalletAddress(publicKey);
    }
  }, []);

  const createBurnerWallet = useCallback(async (username: string, email: string) => {
    setIsCreating(true);
    try {
      const keypair = Keypair.generate();
      const walletData = {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
        username,
        email,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('burnerWallet', JSON.stringify(walletData));
      
      // Store the wallet address and show success modal
      setWalletAddress(keypair.publicKey.toBase58());
      setShowModal(false);
      setShowSuccessModal(true);
      
      // Select the burner wallet adapter
      await select('Burner');
    } catch (error) {
      console.error('Failed to create burner wallet:', error);
      alert('Failed to create wallet. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [select]);

  // Don't show anything if connected to a non-burner wallet
  if (connected && !walletAddress) return null;

  const handleViewOnSolscan = () => {
    if (walletAddress) {
      window.open(`https://solscan.io/account/${walletAddress}?cluster=devnet`, '_blank');
    }
  };

  return (
    <>
      {walletAddress ? (
        <button
          onClick={handleViewOnSolscan}
          className="flex items-center gap-2 px-4 py-2 text-base font-medium text-white 
                    bg-purple-600 hover:bg-purple-700 rounded-lg h-10
                    transition-colors duration-200"
        >
          <Wallet className="w-4 h-4" />
          Your Wallet
          <ExternalLink className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-base font-medium text-white 
                    bg-purple-600 hover:bg-purple-700 rounded-lg h-10
                    transition-colors duration-200"
        >
          <Wallet className="w-4 h-4" />
          Create Wallet
        </button>
      )}

      <BurnerWalletModal
        isOpen={showModal}
        onClose={() => !isCreating && setShowModal(false)}
        onSubmit={createBurnerWallet}
        isCreating={isCreating}
      />

      <WalletSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        walletAddress={walletAddress || ''}
      />
    </>
  );
}