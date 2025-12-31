// src/app/api/share/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBetById, updateBetShareCode } from '@/lib/supabase-server';
import { generateShareCode, getShareUrl, isValidShareCode } from '@/lib/shareCode';

/**
 * POST /api/share
 * 
 * Generates a unique share code for a bet and returns the shareable URL.
 * If the bet already has a share code, returns the existing one.
 * 
 * Request body:
 * {
 *   bet_id: number  // The ID of the bet to generate a share link for
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     share_code: string,
 *     share_url: string,
 *     bet: BetRecord
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📤 API: Received share link generation request');
    
    const body = await request.json();
    const { bet_id } = body;
    
    // Validate bet_id
    if (!bet_id || typeof bet_id !== 'number') {
      console.error('❌ API: Missing or invalid bet_id');
      return NextResponse.json(
        { success: false, error: 'Missing or invalid bet_id' },
        { status: 400 }
      );
    }
    
    console.log('🎯 API: Generating share link for bet_id:', bet_id);
    
    // Fetch the bet
    const betResult = await getBetById(bet_id);
    
    if (!betResult.success || !betResult.data) {
      console.error('❌ API: Bet not found:', bet_id);
      return NextResponse.json(
        { success: false, error: 'Bet not found' },
        { status: 404 }
      );
    }
    
    const bet = betResult.data;
    
    // Check if bet already has a share code
    if (bet.share_code && isValidShareCode(bet.share_code)) {
      console.log('✅ API: Bet already has share_code:', bet.share_code);
      return NextResponse.json({
        success: true,
        data: {
          share_code: bet.share_code,
          share_url: getShareUrl(bet.share_code),
          bet
        }
      });
    }
    
    // Generate a new share code
    const shareCode = generateShareCode();
    console.log('🔗 API: Generated new share_code:', shareCode);
    
    // Update the bet with the share code
    const updateResult = await updateBetShareCode(bet_id, shareCode);
    
    if (!updateResult.success || !updateResult.data) {
      console.error('❌ API: Failed to update bet with share_code');
      return NextResponse.json(
        { success: false, error: updateResult.error || 'Failed to generate share link' },
        { status: 500 }
      );
    }
    
    const shareUrl = getShareUrl(shareCode);
    console.log('✅ API: Share link generated successfully:', shareUrl);
    
    return NextResponse.json({
      success: true,
      data: {
        share_code: shareCode,
        share_url: shareUrl,
        bet: updateResult.data
      }
    });
    
  } catch (error) {
    console.error('❌ API: Unexpected error in share link generation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/share?code=abc123
 * 
 * Fetches bet details by share code.
 * Used by the challenge page to display shared bet information.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    
    if (!code || !isValidShareCode(code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing share code' },
        { status: 400 }
      );
    }
    
    console.log('🔍 API: Looking up bet by share_code:', code);
    
    // Import here to avoid circular dependency
    const { getBetByShareCode } = await import('@/lib/supabase-server');
    const result = await getBetByShareCode(code);
    
    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: 'Share link not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ API: Found bet for share_code:', code);
    
    return NextResponse.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('❌ API: Unexpected error fetching share link:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
