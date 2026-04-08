#!/usr/bin/env node
/**
 * Fetches the first live market from the app's API and prints a shareable match URL.
 *
 * Usage:
 *   npm run market:link
 *   MARKET_LINK_BASE_URL=https://www.winbig.fun npm run market:link
 *
 * Default base URL: NEXT_PUBLIC_APP_URL from .env / .env.local, else http://localhost:9002
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const base =
  process.env.MARKET_LINK_BASE_URL?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'http://localhost:9002';

const apiUrl = `${base}/api/markets/live-odds?limit=1&cursor=0`;

async function main() {
  console.log(`Fetching: ${apiUrl}\n`);

  let res;
  try {
    res = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
  } catch (e) {
    console.error('Request failed. Is the dev server running on port 9002, or set MARKET_LINK_BASE_URL?\n', e.message);
    process.exit(1);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    console.error('API error:', data.message || data.error || res.statusText, `(${res.status})`);
    process.exit(1);
  }

  const market = data.markets?.[0];
  if (!market?.id) {
    console.error('No live markets returned (empty cache or Redis has no market:* keys).');
    process.exit(1);
  }

  const matchPath = `/match/${encodeURIComponent(market.id)}`;
  const qs = new URLSearchParams({ predictionId: String(market.id) });
  const fullUrl = `${base}${matchPath}?${qs.toString()}`;

  console.log('Market:', market.question || market.id);
  console.log('\nLink:\n', fullUrl);
}

main();
