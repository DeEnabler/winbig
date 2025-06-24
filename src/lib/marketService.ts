// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

/**
 * A helper function to construct a LiveMarket object from raw Redis data.
 * @param marketId The ID of the market.
 * @param metaData The hash data from the `meta:market:` key.
 * @param oddsData The hash data from the `odds:` key.
 * @returns A LiveMarket object or null if the data is invalid.
 */
function constructMarketFromData(
    marketId: string,
    metaData: Record<string, string> | null,
    oddsData: Record<string, string> | null
): LiveMarket | null {
    // A market is only considered valid if it has metadata, especially a question.
    if (!metaData || !metaData.question) {
        return null;
    }

    const yesPrice = oddsData?.yes_price ? parseFloat(oddsData.yes_price) : 0.5;
    const noPrice = 1 - yesPrice;

    if (isNaN(yesPrice)) {
        console.warn(`[MarketService] Skipping market ${marketId} due to invalid price data. Yes: ${oddsData?.yes_price}`);
        return null;
    }

    return {
        id: marketId,
        question: metaData.question,
        yesPrice: Math.max(0.01, Math.min(0.99, yesPrice)),
        noPrice: Math.max(0.01, Math.min(0.99, noPrice)),
        category: metaData.category || 'General',
        endsAt: metaData.endDateIso ? new Date(metaData.endDateIso) : undefined,
        imageUrl: metaData.image_url || `https://placehold.co/600x400.png`,
        aiHint: metaData.ai_hint || 'event',
        payoutTeaser: `Bet YES to win ${(1 / Math.max(0.01, yesPrice)).toFixed(1)}x`,
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
 * Fetches a paginated list of live markets on-demand from Redis.
 * This approach avoids large in-memory caches and is more scalable.
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
    
    // 3. Use a pipeline to get metadata and odds for the current page's markets in one round trip
    console.log(`[MarketService] Fetching metadata and odds for ${paginatedMarketIds.length} markets via pipeline.`);
    const pipeline = redis.pipeline();
    paginatedMarketIds.forEach(marketId => {
        pipeline.hgetall(`meta:market:${marketId}`);
        pipeline.hgetall(`odds:${marketId}`);
    });
    const results = await pipeline.exec<Array<Record<string, string> | null>>();

    // 4. Construct the final market list by combining the pipelined results
    const fetchedMarkets: LiveMarket[] = [];
    for (let i = 0; i < paginatedMarketIds.length; i++) {
        const marketId = paginatedMarketIds[i];
        const metaData = results[i * 2]; // Metadata is at even indices (0, 2, 4, ...)
        const oddsData = results[i * 2 + 1]; // Odds is at odd indices (1, 3, 5, ...)

        const market = constructMarketFromData(marketId, metaData, oddsData);
        if (market) {
            fetchedMarkets.push(market);
        }
    }

    return { markets: fetchedMarkets, total: totalMarkets };
}

/**
 * Fetches the complete details for a single market by its ID.
 * @param marketId - The ID of the market to fetch.
 * @returns A promise that resolves to a LiveMarket object or null if not found.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    
    // Fetch both metadata and live odds for this single market in parallel
    const [metaData, oddsData] = await Promise.all([
        redis.hgetall(`meta:market:${marketId}`),
        redis.hgetall(`odds:${marketId}`)
    ]);

    // Re-use the same construction logic
    return constructMarketFromData(marketId, metaData, oddsData);
}
