// src/app/api/affiliate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getOrCreateAffiliateCode, 
  getUserByAffiliateCode, 
  getAffiliateEarningsSummary,
  getRecentAffiliateEarnings,
  setUserReferrer,
  AffiliateEarning,
} from '@/lib/supabase-server';

/**
 * GET /api/affiliate?user_id=0x...
 * GET /api/affiliate?code=alice_1234
 * 
 * Either get/create affiliate code for a user, or look up user by affiliate code.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('user_id');
    const code = searchParams.get('code');

    // If looking up by code
    if (code) {
      console.log('🔍 API: Looking up user by affiliate code:', code);
      
      const result = await getUserByAffiliateCode(code);
      
      if (!result.success || !result.data) {
        return NextResponse.json(
          { success: false, error: 'Affiliate code not found' },
          { status: 404 }
        );
      }

      // Return minimal user info (for privacy)
      return NextResponse.json({
        success: true,
        data: {
          wallet_address: result.data.wallet_address,
          x_username: result.data.x_username,
          x_avatar: result.data.x_avatar,
          affiliate_code: result.data.affiliate_code,
        }
      });
    }

    // If getting/creating affiliate code for a user
    if (userId) {
      console.log('🔗 API: Getting affiliate code for user:', userId);
      
      const result = await getOrCreateAffiliateCode(userId);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to get affiliate code' },
          { status: 500 }
        );
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun';
      const affiliateUrl = `${appUrl}/ref/${result.data}`;

      return NextResponse.json({
        success: true,
        data: {
          affiliate_code: result.data,
          affiliate_url: affiliateUrl,
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Missing user_id or code parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ API: Error in affiliate route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/affiliate
 * 
 * Set a user's referrer (when they join via affiliate link).
 * 
 * Request body:
 * {
 *   user_id: string,      // The new user's wallet address
 *   referrer_id: string   // The referrer's wallet address (from affiliate code)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, referrer_id } = body;

    if (!user_id || !referrer_id) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id or referrer_id' },
        { status: 400 }
      );
    }

    // Prevent self-referral
    if (user_id.toLowerCase() === referrer_id.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Cannot refer yourself' },
        { status: 400 }
      );
    }

    console.log('🔗 API: Setting referrer for user:', user_id, '-> referrer:', referrer_id);

    const result = await setUserReferrer(user_id, referrer_id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ API: Error setting referrer:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
