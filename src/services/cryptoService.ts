import type { CryptoData } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { TokenMetadata, TokenStats } from "../types/token";
import { createBasicToken } from "./tokenService";

// Extend CryptoData interface with additional properties
interface ExtendedCryptoData extends CryptoData {
  logo?: string;
  categories?: string[];
  image?: string;
}

// API Configuration
const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";
const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
  "https://cors-anywhere.herokuapp.com/",
];

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const PRICE_CACHE_DURATION = 30 * 1000; // 30 seconds
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const apiCache: { [key: string]: CacheEntry<any> } = {};

// Rate limiting configuration
const RATE_LIMIT_RESET = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 30;
let requestCount = 0;
let lastResetTime = Date.now();

// Add exponential backoff configuration
const INITIAL_BACKOFF = 1000; // 1 second
const MAX_BACKOFF = 32000; // 32 seconds
const MAX_RETRIES = 3;

// Helper function to check and reset rate limit
function checkRateLimit() {
  const now = Date.now();
  if (now - lastResetTime >= RATE_LIMIT_RESET) {
    requestCount = 0;
    lastResetTime = now;
  }
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    throw new CryptoError("Rate limit exceeded", "RATE_LIMIT");
  }
  requestCount++;
}

// Helper function to get cached data
function getCachedData<T>(key: string, maxAge: number): T | null {
  const cached = apiCache[key];
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data;
  }
  return null;
}

// Helper function to set cached data
function setCachedData<T>(key: string, data: T) {
  apiCache[key] = {
    data,
    timestamp: Date.now(),
  };
}

// Helper function for exponential backoff
async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to handle CORS fetch with retries and exponential backoff
async function fetchWithCORS(
  url: string,
  options: RequestInit = {},
  cacheKey?: string,
  cacheDuration: number = CACHE_DURATION
): Promise<Response> {
  // Check cache first
  if (cacheKey) {
    const cachedData = getCachedData<any>(cacheKey, cacheDuration);
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let lastError: Error | null = null;
  let backoffTime = INITIAL_BACKOFF;

  // Try each proxy with retries and backoff
  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    // Check rate limit
    try {
      checkRateLimit();
    } catch (error) {
      if (error instanceof CryptoError && error.code === "RATE_LIMIT") {
        await wait(backoffTime);
        backoffTime = Math.min(backoffTime * 2, MAX_BACKOFF);
        continue;
      }
      throw error;
    }

    // Try each proxy
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl, {
          ...options,
          headers: {
            ...options.headers,
            Accept: "application/json",
          },
        });

        if (response.status === 429) {
          // Rate limit hit, apply backoff
          await wait(backoffTime);
          backoffTime = Math.min(backoffTime * 2, MAX_BACKOFF);
          continue;
        }

        if (response.ok) {
          const data = await response.json();
          if (cacheKey) {
            setCachedData(cacheKey, data);
          }
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        lastError = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
      } catch (error) {
        console.warn(`Proxy ${proxy} failed:`, error);
        lastError = error as Error;
      }
    }

    // If we've tried all proxies and none worked, wait before retry
    if (retry < MAX_RETRIES) {
      await wait(backoffTime);
      backoffTime = Math.min(backoffTime * 2, MAX_BACKOFF);
    }
  }

  throw new CryptoError(
    `All fetch attempts failed: ${lastError?.message || "Unknown error"}`,
    "FETCH_ERROR"
  );
}

export class CryptoError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "CryptoError";
  }
}

// Criteria for featuring coins
const FEATURING_CRITERIA = {
  minVolume: 5000000, // Minimum 24h volume of $5M
  minMarketCap: 10000000, // Minimum market cap of $10M
  maxAge: 180, // Maximum age in days
  minHolders: 1000, // Minimum number of holders
};

// Update the fallback coins to use ExtendedCryptoData
const FALLBACK_FEATURED_COINS: ExtendedCryptoData[] = [
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    current_price: 0,
    price_change_percentage_24h: 0,
    total_volume: 0,
    market_cap: 0,
    logo: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
  },
  {
    id: "bonk",
    name: "Bonk",
    symbol: "BONK",
    current_price: 0,
    price_change_percentage_24h: 0,
    total_volume: 0,
    market_cap: 0,
    logo: "https://assets.coingecko.com/coins/images/28600/large/bonk.jpg",
  },
  {
    id: "myro",
    name: "Myro",
    symbol: "MYRO",
    current_price: 0,
    price_change_percentage_24h: 0,
    total_volume: 0,
    market_cap: 0,
    logo: "https://assets.coingecko.com/coins/images/33969/large/myro.jpg",
  },
];

// Default trending coins to show when API fails
const FALLBACK_TRENDING_COINS: CryptoData[] = [
  {
    id: "bonk",
    name: "Bonk",
    symbol: "BONK",
    current_price: 0.000012,
    price_change_percentage_24h: 42.69,
    total_volume: 12420000,
    market_cap: 750000000,
    logo: "https://assets.coingecko.com/coins/images/28600/large/bonk.jpg",
  },
  {
    id: "myro",
    name: "Myro",
    symbol: "MYRO",
    current_price: 0.000834,
    price_change_percentage_24h: 89.34,
    total_volume: 8234567,
    market_cap: 250000000,
    logo: "https://assets.coingecko.com/coins/images/33969/large/myro.jpg",
  },
  {
    id: "book-of-meme",
    name: "Book of Meme",
    symbol: "BOME",
    current_price: 0.002156,
    price_change_percentage_24h: 156.42,
    total_volume: 4201337,
    market_cap: 120000000,
    logo: "https://assets.coingecko.com/coins/images/36669/large/bome.jpg",
  },
];

interface TrendingCriteria {
  minVolume: number;
  minPriceChange: number;
  maxAge: number;
}

const TRENDING_CRITERIA: TrendingCriteria = {
  minVolume: 1000000,
  minPriceChange: 5,
  maxAge: 90,
};

interface ScoredCoin extends ExtendedCryptoData {
  score: number;
}

async function handleApiResponse(
  response: Response,
  endpoint: string
): Promise<any> {
  if (!response.ok) {
    if (response.status === 429) {
      console.warn(`Rate limit exceeded for ${endpoint}`);
      throw new CryptoError("Rate limit exceeded", "RATE_LIMIT");
    }
    if (response.status === 404) {
      throw new CryptoError("Resource not found", "NOT_FOUND");
    }
    throw new CryptoError(`API error: ${response.status}`, "API_ERROR");
  }
  return response.json();
}

// Update the function to use ExtendedCryptoData
function calculateFeaturingScore(coin: ExtendedCryptoData): number {
  const volumeScore = Math.min(
    coin.total_volume / FEATURING_CRITERIA.minVolume,
    10
  );
  const marketCapScore = Math.min(
    coin.market_cap / FEATURING_CRITERIA.minMarketCap,
    10
  );
  const priceChangeScore = Math.abs(coin.price_change_percentage_24h) / 10;

  const weights = {
    volume: 0.4,
    marketCap: 0.3,
    priceChange: 0.3,
  };

  return (
    volumeScore * weights.volume +
    marketCapScore * weights.marketCap +
    priceChangeScore * weights.priceChange
  );
}

export async function getFeaturedCoins(): Promise<CryptoData[]> {
  try {
    const cacheKey = "featured_coins";
    const response = await fetchWithCORS(
      `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=24h`,
      {},
      cacheKey
    );

    const allCoins = await handleApiResponse(response, "featured coins");

    // Filter coins based on criteria
    const eligibleCoins = allCoins.filter((coin: ExtendedCryptoData) => {
      const meetsVolume = coin.total_volume >= FEATURING_CRITERIA.minVolume;
      const meetsMarketCap = coin.market_cap >= FEATURING_CRITERIA.minMarketCap;

      return meetsVolume && meetsMarketCap;
    });

    // Calculate scores and sort
    const scoredCoins = eligibleCoins
      .map((coin: ExtendedCryptoData) => ({
        ...coin,
        score: calculateFeaturingScore(coin),
      }))
      .sort((a: ScoredCoin, b: ScoredCoin) => b.score - a.score);

    // Select top 3 coins to feature
    const featuredCoins = scoredCoins.slice(0, 3).map((coin: ScoredCoin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      current_price: coin.current_price,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      total_volume: coin.total_volume,
      market_cap: coin.market_cap,
      logo: coin.image,
    }));

    // Update SOL data using fetchWithCORS instead of direct fetch
    if (
      !featuredCoins.find((coin: ExtendedCryptoData) => coin.symbol === "SOL")
    ) {
      const solResponse = await fetchWithCORS(
        `${COINGECKO_API_BASE}/simple/price?ids=solana&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true`,
        {},
        "sol_price",
        PRICE_CACHE_DURATION
      );

      const solData = await handleApiResponse(solResponse, "SOL data");

      featuredCoins.unshift({
        id: "solana",
        name: "Solana",
        symbol: "SOL",
        current_price: solData.solana.usd,
        price_change_percentage_24h: solData.solana.usd_24h_change,
        total_volume: solData.solana.usd_24h_vol,
        market_cap: solData.solana.usd_market_cap,
        logo: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
      });

      // Keep only top 3
      featuredCoins.pop();
    }

    return featuredCoins;
  } catch (error) {
    console.warn("Using fallback data for featured coins:", error);
    return await updateFallbackPrices();
  }
}

async function updateFallbackPrices(): Promise<CryptoData[]> {
  try {
    const cacheKey = "fallback_prices";
    const response = await fetchWithCORS(
      `${COINGECKO_API_BASE}/simple/price?ids=solana,bonk,myro&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true`,
      {},
      cacheKey,
      PRICE_CACHE_DURATION
    );

    const data = await handleApiResponse(response, "fallback prices");

    return FALLBACK_FEATURED_COINS.map((coin: ExtendedCryptoData) => ({
      ...coin,
      current_price: data[coin.id]?.usd || 0,
      price_change_percentage_24h: data[coin.id]?.usd_24h_change || 0,
      total_volume: data[coin.id]?.usd_24h_vol || 0,
      market_cap: data[coin.id]?.usd_market_cap || 0,
    }));
  } catch (error) {
    console.warn("Failed to update fallback prices:", error);
    return FALLBACK_FEATURED_COINS;
  }
}

export async function getTrendingCoins(): Promise<CryptoData[]> {
  try {
    const cacheKey = "trending_coins";
    const response = await fetchWithCORS(
      `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&category=solana-ecosystem&order=volume_desc&per_page=100&sparkline=false&price_change_percentage=24h`,
      {},
      cacheKey
    );

    const allCoins = await handleApiResponse(response, "trending coins");

    const trendingCoins = allCoins
      .filter((coin: ExtendedCryptoData) => {
        const meetsVolume = coin.total_volume >= TRENDING_CRITERIA.minVolume;
        const meetsPriceChange =
          Math.abs(coin.price_change_percentage_24h) >=
          TRENDING_CRITERIA.minPriceChange;

        return (
          meetsVolume &&
          meetsPriceChange &&
          (coin.name.toLowerCase().includes("meme") ||
            coin.symbol.toLowerCase().includes("meme") ||
            coin.categories?.includes("meme") ||
            ["bonk", "myro", "wif", "bome"].includes(coin.symbol.toLowerCase()))
        );
      })
      .sort((a: ExtendedCryptoData, b: ExtendedCryptoData) => {
        const scoreA =
          (a.total_volume * Math.abs(a.price_change_percentage_24h)) / 100;
        const scoreB =
          (b.total_volume * Math.abs(b.price_change_percentage_24h)) / 100;
        return scoreB - scoreA;
      })
      .slice(0, 10)
      .map((coin: ExtendedCryptoData) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        current_price: coin.current_price,
        price_change_percentage_24h: coin.price_change_percentage_24h,
        total_volume: coin.total_volume,
        market_cap: coin.market_cap,
        logo: coin.image,
      }));

    if (trendingCoins.length === 0) {
      console.warn("No coins met trending criteria, using fallback data");
      return FALLBACK_TRENDING_COINS;
    }

    return trendingCoins;
  } catch (error) {
    console.warn("Using fallback data for trending coins:", error);
    return FALLBACK_TRENDING_COINS;
  }
}

export function calculateTrendingScore(
  volume: number,
  priceChange: number
): number {
  const normalizedVolume = Math.min(volume / 1000000, 100);
  const normalizedPriceChange = Math.min(Math.abs(priceChange), 100);

  const volumeWeight = 0.6;
  const priceChangeWeight = 0.4;

  return (
    normalizedVolume * volumeWeight + normalizedPriceChange * priceChangeWeight
  );
}

// Add verification helper
async function verifyMetadataCreation(
  connection: Connection,
  mint: PublicKey,
  expectedName: string,
  expectedSymbol: string
): Promise<boolean> {
  try {
    const metaplex = new Metaplex(connection);
    const metadata = await metaplex.nfts().findByMint({ mintAddress: mint });

    const checks = {
      exists: !!metadata,
      nameMatch: metadata?.name === expectedName,
      symbolMatch: metadata?.symbol === expectedSymbol,
      hasUri: !!metadata?.uri,
      hasImage: !!metadata?.json?.image,
    };

    console.log("Metadata verification results:", checks);

    return Object.values(checks).every((check) => check === true);
  } catch (error) {
    console.error("Metadata verification failed:", error);
    return false;
  }
}

export async function createTokenWithMetadata(
  connection: Connection,
  payer: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  metadata: TokenMetadata,
  imageUri: string
): Promise<{ mint: PublicKey; ata: PublicKey; metadataAddress: PublicKey }> {
  try {
    console.log("Starting token creation with metadata:", {
      name: metadata.name,
      symbol: metadata.symbol,
      imageUri,
    });

    // Create token
    const { mint, ata } = await createBasicToken(
      connection,
      payer,
      signTransaction,
      metadata
    );
    console.log("Token created successfully:", mint.toString());

    // Prepare metadata JSON with additional fields
    const tokenMetadataJson = {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      image: imageUri,
      attributes: [
        {
          trait_type: "token_type",
          value: "fungible",
        },
        {
          trait_type: "decimals",
          value: metadata.decimals.toString(),
        },
      ],
      properties: {
        files: [
          {
            uri: imageUri,
            type: "image/png",
          },
        ],
        category: "token",
        creators: [
          {
            address: payer.toString(),
            share: 100,
          },
        ],
      },
    };

    // Upload metadata with retry logic
    let metadataUri;
    for (let i = 0; i < 3; i++) {
      try {
        const metaplex = new Metaplex(connection);
        const result = await metaplex.nfts().uploadMetadata(tokenMetadataJson);
        metadataUri = result.uri;
        console.log("Metadata uploaded successfully:", metadataUri);
        break;
      } catch (error) {
        if (i === 2) throw error;
        console.warn(`Metadata upload attempt ${i + 1} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    // Create metadata PDA
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        mint.toBuffer(),
      ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    // Create metadata instruction
    const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAddress,
        mint,
        mintAuthority: payer,
        payer,
        updateAuthority: payer,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadataUri!,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      }
    );

    // Send transaction with retry logic
    let signature;
    for (let i = 0; i < 3; i++) {
      try {
        const transaction = new Transaction().add(createMetadataInstruction);
        transaction.feePayer = payer;

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        const signedTx = await signTransaction(transaction);
        signature = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(signature);
        console.log("Metadata transaction confirmed:", signature);
        break;
      } catch (error) {
        if (i === 2) throw error;
        console.warn(`Transaction attempt ${i + 1} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    // Verify metadata was created correctly
    const verified = await verifyMetadataCreation(
      connection,
      mint,
      metadata.name,
      metadata.symbol
    );

    if (!verified) {
      throw new Error("Metadata verification failed after creation");
    }

    console.log("Token creation with metadata completed successfully");
    return { mint, ata, metadataAddress };
  } catch (error) {
    console.error("Failed to create token with metadata:", error);
    if (error instanceof Error) {
      throw new TokenError(
        `Failed to create token with metadata: ${error.message}`,
        "METADATA_CREATION_ERROR"
      );
    } else {
      throw new TokenError(
        "Failed to create token with metadata: Unknown error",
        "METADATA_CREATION_ERROR"
      );
    }
  }
}

export async function verifyTokenMetadata(
  connection: Connection,
  mint: PublicKey
): Promise<boolean> {
  try {
    const metaplex = new Metaplex(connection);
    const nft = await metaplex.nfts().findByMint({ mintAddress: mint });

    // Verify the metadata exists and has required fields
    return !!(nft && nft.name && nft.symbol && nft.uri && nft.json?.image);
  } catch (error) {
    console.warn("Failed to verify token metadata:", error);
    return false;
  }
}

export async function getTokenMetadata(
  connection: Connection,
  mint: PublicKey
): Promise<{
  name: string;
  symbol: string;
  uri: string;
  image?: string;
} | null> {
  try {
    const metaplex = new Metaplex(connection);
    const nft = await metaplex.nfts().findByMint({ mintAddress: mint });

    if (!nft) return null;

    return {
      name: nft.name,
      symbol: nft.symbol,
      uri: nft.uri,
      image: nft.json?.image,
    };
  } catch (error) {
    console.warn("Failed to get token metadata:", error);
    return null;
  }
}

export async function testTokenMetadata(
  connection: Connection,
  wallet: WalletContextState
): Promise<void> {
  try {
    console.log("Starting token metadata test...");

    const testMetadata = {
      name: "Test Token",
      symbol: "TEST",
      description: "A test token with metadata",
      decimals: 9,
      initialSupply: 1000000,
      buyTaxEnabled: false,
      sellTaxEnabled: false,
      reflectionEnabled: false,
    };

    const testImageUri = "https://arweave.net/your-test-image-uri";

    const result = await createTokenWithMetadata(
      connection,
      wallet.publicKey!,
      wallet.signTransaction!,
      testMetadata,
      testImageUri
    );

    console.log("Test results:", {
      mint: result.mint.toString(),
      metadata: result.metadataAddress.toString(),
      ata: result.ata.toString(),
    });

    // Verify the metadata is readable
    const metadata = await getTokenMetadata(connection, result.mint);
    console.log("Retrieved metadata:", metadata);
  } catch (error) {
    console.error("Token metadata test failed:", error);
    throw error;
  }
}

export class TokenError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "TokenError";
  }
}

export function processCoin(coin: ExtendedCryptoData): void {
  console.log(`Processing coin: ${coin.name} (${coin.symbol})`);
}
