
// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

/**
 * A helper function to construct a LiveMarket object from its constituent parts from Redis.
 * This function is now more robust against missing optional metadata fields.
 * @param marketId The ID of the market.
 * @param oddsData The market's live odds data, which must contain the question.
 * @returns A LiveMarket object or null if the data is invalid.
 */
function constructMarket(
    marketId: string,
    oddsData: Record<string, any> | null
): LiveMarket | null {
    // The primary source of truth is the odds data. It MUST exist and have a question.
    if (!oddsData || typeof oddsData.question !== 'string' || !oddsData.question) {
        console.warn(`[MarketService] Skipping market ${marketId} due to missing or invalid odds data/question.`);
        return null;
    }

    const yesPrice = typeof oddsData.yes_price === 'number' ? oddsData.yes_price : 0.5;
    const noPrice = typeof oddsData.no_price === 'number' ? 1 - yesPrice : 0.5;
    const category = oddsData.category || 'General';

    // Payout teaser logic remains the same
    const payoutTeaser = `Bet YES to win ${(1 / (yesPrice || 0.5)).toFixed(1)}x`;

    return {
        id: marketId,
        question: oddsData.question,
        yesPrice: parseFloat(yesPrice.toFixed(2)),
        noPrice: parseFloat(noPrice.toFixed(2)),
        category: category,
        endsAt: oddsData.end_date_iso ? new Date(oddsData.end_date_iso) : undefined,
        imageUrl: oddsData.image_url || `https://placehold.co/600x400.png`,
        aiHint: oddsData.ai_hint || category.toLowerCase() || 'event',
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
 * Fetches a paginated list of live markets from Redis using memory-efficient commands.
 * This function avoids loading all market IDs into memory at once.
 *
 * @param params - An object containing limit and offset for pagination.
 * @returns A promise that resolves to an object with the list of markets and the total count.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redis = getRedisClient();

    // 1. Efficiently get the total number of markets without loading them.
    const totalMarkets = await redis.scard('active_market_ids');

    if (totalMarkets === 0) {
      return { markets: [], total: 0 };
    }

    // 2. Use SSCAN to iterate through keys without loading the whole set into memory.
    let cursor = 0;
    const collectedIds: string[] = [];
    const targetCount = offset + limit;
    
    do {
        const [nextCursor, members] = await redis.sscan('active_market_ids', cursor, { count: 100 });
        collectedIds.push(...members);
        cursor = nextCursor;
    } while (cursor !== 0 && collectedIds.length < targetCount);

    // 3. Slice the collected IDs to get just the page we need.
    const paginatedMarketIds = collectedIds.slice(offset, offset + limit);

    if (paginatedMarketIds.length === 0) {
        return { markets: [], total: totalMarkets };
    }

    // 4. Use MGET to batch-fetch all market JSON strings in a single request.
    const marketKeys = paginatedMarketIds.map(id => `market:${id}`);
    const oddsJsonStrings = await redis.mget<Array<string | null>>(...marketKeys);

    const fetchedMarkets: LiveMarket[] = [];
    for (let i = 0; i < paginatedMarketIds.length; i++) {
        const marketId = paginatedMarketIds[i];
        const oddsJsonString = oddsJsonStrings[i];
        
        let oddsData = null;
        if (oddsJsonString) {
            try {
                oddsData = JSON.parse(oddsJsonString);
            } catch (e) {
                console.error(`[MarketService] Failed to parse JSON for market ${marketId}. Data: "${oddsJsonString}"`, e);
            }
        }
        
        const market = constructMarket(marketId, oddsData);
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

    const oddsJsonString = await redis.get(`market:${marketId}`);

    if (!oddsJsonString) {
      console.warn(`[MarketService] No data found for single market ID ${marketId}. It may have expired or does not exist.`);
      return null;
    }

    let oddsData = null;
    try {
        oddsData = JSON.parse(oddsJsonString as string);
    } catch (e) {
        console.error(`[MarketService] Failed to parse JSON for single market ${marketId}. Data: "${oddsJsonString}"`, e);
        return null;
    }

    return constructMarket(marketId, oddsData);
}
