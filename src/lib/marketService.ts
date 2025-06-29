
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

function constructMarket(
  marketId: string,
  oddsData: any,
  metaData: any,
  yesTokenData: any,
  noTokenData: any
): LiveMarket | null {
  if (!metaData || !metaData.question) {
    console.warn(`[MarketService] Skipping market ${marketId}: Metadata not yet available.`);
    return null;
  }
  
  const yesImpliedProbability = parseFloat(oddsData?.market_yes_price || 0);

  // For the simplified UI, we still provide a top-level `yesPrice` and `noPrice`.
  // We'll use the implied probability for this.
  const yesPrice = yesImpliedProbability;
  const noPrice = 1 - yesPrice;

  return {
    id: marketId,
    question: metaData.question,
    category: metaData.category || 'General',
    yesPrice: parseFloat(yesPrice.toFixed(2)),
    noPrice: parseFloat(noPrice.toFixed(2)),
    imageUrl: `https://placehold.co/600x400.png`,
    aiHint: metaData.category?.toLowerCase() || 'general',
    // New rich data structure
    pricing: {
      yes: {
        buy: parseFloat(yesTokenData?.buy_price || 0),
        sell: parseFloat(yesTokenData?.sell_price || 0),
        lastUpdated: yesTokenData?.timestamp,
      },
      no: {
        buy: parseFloat(noTokenData?.buy_price || 0),
        sell: parseFloat(noTokenData?.sell_price || 0),
        lastUpdated: noTokenData?.timestamp,
      },
    },
    odds: {
      yesImpliedProbability: yesImpliedProbability,
      noImpliedProbability: parseFloat(oddsData?.market_no_price_implied_yes || 0),
      midpointPrice: parseFloat(oddsData?.midpoint_price || 0),
      lastUpdated: oddsData?.last_updated_timestamp,
    },
  };
}


/**
 * Fetches a paginated list of live markets from the optimized Redis structure.
 * This version uses the `active_market_ids` set for discovery, which is more
 * performant and reliable than a `KEYS` scan.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  const redis = getRedisClient();

  try {
    // 1. Discover active markets from the dedicated `active_market_ids` set.
    const activeMarketIds = await redis.smembers('active_market_ids');
    const totalMarkets = activeMarketIds.length;

    if (totalMarkets === 0) {
      console.log("[MarketService] No market IDs found in 'active_market_ids' set in Redis.");
      return { markets: [], total: 0 };
    }

    // Paginate
    const paginatedMarketIds = activeMarketIds.slice(offset, offset + limit);

    if (paginatedMarketIds.length === 0) {
      return { markets: [], total: totalMarkets };
    }

    // 2. Build pipeline to fetch all required data for the paginated IDs.
    const pipeline = redis.pipeline();
    paginatedMarketIds.forEach(id => {
      pipeline.hgetall(`market_odds:${id}`);
      pipeline.hgetall(`market_meta:${id}`);
      pipeline.hgetall(`token_price:${id}:Yes`);
      pipeline.hgetall(`token_price:${id}:No`);
    });

    // 3. Execute pipeline
    const results = await pipeline.exec();

    // 4. Process results
    const markets: LiveMarket[] = [];
    for (let i = 0; i < paginatedMarketIds.length; i++) {
      const marketId = paginatedMarketIds[i];
      const oddsData = results[i * 4];
      const metaData = results[i * 4 + 1];
      const yesTokenData = results[i * 4 + 2];
      const noTokenData = results[i * 4 + 3];

      const market = constructMarket(marketId, oddsData, metaData, yesTokenData, noTokenData);
      if (market) {
        markets.push(market);
      }
    }

    console.log(`[MarketService] Successfully constructed ${markets.length} of ${paginatedMarketIds.length} requested markets. Source: 100% Redis (Set-based discovery).`);
    return { markets, total: totalMarkets };

  } catch (error) {
    console.error('[MarketService] A critical error occurred in getLiveMarkets:', error);
    // In case of error (e.g., Redis connection), return empty.
    return { markets: [], total: 0 };
  }
}

/**
 * Fetches the complete details for a single market from the optimized Redis structure.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redis = getRedisClient();
    try {
        const pipeline = redis.pipeline();
        pipeline.hgetall(`market_odds:${marketId}`);
        pipeline.hgetall(`market_meta:${marketId}`);
        pipeline.hgetall(`token_price:${marketId}:Yes`);
        pipeline.hgetall(`token_price:${marketId}:No`);

        const [oddsData, metaData, yesTokenData, noTokenData] = await pipeline.exec();

        if (!metaData) {
            console.warn(`[MarketService] No metadata found for single market fetch: ${marketId}`);
            return null;
        }

        return constructMarket(marketId, oddsData, metaData, yesTokenData, noTokenData);

    } catch (error) {
        console.error(`[MarketService] A critical error occurred in getMarketDetails for ID ${marketId}:`, error);
        return null;
    }
}
