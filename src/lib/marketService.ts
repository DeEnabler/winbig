
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
    oddsData: any | null,
    metadata?: any | null
): LiveMarket | null {
    const hasValidOdds = oddsData && typeof oddsData.yes_price === 'number';

    // If we have neither valid odds nor metadata, we cannot construct a market.
    if (!hasValidOdds && !metadata) {
        return null;
    }

    // Use metadata if available, otherwise create placeholders.
    const question = metadata?.question || `Market ID: ${marketId.slice(0, 8)}...`;
    const category = metadata?.category || "General";
    const imageUrl = metadata?.image_url || `https://placehold.co/600x400.png`;
    const aiHint = metadata?.ai_hint || category.toLowerCase().split(' ').slice(0, 2).join(' ') || 'event';
    const endsAt = metadata?.end_date_iso ? new Date(metadata.end_date_iso) : undefined;
    
    // Use live odds if available, otherwise use placeholder values (e.g., 0).
    const yesPrice = hasValidOdds ? oddsData.yes_price : 0;
    const noPrice = hasValidOdds ? (oddsData.no_price ?? (1 - yesPrice)) : 0;

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
 * [DEFINITIVE FIX] Fetches a paginated list of live markets from Redis.
 * This function is fast, Redis-only, and makes no external API calls.
 * It is resilient to temporarily missing odds data.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
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

        const oddsKeys = paginatedMarketIds.map(id => `market:${id}`);
        const oddsJsonStrings = await redis.mget<Array<string | null>>(...oddsKeys);

        const fetchedMarkets = oddsJsonStrings.map((oddsJsonString, i) => {
            const marketId = paginatedMarketIds[i];
            let oddsData = null;

            if (oddsJsonString) {
                try {
                    oddsData = JSON.parse(oddsJsonString);
                } catch (e) {
                    console.warn(`[MarketService] Failed to parse JSON for market odds ${marketId}. Data: "${oddsJsonString}"`, e);
                }
            }
            
            // This is the key change: construct market with ONLY Redis data.
            // If oddsData is null, constructMarket will also return null.
            return constructMarket(marketId, oddsData, null);

        }).filter((m): m is LiveMarket => m !== null); // Filter out any nulls, which handles missing/invalid odds gracefully.
        
        return { markets: fetchedMarkets, total: totalMarkets };

    } catch (error) {
        console.error('[MarketService] A critical error occurred in getLiveMarkets:', error);
        // In case of a Redis connection error, return an empty list.
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
    const [oddsJsonString, metadata] = await Promise.all([
        redis.get<string | null>(`market:${marketId}`),
        getMarketMetadata(marketId) // This is the external API call, now isolated here.
    ]);

    let oddsData = null;
    if (oddsJsonString) {
        try {
            oddsData = JSON.parse(oddsJsonString);
        } catch (e) {
            console.error(`[MarketService] Failed to parse JSON for single market odds ${marketId}. Data: "${oddsJsonString}"`, e);
        }
    }
    
    // If we can't find *any* data for this market, it's truly not found.
    if (!oddsData && !metadata) {
      console.warn(`[MarketService] No data found for market ${marketId} in either Redis or the API.`);
      return null;
    }

    // Construct the market WITH full metadata and any available odds.
    return constructMarket(marketId, oddsData, metadata);
}
