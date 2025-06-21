// src/lib/marketService.ts
import 'server-only'; // Ensures this module is only used on the server
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

interface GetLiveMarketsParams {
  limit?: number;
  offset?: number;
}

interface LiveMarketsResponse {
  markets: LiveMarket[];
  total: number;
}

/**
 * A helper function to construct a LiveMarket object from raw Redis data.
 * This can be reused by both getLiveMarkets and getMarketDetails.
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
        console.warn(`[MarketService] Skipping market ${marketId} due to missing or incomplete metadata.`);
        return null;
    }

    const yesPrice = oddsData?.yes_price ? parseFloat(oddsData.yes_price) : 0.5;
    const noPrice = oddsData?.no_price ? parseFloat(oddsData.no_price) : 0.5;

    if (isNaN(yesPrice) || isNaN(noPrice)) {
        console.warn(`[MarketService] Skipping market ${marketId} due to invalid price data. Yes: ${oddsData?.yes_price}, No: ${oddsData?.no_price}`);
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


/**
 * Fetches a paginated list of all currently live markets using an efficient Redis pipeline.
 * @param params - An object containing limit and offset for pagination.
 * @returns A promise that resolves to an object with the list of markets and the total count.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redisClient = getRedisClient();
    
    // 1. Get all active market IDs (1 request)
    const activeMarketIds = await redisClient.smembers('active_market_ids');
    if (!activeMarketIds || activeMarketIds.length === 0) {
        return { markets: [], total: 0 };
    }
    
    const totalMarkets = activeMarketIds.length;
    const paginatedMarketIds = activeMarketIds.slice(offset, offset + limit);

    if (paginatedMarketIds.length === 0) {
        return { markets: [], total: totalMarkets };
    }

    // 2. Use a pipeline to fetch all data in a single batch (1 request)
    const pipeline = redisClient.pipeline();
    paginatedMarketIds.forEach(marketId => {
        pipeline.hgetall(`meta:market:${marketId}`);
        pipeline.hgetall(`odds:${marketId}`);
    });
    
    const results = await pipeline.exec<Array<Record<string, string> | null>>();

    const fetchedMarkets: LiveMarket[] = [];
    for (let i = 0; i < results.length; i += 2) {
        const metaData = results[i];
        const oddsData = results[i + 1];
        const marketId = paginatedMarketIds[i / 2];

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
    const redisClient = getRedisClient();
    
    const [metaData, oddsData] = await Promise.all([
        redisClient.hgetall(`meta:market:${marketId}`),
        redisClient.hgetall(`odds:${marketId}`),
    ]);

    return constructMarketFromData(marketId, metaData, oddsData);
}
