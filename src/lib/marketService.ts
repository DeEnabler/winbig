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
 * Fetches data for markets by discovering them from Redis using the SCAN command.
 * This is the recommended method that avoids using the KEYS command.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  const redis = getRedisClient();
  
  try {
    // 1. Discover active markets from Redis keys using SCAN
    const marketOddsKeys = [];
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'market_odds:*', count: 100 });
      cursor = nextCursor;
      marketOddsKeys.push(...keys);
    } while (cursor !== 0);
    
    if (marketOddsKeys.length === 0) {
      console.log("[MarketService] No markets found in Redis.");
      return { markets: [], total: 0 };
    }
    
    // Extract market IDs
    const marketIds = marketOddsKeys.map(key => key.replace('market_odds:', ''));
    
    // Paginate the discovered IDs
    const paginatedMarketIds = marketIds.slice(offset, offset + limit);

    // 2. Build efficient pipeline to fetch all data
    const pipeline = redis.pipeline();
    
    paginatedMarketIds.forEach(marketId => {
      pipeline.hgetall(`market_odds:${marketId}`);
      pipeline.hgetall(`market_meta:${marketId}`);
      pipeline.hgetall(`token_price:${marketId}:Yes`);
      pipeline.hgetall(`token_price:${marketId}:No`);
    });
    
    // 3. Execute pipeline and process results
    const results = await pipeline.exec();
    
    // 4. Build market objects
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
    
    console.log(`[MarketService] Successfully constructed ${markets.length} of ${paginatedMarketIds.length} requested markets. Source: Redis (Dynamic Discovery).`);
    return { markets, total: marketIds.length };

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
