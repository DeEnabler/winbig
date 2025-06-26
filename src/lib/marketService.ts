
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
  console.log(`[DIAGNOSTIC] getMarketMetadata called for ID: ${marketId}`);
  const now = Date.now();
  const cachedEntry = metadataCache.get(marketId);

  if (cachedEntry && (now - cachedEntry.timestamp < METADATA_CACHE_TTL)) {
    console.log(`[DIAGNOSTIC] METADATA CACHE HIT for ${marketId}.`);
    return cachedEntry.data;
  }
  
  console.log(`[DIAGNOSTIC] METADATA CACHE MISS for ${marketId}. Fetching from Polymarket API.`);
  try {
    const response = await fetch(`https://gamma-api.polymarket.com/markets/${marketId}`);
    if (!response.ok) {
      console.error(`[MarketService] Failed to fetch metadata for ${marketId} from Polymarket API. Status: ${response.status}`);
      return null;
    }
    const metadata = await response.json();
    metadataCache.set(marketId, { data: metadata, timestamp: now });
    console.log(`[DIAGNOSTIC] Successfully fetched and cached metadata for ${marketId}.`);
    return metadata;
  } catch (error) {
    console.error(`[MarketService] CRITICAL ERROR fetching metadata for ${marketId}:`, error);
    return null;
  }
}

/**
 * A flexible helper to construct a LiveMarket object from various data sources.
 * This function is now more resilient and doesn't assume all data is present.
 */
function constructMarket(
    marketId: string,
    oddsData: { yes: number; no: number; ts: number } | null, // Updated to correct schema
    metadata?: any | null
): LiveMarket | null {
    console.log(`[DIAGNOSTIC] Constructing market for ID ${marketId.slice(0,12)}...`);
    // CRITICAL: If we have no metadata AND no odds, we can't display a useful card.
    // However, if we have metadata, we can still display a card even if live odds are missing.
    if (!metadata) {
      console.error(`[DIAGNOSTIC] Skipping market ${marketId}: Metadata is required but was not provided or fetched.`);
      return null;
    }

    // Use metadata if available, otherwise create placeholders.
    const question = metadata?.question || `Market ID: ${marketId.slice(0, 12)}...`;
    const category = metadata?.category || "General";
    const imageUrl = metadata?.image_url || `https://placehold.co/600x400.png`;
    const aiHint = metadata?.ai_hint || category.toLowerCase().split(' ').slice(0, 2).join(' ') || 'event';
    const endsAt = metadata?.end_date_iso ? new Date(metadata.end_date_iso) : undefined;
    
    // Use live odds if available, otherwise use placeholder values (e.g., 0).
    const yesPrice = oddsData ? oddsData.yes : 0;
    const noPrice = oddsData ? oddsData.no : 0;

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
 * Fetches a paginated list of live markets. It first tries to get live odds from
 * Redis and falls back to fetching static metadata if odds are temporarily unavailable.
 */
export async function getLiveMarkets({ limit = 3, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    console.log("--- [DIAGNOSTIC] getLiveMarkets initiated ---");
    const redis = getRedisClient();
    
    try {
        console.log("[DIAGNOSTIC] Step 1: Fetching market IDs from 'active_market_ids' set.");
        const marketIds = await redis.smembers('active_market_ids');
        const totalMarkets = marketIds.length;
        console.log(`[DIAGNOSTIC] Step 2: Found ${totalMarkets} total market IDs.`);

        if (totalMarkets === 0) {
            console.warn("[DIAGNOSTIC] No market IDs found in 'active_market_ids'. Returning empty.");
            return { markets: [], total: 0 };
        }

        const paginatedMarketIds = marketIds.slice(offset, offset + limit);
        console.log(`[DIAGNOSTIC] Step 3: Sliced to ${paginatedMarketIds.length} IDs for this page (offset: ${offset}, limit: ${limit}).`);

        if (paginatedMarketIds.length === 0) {
            return { markets: [], total: totalMarkets };
        }

        // CRITICAL FIX: Use the correct "odds:" prefix.
        const oddsKeys = paginatedMarketIds.map(id => `odds:${id}`);
        console.log(`[DIAGNOSTIC] Step 4: Constructed Redis keys for MGET. Sample key: "${oddsKeys[0]}"`);
        
        const oddsJsonStrings = await redis.mget<Array<string | null>>(...oddsKeys);
        console.log(`[DIAGNOSTIC] Step 5: Raw response from MGET for ${oddsKeys.length} keys:`, oddsJsonStrings);

        const marketPromises = paginatedMarketIds.map(async (marketId, i) => {
            console.log(`\n[DIAGNOSTIC] > Processing item ${i+1}/${paginatedMarketIds.length}: ID ${marketId}`);
            const oddsJsonString = oddsJsonStrings[i];
            let oddsData = null;

            if (oddsJsonString) {
                try {
                    // CRITICAL FIX: Parse the correct JSON schema { yes, no, ... }
                    oddsData = JSON.parse(oddsJsonString);
                } catch (e) {
                    console.error(`[DIAGNOSTIC] JSON Parse ERROR for market ${marketId}:`, e);
                    // Continue with null oddsData, fallback will be triggered.
                }
            } else {
                 console.warn(`[DIAGNOSTIC] > CACHE MISS for ${marketId}: MGET returned null.`);
            }
            
            // ALWAYS fetch metadata. If odds are missing, we can still show the market question.
            // This makes the UI more resilient.
            if (!oddsData) {
              console.log(`[DIAGNOSTIC] > Odds missing for ${marketId}. Initiating metadata fallback.`);
            }
            const metadata = await getMarketMetadata(marketId);
            
            return constructMarket(marketId, oddsData, metadata);
        });

        const fetchedMarkets = (await Promise.all(marketPromises)).filter((m): m is LiveMarket => m !== null);
        console.log(`\n--- [DIAGNOSTIC] getLiveMarkets FINISHED. Returning ${fetchedMarkets.length} constructed markets. ---\n`);
        return { markets: fetchedMarkets, total: totalMarkets };

    } catch (error) {
        console.error('[MarketService] A critical error occurred in getLiveMarkets:', error);
        return { markets: [], total: 0 };
    }
}


/**
 * Fetches the COMPLETE details for a single market by its ID.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    
    // Fetch odds and metadata concurrently for performance.
    const [oddsJsonString, metadata] = await Promise.all([
        redis.get<string | null>(`odds:${marketId}`), // CRITICAL FIX: Use 'odds:' prefix
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
    
    if (!metadata) {
      console.warn(`[MarketService] No metadata found for market ${marketId}. Cannot construct market details.`);
      return null;
    }

    return constructMarket(marketId, oddsData, metadata);
}
