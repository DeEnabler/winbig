// src/app/api/predict/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { generateShareCode, getShareUrl, isValidShareCode } from '@/lib/shareCode';

export interface PredictionShare {
  id?: number;
  created_at?: string;
  share_code: string;
  user_id: string;
  username?: string | null;
  market_id: string;
  predicted_outcome: 'YES' | 'NO';
  bet_id?: number | null;
  clicks?: number;
  conversions?: number;
  is_active?: boolean;
  expires_at?: string | null;
}

/**
 * POST /api/predict
 * 
 * Creates a shareable prediction link WITHOUT requiring a bet.
 * Perfect for social sharing and testing the affiliate system.
 * 
 * Request body:
 * {
 *   user_id: string,           // Wallet address
 *   username?: string,         // Display name (optional)
 *   market_id: string,         // The market/prediction ID
 *   predicted_outcome: 'YES' | 'NO'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📤 API: Creating prediction share link');
    
    const body = await request.json();
    const { user_id, username, market_id, predicted_outcome } = body;
    
    // Validate required fields
    if (!user_id || !market_id || !predicted_outcome) {
      console.error('❌ API: Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields: user_id, market_id, predicted_outcome' },
        { status: 400 }
      );
    }
    
    if (!['YES', 'NO'].includes(predicted_outcome)) {
      return NextResponse.json(
        { success: false, error: 'predicted_outcome must be YES or NO' },
        { status: 400 }
      );
    }
    
    if (!supabase) {
      console.error('❌ API: Supabase not initialized');
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }
    
    // Check if user already has a share for this market + outcome
    const { data: existingShare, error: checkError } = await supabase
      .from('prediction_shares')
      .select('*')
      .eq('user_id', user_id)
      .eq('market_id', market_id)
      .eq('predicted_outcome', predicted_outcome)
      .eq('is_active', true)
      .single();
    
    if (existingShare && !checkError) {
      console.log('✅ API: Returning existing prediction share:', existingShare.share_code);
      return NextResponse.json({
        success: true,
        data: {
          share_code: existingShare.share_code,
          share_url: getShareUrl(existingShare.share_code),
          prediction_share: existingShare,
          is_new: false,
        }
      });
    }
    
    // Generate new share code
    const shareCode = generateShareCode();
    console.log('🔗 API: Generated share_code:', shareCode);
    
    // Create prediction share record
    const predictionShare: Omit<PredictionShare, 'id' | 'created_at'> = {
      share_code: shareCode,
      user_id,
      username: username || null,
      market_id,
      predicted_outcome,
      clicks: 0,
      conversions: 0,
      is_active: true,
    };
    
    const { data, error } = await supabase
      .from('prediction_shares')
      .insert([predictionShare])
      .select()
      .single();
    
    if (error) {
      console.error('❌ API: Failed to create prediction share:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    const shareUrl = getShareUrl(shareCode);
    console.log('✅ API: Prediction share created:', shareUrl);
    
    return NextResponse.json({
      success: true,
      data: {
        share_code: shareCode,
        share_url: shareUrl,
        prediction_share: data,
        is_new: true,
      }
    });
    
  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/predict?code=abc123
 * 
 * Fetches a prediction share by code and increments click count.
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
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }
    
    console.log('🔍 API: Looking up prediction share:', code);
    
    // Fetch the prediction share
    const { data, error } = await supabase
      .from('prediction_shares')
      .select('*')
      .eq('share_code', code)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      console.log('❌ API: Prediction share not found:', code);
      return NextResponse.json(
        { success: false, error: 'Share link not found', type: 'prediction' },
        { status: 404 }
      );
    }
    
    // Increment click count (fire and forget)
    supabase
      .from('prediction_shares')
      .update({ clicks: (data.clicks || 0) + 1 })
      .eq('id', data.id)
      .then(() => console.log('📊 Click tracked for:', code));
    
    console.log('✅ API: Found prediction share:', code);
    
    return NextResponse.json({
      success: true,
      data,
      type: 'prediction',
    });
    
  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
