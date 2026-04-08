
// src/app/api/bets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { insertBet, BetRecord } from '@/lib/supabase-server'
import { deductBonusForBet, checkAndUnlockProfits } from '@/lib/bonus-service'

// Extended bet data interface to include bonus + campaign fields
interface BetDataWithBonus extends Omit<BetRecord, 'id' | 'created_at'> {
  bonus_amount_used?: number;
  cash_amount_used?: number;
  campaign_sub1?: string;
  campaign_sub2?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 API: Received bet placement request');
    
    const betData = await request.json() as BetDataWithBonus;
    console.log('🎯 API: Bet data received:', betData);
    
    // Log referrer information if present (affiliate tracking)
    if (betData.referrer_bet_id || betData.referrer_user_id) {
      console.log('🔗 API: Affiliate referral detected:', {
        referrer_bet_id: betData.referrer_bet_id,
        referrer_user_id: betData.referrer_user_id,
      });
    }
    
    // Log bonus information if present
    if (betData.bonus_amount_used && betData.bonus_amount_used > 0) {
      console.log('🎁 API: Bonus bet detected:', {
        bonus_amount_used: betData.bonus_amount_used,
        cash_amount_used: betData.cash_amount_used,
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
    
    // Allow bonus-only bets (tx_hash starts with 'bonus_') or regular blockchain transactions
    const isBonusOnlyBet = betData.tx_hash.startsWith('bonus_');
    if (!isBonusOnlyBet && (typeof betData.tx_hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(betData.tx_hash))) {
      console.error('❌ API: Invalid tx_hash format:', betData.tx_hash);
      return NextResponse.json(
        { success: false, error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }
    
    // Insert bet using server-side Supabase client
    const result = await insertBet(betData);
    console.log('📤 API: Bet insertion result:', result);
    
    if (result.success && result.data) {
      // Fire S2S PropellerAds postback if campaign sub1 present (non-blocking)
      const campaignSub1 = betData.campaign_sub1 as string | undefined;
      const campaignSub2 = betData.campaign_sub2 as string | undefined;
      if (campaignSub1) {
        const pbUrl = new URL('/api/postback', request.nextUrl.origin);
        pbUrl.searchParams.set('sub1', campaignSub1);
        if (campaignSub2) pbUrl.searchParams.set('sub2', campaignSub2);
        pbUrl.searchParams.set('amount', String(betData.amount));
        fetch(pbUrl.toString()).catch(() => {});
      }

      // Handle bonus deduction if bonus was used
      if (betData.bonus_amount_used && betData.bonus_amount_used > 0) {
        console.log('🎁 API: Processing bonus deduction for bet:', result.data.id);
        
        try {
          const bonusResult = await deductBonusForBet(
            betData.user_id,
            betData.bonus_amount_used,
            result.data.id!
          );
          
          if (bonusResult.success) {
            console.log('✅ API: Bonus deducted successfully:', bonusResult.data);
            
            // Check if any profits can be unlocked (volume requirement met)
            const unlockResult = await checkAndUnlockProfits(betData.user_id);
            if (unlockResult.success && unlockResult.data?.unlocked_amount) {
              console.log('🎉 API: Profits unlocked:', unlockResult.data.unlocked_amount);
            }
          } else {
            console.error('⚠️ API: Bonus deduction failed (non-blocking):', bonusResult.error);
            // Don't fail the bet - bonus deduction is secondary
          }
        } catch (bonusErr) {
          console.error('⚠️ API: Bonus processing error (non-blocking):', bonusErr);
          // Don't fail the bet - bonus processing is secondary
        }
      }
      
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
