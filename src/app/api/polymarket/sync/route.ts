// src/app/api/polymarket/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCompletePolymarketProfile,
  SAMPLE_POLYMARKET_PROFILES,
} from '@/lib/polymarket-service';
import { supabase } from '@/lib/supabase-server';

/**
 * POST /api/polymarket/sync
 * 
 * Syncs multiple Polymarket profiles to our database.
 * Body: { identifiers: string[] } or { useSamples: true }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifiers, useSamples } = body;

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      );
    }

    let profilestoSync: string[] = [];

    if (useSamples) {
      // Use predefined sample profiles
      profilestoSync = SAMPLE_POLYMARKET_PROFILES.map(p => p.username);
      console.log('📥 Syncing sample Polymarket profiles:', profilestoSync);
    } else if (Array.isArray(identifiers) && identifiers.length > 0) {
      profilestoSync = identifiers.slice(0, 10); // Max 10 at a time
      console.log('📥 Syncing specified Polymarket profiles:', profilestoSync);
    } else {
      return NextResponse.json(
        { success: false, error: 'No identifiers provided' },
        { status: 400 }
      );
    }

    const results: { identifier: string; success: boolean; error?: string }[] = [];

    for (const identifier of profilestoSync) {
      try {
        const profile = await fetchCompletePolymarketProfile(identifier);
        
        if (!profile) {
          results.push({ identifier, success: false, error: 'Profile not found' });
          continue;
        }

        // Upsert to database
        const { error } = await supabase
          .from('polymarket_profiles')
          .upsert({
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
          }, { onConflict: 'polymarket_address' });

        if (error) {
          results.push({ identifier, success: false, error: error.message });
        } else {
          results.push({ identifier, success: true });
        }
      } catch (err) {
        results.push({ 
          identifier, 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} profiles, ${failCount} failed`,
      results,
    });

  } catch (error) {
    console.error('❌ Error in batch sync:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync profiles' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/polymarket/sync
 * 
 * Returns list of synced profiles from database
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      );
    }

    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '20');
    const orderBy = searchParams.get('orderBy') || 'portfolio_value';

    const { data, error } = await supabase
      .from('polymarket_profiles')
      .select('*')
      .order(orderBy, { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });

  } catch (error) {
    console.error('❌ Error fetching synced profiles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}
