// src/lib/marketService.ts
import 'server-only'; // Ensures this module is only used on the server
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

// The scanAllKeys function is now obsolete and has been removed.

interface GetLiveMarketsParams {
  limit?: number;
  offset?: number;
}

interface LiveMarketsResponse {
  markets: LiveMarket[];
  total: number;
}

export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  const redisClient = await getRedisClient();
  
  // NEW: Use SMEMBERS to get all active market IDs from the dedicated set.
  const activeMarketIds = await redisClient.smembers('active_market_ids');

  if (!activeMarketIds || activeMarketIds.length === 0) {
    console.log('[MarketService] No active market IDs found in the "active_market_ids" set.');
    return { markets: [], total: 0 };
  }
  
  const totalMarkets = activeMarketIds.length;

  // Paginate the market IDs.
  const paginatedMarketIds = activeMarketIds.slice(offset, offset + limit);

  if (paginatedMarketIds.length === 0) {
    return { markets: [], total: totalMarkets };
  }

  const pipeline = redisClient.pipeline();
  paginatedMarketIds.forEach(marketId => {
    pipeline.hgetall(`odds:market:${marketId}`);
    pipeline.hgetall(`meta:market:${marketId}`);
  });
  const pipelineResults = await pipeline.exec();
  
  if (!pipelineResults) {
    throw new Error('Failed to fetch data from Redis pipeline.');
  }

  const fetchedMarkets: LiveMarket[] = [];
  for (let i = 0; i < pipelineResults.length; i += 2) {
    const [oddsErr, singleOddData] = pipelineResults[i];
    const [metaErr, metaData] = pipelineResults[i + 1];
    const currentMarketId = paginatedMarketIds[i / 2];

    if (oddsErr || metaErr || !singleOddData) {
      console.warn(`Error fetching data for market ${currentMarketId}. OddsErr: ${oddsErr}, MetaErr: ${metaErr}`);
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
}

export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redisClient = await getRedisClient();
    const oddsKey = `odds:market:${marketId}`;
    const metaKey = `meta:market:${marketId}`;

    const pipeline = redisClient.pipeline();
    pipeline.hgetall(oddsKey);
    pipeline.hgetall(metaKey);
    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Failed to fetch data from Redis pipeline.');
    }

    const [oddsErr, oddsData] = results[0];
    const [metaErr, metaData] = results[1];
    
    if (oddsErr || metaErr || !oddsData || Object.keys(oddsData).length === 0) {
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
}
