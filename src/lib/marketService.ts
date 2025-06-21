
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
    pipeline.hgetall(`odds:market:${marketId}`);
    pipeline.hgetall(`meta:market:${marketId}`);
  });

  try {
    const pipelineResults = await pipeline.exec();
    
    const fetchedMarkets: LiveMarket[] = [];
    for (let i = 0; i < pipelineResults.length; i += 2) {
      const singleOddData = pipelineResults[i] as Record<string, string> | null;
      const metaData = pipelineResults[i+1] as Record<string, string> | null;
      const currentMarketId = paginatedMarketIds[i / 2];

      if (!singleOddData) {
        console.warn(`[MarketService] No odds data returned from pipeline for market ${currentMarketId}.`);
        continue;
      }

      const yesPrice = parseFloat(singleOddData.yesPrice);
      const noPrice = parseFloat(singleOddData.noPrice);

      if (isNaN(yesPrice) || isNaN(noPrice)) {
        console.warn(`Invalid prices for market ${currentMarketId}`);
        continue;
      }

      const marketToAdd: LiveMarket = {
        id: currentMarketId,
        question: metaData?.question || singleOddData.question || 'N/A',
        yesPrice: yesPrice,
        noPrice: noPrice,
        category: metaData?.category || singleOddData.category || 'General',
        endsAt: metaData?.endsAt ? new Date(metaData.endsAt) : (singleOddData.endsAt ? new Date(singleOddData.endsAt) : undefined),
        imageUrl: metaData?.imageUrl || singleOddData.imageUrl || `https://placehold.co/600x400.png`,
        aiHint: metaData?.aiHint || singleOddData.aiHint || 'event',
        payoutTeaser: metaData?.payoutTeaser,
        streakCount: metaData?.streakCount ? parseInt(metaData.streakCount) : undefined,
        facePileCount: metaData?.facePileCount ? parseInt(metaData.facePileCount) : undefined,
      };
      fetchedMarkets.push(marketToAdd);
    }
    return { markets: fetchedMarkets, total: totalMarkets };

  } catch (error) {
    console.error('[MarketService] CRITICAL ERROR executing Redis pipeline:', error);
    // Re-throw or handle as appropriate for your app's error strategy
    throw new Error('Failed to fetch market data from Redis.');
  }
}

export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redisClient = getRedisClient();
    const oddsKey = `odds:market:${marketId}`;
    const metaKey = `meta:market:${marketId}`;

    try {
        const pipeline = redisClient.pipeline();
        pipeline.hgetall(oddsKey);
        pipeline.hgetall(metaKey);
        const results = await pipeline.exec();

        const oddsData = results[0] as Record<string, string> | null;
        const metaData = results[1] as Record<string, string> | null;
        
        if (!oddsData || Object.keys(oddsData).length === 0) {
          return null;
        }

        const yesPrice = parseFloat(oddsData.yesPrice);
        const noPrice = parseFloat(oddsData.noPrice);

        if (isNaN(yesPrice) || isNaN(noPrice)) {
            return null;
        }

        const market: LiveMarket = {
          id: marketId,
          question: metaData?.question || oddsData.question || 'N/A',
          yesPrice: yesPrice,
          noPrice: noPrice,
          category: metaData?.category || oddsData.category || 'General',
          endsAt: metaData?.endsAt ? new Date(metaData.endsAt) : (oddsData.endsAt ? new Date(oddsData.endsAt) : undefined),
          imageUrl: metaData?.imageUrl || oddsData.imageUrl || `https://placehold.co/600x400.png`,
          aiHint: metaData?.aiHint || oddsData.aiHint || 'event',
          payoutTeaser: metaData?.payoutTeaser,
          streakCount: metaData?.streakCount ? parseInt(metaData.streakCount) : undefined,
      facePileCount: metaData?.facePileCount ? parseInt(metaData.facePileCount) : undefined,
        };
        return market;
    } catch(error) {
        console.error(`[MarketService] CRITICAL ERROR fetching details for market ${marketId}:`, error);
        throw new Error(`Failed to fetch market details for ${marketId} from Redis.`);
    }
}
