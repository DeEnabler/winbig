import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

// This is the interface for the data we get from Redis odds key
interface RedisOddsData {
  yes_price: number;
  no_price: number;
  ts: number;
}

// This is the interface for the data we get from Redis metadata hash
interface RedisMetadata {
  question: string;
  category: string;
  slug: string;
  // any other fields...
}

interface GetLiveMarketsParams {
  limit?: number;
  offset?: number;
}

interface LiveMarketsResponse {
  markets: LiveMarket[];
  total: number;
}

/**
 * Constructs a LiveMarket object from Redis data.
 * This function expects that metadata exists, as guaranteed by the fixed producer.
 * @param marketId The condition ID of the market.
 * @param oddsData The parsed JSON object from the 'market:{id}' key. Can be null if odds haven't been written yet.
 * @param metaData The object from the 'meta:market:{id}' hash. Should not be null.
 * @returns A LiveMarket object or null if essential metadata is missing.
 */
function constructMarket(marketId: string, oddsData: RedisOddsData | null, metaData: RedisMetadata | null): LiveMarket | null {
  // The producer now guarantees metadata. If it's missing, it's an unexpected state.
  if (!metaData || !metaData.question) {
    console.warn(`[MarketService] Missing essential metadata in Redis for market ${marketId}. Skipping.`);
    return null;
  }

  return {
    id: marketId,
    question: metaData.question,
    category: metaData.category || 'General',
    // Provide a default if odds are momentarily missing (e.g., race condition on new market)
    yesPrice: oddsData ? parseFloat(oddsData.yes_price.toFixed(2)) : 0.50,
    noPrice: oddsData ? parseFloat(oddsData.no_price.toFixed(2)) : 0.50,
    imageUrl: `https://placehold.co/600x400.png`,
    aiHint: metaData.category?.toLowerCase() || 'event'
  };
}


/**
 * Fetches a paginated list of live markets by reading all data directly from Redis
 * using a pipeline for maximum efficiency, as specified in the definitive example.
 */
export async function getLiveMarkets({ limit = 3, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  const redis = getRedisClient();

  try {
    const activeMarketIds = await redis.smembers('active_market_ids');
    const totalMarkets = activeMarketIds.length;

    if (totalMarkets === 0) {
      console.warn("[MarketService] No active market IDs found in Redis.");
      return { markets: [], total: 0 };
    }

    const paginatedMarketIds = activeMarketIds.slice(offset, offset + limit);
    if (paginatedMarketIds.length === 0) {
      return { markets: [], total: totalMarkets };
    }

    const pipeline = redis.pipeline();
    paginatedMarketIds.forEach(id => {
      pipeline.get(`market:${id}`);      // Odds data (JSON string)
      pipeline.hgetall(`meta:market:${id}`); // Metadata (Hash)
    });

    const results = await pipeline.exec();

    const markets: LiveMarket[] = [];
    for (let i = 0; i < paginatedMarketIds.length; i++) {
      const marketId = paginatedMarketIds[i];
      const oddsJsonString = results[i * 2] as string | null;
      const metaData = results[i * 2 + 1] as RedisMetadata | null;

      let oddsData: RedisOddsData | null = null;
      if (oddsJsonString) {
        try {
          oddsData = JSON.parse(oddsJsonString);
        } catch (e) {
          console.error(`[MarketService] Failed to parse odds JSON for market ${marketId}`, e);
          // Don't skip the market, just proceed without odds data
        }
      }

      const market = constructMarket(marketId, oddsData, metaData);
      if (market) {
        markets.push(market);
      }
    }

    console.log(`[MarketService] Successfully constructed ${markets.length} of ${paginatedMarketIds.length} requested markets from Redis.`);
    return { markets, total: totalMarkets };

  } catch (error) {
    console.error('[MarketService] A critical error occurred in getLiveMarkets:', error);
    return { markets: [], total: 0 };
  }
}

/**
 * Fetches the complete details for a single market from Redis.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    try {
        const [oddsJsonString, metaData] = await Promise.all([
            redis.get<string | null>(`market:${marketId}`),
            redis.hgetall<RedisMetadata | null>(`meta:market:${marketId}`)
        ]);

        let oddsData: RedisOddsData | null = null;
        if (oddsJsonString) {
            try {
              oddsData = JSON.parse(oddsJsonString);
            } catch (e) {
              console.error(`[MarketService] Failed to parse odds JSON for single market ${marketId}`, e);
            }
        }

        return constructMarket(marketId, oddsData, metaData);

    } catch (error) {
        console.error(`[MarketService] A critical error occurred in getMarketDetails for ID ${marketId}:`, error);
        return null;
    }
}
