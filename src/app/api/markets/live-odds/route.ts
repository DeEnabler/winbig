// src/app/api/markets/live-odds/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import type { LiveMarket } from '@/types'; // Using the main app-wide LiveMarket type

export const dynamic = 'force-dynamic'; // Ensures the route is not cached

let redis: Redis.Redis | null = null;

function getRedisClient(): Redis.Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.error('[API/Redis] REDIS_URL environment variable is not set.');
      throw new Error('Redis connection string is not configured.');
    }
    try {
      console.log('[API/Redis] Initializing Redis client...');
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 10000, // 10 seconds
        // Add TLS for Upstash if not included in REDIS_URL and needed
        // tls: process.env.REDIS_TLS_ENABLED === 'true' ? {} : undefined,
      });

      redis.on('connect', () => console.log('[API/Redis] Connected to Redis server.'));
      redis.on('error', (err) => {
        console.error('[API/Redis] Redis connection error:', err);
        // Potentially nullify client to allow re-initialization on next request or implement more robust retry
        // Be careful with just nullifying, might lead to multiple connection attempts on concurrent requests.
        // For now, log and let ioredis handle retries internally if configured.
      });
      redis.on('reconnecting', () => console.log('[API/Redis] Reconnecting to Redis...'));
      redis.on('end', () => console.log('[API/Redis] Connection to Redis ended.'));

    } catch (e) {
      console.error('[API/Redis] Failed to initialize Redis client:', e);
      throw e; // Rethrow to indicate failure
    }
  }
  return redis;
}


export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  // Pagination params are kept for API consistency, but Redis implementation might simplify this.
  // For now, we'll fetch all relevant odds and let client-side handle more if needed,
  // or implement pagination on Redis keys if performance becomes an issue.
  const limitQuery = searchParams.get('limit');
  const offsetQuery = searchParams.get('offset');

  const limit = limitQuery ? parseInt(limitQuery) : 20;
  const offset = offsetQuery ? parseInt(offsetQuery) : 0;

  console.log(`[API Route] /api/markets/live-odds called (Redis). Limit: ${limit}, Offset: ${offset}`);

  try {
    const redisClient = getRedisClient();
    // Use SCAN instead of KEYS for better performance in production
    // For simplicity in this example, using KEYS. Replace with SCAN for larger datasets.
    // let cursor = '0';
    // const allOddsKeys: string[] = [];
    // do {
    //   const [nextCursor, keysBatch] = await redisClient.scan(cursor, 'MATCH', 'odds:*', 'COUNT', 100);
    //   allOddsKeys.push(...keysBatch);
    //   cursor = nextCursor;
    // } while (cursor !== '0');

    const oddsKeys = await redisClient.keys("odds:*");

    if (!oddsKeys || oddsKeys.length === 0) {
      console.log('[API/Redis] No keys found for "odds:*" pattern.');
      return NextResponse.json({
        success: true,
        message: 'No live markets found in Redis.',
        timestamp: new Date().toISOString(),
        marketCount: 0,
        markets: [],
      }, { status: 200 });
    }

    // Fetch all odds data hashes
    const pipeline = redisClient.pipeline();
    oddsKeys.forEach(key => pipeline.hgetall(key));
    const oddsResults = await pipeline.exec();

    if (!oddsResults) {
      console.error('[API/Redis] Pipeline exec for odds returned null or undefined.');
      return NextResponse.json({ success: false, error: 'Failed to fetch odds data from Redis pipeline.' }, { status: 500 });
    }
    
    const fetchedMarkets: LiveMarket[] = [];

    for (let i = 0; i < oddsResults.length; i++) {
      const [err, singleOddData] = oddsResults[i];
      if (err || !singleOddData) {
        console.warn(`[API/Redis] Error fetching or empty data for key ${oddsKeys[i]}:`, err);
        continue;
      }

      const marketId = singleOddData.marketId || oddsKeys[i].split(':')[1]; // Extract ID if not in hash

      if (!marketId) {
        console.warn(`[API/Redis] Could not determine marketId for key ${oddsKeys[i]} and data:`, singleOddData);
        continue;
      }

      // Fetch corresponding metadata
      const metaData = await redisClient.hgetall(`meta:market:${marketId}`);

      const yesPrice = parseFloat(singleOddData.yesPrice);
      const noPrice = parseFloat(singleOddData.noPrice);

      if (isNaN(yesPrice) || isNaN(noPrice)) {
        console.warn(`[API/Redis] Invalid prices for market ${marketId}: yes=${singleOddData.yesPrice}, no=${singleOddData.noPrice}`);
        continue;
      }

      fetchedMarkets.push({
        id: marketId,
        question: metaData.question || singleOddData.question || 'N/A',
        yesPrice: yesPrice,
        noPrice: noPrice,
        category: metaData.category || singleOddData.category || 'General',
        endsAt: metaData.endsAt ? new Date(metaData.endsAt) : (singleOddData.endsAt ? new Date(singleOddData.endsAt) : undefined),
        imageUrl: metaData.imageUrl || singleOddData.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(metaData.category || 'Market')}`,
        aiHint: metaData.aiHint || singleOddData.aiHint || (metaData.category || 'event').toLowerCase(),
        // Include other fields from metaData or singleOddData as needed, mapping to LiveMarket type
        payoutTeaser: metaData.payoutTeaser || singleOddData.payoutTeaser,
        streakCount: metaData.streakCount ? parseInt(metaData.streakCount) : (singleOddData.streakCount ? parseInt(singleOddData.streakCount) : undefined),
        facePileCount: metaData.facePileCount ? parseInt(metaData.facePileCount) : (singleOddData.facePileCount ? parseInt(singleOddData.facePileCount) : undefined),
        timeLeft: metaData.timeLeft || singleOddData.timeLeft,

      });
    }
    
    // Apply limit and offset after fetching and processing all, for simplicity.
    // For large datasets, Redis-side pagination (e.g., with sorted sets) would be better.
    const paginatedMarkets = fetchedMarkets.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      marketCount: paginatedMarkets.length,
      totalAvailable: fetchedMarkets.length,
      markets: paginatedMarkets,
      query: { limit, offset }
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[API/Redis] Error fetching live market odds from Redis:', errorMessage, error);
    // Avoid leaking sensitive error details in production
    const responseError = process.env.NODE_ENV === 'development' ? errorMessage : 'Failed to fetch live market odds from cache.';
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch live market odds.',
      message: responseError,
      query: { limit, offset }
    }, { status: 500 });
  }
}
