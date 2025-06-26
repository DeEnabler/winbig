
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
      return null; // Return null on failure, don't throw
    }
    const metadata = await response.json();
    metadataCache.set(marketId, { data: metadata, timestamp: now });
    return metadata;
  } catch (error) {
    console.error(`[MarketService] CRITICAL ERROR fetching metadata for ${marketId}:`, error);
    return null; // Return null on exception
  }
}

/**
 * A flexible helper to construct a LiveMarket object from various data sources.
 * This is now more resilient to missing metadata.
 */
function constructMarket(
    marketId: string,
    oddsData: { yes: number; no: number; ts: number } | null,
    metadata: any | null
): LiveMarket {
    // If metadata fails, create a stub market so the UI doesn't break.
    const question = metadata?.question || `Market ${marketId.slice(0, 8)}...`;
    const category = metadata?.category || "General";
    const imageUrl = metadata?.image_url || `https://placehold.co/600x400.png`;
    const aiHint = metadata?.ai_hint || category.toLowerCase().split(' ').slice(0, 2).join(' ') || 'event';
    const endsAt = metadata?.end_date_iso ? new Date(metadata.end_date_iso) : undefined;
    
    // Odds data can be null, default to 50/50 if so.
    const yesPrice = oddsData ? oddsData.yes : 0.5;
    const noPrice = oddsData ? oddsData.no : 0.5;

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
 */
export async function getLiveMarkets({ limit = 3, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redis = getRedisClient();
    
    try {
        const marketIds = await redis.smembers('active_market_ids');
        const totalMarkets = marketIds.length;

        if (totalMarkets === 0) {
            console.warn("[MarketService] No market IDs found in 'active_market_ids'.");
            return { markets: [], total: 0 };
        }

        const paginatedMarketIds = marketIds.slice(offset, offset + limit);

        if (paginatedMarketIds.length === 0) {
            return { markets: [], total: totalMarkets };
        }

        const oddsKeys = paginatedMarketIds.map(id => `odds:${id}`);
        const oddsJsonStrings = await redis.mget<Array<string | null>>(...oddsKeys);

        const marketPromises = paginatedMarketIds.map(async (marketId, i) => {
            const oddsJsonString = oddsJsonStrings[i];
            let oddsData = null;

            if (oddsJsonString) {
                try {
                    oddsData = JSON.parse(oddsJsonString);
                } catch (e) {
                    console.error(`[MarketService] JSON Parse ERROR for market ${marketId}:`, e);
                    // Continue with null oddsData
                }
            }
            
            // Always fetch metadata, which will use a cache.
            // This is necessary because odds data from redis does not contain it.
            const metadata = await getMarketMetadata(marketId);

            // ConstructMarket will now always return a market, even a stub.
            return constructMarket(marketId, oddsData, metadata);
        });

        const fetchedMarkets = await Promise.all(marketPromises);
        
        console.log(`[MarketService] Successfully constructed ${fetchedMarkets.length} of ${paginatedMarketIds.length} requested markets.`);
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
    
    const [oddsJsonString, metadata] = await Promise.all([
        redis.get<string | null>(`odds:${marketId}`),
        getMarketMetadata(marketId)
    ]);

    let oddsData = null;
    if (oddsJsonString) {
        try {
            oddsData = JSON.parse(oddsJsonString);
        } catch (e) {
            console.error(`[MarketService] Failed to parse JSON for single market odds ${marketId}.`, e);
        }
    }
    
    // For the detail view, we require metadata. If it's null, we can't show the page.
    if (!metadata) {
      console.warn(`[MarketService] No metadata found for market detail view ${marketId}.`);
      return null;
    }

    return constructMarket(marketId, oddsData, metadata);
}
