import 'server-only';
import redis from '@/lib/redis'; // Simplified import
import type { LiveMarket } from '@/types';

interface GetLiveMarketsParams {
  limit?: number;
  offset?: number;
}

interface LiveMarketsResponse {
  markets: LiveMarket[];
  total: number;
}

// Helper to get hardcoded market IDs (the correct way for this project)
const getTrackedMarketIds = (): string[] => {
  const idsFromEnv = process.env.TRACKED_MARKET_IDS;
  if (!idsFromEnv) {
    console.error("[MarketService] WARNING: TRACKED_MARKET_IDS env var is not set. No markets will be fetched.");
    return [];
  }
  return idsFromEnv.split(',').map(id => id.trim()).filter(id => id);
};

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
  const allTrackedIds = getTrackedMarketIds();
  const total = allTrackedIds.length;

  if (total === 0) {
    return { markets: [], total: 0 };
  }

  const paginatedMarketIds = allTrackedIds.slice(offset, offset + limit);

  if (paginatedMarketIds.length === 0) {
    console.log("[MarketService] No more tracked market IDs to fetch for the given offset or no IDs were configured.");
    return { markets: [], total };
  }
  
  try {
    const pipeline = redis.pipeline();
    paginatedMarketIds.forEach(marketId => {
      pipeline.hgetall(`market_odds:${marketId}`);
      pipeline.hgetall(`market_meta:${marketId}`);
      pipeline.hgetall(`token_price:${marketId}:Yes`);
      pipeline.hgetall(`token_price:${marketId}:No`);
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
    
    console.log(`[MarketService] Successfully constructed ${markets.length} of ${paginatedMarketIds.length} requested markets.`);
    return { markets, total };

  } catch (error) {
    console.error('[MarketService] A critical error occurred in getLiveMarkets:', error);
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
