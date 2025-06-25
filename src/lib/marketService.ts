
// src/lib/marketService.ts
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

/**
 * Constructs a LiveMarket object by combining metadata from a Redis hash
 * and odds data from a Redis JSON string.
 * @param marketId The ID of the market.
 * @param metadata The market's metadata from `meta:market:{id}`.
 * @param oddsData The market's odds data from `market:{id}`.
 * @returns A LiveMarket object or null if the data is invalid.
 */
function constructMarket(
    marketId: string,
    metadata: Record<string, any> | null,
    oddsData: Record<string, any> | null
): LiveMarket | null {
    if (!metadata || typeof metadata.question !== 'string' || !metadata.question) {
        console.warn(`[MarketService] Skipping market ${marketId}: Invalid or missing metadata (especially question).`);
        return null;
    }

    if (!oddsData) {
        // This is less critical; we can show a market with default/stale odds.
        // But for a live feed, we probably want to skip it if odds are missing.
        console.warn(`[MarketService] Skipping market ${marketId}: Missing odds data.`);
        return null;
    }

    const yesPrice = typeof oddsData.yes_price === 'number' ? oddsData.yes_price : 0.5;
    const noPrice = typeof oddsData.no_price === 'number' ? oddsData.no_price : (1 - yesPrice);
    const category = metadata.category || 'General';
    const payoutTeaser = `Bet YES to win ${(1 / (yesPrice || 0.5)).toFixed(1)}x`;

    return {
        id: marketId,
        question: metadata.question,
        yesPrice: parseFloat(yesPrice.toFixed(2)),
        noPrice: parseFloat(noPrice.toFixed(2)),
        category: category,
        endsAt: metadata.end_date_iso ? new Date(metadata.end_date_iso) : undefined,
        imageUrl: metadata.image_url || `https://placehold.co/600x400.png`,
        aiHint: metadata.ai_hint || category.toLowerCase().split(' ').slice(0, 2).join(' ') || 'event',
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
 * Fetches a paginated list of live markets from Redis using the combined schema.
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
        pipeline.hgetall(`meta:market:${id}`); // Fetch metadata hash
        pipeline.get(`market:${id}`);          // Fetch odds JSON string
    });
    const results = await pipeline.exec<Array<Record<string, any> | string | null>>();

    const fetchedMarkets: LiveMarket[] = [];
    for (let i = 0; i < paginatedMarketIds.length; i++) {
        const marketId = paginatedMarketIds[i];
        const metadataResult = results[i * 2] as Record<string, any> | null;
        const oddsJsonString = results[i * 2 + 1] as string | null;

        let oddsData = null;
        if (oddsJsonString) {
            try {
                oddsData = JSON.parse(oddsJsonString);
            } catch (e) {
                console.error(`[MarketService] Failed to parse JSON for market odds ${marketId}. Data: "${oddsJsonString}"`, e);
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

    const pipeline = redis.pipeline();
    pipeline.hgetall(`meta:market:${marketId}`);
    pipeline.get(`market:${marketId}`);
    const [metadataResult, oddsJsonString] = await pipeline.exec<[Record<string, any> | null, string | null]>();

    if (!metadataResult) {
      console.warn(`[MarketService] No metadata found for single market ID ${marketId}.`);
      return null;
    }

    let oddsData = null;
    if(oddsJsonString){
        try {
            oddsData = JSON.parse(oddsJsonString);
        } catch (e) {
            console.error(`[MarketService] Failed to parse JSON for single market odds ${marketId}. Data: "${oddsJsonString}"`, e);
            // We might still proceed with just metadata if that's acceptable
        }
    }

    return constructMarket(marketId, metadataResult, oddsData);
}
