
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
    const hasValidOdds = oddsData && typeof oddsData.yes_price === 'number' && typeof oddsData.no_price === 'number';

    if (!hasValidOdds && !metadata) {
        console.error(`[DIAGNOSTIC] Skipping market ${marketId}: Both odds and metadata are null.`);
        return null;
    }

    // Use metadata if available, otherwise create placeholders.
    const question = metadata?.question || `Market ID: ${marketId.slice(0, 12)}...`;
    const category = metadata?.category || "General";
    const imageUrl = metadata?.image_url || `https://placehold.co/600x400.png`;
    const aiHint = metadata?.ai_hint || category.toLowerCase().split(' ').slice(0, 2).join(' ') || 'event';
    const endsAt = metadata?.end_date_iso ? new Date(metadata.end_date_iso) : undefined;
    
    // Use live odds if available, otherwise use placeholder values (e.g., 0).
    const yesPrice = hasValidOdds ? oddsData.yes_price : 0;
    const noPrice = hasValidOdds ? oddsData.no_price : 0;

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
 * [DEFINITIVE FIX] Fetches a paginated list of live markets.
 * This version is resilient to cache misses in Redis.
 */
export async function getLiveMarkets({ limit = 3, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    console.log("--- [DIAGNOSTIC] getLiveMarkets initiated ---");
    const redis = getRedisClient();
    
    try {
        const marketIds = await redis.smembers('active_market_ids');
        const totalMarkets = marketIds.length;
        console.log(`[DIAGNOSTIC] Found ${totalMarkets} total market IDs in 'active_market_ids' set.`);

        if (totalMarkets === 0) {
            return { markets: [], total: 0 };
        }

        const paginatedMarketIds = marketIds.slice(offset, offset + limit);
        console.log(`[DIAGNOSTIC] Sliced to ${paginatedMarketIds.length} IDs for this page (offset: ${offset}, limit: ${limit}).`);

        if (paginatedMarketIds.length === 0) {
            return { markets: [], total: totalMarkets };
        }

        const oddsKeys = paginatedMarketIds.map(id => `market:${id}`);
        console.log(`[DIAGNOSTIC] Constructed Redis keys for MGET. Sample key: "${oddsKeys[0]}"`);
        
        const oddsJsonStrings = await redis.mget<Array<string | null>>(...oddsKeys);
        console.log(`[DIAGNOSTIC] Raw response from MGET for ${oddsKeys.length} keys:`, oddsJsonStrings);

        const marketPromises = paginatedMarketIds.map(async (marketId, i) => {
            console.log(`[DIAGNOSTIC] Processing item ${i+1}/${paginatedMarketIds.length}: ID ${marketId.slice(0,12)}...`);
            const oddsJsonString = oddsJsonStrings[i];
            let oddsData = null;

            if (oddsJsonString) {
                try {
                    oddsData = JSON.parse(oddsJsonString);
                } catch (e) {
                    console.error(`[DIAGNOSTIC] JSON Parse ERROR for ${marketId}:`, e);
                }
            } else {
                 console.error(`[DIAGNOSTIC] ERROR for ${marketId}: MGET returned null. The key 'market:${marketId}' likely does not exist or has expired.`);
            }

            // Fallback to fetching metadata if odds are missing, to ensure a card can be displayed
            if (!oddsData) {
                const metadata = await getMarketMetadata(marketId);
                return constructMarket(marketId, null, metadata);
            }
            
            return constructMarket(marketId, oddsData, null); // Pass null for metadata when odds are present
        });

        const fetchedMarkets = (await Promise.all(marketPromises)).filter((m): m is LiveMarket => m !== null);
        console.log(`--- [DIAGNOSTIC] getLiveMarkets FINISHED. Returning ${fetchedMarkets.length} markets. ---`);
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
