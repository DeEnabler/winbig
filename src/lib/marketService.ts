
// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

/**
 * A helper function to construct a LiveMarket object from its constituent parts from Redis.
 * @param marketId The ID of the market.
 * @param jsonData The parsed JSON data from the `market:{id}` key.
 * @returns A LiveMarket object or null if the data is invalid.
 */
function constructMarketFromJson(
    marketId: string,
    jsonData: any 
): LiveMarket | null {
    if (!jsonData || typeof jsonData.question !== 'string' || !jsonData.question) {
        console.warn(`[MarketService] Skipping market ${marketId} due to invalid or missing question in JSON data.`);
        return null;
    }

    const yesPrice = typeof jsonData.yes_price === 'number' ? jsonData.yes_price : 0.5;
    const noPrice = typeof jsonData.no_price === 'number' ? jsonData.no_price : 1 - yesPrice;
    const category = jsonData.category || 'General';

    return {
        id: marketId,
        question: jsonData.question,
        yesPrice: parseFloat(yesPrice.toFixed(2)),
        noPrice: parseFloat(noPrice.toFixed(2)),
        category: category,
        endsAt: jsonData.end_date_iso ? new Date(jsonData.end_date_iso) : undefined,
        imageUrl: jsonData.image_url || `https://placehold.co/600x400.png`,
        aiHint: jsonData.ai_hint || category.toLowerCase() || 'event',
        payoutTeaser: `Bet YES to win ${(1 / yesPrice).toFixed(1)}x`,
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
 * Fetches a paginated list of live markets on-demand from Redis using the correct data structure.
 * This is highly efficient, using one command to get IDs and one MGET to fetch all data.
 *
 * @param params - An object containing limit and offset for pagination.
 * @returns A promise that resolves to an object with the list of markets and the total count.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redis = getRedisClient();

    const allMarketIds = await redis.smembers('active_market_ids');
    const totalMarkets = allMarketIds.length;

    if (totalMarkets === 0) {
      return { markets: [], total: 0 };
    }

    const paginatedMarketIds = allMarketIds.slice(offset, offset + limit);
    if (paginatedMarketIds.length === 0) {
        return { markets: [], total: totalMarkets };
    }
    
    const marketKeys = paginatedMarketIds.map(id => `market:${id}`);
    const marketDataStrings = await redis.mget<string[]>(...marketKeys);

    const fetchedMarkets: LiveMarket[] = [];
    marketDataStrings.forEach((jsonString, index) => {
        if (!jsonString) {
            // Market data might have expired between smembers and mget, or was never set.
            // This is expected and not an error.
            return; 
        }
        try {
            const marketId = paginatedMarketIds[index];
            const data = JSON.parse(jsonString);
            const market = constructMarketFromJson(marketId, data);
            if (market) {
                fetchedMarkets.push(market);
            }
        } catch (e) {
            console.error(`[MarketService] Failed to parse JSON for market at index ${index}. Data: "${jsonString}"`, e);
        }
    });

    return { markets: fetchedMarkets, total: totalMarkets };
}

/**
 * Fetches the complete details for a single market by its ID from Redis.
 * @param marketId - The ID of the market to fetch.
 * @returns A promise that resolves to a LiveMarket object or null if not found.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    
    const jsonString = await redis.get<string>(`market:${marketId}`);
    if (!jsonString) {
      console.warn(`[MarketService] No data found for market ID ${marketId}. It may have expired or does not exist.`);
      return null;
    }

    try {
        const data = JSON.parse(jsonString);
        return constructMarketFromJson(marketId, data);
    } catch (e) {
        console.error(`[MarketService] Failed to parse JSON for single market ${marketId}. Data: "${jsonString}"`, e);
        return null;
    }
}
