
// src/app/api/markets/[marketId]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getMarketDetails } from '@/lib/marketService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: { marketId: string } }
) {
  const { marketId } = context.params;
  console.log(`[API /markets/${marketId}] Request received`);

  if (!marketId) {
    return NextResponse.json({ success: false, error: 'Market ID is required.' }, { status: 400 });
  }

  try {
    const market = await getMarketDetails(marketId);

    if (!market) {
      return NextResponse.json({ success: false, error: `Market not found for ID ${marketId}.` }, { status: 404 });
    }
    
    console.log(`[API /markets/${marketId}] Successfully fetched market details.`);
    return NextResponse.json({ success: true, market }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[API /markets/${marketId}] CRITICAL ERROR in GET handler:`, errorMessage, error);
    const responseError = process.env.NODE_ENV === 'development' ? errorMessage : 'Failed to fetch market details.';
    return NextResponse.json({
      success: false,
      error: `Failed to process request for market ID ${marketId}.`,
      message: responseError,
    }, { status: 500 });
  }
}
