// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

/**
 * A helper function to construct a LiveMarket object from the new JSON format.
 * @param marketId The ID of the market.
 * @param jsonData The parsed JSON data from the `market:{id}` key.
 * @returns A LiveMarket object or null if the data is invalid.
 */
function constructMarketFromJson(
    marketId: string,
    jsonData: any
): LiveMarket | null {
    // A market is only valid if it has a question and a yes_price.
    if (!jsonData || typeof jsonData.question !== 'string' || typeof jsonData.yes_price !== 'number') {
        console.warn(`[MarketService] Skipping market ${marketId} due to invalid or missing JSON data.`, jsonData);
        return null;
    }

    const yesPrice = Math.max(0.01, Math.min(0.99, jsonData.yes_price));
    const noPrice = 1 - yesPrice;

    return {
        id: marketId,
        question: jsonData.question,
        yesPrice: parseFloat(yesPrice.toFixed(2)),
        noPrice: parseFloat(noPrice.toFixed(2)),
        category: jsonData.category || 'General',
        endsAt: jsonData.end_date_iso ? new Date(jsonData.end_date_iso) : undefined,
        imageUrl: jsonData.image_url || `https://placehold.co/600x400.png`,
        aiHint: jsonData.ai_hint || jsonData.category?.toLowerCase() || 'event',
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
 * Fetches a paginated list of live markets on-demand from Redis using the new JSON format.
 * This is highly efficient, using one command to get IDs and one `mget` command to fetch data.
 *
 * @param params - An object containing limit and offset for pagination.
 * @returns A promise that resolves to an object with the list of markets and the total count.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redis = getRedisClient();

    // 1. Get all active market IDs to determine total count and the slice for the current page
    const allMarketIds = await redis.smembers('active_market_ids');
    const totalMarkets = allMarketIds.length;

    if (totalMarkets === 0) {
      return { markets: [], total: 0 };
    }

    // 2. Get the specific page of market IDs to fetch full data for
    const paginatedMarketIds = allMarketIds.slice(offset, offset + limit);
    if (paginatedMarketIds.length === 0) {
        return { markets: [], total: totalMarkets };
    }
    
    // 3. Use `mget` to fetch all market data JSON strings in a single batch request
    const keys = paginatedMarketIds.map(id => `market:${id}`);
    const results = await redis.mget<any[]>(...keys);

    // 4. Construct the final market list by parsing the JSON strings
    const fetchedMarkets: LiveMarket[] = [];
    results.forEach((jsonData, index) => {
        if (jsonData) { // mget returns null for non-existent keys
            const marketId = paginatedMarketIds[index];
            const market = constructMarketFromJson(marketId, jsonData);
            if (market) {
                fetchedMarkets.push(market);
            }
        }
    });

    return { markets: fetchedMarkets, total: totalMarkets };
}

/**
 * Fetches the complete details for a single market by its ID from a JSON string.
 * @param marketId - The ID of the market to fetch.
 * @returns A promise that resolves to a LiveMarket object or null if not found.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    
    // Fetch the JSON string for the single market
    const jsonData = await redis.get<any>(`market:${marketId}`);

    // Re-use the same construction logic
    return constructMarketFromJson(marketId, jsonData);
}
