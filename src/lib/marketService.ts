import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket, RedisMetadata } from '@/types';

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
function constructMarket(marketId: string, oddsData: any | null, metaData: RedisMetadata): LiveMarket | null {
  if (!metaData || !metaData.question) {
    console.warn(`[MarketService] Missing essential metadata in Redis for market ${marketId}. Skipping.`);
    return null;
  }

  // We now have four distinct price points. For this UI, we will display
  // the price to BUY Yes and the price to BUY No.
  const yesBuyPrice = oddsData ? oddsData.yes_buy_price : 0.50;
  const noBuyPrice = oddsData ? oddsData.no_buy_price : 0.50;

  // --- START: ADDED DIAGNOSTIC BLOCK ---
  console.log(`[DIAGNOSTIC] Market ID: ${marketId}`);
  console.log(`[DIAGNOSTIC] Raw 'yes_buy_price':`, yesBuyPrice, `(Type: ${typeof yesBuyPrice})`);
  console.log(`[DIAGNOSTIC] Raw 'no_buy_price':`, noBuyPrice, `(Type: ${typeof noBuyPrice})`);
  // --- END: ADDED DIAGNOSTIC BLOCK ---

  return {
    id: marketId,
    question: metaData.question,
    category: metaData.category || 'General',
    // SIMPLIFIED: Directly convert to number, avoiding complex string conversion.
    yesPrice: Number(yesBuyPrice),
    noPrice: Number(noBuyPrice),
    imageUrl: `https://placehold.co/600x400.png`,
    aiHint: metaData.category?.toLowerCase() || 'general',
  };
}


/**
 * Fetches a paginated list of live markets by reading all data directly from Redis
 * using a pipeline for maximum efficiency.
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
      const metaData = results[i * 2 + 1] as RedisMetadata | null; // This should be the metadata object

      let parsedOddsData: any | null = null;
      if (oddsDataString) {
        try {
          // The producer now stores odds as a JSON string, so we must parse it.
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
        
        let parsedOddsData: any | null = null;
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
