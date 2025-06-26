
// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

// In-memory cache for market METADATA to avoid hitting the Polymarket API on every request.
const metadataCache = new Map<string, { data: any; timestamp: number }>();
const METADATA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches static metadata for a SINGLE market from the Polymarket Gamma API.
 * Uses an in-memory cache to avoid redundant API calls.
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
 * A flexible helper to construct a LiveMarket object from various data sources.
 * This function is now more resilient and doesn't assume all data is present.
 */
function constructMarket(
    marketId: string,
    oddsData: any | null, // Expects { yes, no, last_updated }
    metadata?: any | null
): LiveMarket | null {
    // If we have no metadata, we cannot display a meaningful card.
    if (!metadata) {
      console.warn(`[DIAGNOSTIC] Skipping market ${marketId}: Metadata is required but was not provided or fetched.`);
      return null;
    }

    // Check for a valid odds object with the correct properties.
    const hasValidOdds = oddsData && typeof oddsData.yes === 'number' && typeof oddsData.no === 'number';

    // Use metadata if available, otherwise create placeholders.
    const question = metadata?.question || `Market ID: ${marketId.slice(0, 12)}...`;
    const category = metadata?.category || "General";
    const imageUrl = metadata?.image_url || `https://placehold.co/600x400.png`;
    const aiHint = metadata?.ai_hint || category.toLowerCase().split(' ').slice(0, 2).join(' ') || 'event';
    const endsAt = metadata?.end_date_iso ? new Date(metadata.end_date_iso) : undefined;
    
    // Use live odds if available, otherwise use placeholder values (e.g., 0).
    const yesPrice = hasValidOdds ? oddsData.yes : 0;
    const noPrice = hasValidOdds ? oddsData.no : 0;

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
 * Fetches a paginated list of live markets from Redis.
 * It is designed to be resilient to temporary cache misses for individual markets.
 */
export async function getLiveMarkets({ limit = 3, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redis = getRedisClient();
    
    try {
        const marketIds = await redis.smembers('active_market_ids');
        const totalMarkets = marketIds.length;

        if (totalMarkets === 0) {
            return { markets: [], total: 0 };
        }

        const paginatedMarketIds = marketIds.slice(offset, offset + limit);

        if (paginatedMarketIds.length === 0) {
            return { markets: [], total: totalMarkets };
        }

        // CRITICAL FIX: Use the correct "odds:" prefix as per the architect's guidance.
        const oddsKeys = paginatedMarketIds.map(id => `odds:${id}`);
        
        const oddsJsonStrings = await redis.mget<Array<string | null>>(...oddsKeys);

        const marketPromises = paginatedMarketIds.map(async (marketId, i) => {
            const oddsJsonString = oddsJsonStrings[i];
            let oddsData = null;

            if (oddsJsonString) {
                try {
                    // CRITICAL FIX: Parse the correct JSON schema { yes, no, ... }
                    oddsData = JSON.parse(oddsJsonString);
                } catch (e) {
                    console.error(`[MarketService] JSON Parse ERROR for market ${marketId}:`, e);
                    // Continue without odds data, will fallback to metadata-only display.
                }
            } else {
                 console.warn(`[MarketService] Odds data from Redis is null for market: ${marketId}. Will rely on metadata fallback.`);
            }
            
            // Metadata is required for a useful display, so it's always fetched.
            // This is acceptable as it's cached in-memory.
            const metadata = await getMarketMetadata(marketId);
            
            return constructMarket(marketId, oddsData, metadata);
        });

        const fetchedMarkets = (await Promise.all(marketPromises)).filter((m): m is LiveMarket => m !== null);
        return { markets: fetchedMarkets, total: totalMarkets };

    } catch (error) {
        console.error('[MarketService] A critical error occurred in getLiveMarkets:', error);
        return { markets: [], total: 0 };
    }
}


/**
 * [HEAVY & ON-DEMAND] Fetches the COMPLETE details for a single market by its ID.
 * This is for detail pages. It fetches both Redis odds and external metadata.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    
    // Fetch odds and metadata concurrently for performance.
    // CRITICAL FIX: Use the correct "odds:" prefix.
    const [oddsJsonString, metadata] = await Promise.all([
        redis.get<string | null>(`odds:${marketId}`),
        getMarketMetadata(marketId)
    ]);

    let oddsData = null;
    if (oddsJsonString) {
        try {
            // CRITICAL FIX: Parse the correct JSON schema { yes, no, ... }
            oddsData = JSON.parse(oddsJsonString);
        } catch (e) {
            console.error(`[MarketService] Failed to parse JSON for single market odds ${marketId}. Data: "${oddsJsonString}"`, e);
        }
    }
    
    if (!metadata) {
      console.warn(`[MarketService] No metadata found for market ${marketId}. Cannot construct market details.`);
      return null;
    }

    // Construct the market WITH full metadata and any available odds.
    return constructMarket(marketId, oddsData, metadata);
}
