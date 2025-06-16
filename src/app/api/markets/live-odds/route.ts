
// src/app/api/markets/live-odds/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { LiveMarketService } from '@/lib/polymarket-sdk/live-market-service';
import { EphemeralCredentialManager } from '@/lib/polymarket-sdk/credential-manager';

// Initialize services.
// These instances will be reused across requests in the same serverless function invocation (if warm)
// or recreated on cold starts. This is generally fine for this use case.
const credentialManager = new EphemeralCredentialManager();
// Reverted to Amoy for testnet focus, service itself now filters better
const marketService = new LiveMarketService(credentialManager, 'amoy'); 

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get('category') || undefined;
  const limitQuery = searchParams.get('limit');
  // Service default is 50, API route can override. Defaulting API query to 20 still.
  const limit = limitQuery ? parseInt(limitQuery) : 20; 

  // Basic validation for limit
  if (isNaN(limit) || limit <= 0 || limit > 100) { // Max limit 100 for sanity
    return NextResponse.json({
      success: false,
      error: 'Invalid limit parameter. Must be a number between 1 and 100.',
    }, { status: 400 });
  }
  
  console.log(`[API Route] /api/markets/live-odds called. Category: ${category}, Limit: ${limit}, Network: amoy`);

  try {
    const markets = await marketService.getLiveMarkets(limit, category);

    if (!markets || markets.length === 0) {
      return NextResponse.json({
        success: true, // Still a success, just no data for criteria
        message: 'No live markets found for the given criteria after filtering.',
        timestamp: new Date().toISOString(),
        marketCount: 0,
        markets: [],
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      marketCount: markets.length,
      markets: markets,
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('❌ Error in /api/markets/live-odds API route (using amoy network):', errorMessage, error);
    // Log nested error response if available, especially from Polymarket API
    if (error instanceof Error && (error as any).response?.data) {
      console.error('└──> Polymarket API Response (from route error):', (error as any).response.data);
    }
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch live market odds.',
      message: errorMessage,
    }, { status: 500 });
  }
}
