
// src/app/api/bets/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { mockCurrentUser } from '@/lib/mockData';
import { insertBet, type BetRecord } from '@/lib/supabase';
import { getMarketOdds } from '@/lib/marketService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId, // In a real app, this would come from authenticated session
      challengeMatchId, // The ID from the URL path of the challenge e.g. "challengeAsTest1"
      predictionId,
      choice, // 'YES' or 'NO'
      amount,
      referrerName, // Optional: who referred this challenge acceptance
      bonusApplied // Added to receive bonus status
    } = body;

    // Validate required fields
    if (!predictionId || !choice || !amount) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: predictionId, choice, and amount are required.',
      }, { status: 400 });
    }

    // Validate choice
    if (choice !== 'YES' && choice !== 'NO') {
      return NextResponse.json({
        success: false,
        message: 'Invalid choice. Must be either "YES" or "NO".',
      }, { status: 400 });
    }

    // Validate amount
    const betAmount = parseFloat(amount);
    if (isNaN(betAmount) || betAmount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid amount. Must be a positive number.',
      }, { status: 400 });
    }

    // Use provided userId or fall back to mock user
    const finalUserId = userId || mockCurrentUser.id;

    // Get current market odds for accurate recording
    let currentOdds = choice === 'YES' ? 0.5 : 0.5; // Default fallback
    
    try {
      const marketOdds = await getMarketOdds(predictionId);
      if (marketOdds) {
        currentOdds = choice === 'YES' ? marketOdds.odds.yes : marketOdds.odds.no;
        console.log(`✅ Retrieved market odds for ${predictionId}: YES=${marketOdds.odds.yes.toFixed(3)}, NO=${marketOdds.odds.no.toFixed(3)}`);
      } else {
        console.warn(`⚠️ Could not retrieve market odds for ${predictionId}, using fallback odds`);
      }
    } catch (error) {
      console.error(`❌ Error fetching market odds for ${predictionId}:`, error);
    }

    console.log('Received bet placement request:');
    console.log({ userId: finalUserId, challengeMatchId, predictionId, choice, amount: betAmount, currentOdds, referrerName, bonusApplied });

    // Create bet record for Supabase
    const betRecord: Omit<BetRecord, 'id' | 'created_at'> = {
      user_id: finalUserId,
      session_id: challengeMatchId, // Using challengeMatchId as session_id for tracking
      market_id: predictionId,
      outcome: choice as 'YES' | 'NO',
      amount: betAmount,
      odds_shown_to_user: currentOdds,
      status: 'pending',
      notes: bonusApplied ? `Bonus applied by referrer: ${referrerName || 'unknown'}` : undefined
    };

    // Insert bet into Supabase
    const result = await insertBet(betRecord);
    
    if (!result.success) {
      console.error('Failed to insert bet into database:', result.error);
      return NextResponse.json({
        success: false,
        message: 'Failed to save bet to database.',
        error: result.error,
      }, { status: 500 });
    }

    // Format response to match existing frontend expectations
    const betDetails = {
      betId: result.data!.id,
      userId: finalUserId,
      challengeMatchId,
      predictionId,
      choice,
      amount: betAmount,
      status: 'PENDING',
      timestamp: result.data!.created_at,
      bonusApplied: !!bonusApplied,
      // Include database record for debugging
      dbRecord: result.data
    };

    console.log('✅ Bet successfully saved to Supabase:', result.data!.id);

    return NextResponse.json({
      success: true,
      message: 'Bet placed successfully and saved to database.',
      data: betDetails,
    }, { status: 200 });

  } catch (error) {
    console.error('Error placing bet:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to place bet.',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
