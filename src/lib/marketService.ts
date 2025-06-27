
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

interface MarketMetadata {
    question: string;
    category: string;
    slug: string;
}

/**
 * Fetches a paginated list of live markets by reading all data directly from Redis.
 * This function now assumes a two-part data structure in Redis:
 * 1. A single key ('market_metadata_map') holding a JSON string of all market metadata.
 * 2. Individual 'market:{id}' keys for live odds.
 */
export async function getLiveMarkets({ limit = 3, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
    const redis = getRedisClient();
    
    try {
        console.log("[MarketService] Initiating fetch...");

        // Step 1: Fetch the single key containing all market metadata.
        const metadataMapString = await redis.get<string>('market_metadata_map');
        if (!metadataMapString) {
            console.error("[MarketService] CRITICAL: 'market_metadata_map' key not found in Redis. Cannot proceed.");
            return { markets: [], total: 0 };
        }
        const metadataMap: Record<string, MarketMetadata> = JSON.parse(metadataMapString);

        // Step 2: Fetch active market IDs.
        const activeMarketIds = await redis.smembers('active_market_ids');
        const totalMarkets = activeMarketIds.length;
        if (totalMarkets === 0) {
            console.warn("[MarketService] No active market IDs found. Producer may be offline.");
            return { markets: [], total: 0 };
        }

        // Step 3: Paginate IDs and fetch corresponding odds.
        const paginatedMarketIds = activeMarketIds.slice(offset, offset + limit);
        if (paginatedMarketIds.length === 0) {
            return { markets: [], total: totalMarkets };
        }

        const oddsKeys = paginatedMarketIds.map(id => `market:${id}`);
        const oddsDataArray = await redis.mget<({ yes_price: number, no_price: number, ts: number } | null)[]>(...oddsKeys);

        // Step 4: Combine metadata and odds.
        const markets: LiveMarket[] = [];
        paginatedMarketIds.forEach((marketId, i) => {
            const meta = metadataMap[marketId];
            const odds = oddsDataArray[i];

            if (!meta || !meta.question) {
                console.warn(`[MarketService] Metadata for active market ${marketId} not found in metadata map. Skipping.`);
                return;
            }

            markets.push({
                id: marketId,
                question: meta.question,
                category: meta.category || 'General',
                yesPrice: odds ? parseFloat(odds.yes_price.toFixed(2)) : 0.50, // Gracefully handle null odds
                noPrice: odds ? parseFloat(odds.no_price.toFixed(2)) : 0.50,
                imageUrl: `https://placehold.co/600x400.png`,
                aiHint: meta.category?.toLowerCase() || 'event'
            });
        });
        
        console.log(`[MarketService] Successfully constructed ${markets.length} of ${paginatedMarketIds.length} requested markets.`);
        return { markets, total: totalMarkets };

    } catch (error) {
        console.error('[MarketService] A critical error occurred in getLiveMarkets:', error);
        return { markets: [], total: 0 };
    }
}


/**
 * Fetches the COMPLETE details for a single market.
 * It first checks the central metadata map, then fetches live odds.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    
    try {
        const metadataMapString = await redis.get<string>('market_metadata_map');
        if (!metadataMapString) {
            console.error(`[MarketService] CRITICAL: 'market_metadata_map' key not found for getMarketDetails.`);
            return null;
        }
        const metadataMap: Record<string, MarketMetadata> = JSON.parse(metadataMapString);
        
        const meta = metadataMap[marketId];
        if (!meta || !meta.question) {
            console.warn(`[MarketService] No metadata found in map for market detail view ${marketId}.`);
            return null;
        }

        const odds = await redis.get<{ yes_price: number, no_price: number, ts: number }>(`market:${marketId}`);

        return {
            id: marketId,
            question: meta.question,
            category: meta.category || 'General',
            yesPrice: odds ? parseFloat(odds.yes_price.toFixed(2)) : 0.50,
            noPrice: odds ? parseFloat(odds.no_price.toFixed(2)) : 0.50,
            imageUrl: `https://placehold.co/600x400.png`,
            aiHint: meta.category?.toLowerCase() || 'event'
        };
    } catch (error) {
        console.error(`[MarketService] A critical error occurred in getMarketDetails for ID ${marketId}:`, error);
        return null;
    }
}
