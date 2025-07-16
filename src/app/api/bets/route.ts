
// src/app/api/bets/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { mockCurrentUser } from '@/lib/mockData';
import { insertBet, type BetRecord } from '@/lib/supabase';
import { getMarketOdds } from '@/lib/marketService';

export async function POST(req: NextRequest) {
  console.log('🎯 /api/bets POST endpoint called');
  
  try {
    console.log('📥 Parsing request body...');
    const body = await req.json();
    console.log('📋 Request body:', body);
    
    const {
      userId, // In a real app, this would come from authenticated session
      challengeMatchId, // The ID from the URL path of the challenge e.g. "challengeAsTest1"
      predictionId,
      choice, // 'YES' or 'NO'
      amount,
      referrerName, // Optional: who referred this challenge acceptance
      bonusApplied // Added to receive bonus status
    } = body;

    console.log('🔍 Validating required fields...');
    console.log('Validation check:', { predictionId: !!predictionId, choice: !!choice, amount: !!amount });

    // Validate required fields
    if (!predictionId || !choice || !amount) {
      console.error('❌ Validation failed - missing required fields:', { predictionId, choice, amount });
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: predictionId, choice, and amount are required.',
      }, { status: 400 });
    }

    // Validate choice
    if (choice !== 'YES' && choice !== 'NO') {
      console.error('❌ Validation failed - invalid choice:', choice);
      return NextResponse.json({
        success: false,
        message: 'Invalid choice. Must be either "YES" or "NO".',
      }, { status: 400 });
    }

    // Validate amount
    const betAmount = parseFloat(amount);
    if (isNaN(betAmount) || betAmount <= 0) {
      console.error('❌ Validation failed - invalid amount:', amount, betAmount);
      return NextResponse.json({
        success: false,
        message: 'Invalid amount. Must be a positive number.',
      }, { status: 400 });
    }

    console.log('✅ All validations passed');

    // Use provided userId or fall back to mock user
    const finalUserId = userId || mockCurrentUser.id;
    console.log('👤 Using userId:', finalUserId);

    // Get current market odds for accurate recording
    let currentOdds = choice === 'YES' ? 0.5 : 0.5; // Default fallback
    console.log('💰 Fetching market odds for predictionId:', predictionId);
    
    try {
      console.log('🌐 Calling getMarketOdds...');
      const marketOdds = await getMarketOdds(predictionId);
      if (marketOdds) {
        currentOdds = choice === 'YES' ? marketOdds.odds.yes : marketOdds.odds.no;
        console.log(`✅ Retrieved market odds for ${predictionId}: YES=${marketOdds.odds.yes.toFixed(3)}, NO=${marketOdds.odds.no.toFixed(3)}`);
        console.log(`📊 Using odds for ${choice}: ${currentOdds.toFixed(3)}`);
      } else {
        console.warn(`⚠️ Could not retrieve market odds for ${predictionId}, using fallback odds`);
      }
    } catch (error) {
      console.error(`❌ Error fetching market odds for ${predictionId}:`, error);
    }

    console.log('📝 Creating bet record...');
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

    console.log('💾 Bet record to insert:', betRecord);
    console.log('🎯 Environment check - SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
    console.log('🎯 Environment check - SUPABASE_KEY exists:', !!process.env.SUPABASE_KEY);

    // Insert bet into Supabase
    console.log('🚀 Calling insertBet...');
    const result = await insertBet(betRecord);
    console.log('📥 insertBet result:', result);
    
    if (!result.success) {
      console.error('❌ Failed to insert bet into database:', result.error);
      return NextResponse.json({
        success: false,
        message: 'Failed to save bet to database.',
        error: result.error,
      }, { status: 500 });
    }

    console.log('✅ Bet successfully inserted, formatting response...');

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

    console.log('📤 Sending success response:', betDetails);
    console.log('✅ Bet successfully saved to Supabase:', result.data!.id);

    return NextResponse.json({
      success: true,
      message: 'Bet placed successfully and saved to database.',
      data: betDetails,
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Unexpected error in /api/bets POST:', error);
    console.error('Error type:', typeof error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Error stack:', error instanceof Error ? error.stack : 'Unknown');
    
    return NextResponse.json({
      success: false,
      message: 'Failed to place bet.',
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'Unknown'
    }, { status: 500 });
  }
}
