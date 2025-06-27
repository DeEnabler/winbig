
// src/lib/marketService.ts
import 'server-only';
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
 * Fetches a paginated list of live markets by reading all data directly from Redis.
 * This aligns with the definitive data fetching strategy.
 */
export async function getLiveMarkets({ limit = 3, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redis = getRedisClient();
    
    try {
        const activeMarketIds = await redis.smembers('active_market_ids');
        const totalMarkets = activeMarketIds.length;

        if (totalMarkets === 0) {
            console.warn("[MarketService] No market IDs found in 'active_market_ids'. The data producer may not be running.");
            return { markets: [], total: 0 };
        }

        const paginatedMarketIds = activeMarketIds.slice(offset, offset + limit);

        if (paginatedMarketIds.length === 0) {
            return { markets: [], total: totalMarkets };
        }

        const pipeline = redis.pipeline();
        paginatedMarketIds.forEach(id => {
            pipeline.get(`market:${id}`);      // Fetch odds (JSON string)
            pipeline.hgetall(`meta:market:${id}`); // Fetch metadata (Hash)
        });

        const results = await pipeline.exec();

        const markets: LiveMarket[] = [];
        for (let i = 0; i < paginatedMarketIds.length; i++) {
            const marketId = paginatedMarketIds[i];
            const oddsData = results[i * 2] as { yes_price: number, no_price: number, ts: number } | null;
            const metaData = results[i * 2 + 1] as { question: string, category: string, slug: string } | null;

            if (!metaData || !metaData.question) {
                console.warn(`[MarketService] Missing essential metadata in Redis for market ${marketId}. Skipping.`);
                continue;
            }

            markets.push({
                id: marketId,
                question: metaData.question,
                category: metaData.category || 'General',
                // Default to 0.50/0.50 if odds are missing (e.g., race condition on first write)
                yesPrice: oddsData ? parseFloat(oddsData.yes_price.toFixed(2)) : 0.50,
                noPrice: oddsData ? parseFloat(oddsData.no_price.toFixed(2)) : 0.50,
                imageUrl: `https://placehold.co/600x400.png`, // Use a reliable placeholder
                aiHint: metaData.category?.toLowerCase() || 'event'
            });
        }
        
        console.log(`[MarketService] Successfully constructed ${markets.length} of ${paginatedMarketIds.length} requested markets from Redis.`);
        return { markets, total: totalMarkets };

    } catch (error) {
        console.error('[MarketService] A critical error occurred in getLiveMarkets:', error);
        return { markets: [], total: 0 };
    }
}


/**
 * Fetches the COMPLETE details for a single market by its ID from Redis.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    
    try {
        const pipeline = redis.pipeline();
        pipeline.get(`market:${marketId}`);
        pipeline.hgetall(`meta:market:${marketId}`);
        const [oddsData, metaData] = await pipeline.exec() as [
            { yes_price: number, no_price: number, ts: number } | null,
            { question: string, category: string, slug: string } | null
        ];

        if (!metaData || !metaData.question) {
            console.warn(`[MarketService] No metadata found in Redis for market detail view ${marketId}.`);
            return null;
        }

        return {
            id: marketId,
            question: metaData.question,
            category: metaData.category || 'General',
            yesPrice: oddsData ? parseFloat(oddsData.yes_price.toFixed(2)) : 0.50,
            noPrice: oddsData ? parseFloat(oddsData.no_price.toFixed(2)) : 0.50,
            imageUrl: `https://placehold.co/600x400.png`,
            aiHint: metaData.category?.toLowerCase() || 'event'
        };
    } catch (error) {
        console.error(`[MarketService] A critical error occurred in getMarketDetails for ID ${marketId}:`, error);
        return null;
    }
}
