
import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

interface RedisOddsData {
  yes_price: number;
  no_price: number;
  ts: number;
}

interface RedisMetadata {
  question: string;
  category: string;
  slug: string;
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
 * @param marketId The condition ID of the market.
 * @param oddsData The parsed JSON object from the 'market:{id}' key.
 * @param metaData The object from the 'meta:market:{id}' hash.
 * @returns A LiveMarket object or null if essential metadata is missing.
 */
function constructMarket(marketId: string, oddsData: RedisOddsData | null, metaData: RedisMetadata): LiveMarket | null {
  if (!metaData || !metaData.question) {
    console.warn(`[MarketService] Missing essential metadata in Redis for market ${marketId}. Skipping.`);
    return null;
  }

  const category = metaData.category || 'General';

  return {
    id: marketId,
    question: metaData.question,
    category: category,
    yesPrice: oddsData ? parseFloat(oddsData.yes_price.toFixed(2)) : 0.50,
    noPrice: oddsData ? parseFloat(oddsData.no_price.toFixed(2)) : 0.50,
    imageUrl: `https://placehold.co/600x400.png`,
    aiHint: category.toLowerCase(),
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

    const paginatedMarketIds = activeMarketIds.slice(offset, offset + limit);
    if (paginatedMarketIds.length === 0) {
      return { markets: [], total: totalMarkets };
    }

    const pipeline = redis.pipeline();
    paginatedMarketIds.forEach(id => {
      pipeline.get(`market:${id}`);      // Fetching odds (JSON string)
      pipeline.hgetall(`meta:market:${id}`); // Fetching metadata (Hash)
    });

    const results = await pipeline.exec();

    const markets: LiveMarket[] = [];
    for (let i = 0; i < paginatedMarketIds.length; i++) {
      const marketId = paginatedMarketIds[i];
      const oddsDataString = results[i * 2] as string | null;
      const metaData = results[i * 2 + 1] as RedisMetadata | null;

      let parsedOddsData: RedisOddsData | null = null;
      if (oddsDataString) {
        try {
          // This is the critical change: parsing the JSON string from Redis.
          parsedOddsData = JSON.parse(oddsDataString);
        } catch (e) {
          console.error(`[MarketService] Could not parse odds JSON for market ${marketId}. Invalid data: ${oddsDataString}`, e);
        }
      }

      const market = constructMarket(marketId, parsedOddsData, metaData);
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
        const pipeline = redis.pipeline();
        pipeline.get(`market:${marketId}`);
        pipeline.hgetall(`meta:market:${marketId}`);
        const [oddsDataString, metaData] = await pipeline.exec() as [string | null, RedisMetadata | null];
        
        let parsedOddsData: RedisOddsData | null = null;
        if (oddsDataString) {
            try {
              parsedOddsData = JSON.parse(oddsDataString);
            } catch (e) {
              console.error(`[MarketService] Failed to parse odds JSON for single market ${marketId}`, e);
            }
        }

        if (!metaData) {
            return null;
        }

        return constructMarket(marketId, parsedOddsData, metaData);

    } catch (error) {
        console.error(`[MarketService] A critical error occurred in getMarketDetails for ID ${marketId}:`, error);
        return null;
    }
}
