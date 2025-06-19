
// src/app/api/markets/[marketId]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import getRedisClient from '@/lib/redis'; // Import the reusable client getter
import type { LiveMarket } from '@/types'; // Using the main app-wide LiveMarket type

export const dynamic = 'force-dynamic'; // Ensures the route is not cached by Next.js

export async function GET(
  req: NextRequest,
  { params }: { params: { marketId: string } }
) {
  const { marketId } = params;

  if (!marketId) {
    return NextResponse.json({ success: false, error: 'Market ID is required.' }, { status: 400 });
  }

  console.log(`[API Route] /api/markets/${marketId} called.`);

  try {
    const redisClient = getRedisClient();
    // Ensure connection if lazyConnect is used, or if client might have disconnected.
    // ioredis handles reconnections, but an explicit connect() can be good for first use in a request.
    if (redisClient.status !== 'ready' && redisClient.status !== 'connect') {
        await redisClient.connect().catch(err => { 
            console.error(`[API Route /markets/${marketId}] Failed to connect to Redis for market detail:`, err);
            throw new Error('Failed to connect to Redis.');
        });
    }

    const oddsKey = `odds:market:${marketId}`;
    const metaKey = `meta:market:${marketId}`;

    // Fetch odds and metadata in parallel
    const [oddsData, metaData] = await Promise.all([
      redisClient.hgetall(oddsKey),
      redisClient.hgetall(metaKey),
    ]);

    if (!oddsData || Object.keys(oddsData).length === 0) {
      console.log(`[API Route /markets/${marketId}] No odds data found in Redis for key ${oddsKey}.`);
      return NextResponse.json({ success: false, error: 'Market odds not found.' }, { status: 404 });
    }
    // Metadata is important, but we might proceed if some basic odds data (like question) exists.
    // For this version, let's assume metadata is not strictly required for a 404 if odds exist.
    if (!metaData || Object.keys(metaData).length === 0) {
      console.warn(`[API Route /markets/${marketId}] No metadata found in Redis for key ${metaKey}. Market might exist but metadata is missing.`);
    }

    const yesPrice = parseFloat(oddsData.yesPrice);
    const noPrice = parseFloat(oddsData.noPrice);

    if (isNaN(yesPrice) || isNaN(noPrice)) {
      console.warn(`[API Route /markets/${marketId}] Invalid prices for market ${marketId}: yes=${oddsData.yesPrice}, no=${oddsData.noPrice}`);
      return NextResponse.json({ success: false, error: 'Market price data is invalid.' }, { status: 500 });
    }

    const market: LiveMarket = {
      id: oddsData.marketId || marketId, 
      question: metaData?.question || oddsData.question || 'N/A', 
      yesPrice: yesPrice,
      noPrice: noPrice,
      category: metaData?.category || oddsData.category || 'General',
      endsAt: metaData?.endsAt ? new Date(metaData.endsAt) : (oddsData.endsAt ? new Date(oddsData.endsAt) : undefined),
      imageUrl: metaData?.imageUrl || oddsData.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(metaData?.category || oddsData.category || 'Market')}`,
      aiHint: metaData?.aiHint || oddsData.aiHint || (metaData?.category || oddsData.category || 'event').toLowerCase(),
    };
    
    // Add any additional fields from metaData that are part of LiveMarket type
    if (metaData?.payoutTeaser) market.payoutTeaser = metaData.payoutTeaser;
    if (metaData?.streakCount) market.streakCount = parseInt(metaData.streakCount);
    if (metaData?.facePileCount) market.facePileCount = parseInt(metaData.facePileCount);
    if (metaData?.timeLeft) market.timeLeft = metaData.timeLeft;


    return NextResponse.json({ success: true, market }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[API Route /markets/${marketId}] Error fetching market details from Redis:`, errorMessage, error);
    const responseError = process.env.NODE_ENV === 'development' ? errorMessage : 'Failed to fetch market details from cache.';
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch market details.',
      message: responseError,
    }, { status: 500 });
  }
}
