// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

// Simple in-memory cache for market metadata to avoid hitting the API on every request.
const metadataCache = new Map<string, { data: any; timestamp: number }>();
const METADATA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches static metadata for a market from the Polymarket Gamma API.
 * Uses an in-memory cache to avoid redundant API calls for slow-moving data.
 * @param marketId The condition ID of the market.
 * @returns The market metadata object or null if not found.
 */
async function getMarketMetadata(marketId: string): Promise<any | null> {
  const now = Date.now();
  const cachedEntry = metadataCache.get(marketId);

  if (cachedEntry && (now - cachedEntry.timestamp < METADATA_CACHE_TTL)) {
    // console.log(`[MarketService] Using cached metadata for ${marketId}.`);
    return cachedEntry.data;
  }

  try {
    // console.log(`[MarketService] Fetching fresh metadata for ${marketId} from Polymarket API.`);
    const response = await fetch(`https://gamma-api.polymarket.com/markets/${marketId}`);
    if (!response.ok) {
      console.warn(`[MarketService] Failed to fetch metadata for ${marketId} from Polymarket API. Status: ${response.status}`);
      // Don't cache failed attempts to allow for quick retries
      return null;
    }
    const metadata = await response.json();
    metadataCache.set(marketId, { data: metadata, timestamp: now });
    return metadata;
  } catch (error) {
    console.error(`[MarketService] Error fetching metadata for ${marketId}:`, error);
    return null;
  }
}

/**
 * Constructs a LiveMarket object by combining metadata from the Polymarket API
 * and live odds data from a Redis JSON string.
 * @param marketId The ID of the market.
 * @param metadata The market's metadata from the Polymarket API.
 * @param oddsData The market's odds data from `market:{id}`.
 * @returns A LiveMarket object or null if the data is invalid.
 */
function constructMarket(
    marketId: string,
    metadata: any | null,
    oddsData: any | null
): LiveMarket | null {
    if (!metadata || typeof metadata.question !== 'string' || !metadata.question) {
        console.warn(`[MarketService] Skipping market ${marketId}: Invalid or missing metadata from API, especially 'question'.`);
        return null;
    }

    if (!oddsData) {
        console.warn(`[MarketService] Skipping market ${marketId}: Missing live odds data from Redis.`);
        return null;
    }

    const yesPrice = typeof oddsData.yes_price === 'number' ? oddsData.yes_price : 0.5;
    const noPrice = typeof oddsData.no_price === 'number' ? oddsData.no_price : (1 - yesPrice);
    const category = metadata.category || 'General';

    return {
        id: marketId,
        question: metadata.question,
        yesPrice: parseFloat(yesPrice.toFixed(2)),
        noPrice: parseFloat(noPrice.toFixed(2)),
        category: category,
        endsAt: metadata.end_date_iso ? new Date(metadata.end_date_iso) : undefined,
        imageUrl: metadata.image_url || `https://placehold.co/600x400.png`,
        aiHint: metadata.ai_hint || category.toLowerCase().split(' ').slice(0, 2).join(' ') || 'event',
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
 * Fetches a paginated list of live markets using an efficient SSCAN loop.
 * This function fetches metadata from the Polymarket API and live odds from Redis, then combines them.
 * @param params - An object containing limit and offset for pagination.
 * @returns A promise that resolves to an object with the list of markets and the total count.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redis = getRedisClient();
    
    // Efficiently get the total count without loading all members
    const totalMarkets = await redis.scard('active_market_ids');
    if (totalMarkets === 0) {
      return { markets: [], total: 0 };
    }

    // Efficiently iterate through the set to get just the IDs we need for this page
    let cursor = 0;
    const collectedMarketIds: string[] = [];
    const neededIds = offset + limit;

    if (totalMarkets > 0) {
      do {
          const [nextCursor, members] = await redis.sscan('active_market_ids', cursor, { count: 100 });
          collectedMarketIds.push(...members);
          cursor = nextCursor;
      } while (cursor !== 0 && collectedMarketIds.length < neededIds);
    }
    
    const paginatedMarketIds = collectedMarketIds.slice(offset, offset + limit);

    if (paginatedMarketIds.length === 0) {
        return { markets: [], total: totalMarkets };
    }

    // Fetch live odds from Redis using a single mget for efficiency
    const oddsKeys = paginatedMarketIds.map(id => `market:${id}`);
    const oddsJsonStrings = await redis.mget<Array<string | null>>(...oddsKeys);

    // Fetch metadata for each market (will use cache where possible)
    const metadataPromises = paginatedMarketIds.map(id => getMarketMetadata(id));
    const metadataResults = await Promise.all(metadataPromises);

    const fetchedMarkets: LiveMarket[] = [];
    for (let i = 0; i < paginatedMarketIds.length; i++) {
        const marketId = paginatedMarketIds[i];
        const metadata = metadataResults[i];
        const oddsJsonString = oddsJsonStrings[i];

        let oddsData = null;
        if (oddsJsonString) {
            try {
                oddsData = JSON.parse(oddsJsonString);
            } catch (e) {
                console.error(`[MarketService] Failed to parse JSON for market odds ${marketId}. Data: "${oddsJsonString}"`, e);
            }
        }
        
        const market = constructMarket(marketId, metadata, oddsData);
        if (market) {
            fetchedMarkets.push(market);
        }
    }

    return { markets: fetchedMarkets, total: totalMarkets };
}

/**
 * Fetches the complete details for a single market by its ID.
 * @param marketId - The ID of the market to fetch.
 * @returns A promise that resolves to a LiveMarket object or null if not found.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    
    // Fetch both pieces of data in parallel
    const [metadata, oddsJsonString] = await Promise.all([
        getMarketMetadata(marketId),
        redis.get<string | null>(`market:${marketId}`)
    ]);

    let oddsData = null;
    if (oddsJsonString) {
        try {
            oddsData = JSON.parse(oddsJsonString);
        } catch (e) {
            console.error(`[MarketService] Failed to parse JSON for single market odds ${marketId}. Data: "${oddsJsonString}"`, e);
        }
    }

    return constructMarket(marketId, metadata, oddsData);
}
