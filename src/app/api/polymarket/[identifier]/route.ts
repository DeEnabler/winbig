// src/app/api/polymarket/[identifier]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCompletePolymarketProfile,
  MirroredProfile,
} from '@/lib/polymarket-service';
import { supabase } from '@/lib/supabase-server';

/**
 * GET /api/polymarket/[identifier]
 * 
 * Fetches a Polymarket profile by username or address.
 * Optionally syncs to database if ?sync=true
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params;
    const { searchParams } = request.nextUrl;
    const shouldSync = searchParams.get('sync') === 'true';

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Missing identifier' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching Polymarket profile:', identifier, { sync: shouldSync });

    // First check if we have a cached version in database
    let cachedProfile = null;
    if (supabase) {
      const isAddress = identifier.startsWith('0x');
      const query = supabase
        .from('polymarket_profiles')
        .select('*')
        .limit(1);

      if (isAddress) {
        query.ilike('polymarket_address', identifier);
      } else {
        const username = identifier.startsWith('@') ? identifier.substring(1) : identifier;
        query.ilike('polymarket_username', username);
      }

      const { data } = await query.maybeSingle();
      
      if (data) {
        // Check if cache is fresh (less than 5 minutes old)
        const lastSync = new Date(data.last_synced_at);
        const cacheAge = Date.now() - lastSync.getTime();
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        if (cacheAge < CACHE_TTL && !shouldSync) {
          console.log('📦 Returning cached Polymarket profile');
          return NextResponse.json({
            success: true,
            data: data,
            source: 'cache',
            cachedAt: data.last_synced_at,
          });
        }
        cachedProfile = data;
      }
    }

    // Fetch fresh data from Polymarket
    const profile = await fetchCompletePolymarketProfile(identifier);

    if (!profile) {
      // If we have cached data, return it even if stale
      if (cachedProfile) {
        console.log('⚠️ Polymarket API failed, returning stale cache');
        return NextResponse.json({
          success: true,
          data: cachedProfile,
          source: 'stale_cache',
          cachedAt: cachedProfile.last_synced_at,
        });
      }

      return NextResponse.json(
        { success: false, error: 'Polymarket profile not found' },
        { status: 404 }
      );
    }

    // Sync to database if requested and supabase is available
    if (shouldSync && supabase) {
      await syncProfileToDatabase(profile);
    }

    return NextResponse.json({
      success: true,
      data: profile,
      source: 'polymarket_api',
    });

  } catch (error) {
    console.error('❌ Error in Polymarket profile API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Polymarket profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/polymarket/[identifier]
 * 
 * Syncs a Polymarket profile to our database
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params;

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Missing identifier' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      );
    }

    console.log('📥 Syncing Polymarket profile:', identifier);

    // Fetch fresh data from Polymarket
    const profile = await fetchCompletePolymarketProfile(identifier);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Polymarket profile not found' },
        { status: 404 }
      );
    }

    // Sync to database
    const savedProfile = await syncProfileToDatabase(profile);

    return NextResponse.json({
      success: true,
      data: savedProfile,
      message: 'Profile synced successfully',
    });

  } catch (error) {
    console.error('❌ Error syncing Polymarket profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync Polymarket profile' },
      { status: 500 }
    );
  }
}

/**
 * Sync profile data to Supabase
 */
async function syncProfileToDatabase(profile: MirroredProfile) {
  if (!supabase) {
    console.log('⚠️ Supabase not available, skipping sync');
    return profile;
  }

  try {
    console.log('💾 Syncing profile to database:', profile.polymarket_address);

    // Upsert main profile
    const profileData = {
      polymarket_address: profile.polymarket_address,
      polymarket_username: profile.polymarket_username,
      display_name: profile.display_name,
      pseudonym: profile.pseudonym,
      bio: profile.bio,
      profile_image_url: profile.profile_image_url,
      x_username: profile.x_username,
      is_verified: profile.is_verified,
      display_username_public: profile.display_username_public,
      joined_at: profile.joined_at,
      portfolio_value: profile.portfolio_value,
      total_positions: profile.total_positions,
      total_trades: profile.total_trades,
      total_pnl: profile.total_pnl,
      total_pnl_percent: profile.total_pnl_percent,
      realized_pnl: profile.realized_pnl,
      unrealized_pnl: profile.unrealized_pnl,
      positions_won: profile.positions_won,
      positions_lost: profile.positions_lost,
      win_rate: profile.win_rate,
      total_volume_traded: profile.total_volume_traded,
      raw_profile_data: profile.raw_profile_data,
      raw_positions_data: profile.positions,
      raw_activity_data: profile.activity,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: savedProfile, error: profileError } = await supabase
      .from('polymarket_profiles')
      .upsert(profileData, { onConflict: 'polymarket_address' })
      .select()
      .single();

    if (profileError) {
      console.error('Error upserting profile:', profileError);
      throw profileError;
    }

    // Sync positions
    if (profile.positions && profile.positions.length > 0) {
      const positionsData = profile.positions.map(pos => ({
        profile_id: savedProfile.id,
        polymarket_address: profile.polymarket_address,
        condition_id: pos.conditionId,
        asset_id: pos.asset,
        market_slug: pos.slug,
        market_title: pos.title,
        outcome: pos.outcome,
        end_date: pos.endDate,
        size: parseFloat(pos.size) || 0,
        avg_price: parseFloat(pos.avgPrice) || 0,
        initial_value: parseFloat(pos.initialValue) || 0,
        current_value: parseFloat(pos.currentValue) || 0,
        cash_pnl: parseFloat(pos.cashPnl) || 0,
        percent_pnl: parseFloat(pos.percentPnl) || 0,
        realized_pnl: parseFloat(pos.realizedPnl) || 0,
        percent_realized_pnl: parseFloat(pos.percentRealizedPnl) || 0,
        is_active: true,
        is_redeemable: pos.redeemable || false,
        is_mergeable: pos.mergeable || false,
        raw_data: pos,
        updated_at: new Date().toISOString(),
      }));

      const { error: positionsError } = await supabase
        .from('polymarket_positions')
        .upsert(positionsData, { 
          onConflict: 'polymarket_address,condition_id,outcome',
          ignoreDuplicates: false 
        });

      if (positionsError) {
        console.error('Error upserting positions:', positionsError);
      } else {
        console.log(`✅ Synced ${positionsData.length} positions`);
      }
    }

    // Sync activity (last 50 items)
    if (profile.activity && profile.activity.length > 0) {
      const activityData = profile.activity.slice(0, 50).map(act => ({
        profile_id: savedProfile.id,
        polymarket_address: profile.polymarket_address,
        activity_type: act.type,
        timestamp: act.timestamp,
        condition_id: act.conditionId,
        market_slug: act.slug,
        market_title: act.title,
        outcome: act.outcome,
        side: act.side,
        price: parseFloat(act.price) || 0,
        size: parseFloat(act.size) || 0,
        value: (parseFloat(act.price) || 0) * (parseFloat(act.size) || 0),
        transaction_hash: act.transactionHash,
        raw_data: act,
      }));

      const { error: activityError } = await supabase
        .from('polymarket_activity')
        .upsert(activityData, { 
          onConflict: 'polymarket_address,transaction_hash,activity_type',
          ignoreDuplicates: true 
        });

      if (activityError) {
        console.error('Error upserting activity:', activityError);
      } else {
        console.log(`✅ Synced ${activityData.length} activity items`);
      }
    }

    console.log('✅ Profile sync complete:', savedProfile.id);
    return { ...profile, id: savedProfile.id };

  } catch (error) {
    console.error('Error syncing profile to database:', error);
    throw error;
  }
}
