// src/app/api/copy-trader/route.ts
//
// Subscription-only copy trading. Records who is copying whom.
// Does NOT insert into the bets table or trigger any real orders.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export interface CopySubscription {
  id: number;
  created_at: string;
  updated_at: string;
  follower_user_id: string;
  leader_user_id: string | null;
  leader_identifier: string;
  leader_source: 'winbig' | 'polymarket';
  fixed_amount: number;
  max_per_trade: number;
  max_daily_usd: number;
  active: boolean;
  paused_reason: string | null;
}

/**
 * GET /api/copy-trader?follower_user_id=0x...
 * 
 * Returns all copy subscriptions for a follower, or check if following a specific leader.
 * Query params:
 *   - follower_user_id (required): wallet address of the follower
 *   - leader_identifier (optional): if provided, returns only that subscription
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const followerUserId = searchParams.get('follower_user_id');
    const leaderIdentifier = searchParams.get('leader_identifier');

    if (!followerUserId) {
      return NextResponse.json({ success: false, error: 'follower_user_id is required' }, { status: 400 });
    }

    let query = supabase
      .from('copy_subscriptions')
      .select('*')
      .ilike('follower_user_id', followerUserId);

    if (leaderIdentifier) {
      query = query.eq('leader_identifier', leaderIdentifier);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[CopyTrader] GET error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (leaderIdentifier) {
      return NextResponse.json({
        success: true,
        data: data?.[0] || null,
        isCopying: !!data?.length && data[0].active,
      });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[CopyTrader] GET exception:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/copy-trader
 * 
 * Create or re-activate a copy subscription. Saves the user's intent to copy
 * a leader — no real orders are placed.
 * Body:
 *   - follower_user_id (required): wallet of the copier
 *   - leader_identifier (required): wallet, @username, or polymarket:address
 *   - leader_source: 'winbig' | 'polymarket' (default: 'winbig')
 *   - leader_user_id: resolved wallet if known
 *   - fixed_amount: preferred USD per trade (default: 10)
 *   - max_per_trade: hard cap (default: 100)
 *   - max_daily_usd: daily cap (default: 500)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const {
      follower_user_id,
      leader_identifier,
      leader_source = 'winbig',
      leader_user_id = null,
      fixed_amount = 10,
      max_per_trade = 100,
      max_daily_usd = 500,
    } = body;

    if (!follower_user_id || !leader_identifier) {
      return NextResponse.json(
        { success: false, error: 'follower_user_id and leader_identifier are required' },
        { status: 400 }
      );
    }

    const normalizedFollower = follower_user_id.toLowerCase();
    const normalizedLeaderWallet = leader_user_id?.toLowerCase() || null;

    if (normalizedFollower === leader_identifier.toLowerCase() ||
        (normalizedLeaderWallet && normalizedFollower === normalizedLeaderWallet)) {
      return NextResponse.json(
        { success: false, error: 'You cannot copy your own trades' },
        { status: 400 }
      );
    }

    // Upsert: reactivate if exists, create if not
    const { data: existing } = await supabase
      .from('copy_subscriptions')
      .select('id, active')
      .eq('follower_user_id', normalizedFollower)
      .eq('leader_identifier', leader_identifier)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('copy_subscriptions')
        .update({
          active: true,
          paused_reason: null,
          leader_user_id: normalizedLeaderWallet,
          leader_source,
          fixed_amount,
          max_per_trade,
          max_daily_usd,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[CopyTrader] Update error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data, action: 'reactivated' });
    }

    const { data, error } = await supabase
      .from('copy_subscriptions')
      .insert({
        follower_user_id: normalizedFollower,
        leader_identifier,
        leader_source,
        leader_user_id: normalizedLeaderWallet,
        fixed_amount,
        max_per_trade,
        max_daily_usd,
      })
      .select()
      .single();

    if (error) {
      console.error('[CopyTrader] Insert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, action: 'created' }, { status: 201 });
  } catch (err) {
    console.error('[CopyTrader] POST exception:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/copy-trader
 * 
 * Deactivate (soft-delete) a copy subscription.
 * Body:
 *   - follower_user_id (required)
 *   - leader_identifier (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { follower_user_id, leader_identifier } = body;

    if (!follower_user_id || !leader_identifier) {
      return NextResponse.json(
        { success: false, error: 'follower_user_id and leader_identifier are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('copy_subscriptions')
      .update({ active: false, paused_reason: 'user_stopped' })
      .eq('follower_user_id', follower_user_id.toLowerCase())
      .eq('leader_identifier', leader_identifier)
      .select()
      .single();

    if (error) {
      console.error('[CopyTrader] DELETE error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[CopyTrader] DELETE exception:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
