import 'server-only';
import getRedisClient from '@/lib/redis';
import type { LiveMarket, RedisMetadata } from '@/types';

// The architect has confirmed that market discovery via `KEYS` is not permitted.
// The client should fetch data for known, tracked markets.
// For now, we will use a single, hardcoded market ID as the "featured market".
const TRACKED_MARKET_IDS = [
  '0x6d00ab09f247ede23241d2abe257b4345dbb82b5e4eeae4eb2ba0980013a658c'
];


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
  
  // For the simple UI card, we still provide a top-level `yesPrice` and `noPrice`.
  // We'll use the implied probability for this, which is more representative than a single buy/sell price.
  const yesImpliedProbability = parseFloat(oddsData?.market_yes_price || 0);

  return {
    id: marketId,
    question: metaData.question,
    category: metaData.category || 'General',
    // These simple prices can be used for basic UI cards
    yesPrice: parseFloat(yesImpliedProbability.toFixed(2)),
    noPrice: parseFloat((1 - yesImpliedProbability).toFixed(2)),
    imageUrl: `https://placehold.co/600x400.png`,
    aiHint: metaData.category?.toLowerCase() || metaData.question.split(' ').slice(0,2).join(' ') || 'general',
    // New rich data structure for detailed views
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
 * Fetches data for known, tracked markets directly from Redis without discovery.
 * This is the production-safe method that avoids using the `KEYS` command.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  const redis = getRedisClient();
  // Paginate the hardcoded list of IDs
  const paginatedMarketIds = TRACKED_MARKET_IDS.slice(offset, offset + limit);

  if (paginatedMarketIds.length === 0) {
      console.log("[MarketService] No more tracked market IDs to fetch for the given offset.");
      return { markets: [], total: TRACKED_MARKET_IDS.length };
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
    return { markets, total: TRACKED_MARKET_IDS.length };

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
