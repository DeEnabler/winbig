
// src/app/api/markets/[marketId]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import getRedisClient from '@/lib/redis'; 
import type { LiveMarket } from '@/types'; 

export const dynamic = 'force-dynamic'; 

export async function GET(
  req: NextRequest,
  { params }: { params: { marketId: string } }
) {
  const overallStartTime = Date.now();
  const { marketId } = params;

  console.log(`[API /markets/${marketId}] Received request for market ID: ${marketId} at ${new Date(overallStartTime).toISOString()}`);

  if (!marketId) {
    console.warn(`[API /markets/${marketId}] Market ID is missing from params.`);
    return NextResponse.json({ success: false, error: 'Market ID is required.' }, { status: 400 });
  }

  try {
    console.time(`[API /markets/${marketId}] getRedisClient`);
    const redisClient = await getRedisClient();
    console.timeEnd(`[API /markets/${marketId}] getRedisClient`);
    console.log(`[API /markets/${marketId}] Obtained Redis client.`);

    const oddsKey = `odds:market:${marketId}`;
    const metaKey = `meta:market:${marketId}`;

    // Use a pipeline to fetch odds and metadata simultaneously
    console.time(`[API /markets/${marketId}] pipeline.exec(odds+meta)`);
    const pipeline = redisClient.pipeline();
    pipeline.hgetall(oddsKey);
    pipeline.hgetall(metaKey);
    const results = await pipeline.exec();
    console.timeEnd(`[API /markets/${marketId}] pipeline.exec(odds+meta)`);

    if (!results) {
      console.error(`[API /markets/${marketId}] Redis pipeline.exec() returned null or undefined.`);
      return NextResponse.json({ success: false, error: 'Failed to fetch data from Redis pipeline.' }, { status: 500 });
    }

    const [oddsErr, oddsData] = results[0];
    const [metaErr, metaData] = results[1];

    if (oddsErr) {
      // Log error but don't immediately fail if e.g. meta still available or vice versa
      console.error(`[API /markets/${marketId}] Error fetching odds from Redis for key ${oddsKey}:`, oddsErr);
    }
    if (metaErr) {
      console.warn(`[API /markets/${marketId}] Error fetching metadata from Redis for key ${metaKey}:`, metaErr);
    }

    // Check if critical odds data is present
    if (!oddsData || Object.keys(oddsData).length === 0) {
      console.warn(`[API /markets/${marketId}] No odds data found in Redis for key ${oddsKey}.`);
      const overallEndTimeOnNotFound = Date.now();
      console.log(`[API /markets/${marketId}] Total execution time (Not Found): ${overallEndTimeOnNotFound - overallStartTime}ms`);
      return NextResponse.json({ success: false, error: `Market odds not found for ID ${marketId}.` }, { status: 404 });
    }
    console.log(`[API /markets/${marketId}] Odds data retrieved:`, oddsData);

    // Log if metadata is missing but don't fail the request solely on this
    if (!metaData || Object.keys(metaData).length === 0) {
      console.warn(`[API /markets/${marketId}] No metadata found in Redis for key ${metaKey}. Market might exist but metadata is missing.`);
    } else {
      console.log(`[API /markets/${marketId}] Metadata retrieved:`, metaData);
    }

    const yesPrice = parseFloat(oddsData.yesPrice);
    const noPrice = parseFloat(oddsData.noPrice);

    if (isNaN(yesPrice) || isNaN(noPrice)) {
      console.error(`[API /markets/${marketId}] Invalid prices for market ${marketId}: yes=${oddsData.yesPrice}, no=${oddsData.noPrice}. Cannot parse to float.`);
      const overallEndTimeOnError = Date.now();
      console.log(`[API /markets/${marketId}] Total execution time (Invalid Price): ${overallEndTimeOnError - overallStartTime}ms`);
      return NextResponse.json({ success: false, error: 'Market price data is invalid or unparsable.' }, { status: 500 });
    }

    // Construct the market object, prioritizing metaData but falling back to oddsData or defaults
    const market: LiveMarket = {
      id: oddsData.marketId || marketId, // Use marketId from key if not in data
      question: metaData?.question || oddsData.question || 'N/A - Question not found in meta or odds', 
      yesPrice: yesPrice,
      noPrice: noPrice,
      category: metaData?.category || oddsData.category || 'General',
      endsAt: metaData?.endsAt ? new Date(metaData.endsAt) : (oddsData.endsAt ? new Date(oddsData.endsAt) : undefined),
      imageUrl: metaData?.imageUrl || oddsData.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(metaData?.category || oddsData.category || 'Market')}`,
      aiHint: metaData?.aiHint || oddsData.aiHint || (metaData?.category || oddsData.category || 'event').toLowerCase(),
      // Safely add optional fields from metaData
      ...(metaData?.payoutTeaser && { payoutTeaser: metaData.payoutTeaser }),
      ...(metaData?.streakCount && { streakCount: parseInt(metaData.streakCount) }),
      ...(metaData?.facePileCount && { facePileCount: parseInt(metaData.facePileCount) }),
      ...(metaData?.timeLeft && { timeLeft: metaData.timeLeft }),
    };
    
    const overallEndTimeOnSuccess = Date.now();
    console.log(`[API /markets/${marketId}] Successfully assembled market data. Total execution time: ${overallEndTimeOnSuccess - overallStartTime}ms`);
    return NextResponse.json({ success: true, market }, { status: 200 });

  } catch (error) {
    const overallEndTimeOnError = Date.now();
    console.log(`[API /markets/${marketId}] Total execution time on error: ${overallEndTimeOnError - overallStartTime}ms`);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[API /markets/${marketId}] CRITICAL ERROR in GET handler:`, errorMessage, error);
    const responseError = process.env.NODE_ENV === 'development' ? errorMessage : 'Failed to fetch market details from cache.';
    return NextResponse.json({
      success: false,
      error: `Failed to fetch market details for ID ${marketId}.`,
      message: responseError,
    }, { status: 500 });
  }
}
