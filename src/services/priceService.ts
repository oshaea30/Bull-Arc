import { Connection, PublicKey } from "@solana/web3.js";
import { Liquidity } from "@raydium-io/raydium-sdk";
import { ChartData } from "../types";

interface PriceUpdate {
  price: number;
  volume: number;
  timestamp: number;
}

// In-memory storage for price history
const priceHistory: { [tokenAddress: string]: PriceUpdate[] } = {};

export class PriceService {
  private static instance: PriceService;
  private priceUpdateCallbacks: {
    [tokenAddress: string]: ((price: number) => void)[];
  } = {};
  private poolPollingIntervals: { [tokenAddress: string]: NodeJS.Timer } = {};

  private constructor() {}

  static getInstance(): PriceService {
    if (!PriceService.instance) {
      PriceService.instance = new PriceService();
    }
    return PriceService.instance;
  }

  async startTracking(
    connection: Connection,
    tokenAddress: string,
    poolId: string,
    onUpdate?: (price: number) => void
  ) {
    try {
      // Initialize price history array if it doesn't exist
      if (!priceHistory[tokenAddress]) {
        priceHistory[tokenAddress] = [];
      }

      // Add callback if provided
      if (onUpdate) {
        if (!this.priceUpdateCallbacks[tokenAddress]) {
          this.priceUpdateCallbacks[tokenAddress] = [];
        }
        this.priceUpdateCallbacks[tokenAddress].push(onUpdate);
      }

      // Start polling pool data
      if (!this.poolPollingIntervals[tokenAddress]) {
        const interval = setInterval(async () => {
          try {
            const poolKeys = await Liquidity.fetchAllPoolKeys(connection);
            const pool = poolKeys.find((pool) => pool.id.toString() === poolId);

            if (!pool) {
              console.error("Pool not found");
              return;
            }

            const poolInfo = await Liquidity.fetchInfo({
              connection,
              poolKeys: pool,
            });

            if (!poolInfo) {
              console.error("Failed to fetch pool info");
              return;
            }

            // Calculate price from pool data
            const price =
              poolInfo.baseReserve && poolInfo.quoteReserve
                ? Number(poolInfo.quoteReserve) / Number(poolInfo.baseReserve)
                : 0;

            const update: PriceUpdate = {
              price,
              volume: Number(poolInfo.volume24h || 0),
              timestamp: Date.now(),
            };

            // Add to price history
            priceHistory[tokenAddress].push(update);

            // Keep only last 24 hours of data (assuming 1-minute intervals)
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            priceHistory[tokenAddress] = priceHistory[tokenAddress].filter(
              (update) => update.timestamp >= oneDayAgo
            );

            // Notify callbacks
            this.priceUpdateCallbacks[tokenAddress]?.forEach((callback) =>
              callback(price)
            );
          } catch (error) {
            console.error("Failed to fetch pool data:", error);
          }
        }, 60000); // Update every minute

        this.poolPollingIntervals[tokenAddress] = interval;
      }
    } catch (error) {
      console.error("Failed to start price tracking:", error);
    }
  }

  stopTracking(tokenAddress: string) {
    if (this.poolPollingIntervals[tokenAddress]) {
      clearInterval(this.poolPollingIntervals[tokenAddress]);
      delete this.poolPollingIntervals[tokenAddress];
    }
    delete this.priceUpdateCallbacks[tokenAddress];
  }

  getChartData(tokenAddress: string): ChartData[] {
    const history = priceHistory[tokenAddress] || [];
    return history.map((update) => ({
      time: new Date(update.timestamp).toISOString(),
      value: update.price,
    }));
  }

  getLatestPrice(tokenAddress: string): number | null {
    const history = priceHistory[tokenAddress];
    if (!history || history.length === 0) return null;
    return history[history.length - 1].price;
  }

  get24hVolume(tokenAddress: string): number {
    const history = priceHistory[tokenAddress];
    if (!history || history.length === 0) return 0;
    return history[history.length - 1].volume;
  }

  get24hPriceChange(tokenAddress: string): number {
    const history = priceHistory[tokenAddress];
    if (!history || history.length < 2) return 0;

    const latestPrice = history[history.length - 1].price;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const oldestPrice =
      history.find((update) => update.timestamp >= oneDayAgo)?.price ||
      latestPrice;

    return ((latestPrice - oldestPrice) / oldestPrice) * 100;
  }
}
