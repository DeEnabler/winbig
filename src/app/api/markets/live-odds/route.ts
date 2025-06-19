
// src/app/api/markets/live-odds/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

export const dynamic = 'force-dynamic';

// Helper function to get all keys matching a pattern using SCAN
async function scanAllKeys(redisClient: import('ioredis').Redis, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  const startTime = Date.now();
  try {
    do {
      const scanResult = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = scanResult[0];
      keys.push(...scanResult[1]);
    } while (cursor !== '0');
  } finally {
    const duration = Date.now() - startTime;
    console.log(`[API /markets/live-odds] scanAllKeys for pattern "${pattern}" took ${duration}ms. Found ${keys.length} keys.`);
  }
  return keys;
}

export async function GET(req: NextRequest) {
  const overallStartTime = Date.now();
  console.log(`[API /markets/live-odds] Received request at ${new Date(overallStartTime).toISOString()}`);
  const { searchParams } = req.nextUrl;
  const limitQuery = searchParams.get('limit');
  const offsetQuery = searchParams.get('offset');

  const limit = limitQuery ? parseInt(limitQuery) : 20;
  const offset = offsetQuery ? parseInt(offsetQuery) : 0;

  console.log(`[API /markets/live-odds] Processing request. Limit: ${limit}, Offset: ${offset}`);

  try {
    const redisClient = await getRedisClient();
    console.log('[API /markets/live-odds] Obtained Redis client.');

    const oddsMarketKeys = await scanAllKeys(redisClient, "odds:market:*");
    console.log(`[API /markets/live-odds] Found ${oddsMarketKeys.length} odds keys using SCAN.`);

    if (!oddsMarketKeys || oddsMarketKeys.length === 0) {
      const emptyResponseTime = Date.now();
      console.log(`[API /markets/live-odds] No market keys found. Total execution time: ${emptyResponseTime - overallStartTime}ms`);
      return NextResponse.json({
        success: true,
        message: 'No live markets found in Redis.',
        timestamp: new Date().toISOString(),
        marketCount: 0,
        markets: [],
        totalAvailable: 0,
      }, { status: 200 });
    }

    const marketIds = oddsMarketKeys.map(key => key.substring("odds:market:".length));

    console.time('[API /markets/live-odds] pipeline.exec(odds+meta)');
    const pipeline = redisClient.pipeline();
    marketIds.forEach(marketId => {
      pipeline.hgetall(`odds:market:${marketId}`);
      pipeline.hgetall(`meta:market:${marketId}`);
    });
    const pipelineResults = await pipeline.exec();
    console.timeEnd('[API /markets/live-odds] pipeline.exec(odds+meta)');


    if (!pipelineResults) {
      console.error('[API /markets/live-odds] Redis pipeline.exec() returned null or undefined.');
      return NextResponse.json({ success: false, error: 'Failed to fetch data from Redis pipeline.' }, { status: 500 });
    }

    console.log(`[API /markets/live-odds] Pipeline returned ${pipelineResults.length} results (odds+meta pairs). Processing...`);
    const fetchedMarkets: LiveMarket[] = [];

    for (let i = 0; i < pipelineResults.length; i += 2) {
      const [oddsErr, singleOddData] = pipelineResults[i];
      const [metaErr, metaData] = pipelineResults[i + 1];
      const currentMarketId = marketIds[i / 2];

      if (oddsErr) {
        console.warn(`[API /markets/live-odds] Error in pipeline result for odds of market ${currentMarketId}:`, oddsErr);
        continue;
      }
      if (metaErr) {
        console.warn(`[API /markets/live-odds] Error in pipeline result for meta of market ${currentMarketId}:`, metaErr);
      }

      if (!singleOddData || Object.keys(singleOddData).length === 0) {
        console.warn(`[API /markets/live-odds] Empty odds data in pipeline result for market ${currentMarketId}.`);
        continue;
      }

      const yesPrice = parseFloat(singleOddData.yesPrice);
      const noPrice = parseFloat(singleOddData.noPrice);

      if (isNaN(yesPrice) || isNaN(noPrice)) {
        console.warn(`[API /markets/live-odds] Invalid prices for market ${currentMarketId}: yes=${singleOddData.yesPrice}, no=${singleOddData.noPrice}`);
        continue;
      }

      const marketToAdd: LiveMarket = {
        id: currentMarketId,
        question: metaData?.question || singleOddData.question || 'N/A - Check meta',
        yesPrice: yesPrice,
        noPrice: noPrice,
        category: metaData?.category || singleOddData.category || 'General',
        endsAt: metaData?.endsAt ? new Date(metaData.endsAt) : (singleOddData.endsAt ? new Date(singleOddData.endsAt) : undefined),
        imageUrl: metaData?.imageUrl || singleOddData.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(metaData?.category || 'Market')}`,
        aiHint: metaData?.aiHint || singleOddData.aiHint || (metaData?.category || 'event').toLowerCase(),
        ...(metaData?.payoutTeaser && { payoutTeaser: metaData.payoutTeaser }),
        ...(metaData?.streakCount && { streakCount: parseInt(metaData.streakCount) }),
        ...(metaData?.facePileCount && { facePileCount: parseInt(metaData.facePileCount) }),
        ...(metaData?.timeLeft && { timeLeft: metaData.timeLeft }),
      };
      fetchedMarkets.push(marketToAdd);
    }

    if (fetchedMarkets.length > 0) {
        console.log(`[API /markets/live-odds] Successfully processed ${fetchedMarkets.length} markets.`);
    } else {
        console.log('[API /markets/live-odds] No valid markets assembled after processing all Redis data.');
    }

    const paginatedMarkets = fetchedMarkets.slice(offset, offset + limit);
    console.log(`[API /markets/live-odds] Returning ${paginatedMarkets.length} markets after pagination. Total available: ${fetchedMarkets.length}.`);

    const overallEndTime = Date.now();
    console.log(`[API /markets/live-odds] Total execution time: ${overallEndTime - overallStartTime}ms`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      marketCount: paginatedMarkets.length,
      totalAvailable: fetchedMarkets.length,
      markets: paginatedMarkets,
      query: { limit, offset }
    }, { status: 200 });

  } catch (error) {
    const overallEndTimeOnCatch = Date.now();
    console.log(`[API /markets/live-odds] Total execution time on error: ${overallEndTimeOnCatch - overallStartTime}ms`);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[API /markets/live-odds] CRITICAL ERROR in GET handler:', errorMessage, error);
    const responseError = process.env.NODE_ENV === 'development' ? errorMessage : 'Failed to fetch live market odds from cache.';
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch live market odds.',
      message: responseError,
      query: { limit, offset }
    }, { status: 500 });
  }
}
