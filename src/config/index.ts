import { clusterApiUrl, Cluster } from "@solana/web3.js";

// Environment variables
const env = import.meta.env;

// Network Configuration
export const NETWORK = (env.VITE_SOLANA_NETWORK || "devnet") as Cluster;
export const ENDPOINT = env.VITE_RPC_ENDPOINT || clusterApiUrl(NETWORK);

// Program IDs
export const BULLX_PROGRAM_ID = "BULLXnGjk3Dy6NDZvFb5JZGiNxKcqVpAkDzw8x5bKtf";
export const RAYDIUM_PROGRAM_ID = "RaYdiumv7mXx65C6FYcNp3pmGRyg5P2fCyZT8vYsxny";

// API Configuration
export const CONFIG = {
  // Cache durations
  METADATA_CACHE_DURATION: parseInt(
    env.VITE_METADATA_CACHE_DURATION || "1800000"
  ),
  STATS_CACHE_DURATION: parseInt(env.VITE_STATS_CACHE_DURATION || "60000"),

  // Rate limiting
  REQUEST_WINDOW: 60 * 1000,
  MAX_REQUESTS_PER_WINDOW: parseInt(env.VITE_MAX_REQUESTS_PER_MINUTE || "30"),
  REQUEST_TIMEOUT: parseInt(env.VITE_REQUEST_TIMEOUT || "5000"),

  // API Keys
  COINGECKO_API_KEY: env.VITE_COINGECKO_API_KEY as string,

  // Database
  SUPABASE_URL: env.VITE_SUPABASE_URL as string,
  SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY as string,
} as const;
