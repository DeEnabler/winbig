// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

// Simple in-memory cache for market metadata to avoid hitting the API on every request.
const metadataCache = new Map<string, { data: any; timestamp: number }>();
const METADATA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches static metadata for a SINGLE market from the Polymarket Gamma API.
 * Uses an in-memory cache to avoid redundant API calls.
 * THIS IS INTENTIONALLY ONLY FOR SINGLE-MARKET (DETAIL) VIEWS.
 * @param marketId The condition ID of the market.
 * @returns The market metadata object or null if not found.
 */
async function getMarketMetadata(marketId: string): Promise<any | null> {
  const now = Date.now();
  const cachedEntry = metadataCache.get(marketId);

  if (cachedEntry && (now - cachedEntry.timestamp < METADATA_CACHE_TTL)) {
    return cachedEntry.data;
  }

  try {
    const response = await fetch(`https://gamma-api.polymarket.com/markets/${marketId}`);
    if (!response.ok) {
      console.warn(`[MarketService] Failed to fetch metadata for ${marketId} from Polymarket API. Status: ${response.status}`);
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
 * Constructs a LiveMarket object.
 * This can now create a partial market from only odds, or a full market if metadata is provided.
 * @param marketId The ID of the market.
 * @param oddsData The market's odds data from `market:{id}`.
 * @param metadata Optional: The market's metadata from the Polymarket API.
 * @returns A LiveMarket object or null if the odds data is invalid.
 */
function constructMarket(
    marketId: string,
    oddsData: any | null,
    metadata?: any | null
): LiveMarket | null {
    if (!oddsData) {
        console.warn(`[MarketService] Skipping market ${marketId}: Missing live odds data from Redis.`);
        return null;
    }

    const yesPrice = typeof oddsData.yes_price === 'number' ? oddsData.yes_price : 0.5;
    const noPrice = typeof oddsData.no_price === 'number' ? oddsData.no_price : (1 - yesPrice);
    
    // Default values if metadata is not provided (for list view)
    const question = metadata?.question || `Market ID: ${marketId}`;
    const category = metadata?.category || "General";
    const imageUrl = metadata?.image_url || `https://placehold.co/600x400.png`;
    const aiHint = metadata?.ai_hint || category.toLowerCase().split(' ').slice(0, 2).join(' ') || 'event';
    const endsAt = metadata?.end_date_iso ? new Date(metadata.end_date_iso) : undefined;

    return {
        id: marketId,
        question: question,
        yesPrice: parseFloat(yesPrice.toFixed(2)),
        noPrice: parseFloat(noPrice.toFixed(2)),
        category: category,
        endsAt: endsAt,
        imageUrl: imageUrl,
        aiHint: aiHint,
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
 * THIS IS NOW LIGHTWEIGHT: It ONLY fetches odds from Redis.
 * It does NOT fetch external metadata, preventing server crashes.
 * @param params - An object containing limit and offset for pagination.
 * @returns A promise that resolves to an object with the list of markets (with partial data) and the total count.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redis = getRedisClient();
    
    const totalMarkets = await redis.scard('active_market_ids');
    if (totalMarkets === 0) {
      return { markets: [], total: 0 };
    }

    // Using smembers as sscan implementation was unstable. For a few hundred keys this is acceptable.
    // If scaling issues return, we must revisit the sscan implementation carefully.
    const allMarketIds = await redis.smembers('active_market_ids');
    
    const paginatedMarketIds = allMarketIds.slice(offset, offset + limit);

    if (paginatedMarketIds.length === 0) {
        return { markets: [], total: totalMarkets };
    }

    const oddsKeys = paginatedMarketIds.map(id => `market:${id}`);
    const oddsJsonStrings = oddsKeys.length ? await redis.mget<Array<string | null>>(...oddsKeys) : [];

    const fetchedMarkets: LiveMarket[] = [];
    for (let i = 0; i < paginatedMarketIds.length; i++) {
        const marketId = paginatedMarketIds[i];
        const oddsJsonString = oddsJsonStrings[i];

        let oddsData = null;
        if (oddsJsonString) {
            try {
                oddsData = JSON.parse(oddsJsonString);
            } catch (e) {
                console.error(`[MarketService] Failed to parse JSON for market odds ${marketId}. Data: "${oddsJsonString}"`, e);
            }
        }
        
        // Construct market with ONLY odds data. No external metadata fetch here.
        const market = constructMarket(marketId, oddsData);
        if (market) {
            fetchedMarkets.push(market);
        }
    }

    return { markets: fetchedMarkets, total: totalMarkets };
}

/**
 * Fetches the COMPLETE details for a single market by its ID.
 * This is the ONLY function that should fetch external metadata.
 * @param marketId - The ID of the market to fetch.
 * @returns A promise that resolves to a full LiveMarket object or null if not found.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    
    // Fetch both Redis odds and external metadata in parallel
    const [oddsJsonString, metadata] = await Promise.all([
        redis.get<string | null>(`market:${marketId}`),
        getMarketMetadata(marketId) 
    ]);

    let oddsData = null;
    if (oddsJsonString) {
        try {
            oddsData = JSON.parse(oddsJsonString);
        } catch (e) {
            console.error(`[MarketService] Failed to parse JSON for single market odds ${marketId}. Data: "${oddsJsonString}"`, e);
        }
    }

    // Construct the full market object using both data sources
    return constructMarket(marketId, oddsData, metadata);
}
