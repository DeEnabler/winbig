import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let cached: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 60_000; // 60 seconds

export const dynamic = 'force-dynamic';

export async function GET() {
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  }

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ recentWins: [], stats: { betsLastHour: 0, totalWonToday: 0 } });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const nowIso = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const todayMidnight = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const [winsRes, hourCountRes, todayWonRes] = await Promise.all([
    supabase
      .from('bets')
      .select('amount, outcome, market_id, created_at, user_id, potential_payout')
      .eq('status', 'executed')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('bets')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo),
    supabase
      .from('bets')
      .select('potential_payout')
      .eq('status', 'executed')
      .gte('created_at', todayMidnight),
  ]);

  const recentWins = (winsRes.data || []).map((b) => ({
    amount: b.amount,
    outcome: b.outcome,
    market_id: b.market_id,
    created_at: b.created_at,
    username: b.user_id ? `${b.user_id.slice(0, 6)}...${b.user_id.slice(-4)}` : 'Anon',
    potential_payout: b.potential_payout,
  }));

  const betsLastHour = hourCountRes.count || 0;
  const totalWonToday = (todayWonRes.data || []).reduce(
    (sum, b) => sum + (b.potential_payout || 0),
    0
  );

  const payload = {
    recentWins,
    stats: { betsLastHour, totalWonToday },
    ts: nowIso,
  };

  cached = { data: payload, ts: Date.now() };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}
