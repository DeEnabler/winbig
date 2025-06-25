
// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

/**
 * Constructs a LiveMarket object from a single JSON data source from Redis.
 * @param marketId The ID of the market.
 * @param marketData The market's data from Redis, parsed from JSON.
 * @returns A LiveMarket object or null if the data is invalid.
 */
function constructMarket(
    marketId: string,
    marketData: Record<string, any> | null
): LiveMarket | null {
    if (!marketData) {
        console.warn(`[MarketService] Skipping market ${marketId}: market data is null.`);
        return null;
    }

    // The question is essential for display.
    if (typeof marketData.question !== 'string' || !marketData.question) {
        console.warn(`[MarketService] Skipping market ${marketId}: missing or invalid 'question' field. Data:`, marketData);
        return null;
    }

    const yesPrice = typeof marketData.yes_price === 'number' ? marketData.yes_price : 0.5;
    const noPrice = typeof marketData.no_price === 'number' ? marketData.no_price : (1 - yesPrice);
    const category = marketData.category || 'General';
    const payoutTeaser = `Bet YES to win ${(1 / (yesPrice || 0.5)).toFixed(1)}x`;

    return {
        id: marketId,
        question: marketData.question,
        yesPrice: parseFloat(yesPrice.toFixed(2)),
        noPrice: parseFloat(noPrice.toFixed(2)),
        category: category,
        endsAt: marketData.end_date_iso ? new Date(marketData.end_date_iso) : undefined,
        imageUrl: marketData.image_url || `https://placehold.co/600x400.png`,
        aiHint: marketData.ai_hint || category.toLowerCase().split(' ').slice(0, 2).join(' ') || 'event',
        payoutTeaser: payoutTeaser,
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
 * Fetches a paginated list of live markets from Redis using the optimized schema.
 * @param params - An object containing limit and offset for pagination.
 * @returns A promise that resolves to an object with the list of markets and the total count.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redis = getRedisClient();

    // 1. Get all active market IDs. This is safe for thousands of keys. For millions, SSCAN would be better.
    const allMarketIds = await redis.smembers('active_market_ids');
    const totalMarkets = allMarketIds.length;

    if (totalMarkets === 0) {
      return { markets: [], total: 0 };
    }

    // 2. Paginate the IDs in application memory.
    const paginatedMarketIds = allMarketIds.slice(offset, offset + limit);

    if (paginatedMarketIds.length === 0) {
        return { markets: [], total: totalMarkets };
    }

    // 3. Use MGET to batch-fetch all market JSON strings for the current page.
    const marketKeys = paginatedMarketIds.map(id => `market:${id}`);
    const marketJsonStrings = await redis.mget<Array<string | null>>(...marketKeys);

    const fetchedMarkets: LiveMarket[] = [];
    for (let i = 0; i < paginatedMarketIds.length; i++) {
        const marketId = paginatedMarketIds[i];
        const marketJsonString = marketJsonStrings[i];
        
        let marketData = null;
        if (marketJsonString) {
            try {
                marketData = JSON.parse(marketJsonString);
            } catch (e) {
                console.error(`[MarketService] Failed to parse JSON for market ${marketId}. Data: "${marketJsonString}"`, e);
            }
        }
        
        const market = constructMarket(marketId, marketData);
        if (market) {
            fetchedMarkets.push(market);
        }
    }

    return { markets: fetchedMarkets, total: totalMarkets };
}

/**
 * Fetches the complete details for a single market by its ID from Redis.
 * @param marketId - The ID of the market to fetch.
 * @returns A promise that resolves to a LiveMarket object or null if not found.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();

    const marketJsonString = await redis.get(`market:${marketId}`);

    if (!marketJsonString) {
      console.warn(`[MarketService] No data found for single market ID ${marketId}. It may have expired or does not exist.`);
      return null;
    }

    let marketData = null;
    try {
        marketData = JSON.parse(marketJsonString as string);
    } catch (e) {
        console.error(`[MarketService] Failed to parse JSON for single market ${marketId}. Data: "${marketJsonString}"`, e);
        return null;
    }

    return constructMarket(marketId, marketData);
}
