// src/app/api/bonus/route.ts
// GET user's bonus balance and summary

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserBonusBalance,
  getUserBonuses,
  getUserGiftHistory,
  type BonusBalanceSummary,
  type Bonus,
  type GiftHistoryItem,
} from '@/lib/bonus-service';

export interface BonusApiResponse {
  success: boolean;
  data?: {
    summary: BonusBalanceSummary;
    bonuses: Bonus[];
    gift_history: GiftHistoryItem[];
  };
  error?: string;
}

/**
 * GET /api/bonus?user_id=0x...
 * 
 * Returns comprehensive bonus information for a user:
 * - Balance summary (total, personal, sharable, pending profits)
 * - Volume progress toward unlock
 * - List of active bonuses
 * - Gift history (sent and received)
 */
export async function GET(request: NextRequest): Promise<NextResponse<BonusApiResponse>> {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id parameter' },
        { status: 400 }
      );
    }

    console.log('📊 Fetching bonus info for user:', userId);

    // Fetch all bonus data in parallel
    const [balanceResult, bonusesResult, historyResult] = await Promise.all([
      getUserBonusBalance(userId),
      getUserBonuses(userId),
      getUserGiftHistory(userId, 10),
    ]);

    if (!balanceResult.success) {
      return NextResponse.json(
        { success: false, error: balanceResult.error || 'Failed to fetch bonus balance' },
        { status: 500 }
      );
    }

    const response: BonusApiResponse = {
      success: true,
      data: {
        summary: balanceResult.data!,
        bonuses: bonusesResult.data || [],
        gift_history: historyResult.data || [],
      },
    };

    console.log('✅ Bonus info fetched:', {
      total_balance: response.data?.summary.total_balance,
      sharable_balance: response.data?.summary.sharable_balance,
      pending_profits: response.data?.summary.pending_profits,
      volume_progress: response.data?.summary.volume_progress_percent.toFixed(1) + '%',
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error in bonus API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
