// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

// --- In-Memory Cache for slow-moving market metadata ---
interface CachedMetadata {
  metadata: Map<string, Record<string, string>>;
  timestamp: number;
}
let metadataCache: CachedMetadata | null = null;
const METADATA_CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes, as per the guide

/**
 * Fetches and caches metadata for ALL active markets.
 * This should be called to get the base data, which changes infrequently.
 * @returns A Map of marketId -> metadata object.
 */
async function getOrUpdateAllMetadata(): Promise<Map<string, Record<string, string>>> {
  const now = Date.now();
  const redis = getRedisClient();

  // 1. Check if cache is valid
  if (metadataCache && (now - metadataCache.timestamp) < METADATA_CACHE_DURATION_MS) {
    console.log('[MarketService] Using cached metadata.');
    return metadataCache.metadata;
  }

  // 2. Fetch all active IDs from Redis
  console.log('[MarketService] Metadata cache stale or empty. Fetching all market metadata from Redis.');
  const activeMarketIds = await redis.smembers('active_market_ids');
  if (!activeMarketIds || activeMarketIds.length === 0) {
    return new Map();
  }

  // 3. Pipeline to get all metadata hashes
  const pipeline = redis.pipeline();
  activeMarketIds.forEach(marketId => {
    pipeline.hgetall(`meta:market:${marketId}`);
  });
  const results = await pipeline.exec<Array<Record<string, string> | null>>();

  // 4. Process and cache the results
  const newMetadataMap = new Map<string, Record<string, string>>();
  results.forEach((metaData, index) => {
    const marketId = activeMarketIds[index];
    if (metaData && Object.keys(metaData).length > 0) {
      newMetadataMap.set(marketId, metaData);
    }
  });
  
  metadataCache = {
    metadata: newMetadataMap,
    timestamp: now,
  };
  console.log(`[MarketService] Cached metadata for ${newMetadataMap.size} markets.`);
  return newMetadataMap;
}


/**
 * A helper function to construct a LiveMarket object from raw Redis data.
 * This can be reused by both getLiveMarkets and getMarketDetails.
 * @param marketId The ID of the market.
 * @param metaData The hash data from the `meta:market:` key.
 * @param oddsData The hash data from the `odds:` key.
 * @returns A LiveMarket object or null if the data is invalid.
 */
function constructMarketFromData(
    marketId: string,
    metaData: Record<string, string> | null,
    oddsData: Record<string, string> | null
): LiveMarket | null {
    // A market is only considered valid if it has metadata, especially a question.
    if (!metaData || !metaData.question) {
        // This is not a warning, as some odds might exist for markets whose metadata is not yet synced.
        return null;
    }

    const yesPrice = oddsData?.yes_price ? parseFloat(oddsData.yes_price) : 0.5;
    const noPrice = 1 - yesPrice; // More reliable calculation

    if (isNaN(yesPrice)) {
        console.warn(`[MarketService] Skipping market ${marketId} due to invalid price data. Yes: ${oddsData?.yes_price}`);
        return null;
    }

    return {
        id: marketId,
        question: metaData.question,
        yesPrice: Math.max(0.01, Math.min(0.99, yesPrice)),
        noPrice: Math.max(0.01, Math.min(0.99, noPrice)),
        category: metaData.category || 'General',
        endsAt: metaData.endDateIso ? new Date(metaData.endDateIso) : undefined,
        imageUrl: metaData.image_url || `https://placehold.co/600x400.png`,
        aiHint: metaData.ai_hint || 'event',
        payoutTeaser: `Bet YES to win ${(1 / Math.max(0.01, yesPrice)).toFixed(1)}x`,
    };
}


// --- API-Facing Functions ---

interface GetLiveMarketsParams {
  limit?: number;
  offset?: number;
}

interface LiveMarketsResponse {
  markets: LiveMarket[];
  total: number;
}

/**
 * Fetches a paginated list of live markets.
 * This function implements the "Smart Polling" strategy:
 * - It fetches and caches the slow-moving metadata for all markets.
 * - On each request, it fetches only the fast-moving odds data for the requested page.
 *
 * @param params - An object containing limit and offset for pagination.
 * @returns A promise that resolves to an object with the list of markets and the total count.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redis = getRedisClient();

    // 1. Get all market metadata (from cache if fresh, otherwise fetches all)
    const allMetadata = await getOrUpdateAllMetadata();
    const allMarketIds = Array.from(allMetadata.keys());
    const totalMarkets = allMarketIds.length;

    if (totalMarkets === 0) {
      return { markets: [], total: 0 };
    }

    // 2. Get the specific page of market IDs to fetch live odds for
    const paginatedMarketIds = allMarketIds.slice(offset, offset + limit);
    if (paginatedMarketIds.length === 0) {
        return { markets: [], total: totalMarkets };
    }
    
    // 3. Pipeline to get ONLY the fast-moving odds for the current page
    console.log(`[MarketService] Fetching live odds for ${paginatedMarketIds.length} markets.`);
    const oddsPipeline = redis.pipeline();
    paginatedMarketIds.forEach(marketId => {
        oddsPipeline.hgetall(`odds:${marketId}`);
    });
    const oddsResults = await oddsPipeline.exec<Array<Record<string, string> | null>>();

    // 4. Construct the final market list by combining cached metadata and fresh odds
    const fetchedMarkets: LiveMarket[] = [];
    paginatedMarketIds.forEach((marketId, index) => {
        const metaData = allMetadata.get(marketId); // From cache
        const oddsData = oddsResults[index];        // Fresh from Redis

        const market = constructMarketFromData(marketId, metaData || null, oddsData);
        if (market) {
            fetchedMarkets.push(market);
        }
    });

    return { markets: fetchedMarkets, total: totalMarkets };
}

/**
 * Fetches the complete details for a single market by its ID.
 * Leverages the metadata cache for efficiency.
 * @param marketId - The ID of the market to fetch.
 * @returns A promise that resolves to a LiveMarket object or null if not found.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    
    // 1. Get all metadata (ensures cache is warm if this is the first call)
    const allMetadata = await getOrUpdateAllMetadata();
    const metaData = allMetadata.get(marketId);

    if (!metaData) {
      console.warn(`[MarketService] No metadata found for market ${marketId}, cannot get details.`);
      return null;
    }

    // 2. Fetch the live odds for just this market
    const oddsData = await redis.hgetall(`odds:${marketId}`);

    return constructMarketFromData(marketId, metaData, oddsData);
}
