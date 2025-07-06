// src/app/api/markets/live-odds/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getLiveMarkets } from '@/lib/marketService'; // Use the new shared service

export const dynamic = 'force-dynamic';

// In-memory cache
let cachedData: any = null;
let lastCacheTime: number = 0;
const CACHE_DURATION = 5000; // 5 seconds

export async function GET(req: NextRequest) {
  const overallStartTime = Date.now();
  console.log(`[API /markets/live-odds] Received request at ${new Date(overallStartTime).toISOString()}`);

  const { searchParams } = req.nextUrl;
  const limitQuery = searchParams.get('limit');
  const offsetQuery = searchParams.get('offset');

  const limit = limitQuery ? parseInt(limitQuery) : 10;
  const offset = offsetQuery ? parseInt(offsetQuery) : 0;

  console.log(`[API /markets/live-odds] Processing request. Limit: ${limit}, Offset: ${offset}`);

  // Check cache first
  if (cachedData && (Date.now() - lastCacheTime < CACHE_DURATION)) {
    console.log('[API /markets/live-odds] Serving from cache.');
    const overallEndTime = Date.now();
    console.log(`[API /markets/live-odds] Successfully served from cache. Total execution time: ${overallEndTime - overallStartTime}ms`);
    return NextResponse.json(cachedData);
  }

  try {
    const marketData = await getLiveMarkets({ limit, offset });

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      marketCount: marketData.markets.length,
      totalAvailable: marketData.total,
      markets: marketData.markets,
      query: { limit, offset }
    };

    // Update cache
    cachedData = response;
    lastCacheTime = Date.now();
    console.log('[API /markets/live-odds] Updated cache.');


    const overallEndTime = Date.now();
    console.log(`[API /markets/live-odds] Successfully fetched ${marketData.markets.length} markets. Total execution time: ${overallEndTime - overallStartTime}ms`);

    return NextResponse.json(response, { status: 200 });

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
