
// src/app/api/markets/live-odds/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { LiveMarketService } from '@/lib/polymarket-sdk/live-market-service';
import { EphemeralCredentialManager } from '@/lib/polymarket-sdk/credential-manager';

const credentialManager = new EphemeralCredentialManager();
const marketService = new LiveMarketService(credentialManager, 'polygon'); 

export const dynamic = 'force-dynamic'; // Ensures the route is not cached

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get('category') || undefined;
  const limitQuery = searchParams.get('limit');
  const offsetQuery = searchParams.get('offset'); // New offset parameter

  const limit = limitQuery ? parseInt(limitQuery) : 20; 
  const offset = offsetQuery ? parseInt(offsetQuery) : 0; // Default offset to 0

  if (isNaN(limit) || limit <= 0 || limit > 100) {
    return NextResponse.json({
      success: false,
      error: 'Invalid limit parameter. Must be a number between 1 and 100.',
    }, { status: 400 });
  }
  if (isNaN(offset) || offset < 0) {
    return NextResponse.json({
      success: false,
      error: 'Invalid offset parameter. Must be a non-negative number.',
    }, { status: 400 });
  }
  
  console.log(`[API Route] /api/markets/live-odds called. Category: ${category}, Limit: ${limit}, Offset: ${offset}, Network: polygon`);

  try {
    // Pass offset to getLiveMarkets. The service will need to handle this.
    // For now, the service's getLiveMarkets might fetch more and slice, or we adapt it.
    // The current LiveMarketService fetches a larger candidate pool and then prices a slice of `limit`.
    // To implement true offset, LiveMarketService would need to fetch `limit + offset` candidates,
    // then price and return the slice from `offset` to `offset + limit`.
    // For this iteration, we'll let the service return its top `limit` results, and the frontend
    // requesting with offset is an intention for future pagination support in the service.
    // The service will still fetch a pool potentially larger than `limit` based on its tiered strategy.
    
    // A simple way to simulate offset if the service doesn't support it directly,
    // while still respecting the tiered fetching:
    // Fetch a slightly larger batch if offset is used, then slice.
    // This is not perfect pagination but better than ignoring offset.
    const fetchLimit = offset > 0 ? limit + offset : limit; 
    const allFetchedMarkets = await marketService.getLiveMarkets(fetchLimit, category);

    const marketsToReturn = allFetchedMarkets.slice(offset, offset + limit);


    if (!marketsToReturn || marketsToReturn.length === 0) {
      return NextResponse.json({
        success: true, 
        message: 'No live markets found for the given criteria after filtering and offset.',
        timestamp: new Date().toISOString(),
        marketCount: 0,
        markets: [],
        query: { limit, offset, category }
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      marketCount: marketsToReturn.length,
      markets: marketsToReturn,
      query: { limit, offset, category }
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('❌ Error in /api/markets/live-odds API route (using polygon network):', errorMessage, error);
    if (error instanceof Error && (error as any).response?.data) {
      console.error('└──> Polymarket API Response (from route error):', (error as any).response.data);
    }
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch live market odds.',
      message: errorMessage,
       query: { limit, offset, category }
    }, { status: 500 });
  }
}
