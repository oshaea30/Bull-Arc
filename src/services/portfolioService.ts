import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Metaplex } from "@metaplex-foundation/js";
import { tokenStorageService } from "./tokenStorageService";
import { PortfolioToken, TokenStats, StoredToken } from "../types/token";
import { getPoolInfo, PoolInfo } from "./dexService";
import { CONFIG } from "../config";

// Cache configuration with longer duration for metadata
const METADATA_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for metadata
const STATS_CACHE_DURATION = 60 * 1000; // 1 minute for stats
const REQUEST_WINDOW = CONFIG.REQUEST_WINDOW;
const MAX_REQUESTS_PER_WINDOW = CONFIG.MAX_REQUESTS_PER_WINDOW;
const PRICE_HISTORY_LIMIT = CONFIG.PRICE_HISTORY_LIMIT;
const MAX_RETRIES = CONFIG.MAX_RETRIES;
const BASE_DELAY = CONFIG.BASE_DELAY;
const MAX_DELAY = CONFIG.MAX_DELAY;
const BATCH_SIZE = 10; // Reduced batch size for better performance
const BATCH_DELAY = 500; // Reduced delay between batches

// Separate caches for metadata and stats
const metadataCache = new Map<string, { data: any; timestamp: number }>();
const statsCache = new Map<string, { data: any; timestamp: number }>();

// Rate limiting
const requestTimestamps: number[] = [];

// Historical price tracking
const STORAGE_KEY_PREFIX = "price_history_";
const PRICE_HISTORY = new Map<string, { price: number; timestamp: number }[]>();

function canMakeRequest(): boolean {
  const now = Date.now();
  // Remove timestamps older than the window
  while (
    requestTimestamps.length > 0 &&
    requestTimestamps[0] < now - REQUEST_WINDOW
  ) {
    requestTimestamps.shift();
  }
  return requestTimestamps.length < MAX_REQUESTS_PER_WINDOW;
}

async function waitForRateLimit(): Promise<void> {
  if (canMakeRequest()) {
    requestTimestamps.push(Date.now());
    return;
  }

  const oldestRequest = requestTimestamps[0];
  const waitTime = REQUEST_WINDOW - (Date.now() - oldestRequest);
  console.log(`Rate limit reached, waiting ${waitTime}ms before next request`);
  await new Promise((resolve) => setTimeout(resolve, waitTime));
  return waitForRateLimit();
}

async function fetchWithRetry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = BASE_DELAY
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      await waitForRateLimit();
      return await operation();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Check if it's a rate limit error (429)
      const is429 =
        error.message.includes("429") ||
        error.message.includes("Too Many Requests");

      if (i === retries - 1 && !is429) {
        throw error;
      }

      // For 429 errors, use a longer delay
      const currentDelay = is429
        ? MAX_DELAY
        : Math.min(delay * Math.pow(2, i), MAX_DELAY);

      console.warn(
        `${is429 ? "Rate limit exceeded" : "Request failed"}, attempt ${
          i + 1
        }/${retries}, waiting ${currentDelay}ms...`,
        error
      );

      await new Promise((resolve) => setTimeout(resolve, currentDelay));

      // If we hit a rate limit, we should reset our request counter
      if (is429) {
        requestTimestamps.length = 0;
        i = Math.max(0, i - 1); // Give one more try after a rate limit
      }
    }
  }
  throw new Error("Maximum retries exceeded");
}

function getCachedMetadata<T>(key: string): T | null {
  const cached = metadataCache.get(key);
  if (cached && Date.now() - cached.timestamp < METADATA_CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function getCachedStats<T>(key: string): T | null {
  const cached = statsCache.get(key);
  if (cached && Date.now() - cached.timestamp < STATS_CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedMetadata<T>(key: string, data: T) {
  metadataCache.set(key, { data, timestamp: Date.now() });
}

function setCachedStats<T>(key: string, data: T) {
  statsCache.set(key, { data, timestamp: Date.now() });
}

function persistPriceHistory(
  mintAddress: string,
  history: { price: number; timestamp: number }[]
) {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${mintAddress}`,
      JSON.stringify(history)
    );
  } catch (error) {
    console.warn("Failed to persist price history:", error);
  }
}

function loadPersistedPriceHistory(mintAddress: string) {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${mintAddress}`);
    if (stored) {
      const history = JSON.parse(stored);
      // Validate and filter old entries
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return history.filter(
        (entry: any) =>
          entry.timestamp >= oneDayAgo &&
          typeof entry.price === "number" &&
          typeof entry.timestamp === "number"
      );
    }
  } catch (error) {
    console.warn("Failed to load persisted price history:", error);
  }
  return [];
}

function updatePriceHistory(mintAddress: string, price: number) {
  if (!PRICE_HISTORY.has(mintAddress)) {
    // Load persisted history when initializing
    const persisted = loadPersistedPriceHistory(mintAddress);
    PRICE_HISTORY.set(mintAddress, persisted);
  }

  const history = PRICE_HISTORY.get(mintAddress)!;
  const now = Date.now();

  // Only add new price if it's different from the last one
  const lastEntry = history[history.length - 1];
  if (!lastEntry || lastEntry.price !== price) {
    history.push({ price, timestamp: now });
  }

  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const updatedHistory = history
    .filter((entry) => entry.timestamp >= oneDayAgo)
    .slice(-PRICE_HISTORY_LIMIT);

  PRICE_HISTORY.set(mintAddress, updatedHistory);
  persistPriceHistory(mintAddress, updatedHistory);
}

function calculatePriceChange(
  mintAddress: string,
  currentPrice: number
): number {
  const history = PRICE_HISTORY.get(mintAddress);
  if (!history || history.length === 0) return 0;

  // Get oldest price in last 24 hours
  const oldestPrice = history[0].price;
  if (oldestPrice === 0) return 0;

  return ((currentPrice - oldestPrice) / oldestPrice) * 100;
}

async function loadTokenAccounts(
  connection: Connection,
  owner: PublicKey
): Promise<PortfolioToken[]> {
  try {
    console.log(`Loading token accounts for owner: ${owner.toString()}`);

    const tokenAccounts = await fetchWithRetry(() =>
      connection.getParsedTokenAccountsByOwner(owner, {
        programId: TOKEN_PROGRAM_ID,
      })
    );

    if (!tokenAccounts?.value?.length) {
      console.log(`No token accounts found for owner: ${owner.toString()}`);
      return [];
    }

    const nonEmptyAccounts = tokenAccounts.value.filter((account) => {
      const parsedInfo = account.account.data.parsed.info;
      return (
        parsedInfo?.tokenAmount?.uiAmount > 0 &&
        parsedInfo?.tokenAmount?.decimals > 0
      );
    });

    console.log(`Found ${nonEmptyAccounts.length} non-empty token accounts`);

    return nonEmptyAccounts.map((account) => {
      const parsedInfo = account.account.data.parsed.info;
      const mintAddress = parsedInfo.mint;
      console.log(`Processing token account with mint: ${mintAddress}`);
      return {
        mint: new PublicKey(mintAddress),
        amount: parsedInfo.tokenAmount.uiAmount,
        metadata: {
          name: `Token ${mintAddress.slice(0, 8)}...`,
          symbol: mintAddress.slice(0, 4).toUpperCase(),
        },
        decimals: parsedInfo.tokenAmount.decimals,
      };
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(
      `Error loading token accounts for owner ${owner.toString()}:`,
      error
    );
    throw new Error(`Failed to load token accounts: ${error.message}`);
  }
}

async function getTokenMetadata(
  connection: Connection,
  mintAddress: PublicKey,
  fallbackName?: string,
  fallbackSymbol?: string
): Promise<{
  name: string;
  symbol: string;
  uri: string;
  image?: string;
}> {
  const cacheKey = `metadata_${mintAddress.toString()}`;
  const cached = getCachedMetadata<any>(cacheKey);
  if (cached) {
    console.log(`Using cached metadata for ${mintAddress.toString()}`);
    return cached;
  }

  try {
    // Try to get stored token data first as it's most reliable
    const storedToken = await tokenStorageService.getTokenByMint(
      mintAddress.toString()
    );
    if (storedToken?.name && storedToken?.symbol) {
      console.log(`Using stored metadata for ${mintAddress.toString()}`);
      const result = {
        name: storedToken.name,
        symbol: storedToken.symbol,
        uri: storedToken.metadataUrl || "",
        image: storedToken.imageUrl,
      };
      setCachedMetadata(cacheKey, result);
      return result;
    }

    // Try Metaplex metadata as fallback
    try {
      console.log(`Fetching Metaplex metadata for ${mintAddress.toString()}`);
      const metaplex = new Metaplex(connection);
      const nft = await fetchWithRetry(() =>
        metaplex.nfts().findByMint({ mintAddress })
      );

      if (nft) {
        const result = {
          name:
            nft.name ||
            fallbackName ||
            `Token ${mintAddress.toString().slice(0, 8)}...`,
          symbol:
            nft.symbol ||
            fallbackSymbol ||
            mintAddress.toString().slice(0, 4).toUpperCase(),
          uri: nft.uri || "",
          image: nft.json?.image,
        };

        // Save this metadata
        const storedToken: StoredToken = {
          name: result.name,
          symbol: result.symbol,
          address: mintAddress.toString(),
          mint: mintAddress.toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          currentPrice: 0,
          poolId: "pending",
          imageUrl: result.image,
          metadataUrl: nft.uri,
        };

        await tokenStorageService.saveToken(storedToken);
        setCachedMetadata(cacheKey, result);
        return result;
      }
    } catch (metaplexError) {
      console.warn("Metaplex metadata fetch failed:", metaplexError);
    }

    // Return fallback data if nothing else worked
    const result = {
      name: fallbackName || `Token ${mintAddress.toString().slice(0, 8)}...`,
      symbol:
        fallbackSymbol || mintAddress.toString().slice(0, 4).toUpperCase(),
      uri: "",
    };
    setCachedMetadata(cacheKey, result);
    return result;
  } catch (error) {
    console.warn(
      `Error fetching metadata for ${mintAddress.toString()}:`,
      error
    );
    const result = {
      name: fallbackName || `Token ${mintAddress.toString().slice(0, 8)}...`,
      symbol:
        fallbackSymbol || mintAddress.toString().slice(0, 4).toUpperCase(),
      uri: "",
    };
    setCachedMetadata(cacheKey, result);
    return result;
  }
}

async function getTokenStats(
  connection: Connection,
  mintAddress: string
): Promise<TokenStats | undefined> {
  const cacheKey = `stats_${mintAddress}`;
  const cached = getCachedStats<TokenStats>(cacheKey);
  if (cached) return cached;

  try {
    // Try to get stored token data and pool info in parallel with retries
    const [storedToken, poolInfo] = await Promise.all([
      fetchWithRetry(() => tokenStorageService.getTokenByMint(mintAddress)),
      fetchWithRetry(() => getPoolInfo(connection, mintAddress)),
    ]);

    let price = 0;
    let volume = 0;
    let marketCap = 0;

    if (poolInfo) {
      price = poolInfo.price;
      volume = poolInfo.volume24h;
      marketCap = poolInfo.marketCap;
    } else if (storedToken) {
      price = storedToken.currentPrice;
      volume = storedToken.volume24h || 0;
    }

    // Update price history and calculate change
    if (price > 0) {
      updatePriceHistory(mintAddress, price);
    }

    const priceChange = calculatePriceChange(mintAddress, price);

    const result: TokenStats = {
      price,
      priceChange24h: priceChange,
      volume24h: volume,
      marketCap,
      holders: storedToken?.holders || 0,
    };

    setCachedStats(cacheKey, result);
    return result;
  } catch (error) {
    console.warn(`Error fetching stats for ${mintAddress}:`, error);
    return {
      price: 0,
      priceChange24h: 0,
      volume24h: 0,
      marketCap: 0,
      holders: 0,
    };
  }
}

export async function getPortfolioTokens(
  connection: Connection,
  owner: PublicKey
): Promise<PortfolioToken[]> {
  try {
    console.log(`Loading portfolio tokens for: ${owner.toString()}`);

    // Load token accounts and stored tokens in parallel
    const [tokens, storedTokens] = await Promise.all([
      loadTokenAccounts(connection, owner),
      tokenStorageService.getTokens(),
    ]);

    console.log(
      `Found ${tokens.length} token accounts and ${storedTokens.length} stored tokens`
    );

    const storedTokenMap = new Map(
      storedTokens.map((token) => [token.mint, token])
    );

    // Process tokens in smaller batches with optimized parallel processing
    const enhancedTokens: PortfolioToken[] = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(
          tokens.length / BATCH_SIZE
        )}`
      );

      // Process each token in the batch in parallel
      const batchPromises = batch.map(async (token) => {
        try {
          const storedToken = storedTokenMap.get(token.mint.toString());

          // Use stored data if it's fresh enough
          if (
            storedToken &&
            storedToken.updatedAt &&
            Date.now() - new Date(storedToken.updatedAt).getTime() <
              METADATA_CACHE_DURATION
          ) {
            return {
              ...token,
              metadata: {
                name: storedToken.name,
                symbol: storedToken.symbol,
                uri: storedToken.metadataUrl || "",
              },
              imageUrl: storedToken.imageUrl,
              metadataUrl: storedToken.metadataUrl,
              stats: {
                price: storedToken.currentPrice || 0,
                priceChange24h: 0,
                volume24h: storedToken.volume24h || 0,
                marketCap: 0,
                holders: storedToken.holders || 0,
              },
              value: token.amount * (storedToken.currentPrice || 0),
              explorerUrl: `https://solscan.io/token/${token.mint.toString()}`,
            };
          }

          // Get metadata and stats in parallel
          const [metadata, stats] = await Promise.all([
            getTokenMetadata(
              connection,
              token.mint,
              token.metadata.name,
              token.metadata.symbol
            ),
            getTokenStats(connection, token.mint.toString()),
          ]);

          // Save the updated token data
          if (metadata.name && metadata.symbol) {
            const updatedToken: StoredToken = {
              name: metadata.name,
              symbol: metadata.symbol,
              address: token.mint.toString(),
              mint: token.mint.toString(),
              createdAt: storedToken?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              currentPrice: stats?.price || 0,
              poolId: storedToken?.poolId || "pending",
              volume24h: stats?.volume24h,
              holders: stats?.holders,
              imageUrl: metadata.image,
              metadataUrl: metadata.uri,
            };

            await tokenStorageService.saveToken(updatedToken);
          }

          return {
            ...token,
            metadata: {
              name: metadata.name,
              symbol: metadata.symbol,
              uri: metadata.uri,
            },
            imageUrl: metadata.image,
            metadataUrl: metadata.uri,
            stats,
            value: stats ? token.amount * stats.price : undefined,
            explorerUrl: `https://solscan.io/token/${token.mint.toString()}`,
          };
        } catch (error) {
          console.warn(
            `Error enhancing token data for ${token.mint.toString()}:`,
            error
          );
          return {
            ...token,
            stats: {
              price: 0,
              priceChange24h: 0,
              volume24h: 0,
              marketCap: 0,
              holders: 0,
            },
            value: 0,
            explorerUrl: `https://solscan.io/token/${token.mint.toString()}`,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      enhancedTokens.push(...batchResults);

      // Add a small delay between batches to help with rate limiting
      if (i + BATCH_SIZE < tokens.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }

    return enhancedTokens;
  } catch (error) {
    console.error("Error loading portfolio tokens:", error);
    throw error;
  }
}
