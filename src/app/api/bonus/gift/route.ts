// src/app/api/bonus/gift/route.ts
// POST to create a gift link from sharable bonus

import { NextRequest, NextResponse } from 'next/server';
import {
  createBonusGift,
  MIN_GIFT_AMOUNT,
  MAX_GIFT_AMOUNT,
  type BonusGift,
} from '@/lib/bonus-service';

export interface CreateGiftRequest {
  user_id: string;
  amount: number;
  username?: string;
  avatar?: string;
}

export interface CreateGiftResponse {
  success: boolean;
  data?: {
    gift_code: string;
    gift_url: string;
    gift: BonusGift;
  };
  error?: string;
}

/**
 * POST /api/bonus/gift
 * 
 * Creates a shareable gift link from the user's sharable bonus pool.
 * 
 * Request body:
 * {
 *   user_id: string,     // Wallet address of gifter
 *   amount: number,      // Amount to gift ($10-$500)
 *   username?: string,   // Display name for claim page
 *   avatar?: string,     // Avatar URL for claim page
 * }
 * 
 * Returns:
 * {
 *   gift_code: string,   // e.g., "ABC123XY"
 *   gift_url: string,    // e.g., "https://winbig.fun/gift/ABC123XY"
 *   gift: BonusGift,     // Full gift record
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateGiftResponse>> {
  try {
    const body: CreateGiftRequest = await request.json();
    const { user_id, amount, username, avatar } = body;

    // Validate required fields
    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id' },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid amount' },
        { status: 400 }
      );
    }

    if (amount < MIN_GIFT_AMOUNT) {
      return NextResponse.json(
        { success: false, error: `Minimum gift amount is $${MIN_GIFT_AMOUNT}` },
        { status: 400 }
      );
    }

    if (amount > MAX_GIFT_AMOUNT) {
      return NextResponse.json(
        { success: false, error: `Maximum gift amount is $${MAX_GIFT_AMOUNT}` },
        { status: 400 }
      );
    }

    console.log('🎁 Creating gift:', { user_id, amount, username });

    const result = await createBonusGift(user_id, amount, username, avatar);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create gift' },
        { status: 400 }
      );
    }

    console.log('✅ Gift created:', result.data?.gift_code);

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('❌ Error creating gift:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
