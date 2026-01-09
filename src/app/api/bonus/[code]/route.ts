// src/app/api/bonus/[code]/route.ts
// GET gift details by code (for claim page)

import { NextRequest, NextResponse } from 'next/server';
import { getGiftByCode, type BonusGift } from '@/lib/bonus-service';

export interface GiftDetailsResponse {
  success: boolean;
  data?: {
    gift: BonusGift;
    can_claim: boolean;
    reason?: string;
  };
  error?: string;
}

/**
 * GET /api/bonus/[code]
 * 
 * Fetches gift details for the claim page.
 * Does NOT require authentication - anyone can view gift details.
 * 
 * Returns:
 * {
 *   gift: BonusGift,     // Gift details including gifter info
 *   can_claim: boolean,  // Whether the gift can be claimed
 *   reason?: string,     // If not claimable, why
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse<GiftDetailsResponse>> {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Missing gift code' },
        { status: 400 }
      );
    }

    console.log('🔍 Looking up gift:', code);

    const result = await getGiftByCode(code);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'Gift not found' },
        { status: 404 }
      );
    }

    const gift = result.data;

    // Determine if gift can be claimed
    let canClaim = true;
    let reason: string | undefined;

    if (gift.status === 'claimed') {
      canClaim = false;
      reason = 'This gift has already been claimed';
    } else if (gift.status === 'expired' || new Date(gift.expires_at) < new Date()) {
      canClaim = false;
      reason = 'This gift has expired';
    } else if (gift.status === 'revoked') {
      canClaim = false;
      reason = 'This gift has been revoked';
    }

    console.log('✅ Gift found:', {
      code,
      amount: gift.amount,
      status: gift.status,
      can_claim: canClaim,
    });

    return NextResponse.json({
      success: true,
      data: {
        gift,
        can_claim: canClaim,
        reason,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching gift:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
