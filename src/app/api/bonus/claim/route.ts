// src/app/api/bonus/claim/route.ts
// POST to claim a gift

import { NextRequest, NextResponse } from 'next/server';
import {
  claimBonusGift,
  type Bonus,
  type BonusGift,
} from '@/lib/bonus-service';

export interface ClaimGiftRequest {
  gift_code: string;
  user_id: string;
}

export interface ClaimGiftResponse {
  success: boolean;
  data?: {
    bonus: Bonus;
    gift: BonusGift;
    message: string;
  };
  error?: string;
}

/**
 * POST /api/bonus/claim
 * 
 * Claims a bonus gift for the authenticated user.
 * 
 * Request body:
 * {
 *   gift_code: string,   // The gift code from URL
 *   user_id: string,     // Wallet address of claimer
 * }
 * 
 * Returns:
 * {
 *   bonus: Bonus,        // The new bonus created for recipient
 *   gift: BonusGift,     // Updated gift record
 *   message: string,     // Success message
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<ClaimGiftResponse>> {
  try {
    const body: ClaimGiftRequest = await request.json();
    const { gift_code, user_id } = body;

    // Validate required fields
    if (!gift_code) {
      return NextResponse.json(
        { success: false, error: 'Missing gift_code' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id - please connect your wallet' },
        { status: 400 }
      );
    }

    // Get client IP for tracking
    const forwardedFor = request.headers.get('x-forwarded-for');
    const claimIp = forwardedFor?.split(',')[0]?.trim() || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    console.log('🎁 Claiming gift:', { gift_code, user_id: user_id.slice(0, 10) + '...' });

    const result = await claimBonusGift(gift_code, user_id, claimIp);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to claim gift' },
        { status: 400 }
      );
    }

    console.log('✅ Gift claimed:', {
      gift_code,
      amount: result.data?.bonus.total_amount,
      recipient: user_id.slice(0, 10) + '...',
    });

    return NextResponse.json({
      success: true,
      data: {
        bonus: result.data!.bonus,
        gift: result.data!.gift,
        message: `You received $${result.data!.bonus.total_amount} bonus! Start trading to unlock profits.`,
      },
    });
  } catch (error) {
    console.error('❌ Error claiming gift:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
