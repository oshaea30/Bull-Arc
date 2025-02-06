import { CONFIG } from "../config";

// Use the free tier endpoint since we're just getting started
const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";

export interface TrendingToken {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  image: string;
}

async function fetchFromCoinGecko(endpoint: string) {
  try {
    const params = new URLSearchParams({
      vs_currency: "usd",
      per_page: "100", // Fetch more initially to filter for Solana tokens
      sparkline: "false",
      platform: "solana", // Only fetch Solana tokens
    });

    const url = `${COINGECKO_API_BASE}${endpoint}${
      endpoint.includes("?") ? "&" : "?"
    }${params}`;
    console.log("Fetching from:", url);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("CoinGecko API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        endpoint,
        url,
      });

      throw new Error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("CoinGecko Response for", endpoint, ":", data);
    return data;
  } catch (error) {
    console.error("Error fetching from CoinGecko:", error);
    throw error;
  }
}

function transformCoinGeckoData(coin: any): TrendingToken {
  try {
    return {
      id: coin.id || "",
      name: coin.name || "Unknown",
      symbol: (coin.symbol || "UNKNOWN").toUpperCase(),
      price:
        typeof coin.current_price === "number"
          ? coin.current_price
          : typeof coin.price === "number"
          ? coin.price
          : 0,
      priceChange24h:
        typeof coin.price_change_percentage_24h === "number"
          ? coin.price_change_percentage_24h
          : typeof coin.price_change_24h === "number"
          ? coin.price_change_24h
          : 0,
      volume24h:
        typeof coin.total_volume === "number"
          ? coin.total_volume
          : typeof coin.volume_24h === "number"
          ? coin.volume_24h
          : 0,
      marketCap: typeof coin.market_cap === "number" ? coin.market_cap : 0,
      image:
        coin.image ||
        coin.large ||
        coin.thumb ||
        `https://via.placeholder.com/40/4F46E5/FFFFFF?text=${(
          coin.symbol || "U"
        )
          .toUpperCase()
          .charAt(0)}`,
    };
  } catch (error) {
    console.error("Error transforming coin data:", error, coin);
    throw error;
  }
}

export async function getRecentTokens(): Promise<TrendingToken[]> {
  try {
    // Get Solana tokens with their platforms
    const data = await fetchFromCoinGecko(
      "/coins/markets?category=solana-ecosystem"
    );

    // Sort by date added to CoinGecko (if available) and take the most recent 10
    const sortedData = Array.isArray(data)
      ? data
          .sort((a, b) =>
            (b.date_added || "").localeCompare(a.date_added || "")
          )
          .slice(0, 10)
      : [];

    return sortedData.map(transformCoinGeckoData);
  } catch (error) {
    console.error("Error in getRecentTokens:", error);
    return [];
  }
}

export async function getTopGainers(): Promise<TrendingToken[]> {
  try {
    // Get Solana tokens sorted by 24h price change percentage
    const data = await fetchFromCoinGecko(
      "/coins/markets?category=solana-ecosystem&order=price_change_percentage_24h_desc"
    );

    return Array.isArray(data)
      ? data.slice(0, 10).map(transformCoinGeckoData)
      : [];
  } catch (error) {
    console.error("Error in getTopGainers:", error);
    return [];
  }
}

export async function getMostActive(): Promise<TrendingToken[]> {
  try {
    // Get Solana tokens sorted by 24h trading volume
    const data = await fetchFromCoinGecko(
      "/coins/markets?category=solana-ecosystem&order=volume_desc"
    );

    return Array.isArray(data)
      ? data.slice(0, 10).map(transformCoinGeckoData)
      : [];
  } catch (error) {
    console.error("Error in getMostActive:", error);
    return [];
  }
}
