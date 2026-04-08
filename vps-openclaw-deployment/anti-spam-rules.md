# Anti-Spam & Content Safety Rules (2026)

These rules ensure the WinBig Legend Bets Telegram group and all automated content remain compliant, trustworthy, and safe from platform bans.

## Posting Cadence

| Rule | Limit |
|------|-------|
| Max bot posts per day | 8 |
| Min interval between posts | 90 minutes |
| Posting hours (UTC) | 08:00 – 23:00 |
| Daily report post | 1x at 22:00 UTC |
| Schedule jitter | ±15 minutes random offset |

## Content Variation

- Maintain a pool of **20+ opening lines** for Telegram posts. Rotate daily.
- Never repeat the exact same message within 48 hours.
- Alternate between content types:
  - Winner spotlights (individual bet wins)
  - Market movers (trending markets)
  - Community milestones (member count, total volume)
  - Educational tips (how prediction markets work)
- Each post uses a different emoji set from a predefined pool.

## Compliance Requirements

Every public-facing message must:
- Include "18+" disclaimer (can be at the end, small text)
- **Never** guarantee returns or promise profits
- Use phrases like "potential payout" and "based on current odds" not "guaranteed win"
- Not use ALL CAPS for more than 3 consecutive words
- Not contain misleading claims about win rates

## PropellerAds Ad Copy Rules

- Title: ≤30 characters
- Body: ≤45 characters
- Must include "18+" in body text
- No fake urgency ("LAST CHANCE" / "CLOSING NOW") unless the market actually closes within 24h
- No impersonation of financial institutions
- Rotate creatives every 48 hours minimum
- Maximum 3 active variants per campaign

## Telegram Anti-Spam

- If group exceeds 200 members: enable Telegram's built-in anti-spam
- Bot should auto-delete messages containing:
  - External group/channel invites (unless from admins)
  - Obvious scam patterns (guaranteed returns, DM-for-signal)
  - Excessive link spam from non-admin members
- New members: 5-minute cool-down before they can post links

## Rate Limit Safety

- Telegram Bot API: respect 30 msg/sec global, 20 msg/min per group
- PropellerAds API: max 10 requests/minute
- WinBig Proof API: cache locally, poll max every 5 minutes
- Supabase: use service_role key, batch queries where possible

## Escalation

- 3 consecutive API failures → alert group admin via DM
- Bot blocked or token revoked → log error, stop all posting, alert admin
- Unusual spend spike (>2× daily average) → pause Optimizer actions, alert admin
