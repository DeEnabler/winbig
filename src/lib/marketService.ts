import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

// The architect has confirmed that market discovery via `KEYS` is not permitted in prod.
// Instead, we fetch data for a known, tracked list of markets.
// This is now managed via an environment variable for security and flexibility.
const getTrackedMarketIds = (): string[] => {
  const idsFromEnv = process.env.TRACKED_MARKET_IDS;
  if (!idsFromEnv) {
    console.warn("[MarketService] WARNING: TRACKED_MARKET_IDS env var is not set. No markets will be fetched.");
    return [];
  }
  return idsFromEnv.split(',').map(id => id.trim()).filter(id => id);
};


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
  // Essential data check: We need metadata and odds to display a market.
  if (!metaData?.question || !oddsData) {
    console.warn(`[MarketService] Skipping market ${marketId}: Missing essential metadata or odds data in Redis.`);
    return null;
  }
  
  const yesImpliedProbability = parseFloat(oddsData?.market_yes_price || 0);

  return {
    id: marketId,
    question: metaData.question,
    category: metaData.category || 'General',
    yesPrice: parseFloat(yesImpliedProbability.toFixed(2)),
    noPrice: parseFloat((1 - yesImpliedProbability).toFixed(2)),
    imageUrl: `https://placehold.co/600x400.png`,
    aiHint: metaData.category?.toLowerCase() || metaData.question.split(' ').slice(0,2).join(' ') || 'general',
    pricing: {
      yes: {
        buy: parseFloat(yesTokenData?.buy_price || 0),
        sell: parseFloat(yesTokenData?.sell_price || 0),
        lastUpdated: yesTokenData?.timestamp,
        assetId: yesTokenData?.asset_id, // Pass asset_id
      },
      no: {
        buy: parseFloat(noTokenData?.buy_price || 0),
        sell: parseFloat(noTokenData?.sell_price || 0),
        lastUpdated: noTokenData?.timestamp,
        assetId: noTokenData?.asset_id, // Pass asset_id
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
 * Fetches data for known, tracked markets directly from Redis without discovery.
 * This is the production-safe method that avoids using the `KEYS` command.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  const redis = getRedisClient();
  const allTrackedIds = getTrackedMarketIds();

  // Paginate the hardcoded list of IDs
  const paginatedMarketIds = allTrackedIds.slice(offset, offset + limit);

  if (paginatedMarketIds.length === 0) {
      console.log("[MarketService] No more tracked market IDs to fetch for the given offset.");
      return { markets: [], total: allTrackedIds.length };
  }

  try {
    const pipeline = redis.pipeline();
    paginatedMarketIds.forEach(id => {
      pipeline.hgetall(`market_odds:${id}`);
      pipeline.hgetall(`market_meta:${id}`);
      pipeline.hgetall(`token_price:${id}:Yes`);
      pipeline.hgetall(`token_price:${id}:No`);
    });

    const results = await pipeline.exec();

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

    console.log(`[MarketService] Successfully constructed ${markets.length} of ${paginatedMarketIds.length} requested markets. Source: Redis (Direct Fetch).`);
    return { markets, total: allTrackedIds.length };

  } catch (error) {
    console.error('[MarketService] A critical error occurred in getLiveMarkets:', error);
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
