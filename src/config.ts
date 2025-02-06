import { clusterApiUrl, Cluster } from "@solana/web3.js";

// Environment detection
const isProd = import.meta.env.PROD;

// Network Configuration
export const NETWORK = (import.meta.env.VITE_SOLANA_NETWORK ||
  "mainnet-beta") as Cluster;
export const ENDPOINT =
  import.meta.env.VITE_RPC_ENDPOINT || clusterApiUrl(NETWORK);

// Program IDs
export const BULLX_PROGRAM_ID = "BULLXnGjk3Dy6NDZvFb5JZGiNxKcqVpAkDzw8x5bKtf";
export const RAYDIUM_PROGRAM_ID = "RaYdiumv7mXx65C6FYcNp3pmGRyg5P2fCyZT8vYsxny";

// Fee configuration
export const FEES = {
  TOKEN_CREATION: 0.05, // SOL
  METADATA_CREATION: 0.05,
  ARWEAVE_STORAGE: 0.1,
  LIQUIDITY_POOL: 0.1,
} as const;

// Validation constants
export const VALIDATION = {
  MIN_SOL_AMOUNT: 0.1,
  MAX_DECIMALS: 9,
  MIN_NAME_LENGTH: 3,
  MAX_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_SYMBOL_LENGTH: 2,
  MAX_SYMBOL_LENGTH: 10,
} as const;

// Default values
export const DEFAULTS = {
  INITIAL_SUPPLY: "1000000",
  INITIAL_PRICE: "0.000001",
  TOKEN_AMOUNT: "1000000",
  DECIMALS: "9",
  SOL_AMOUNT: "1",
} as const;

// API Configuration
export const API_CONFIG = {
  NFT_STORAGE_TOKEN: import.meta.env.VITE_NFT_STORAGE_TOKEN,
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  COINGECKO_API_KEY: import.meta.env.VITE_COINGECKO_API_KEY,
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_TRADING: import.meta.env.VITE_ENABLE_TRADING === "true",
  ENABLE_PORTFOLIO: import.meta.env.VITE_ENABLE_PORTFOLIO === "true",
} as const;

// Cache and Rate Limiting Configuration
export const CONFIG = {
  METADATA_CACHE_DURATION: parseInt(
    import.meta.env.VITE_METADATA_CACHE_DURATION || "1800000"
  ), // 30 minutes
  STATS_CACHE_DURATION: parseInt(
    import.meta.env.VITE_STATS_CACHE_DURATION || "60000"
  ), // 1 minute
  REQUEST_WINDOW: 60 * 1000, // 1 minute window
  MAX_REQUESTS_PER_WINDOW: parseInt(
    import.meta.env.VITE_MAX_REQUESTS_PER_MINUTE || "30"
  ),
  REQUEST_TIMEOUT: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || "5000"),
  PRICE_HISTORY_LIMIT: 24, // Keep 24 hours of hourly prices
  MAX_RETRIES: 3,
  BASE_DELAY: 2000,
  MAX_DELAY: 10000,
  BATCH_SIZE: 5,
  BATCH_DELAY: 1000,
  // Supabase Configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
} as const;

// Wallet Configuration
export const WALLET_CONFIG = {
  FEE_COLLECTOR_WALLET: import.meta.env.VITE_FEE_COLLECTOR_WALLET,
} as const;

// Validation function for required environment variables
export function validateConfig() {
  const required = {
    RPC_ENDPOINT: ENDPOINT,
    NFT_STORAGE_TOKEN: API_CONFIG.NFT_STORAGE_TOKEN,
    SUPABASE_URL: API_CONFIG.SUPABASE_URL,
    SUPABASE_ANON_KEY: API_CONFIG.SUPABASE_ANON_KEY,
    FEE_COLLECTOR_WALLET: WALLET_CONFIG.FEE_COLLECTOR_WALLET,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
