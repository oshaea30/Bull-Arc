import { PublicKey } from "@solana/web3.js";

export interface TokenStats {
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  holders: number;
}

export interface StoredToken {
  name: string;
  symbol: string;
  address: string;
  mint: string;
  createdAt: string;
  updatedAt?: string;
  currentPrice: number;
  previousPrice?: number;
  poolId: string;
  imageUrl?: string;
  metadataUrl?: string;
  description?: string;
  volume24h?: number;
  holders?: number;
  bullxPoolAddress?: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image?: string;
  decimals: number;
  initialSupply: number;
  buyTaxEnabled: boolean;
  sellTaxEnabled: boolean;
  reflectionEnabled: boolean;
  antiBot?: boolean;
  liquidityLock?: boolean;
  prioritySupport?: boolean;
}

export interface PortfolioToken {
  mint: PublicKey;
  amount: number;
  metadata: {
    name: string;
    symbol: string;
    uri?: string | null;
  };
  imageUrl?: string;
  metadataUrl?: string;
  stats?: TokenStats;
  value?: number;
  createdAt?: string;
  explorerUrl?: string;
}

export interface ChartData {
  time: string;
  value: number;
}
