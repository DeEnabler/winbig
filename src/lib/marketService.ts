// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

/**
 * A helper function to construct a LiveMarket object from its constituent parts from Redis.
 * @param marketId The ID of the market.
 * @param metadata The market's static data (question, category, etc.).
 * @param oddsData The market's live odds data (prices, timestamp).
 * @returns A LiveMarket object or null if the data is invalid.
 */
function constructMarket(
    marketId: string,
    metadata: Record<string, any> | null,
    oddsData: Record<string, any> | null
): LiveMarket | null {
    // A market is only valid if we have its fundamental question and live odds.
    if (!metadata || typeof metadata.question !== 'string' || !metadata.question || !oddsData) {
        console.warn(`[MarketService] Skipping market ${marketId} due to missing metadata or odds data.`);
        return null;
    }

    const yesPrice = typeof oddsData.yes_price === 'number' ? oddsData.yes_price : 0.5;
    const noPrice = typeof oddsData.no_price === 'number' ? oddsData.no_price : 1 - yesPrice;
    const category = metadata.category || 'General';

    return {
        id: marketId,
        question: metadata.question,
        yesPrice: parseFloat(yesPrice.toFixed(2)),
        noPrice: parseFloat(noPrice.toFixed(2)),
        category: category,
        endsAt: metadata.end_date_iso ? new Date(metadata.end_date_iso) : undefined,
        imageUrl: metadata.image_url || `https://placehold.co/600x400.png`,
        aiHint: metadata.ai_hint || category.toLowerCase() || 'event',
        payoutTeaser: `Bet YES to win ${(1 / (yesPrice || 0.5)).toFixed(1)}x`,
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
 * Fetches a paginated list of live markets from Redis using an efficient pipeline.
 * It fetches metadata and odds data in a single batch request.
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

    // Create a pipeline to batch all our Redis commands into a single request
    const pipeline = redis.pipeline();

    // For each market ID, queue two commands: one for metadata (hash) and one for odds (json string)
    paginatedMarketIds.forEach(id => {
        pipeline.hgetall(`meta:market:${id}`); // Deprecated but necessary based on examples
        pipeline.get(`market:${id}`);
    });

    // Execute the pipeline and get all results back in one go
    const results = await pipeline.exec<Array<Record<string, any> | string | null>>();

    const fetchedMarkets: LiveMarket[] = [];
    for (let i = 0; i < paginatedMarketIds.length; i++) {
        const marketId = paginatedMarketIds[i];
        
        // Results are interleaved: [meta_market1, odds_market1, meta_market2, odds_market2, ...]
        const metadataResult = results[i * 2] as Record<string, any> | null;
        const oddsJsonString = results[i * 2 + 1] as string | null;
        
        let oddsData = null;
        if (oddsJsonString) {
            try {
                oddsData = JSON.parse(oddsJsonString);
            } catch (e) {
                console.error(`[MarketService] Failed to parse JSON for odds of market ${marketId}. Data: "${oddsJsonString}"`, e);
            }
        }
        
        const market = constructMarket(marketId, metadataResult, oddsData);
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

    // Fetch both metadata and odds in parallel
    const [metadataResult, oddsJsonString] = await Promise.all([
        redis.hgetall(`meta:market:${marketId}`),
        redis.get(`market:${marketId}`)
    ]);

    if (!metadataResult || !oddsJsonString) {
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

    return constructMarket(marketId, metadataResult, oddsData);
}
