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
 * A flexible helper to construct a LiveMarket object.
 * Handles both lightweight (odds only) and full (odds + metadata) data.
 */
function constructMarket(
    marketId: string,
    oddsData: any | null,
    metadata?: any | null
): LiveMarket | null {
    console.log(`[DIAGNOSTIC] constructMarket called for ID: ${marketId.slice(0,10)}...`);
    if (!oddsData || typeof oddsData.yes_price !== 'number') {
        console.error(`[DIAGNOSTIC] constructMarket validation FAILED for ${marketId}. 'oddsData' or 'oddsData.yes_price' is invalid. Received oddsData:`, oddsData);
        return null;
    }
    console.log(`[DIAGNOSTIC] constructMarket validation PASSED for ${marketId}.`);

    const yesPrice = oddsData.yes_price;
    const noPrice = oddsData.no_price ?? (1 - yesPrice);
    
    // Use metadata if available, otherwise use placeholders for the lightweight view
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
 * [LIGHTWEIGHT & FAST] Fetches a paginated list of live markets for the homepage.
 * This is the LEAN version. It ONLY fetches odds from Redis.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    console.log('--- [DIAGNOSTIC] getLiveMarkets initiated ---');
    const redis = getRedisClient();
    
    try {
        const allMarketIds = await redis.smembers('active_market_ids');
        const totalMarkets = allMarketIds.length;
        console.log(`[DIAGNOSTIC] Found ${totalMarkets} total market IDs in 'active_market_ids' set.`);

        if (totalMarkets === 0) {
            console.log("[DIAGNOSTIC] No active markets found in set. Returning empty array.");
            return { markets: [], total: 0 };
        }
        
        const paginatedMarketIds = allMarketIds.slice(offset, offset + limit);
        console.log(`[DIAGNOSTIC] Sliced to ${paginatedMarketIds.length} IDs for this page (offset: ${offset}, limit: ${limit}).`);

        if (paginatedMarketIds.length === 0) {
            console.log("[DIAGNOSTIC] Paginated IDs list is empty. Returning empty array.");
            return { markets: [], total: totalMarkets };
        }

        const oddsKeys = paginatedMarketIds.map(id => `market:${id}`);
        console.log(`[DIAGNOSTIC] Constructed Redis keys for MGET. Sample key: "${oddsKeys[0]}"`);

        const oddsJsonStrings = oddsKeys.length ? await redis.mget<Array<string | null>>(...oddsKeys) : [];
        console.log(`[DIAGNOSTIC] Raw response from MGET for ${oddsKeys.length} keys:`, JSON.stringify(oddsJsonStrings, null, 2));

        const fetchedMarkets: LiveMarket[] = [];
        for (let i = 0; i < paginatedMarketIds.length; i++) {
            const marketId = paginatedMarketIds[i];
            const oddsJsonString = oddsJsonStrings[i];
            console.log(`[DIAGNOSTIC] Processing item ${i+1}/${paginatedMarketIds.length}: ID ${marketId.slice(0, 10)}...`);

            if (!oddsJsonString) {
                console.error(`[DIAGNOSTIC] ERROR for ${marketId}: MGET returned null. The key 'market:${marketId}' likely does not exist or has expired.`);
                continue; // Skip to the next market
            }

            let oddsData = null;
            try {
                oddsData = JSON.parse(oddsJsonString);
                console.log(`[DIAGNOSTIC] Successfully parsed JSON for ${marketId}.`);
            } catch (e) {
                console.error(`[DIAGNOSTIC] FATAL PARSE ERROR for ${marketId}. The data is not valid JSON. Raw Data: "${oddsJsonString}". Error:`, e);
                continue; // Skip to the next market
            }
            
            const market = constructMarket(marketId, oddsData); // No metadata needed for this lightweight call
            if (market) {
                console.log(`[DIAGNOSTIC] Successfully constructed market object for ${marketId}.`);
                fetchedMarkets.push(market);
            } else {
                console.error(`[DIAGNOSTIC] CRITICAL ERROR for ${marketId}: constructMarket returned null even after successful parsing. Check validation logic within constructMarket.`);
            }
        }

        console.log(`--- [DIAGNOSTIC] getLiveMarkets FINISHED. Returning ${fetchedMarkets.length} markets. ---`);
        return { markets: fetchedMarkets, total: totalMarkets };

    } catch (error) {
        console.error('--- [DIAGNOSTIC] FATAL UNHANDLED EXCEPTION in getLiveMarkets ---', error);
        return { markets: [], total: 0 }; // Graceful failure
    }
}


/**
 * [HEAVY & ON-DEMAND] Fetches the COMPLETE details for a single market by its ID.
 * This is for detail pages. It fetches both Redis odds and external metadata.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    
    // Fetch odds and metadata concurrently.
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
            // If odds are corrupt for a detail page, we can't proceed.
            return null;
        }
    } else {
        // If there are no live odds, we can't show the market detail.
        return null;
    }

    // Construct the market WITH full metadata.
    return constructMarket(marketId, oddsData, metadata);
}
