
// src/app/api/bets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { insertBet, BetRecord } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('📥 API: Received bet placement request');
    
    const betData = await request.json() as Omit<BetRecord, 'id' | 'created_at'>;
    console.log('🎯 API: Bet data received:', betData);
    
    // Log referrer information if present (affiliate tracking)
    if (betData.referrer_bet_id || betData.referrer_user_id) {
      console.log('🔗 API: Affiliate referral detected:', {
        referrer_bet_id: betData.referrer_bet_id,
        referrer_user_id: betData.referrer_user_id,
      });
    }
    
    // Validate required fields including tx_hash for idempotency
    if (!betData.user_id || !betData.market_id || !betData.outcome || !betData.amount || !betData.odds_shown_to_user || !betData.tx_hash) {
      console.error('❌ API: Missing required bet fields', { 
        user_id: !!betData.user_id, 
        market_id: !!betData.market_id, 
        outcome: !!betData.outcome, 
        amount: !!betData.amount, 
        odds_shown_to_user: !!betData.odds_shown_to_user,
        tx_hash: !!betData.tx_hash,
        potential_payout: !!betData.potential_payout,
      });
      return NextResponse.json(
        { success: false, error: 'Missing required bet fields (including tx_hash for duplicate prevention)' },
        { status: 400 }
      );
    }
    
    // Basic tx_hash format validation (should be 66 characters: '0x' + 64 hex chars)
    if (typeof betData.tx_hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(betData.tx_hash)) {
      console.error('❌ API: Invalid tx_hash format:', betData.tx_hash);
      return NextResponse.json(
        { success: false, error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }
    
    // Insert bet using server-side Supabase client
    const result = await insertBet(betData);
    console.log('📤 API: Bet insertion result:', result);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ API: Unexpected error in bet placement:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
