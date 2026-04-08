import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const VALID_EVENTS = [
  'lander_view',
  'quiz_complete',
  'tg_join',
  'wallet_connect',
  'bet_placed',
  'bet_funded',
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, sub1, sub2, sub3, sub4, sub5, utm_source, utm_medium, utm_campaign, utm_content, utm_term, variant, metadata } = body;

    if (!event || !VALID_EVENTS.includes(event)) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error('[track] Missing Supabase env vars');
      return NextResponse.json({ ok: true }); // fail silently for tracking
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex');

    const { error } = await supabase.from('campaign_events').insert({
      event,
      sub1: sub1 || null,
      sub2: sub2 || null,
      sub3: sub3 || null,
      sub4: sub4 || null,
      sub5: sub5 || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      utm_term: utm_term || null,
      variant: variant || null,
      user_agent: request.headers.get('user-agent') || null,
      ip_hash: ipHash,
      metadata: metadata || {},
    });

    if (error) {
      console.error('[track] Insert error:', error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[track] Unexpected error:', err);
    return NextResponse.json({ ok: true }); // never fail tracking
  }
}
