
// src/app/api/bets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { insertBet, BetRecord } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('📥 API: Received bet placement request');
    
    const betData = await request.json() as Omit<BetRecord, 'id' | 'created_at'>;
    console.log('🎯 API: Bet data received:', betData);
    
    // Validate required fields
    if (!betData.user_id || !betData.market_id || !betData.outcome || !betData.amount || !betData.odds_shown_to_user) {
      console.error('❌ API: Missing required bet fields');
      return NextResponse.json(
        { success: false, error: 'Missing required bet fields' },
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
