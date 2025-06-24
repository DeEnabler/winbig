// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

/**
 * A helper function to construct a LiveMarket object from its constituent parts from Redis.
 * @param marketId The ID of the market.
 * @param metadata The hash data from the `meta:market:{id}` key.
 * @param oddsJson The JSON string data from the `market:{id}` key.
 * @returns A LiveMarket object or null if the data is invalid.
 */
function constructMarket(
    marketId: string,
    metadata: Record<string, string> | null,
    oddsJson: string | null
): LiveMarket | null {
    if (!metadata || typeof metadata.question !== 'string') {
        console.warn(`[MarketService] Skipping market ${marketId} due to invalid or missing metadata.`, metadata);
        return null;
    }

    let yesPrice = 0.5; // Default price if odds are missing
    let noPrice = 0.5;
    
    if (oddsJson) {
        try {
            const oddsData = JSON.parse(oddsJson);
            if (typeof oddsData.yes_price === 'number') {
                yesPrice = Math.max(0.01, Math.min(0.99, oddsData.yes_price));
                noPrice = 1 - yesPrice;
            }
        } catch (e) {
            console.error(`[MarketService] Failed to parse odds JSON for market ${marketId}`, e);
            // Use default prices if JSON is malformed
        }
    } else {
        console.warn(`[MarketService] No odds data found for market ${marketId}. Using default 50/50 odds.`);
    }

    return {
        id: marketId,
        question: metadata.question,
        yesPrice: parseFloat(yesPrice.toFixed(2)),
        noPrice: parseFloat(noPrice.toFixed(2)),
        category: metadata.category || 'General',
        endsAt: metadata.end_date_iso ? new Date(metadata.end_date_iso) : undefined,
        imageUrl: metadata.image_url || `https://placehold.co/600x400.png`,
        aiHint: metadata.ai_hint || metadata.category?.toLowerCase() || 'event',
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
 * This is highly efficient, using one command to get IDs and one pipeline to fetch all data.
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
    
    const pipeline = redis.pipeline();
    paginatedMarketIds.forEach(id => {
        pipeline.hgetall(`meta:market:${id}`);
        pipeline.get(`market:${id}`); 
    });

    const results = await pipeline.exec();

    const fetchedMarkets: LiveMarket[] = [];
    for (let i = 0; i < paginatedMarketIds.length; i++) {
        const marketId = paginatedMarketIds[i];
        const metadata = results[i * 2] as Record<string, string> | null;
        const oddsJson = results[i * 2 + 1] as string | null;

        const market = constructMarket(marketId, metadata, oddsJson);
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
    
    const [metadata, oddsJson] = await Promise.all([
        redis.hgetall(`meta:market:${marketId}`),
        redis.get(`market:${marketId}`),
    ]);

    return constructMarket(marketId, metadata as Record<string, string> | null, oddsJson as string | null);
}
