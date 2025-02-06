export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  logo?: string;
}

export interface ChartData {
  time: string;
  value: number;
}

export interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  holder: string;
  createdAt: string;
}