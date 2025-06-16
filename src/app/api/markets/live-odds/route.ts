
// src/app/api/markets/live-odds/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { LiveMarketService } from '@/lib/polymarket-sdk/live-market-service';
import { EphemeralCredentialManager } from '@/lib/polymarket-sdk/credential-manager';

// Initialize services.
// These instances will be reused across requests in the same serverless function invocation (if warm)
// or recreated on cold starts. This is generally fine for this use case.
const credentialManager = new EphemeralCredentialManager();
const marketService = new LiveMarketService(credentialManager, 'amoy'); // Defaulting to 'amoy' testnet

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get('category') || undefined;
  const limitQuery = searchParams.get('limit');
  const limit = limitQuery ? parseInt(limitQuery) : 20;

  // Basic validation for limit
  if (isNaN(limit) || limit <= 0 || limit > 100) {
    return NextResponse.json({
      success: false,
      error: 'Invalid limit parameter. Must be a number between 1 and 100.',
    }, { status: 400 });
  }
  
  console.log(\`[API Route] /api/markets/live-odds called. Category: \${category}, Limit: \${limit}\`);

  try {
    const markets = await marketService.getLiveMarkets(limit, category);

    if (!markets || markets.length === 0) {
      return NextResponse.json({
        success: true, // Still a success, just no data for criteria
        message: 'No live markets found for the given criteria.',
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
    console.error('❌ Error in /api/markets/live-odds API route:', errorMessage, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch live market odds.',
      message: errorMessage,
    }, { status: 500 });
  }
}
