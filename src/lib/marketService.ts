
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

const LIVE_MARKETS_CACHE_KEY = 'cache:live_markets_data';
const LIVE_MARKETS_CACHE_TTL_SECONDS = 15; // Cache results for 15 seconds

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
  // 1. Try to get the full list of markets from cache first
  try {
    const cachedData = await redis.get(LIVE_MARKETS_CACHE_KEY);
    if (cachedData) {
      console.log(`[MarketService] CACHE HIT for live markets.`);
      const allMarkets: LiveMarket[] = JSON.parse(cachedData as string);
      const paginatedMarkets = allMarkets.slice(offset, offset + limit);
      return { markets: paginatedMarkets, total: allMarkets.length };
    }
  } catch (e) {
      console.error('[MarketService] Failed to read from cache, fetching from source.', e);
  }

  console.log(`[MarketService] CACHE MISS. Fetching live markets from Redis source.`);
  try {
    // 2. Discover active markets from Redis keys using SCAN instead of KEYS
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
    
    // We fetch all markets to build the cache, then paginate.
    const pipeline = redis.pipeline();
    allMarketIds.forEach(marketId => {
      pipeline.hgetall(`market_odds:${marketId}`);
      pipeline.hgetall(`market_meta:${marketId}`);
      pipeline.hgetall(`token_price:${marketId}:Yes`);
      pipeline.hgetall(`token_price:${marketId}:No`);
    });

    const results = await pipeline.exec();
    
    const allMarkets: LiveMarket[] = [];
    for (let i = 0; i < allMarketIds.length; i++) {
      const marketId = allMarketIds[i];
      const oddsData = results[i * 4];
      const metaData = results[i * 4 + 1];
      const yesTokenData = results[i * 4 + 2];
      const noTokenData = results[i * 4 + 3];

      const market = constructMarket(marketId, oddsData, metaData, yesTokenData, noTokenData);
      if (market) {
        allMarkets.push(market);
      }
    }
    
    // 5. Cache the full, unpaginated result
    if (allMarkets.length > 0) {
      try {
        await redis.set(LIVE_MARKETS_CACHE_KEY, JSON.stringify(allMarkets), { ex: LIVE_MARKETS_CACHE_TTL_SECONDS });
        console.log(`[MarketService] Successfully cached ${allMarkets.length} markets for ${LIVE_MARKETS_CACHE_TTL_SECONDS} seconds.`);
      } catch (e) {
        console.error('[MarketService] Failed to write to cache.', e);
      }
    }

    // 6. Paginate the newly fetched data for the current request
    const paginatedMarkets = allMarkets.slice(offset, offset + limit);
    return { markets: paginatedMarkets, total: allMarkets.length };

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
