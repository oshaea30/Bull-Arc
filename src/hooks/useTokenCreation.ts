import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createToken, TokenMetadata, TokenError } from '../services/tokenService';

export function useTokenCreation() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (metadata: TokenMetadata) => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected');
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await createToken(
        connection,
        publicKey,
        signTransaction,
        metadata
      );
      return result;
    } catch (err) {
      if (err instanceof TokenError) {
        switch (err.code) {
          case 'INSUFFICIENT_BALANCE':
            setError('Insufficient SOL balance. Please add more SOL to your wallet.');
            break;
          case 'USER_REJECTED':
            setError('Transaction was rejected. Please try again.');
            break;
          case 'TRANSACTION_FAILED':
            setError('Transaction failed. Please try again.');
            break;
          default:
            setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [connection, publicKey, signTransaction]);

  return { create, isCreating, error };
}