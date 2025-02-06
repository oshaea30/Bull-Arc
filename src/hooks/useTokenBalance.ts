import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getTokenBalance, getOwnedTokenAccounts, TokenError } from '../services/tokenService';

export function useTokenBalance(tokenAccount?: PublicKey) {
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!tokenAccount) return;

    setIsLoading(true);
    try {
      const bal = await getTokenBalance(connection, tokenAccount);
      setBalance(bal);
      setError(null);
    } catch (err) {
      if (err instanceof TokenError) {
        setError(`Failed to fetch balance: ${err.message}`);
      } else {
        setError('Failed to fetch balance');
      }
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [connection, tokenAccount]);

  useEffect(() => {
    fetchBalance();

    if (tokenAccount) {
      const subscription = connection.onAccountChange(
        tokenAccount,
        () => fetchBalance(),
        'confirmed'
      );

      return () => {
        connection.removeAccountChangeListener(subscription);
      };
    }
  }, [connection, tokenAccount, fetchBalance]);

  return { balance, isLoading, error, refresh: fetchBalance };
}

export function useOwnedTokens() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokens, setTokens] = useState<Array<{
    mint: PublicKey;
    tokenAccount: PublicKey;
    balance: number;
    decimals: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!publicKey) return;

    setIsLoading(true);
    try {
      const ownedTokens = await getOwnedTokenAccounts(connection, publicKey);
      setTokens(ownedTokens);
      setError(null);
    } catch (err) {
      if (err instanceof TokenError) {
        setError(`Failed to fetch tokens: ${err.message}`);
      } else {
        setError('Failed to fetch tokens');
      }
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { tokens, isLoading, error, refresh: fetchTokens };
}