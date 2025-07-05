
import 'server-only';
import redis from '@/lib/redis';
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
  // Essential data check
  if (!metaData?.question) {
    console.warn(`[MarketService] Skipping market ${marketId}: Missing essential 'question' in metaData.`);
    return null;
  }
  if (!oddsData) {
     console.warn(`[MarketService] Skipping market ${marketId}: Missing essential oddsData.`);
    return null;
  }
   if (!yesTokenData || !noTokenData) {
     console.warn(`[MarketService] Skipping market ${marketId}: Missing token pricing data.`);
    return null;
  }
  
  const yesImpliedProbability = parseFloat(oddsData?.market_yes_price || 0);

  return {
    id: marketId,
    question: metaData.question,
    category: metaData.category || 'General',
    // Simple prices for fallback display
    yesPrice: parseFloat(yesTokenData?.buy_price || yesImpliedProbability.toFixed(2)),
    noPrice: parseFloat(noTokenData?.buy_price || (1 - yesImpliedProbability).toFixed(2)),
    imageUrl: `https://placehold.co/600x400.png`,
    aiHint: metaData.category?.toLowerCase() || metaData.question.split(' ').slice(0,2).join(' ') || 'general',
    // Rich pricing data
    pricing: {
      yes: {
        buy: parseFloat(yesTokenData.buy_price || 0),
        sell: parseFloat(yesTokenData.sell_price || 0),
        lastUpdated: yesTokenData.timestamp,
        assetId: yesTokenData.asset_id,
      },
      no: {
        buy: parseFloat(noTokenData.buy_price || 0),
        sell: parseFloat(noTokenData.sell_price || 0),
        lastUpdated: noTokenData.timestamp,
        assetId: noTokenData.asset_id,
      },
    },
    // Market odds data
    odds: {
      yesImpliedProbability: yesImpliedProbability,
      noImpliedProbability: 1 - yesImpliedProbability, // Simplified calculation
      midpointPrice: parseFloat(oddsData.midpoint_price || 0),
      lastUpdated: oddsData.last_updated_timestamp,
    },
  };
}

export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  try {
    // 1. Discover active markets from Redis keys using SCAN instead of KEYS
    const marketOddsKeys: string[] = [];
    let cursor = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, { 
        match: 'market_odds:*', 
        count: 100 
      });
      marketOddsKeys.push(...keys);
      cursor = Number(nextCursor);
    } while (cursor !== 0);


    if (!marketOddsKeys || marketOddsKeys.length === 0) {
      console.log("[MarketService] No market_odds keys found in Redis using SCAN. No markets to display.");
      return { markets: [], total: 0 };
    }
    
    // Extract market IDs
    const allMarketIds = marketOddsKeys.map(key => key.replace('market_odds:', ''));
    const total = allMarketIds.length;

    const paginatedMarketIds = allMarketIds.slice(offset, offset + limit);

    if (paginatedMarketIds.length === 0) {
      console.log("[MarketService] No more market IDs to fetch for the given offset.");
      return { markets: [], total };
    }

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
    
    console.log(`[MarketService] Successfully constructed ${markets.length} of ${paginatedMarketIds.length} requested markets.`);
    return { markets, total };

  } catch (error) {
    console.error('[MarketService] A critical error occurred in getLiveMarkets:', error);
    // In case of error (e.g. Redis unavailable), return empty
    return { markets: [], total: 0 };
  }
}

export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
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
