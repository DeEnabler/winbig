// src/lib/marketService.ts
import 'server-only'; // Ensures this module is only used on the server
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

export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  const redisClient = getRedisClient();
  
  const activeMarketIds = await redisClient.smembers('active_market_ids');

  if (!activeMarketIds || activeMarketIds.length === 0) {
    console.log('[MarketService] No active market IDs found in the "active_market_ids" set.');
    return { markets: [], total: 0 };
  }
  
  const totalMarkets = activeMarketIds.length;
  const paginatedMarketIds = activeMarketIds.slice(offset, offset + limit);

  if (paginatedMarketIds.length === 0) {
    return { markets: [], total: totalMarkets };
  }

  const pipeline = redisClient.pipeline();
  paginatedMarketIds.forEach(marketId => {
    // As per the guide, the odds key is "odds:<marketId>"
    pipeline.hgetall(`odds:${marketId}`);
    pipeline.hgetall(`meta:market:${marketId}`);
  });

  try {
    // The new client returns a flat array of results.
    const pipelineResults = await pipeline.exec<Array<Record<string, unknown> | null>>();
    
    const fetchedMarkets: LiveMarket[] = [];
    for (let i = 0; i < pipelineResults.length; i += 2) {
      const singleOddData = pipelineResults[i] as Record<string, string> | null;
      const metaData = pipelineResults[i + 1] as Record<string, string> | null;
      const currentMarketId = paginatedMarketIds[i / 2];

      if (!singleOddData) {
        console.warn(`[MarketService] No odds data returned from pipeline for market ${currentMarketId}.`);
        continue;
      }
      
      // The keys from python producer are 'yes_price' and 'no_price'
      const yesPrice = parseFloat(singleOddData.yes_price);
      const noPrice = parseFloat(singleOddData.no_price);

      if (isNaN(yesPrice) || isNaN(noPrice)) {
        console.warn(`Invalid prices for market ${currentMarketId}: yes_price=${singleOddData.yes_price}, no_price=${singleOddData.no_price}`);
        continue;
      }

      const marketToAdd: LiveMarket = {
        id: currentMarketId,
        question: metaData?.question || 'N/A',
        yesPrice: yesPrice,
        noPrice: noPrice,
        category: metaData?.category || 'General',
        endsAt: metaData?.endDateIso ? new Date(metaData.endDateIso) : undefined,
        imageUrl: metaData?.image_url || `https://placehold.co/600x400.png`,
        aiHint: metaData?.ai_hint || 'event',
        payoutTeaser: `Bet YES to win ${(1 / yesPrice).toFixed(1)}x`, // Generate teaser dynamically
      };
      fetchedMarkets.push(marketToAdd);
    }
    return { markets: fetchedMarkets, total: totalMarkets };

  } catch (error) {
    console.error('[MarketService] CRITICAL ERROR executing Redis pipeline:', error);
    throw new Error('Failed to fetch market data from Redis.');
  }
}

export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redisClient = getRedisClient();
    // As per the guide, the odds key is "odds:<marketId>"
    const oddsKey = `odds:${marketId}`;
    const metaKey = `meta:market:${marketId}`;

    try {
        const pipeline = redisClient.pipeline();
        pipeline.hgetall(oddsKey);
        pipeline.hgetall(metaKey);
        const results = await pipeline.exec<Array<Record<string, unknown> | null>>();

        const oddsData = results[0] as Record<string, string> | null;
        const metaData = results[1] as Record<string, string> | null;
        
        if (!oddsData || Object.keys(oddsData).length === 0) {
          console.warn(`[MarketService] No odds data found for market ${marketId}`);
          return null;
        }
        if (!metaData || Object.keys(metaData).length === 0) {
          console.warn(`[MarketService] No metadata found for market ${marketId}`);
          // We can still proceed with odds data if needed, but it's likely an incomplete market
        }

        const yesPrice = parseFloat(oddsData.yes_price);
        const noPrice = parseFloat(oddsData.no_price);

        if (isNaN(yesPrice) || isNaN(noPrice)) {
            console.warn(`Invalid prices for market ${marketId} in getMarketDetails.`);
            return null;
        }

        const market: LiveMarket = {
          id: marketId,
          question: metaData?.question || 'N/A',
          yesPrice: yesPrice,
          noPrice: noPrice,
          category: metaData?.category || 'General',
          endsAt: metaData?.endDateIso ? new Date(metaData.endDateIso) : undefined,
          imageUrl: metaData?.image_url || `https://placehold.co/600x400.png`,
          aiHint: metaData?.ai_hint || 'event',
          payoutTeaser: `Bet YES to win ${(1 / yesPrice).toFixed(1)}x`,
        };
        return market;
    } catch(error) {
        console.error(`[MarketService] CRITICAL ERROR fetching details for market ${marketId}:`, error);
        throw new Error(`Failed to fetch market details for ${marketId} from Redis.`);
    }
}
