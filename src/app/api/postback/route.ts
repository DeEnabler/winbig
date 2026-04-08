import { NextRequest, NextResponse } from 'next/server';

const PROPELLER_POSTBACK_URL = process.env.PROPELLER_POSTBACK_URL;
const PROPELLER_ACCOUNT_ID = process.env.PROPELLER_ACCOUNT_ID;

/**
 * Fire S2S postback to PropellerAds on funded bet conversion.
 * Called internally from /api/bets after successful insert.
 *
 * Query params: sub1, sub2, amount
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sub1 = searchParams.get('sub1');
  const sub2 = searchParams.get('sub2');
  const amount = searchParams.get('amount') || '0';

  if (!PROPELLER_POSTBACK_URL || !PROPELLER_ACCOUNT_ID) {
    console.log('[postback] PropellerAds env vars not configured, skipping');
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (!sub1) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no sub1' });
  }

  const url = PROPELLER_POSTBACK_URL
    .replace('{aid}', PROPELLER_ACCOUNT_ID)
    .replace('{tid}', encodeURIComponent(sub1))
    .replace('{visitor_id}', encodeURIComponent(sub2 || ''))
    .replace('{payout}', encodeURIComponent(amount));

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    console.log(`[postback] Fired to PropellerAds: ${res.status}`);
    return NextResponse.json({ ok: true, status: res.status });
  } catch (err) {
    console.error('[postback] Failed:', err);
    return NextResponse.json({ ok: true, error: 'postback_failed' });
  }
}
