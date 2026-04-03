# Copy-Trader Sampler — Service Specification

## Purpose

The **sampler** is a lightweight, always-on worker that bridges the Copy-Trader UI (WinBig Next.js frontend + `copy_subscriptions` table) with the existing hedger (Flask webhook service). It periodically checks leader activity, generates follower bet rows, and lets the hedger execute them via the existing Supabase webhook path.

---

## High-Level Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  WinBig Frontend                                                 │
│  • User clicks "Copy Trader" → POST /api/copy-trader             │
│  • Creates row in copy_subscriptions (active = true)             │
└──────────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Supabase DB                                                     │
│  • copy_subscriptions table (follower → leader mappings)         │
│  • bets table (all trades, both manual and copy)                 │
│  • copy_trade_log (audit trail)                                  │
└──────────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Sampler Worker (THIS SERVICE)                                   │
│  Runs on a schedule (every 30-60s) or Supabase realtime trigger  │
│  1. Query active copy_subscriptions                              │
│  2. For each leader, diff their recent bets vs last_snapshot     │
│  3. For new leader bets → INSERT follower bets rows              │
│  4. Log to copy_trade_log                                        │
│  5. Update copy_subscriptions.last_sampled_at / snapshot_hash    │
└──────────────────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Supabase Webhook → Hedger (/webhook endpoint)                   │
│  Picks up new INSERT to bets table → executes on Polymarket CLOB │
└──────────────────────────────────────────────────────────────────┘
```

---

## Where Should It Live?

| Option | Pros | Cons |
|--------|------|------|
| **Separate repo / Railway service** (recommended) | Decoupled from frontend, can use Python (same as hedger), scales independently | Extra infra to manage |
| **Supabase Edge Function + pg_cron** | No new infra, runs next to the data | Limited runtime (Deno), hard to debug |
| **Inside the hedger repo** | Shares DB client, single deploy | Bloats hedger scope, couples concerns |

**Recommendation:** Standalone Python service on Railway, same pattern as the hedger. It already uses Supabase Python client and shares the same mental model.

---

## Data Model (Reference)

### `copy_subscriptions` (source of truth)

| Column | Type | Notes |
|--------|------|-------|
| `follower_user_id` | text | wallet address (lowercase) |
| `leader_identifier` | text | wallet, `@username`, or `polymarket:<address>` |
| `leader_source` | text | `'winbig'` or `'polymarket'` |
| `active` | bool | sampler only processes active rows |
| `scale_mode` | text | `'fixed'` or `'proportional'` |
| `fixed_amount` | numeric | USD per copied trade |
| `max_per_trade` | numeric | hard cap |
| `max_daily_usd` | numeric | daily notional limit |
| `daily_used_usd` | numeric | rolling counter (reset by sampler) |
| `last_snapshot_hash` | text | hash of last known leader state |
| `last_sampled_at` | timestamptz | when we last checked |

### `bets` (follower rows inserted by sampler)

When inserting a follower bet, set these fields:

```json
{
  "user_id": "<follower wallet>",
  "market_id": "<leader's market_id>",
  "outcome": "<leader's outcome>",
  "amount": "<calculated from scale_mode>",
  "net_to_market": "<amount minus platform fee>",
  "status": "pending",
  "is_copy_trade": true,
  "leader_user_id": "<leader wallet or identifier>",
  "leader_bet_id": "<leader's bet.id>",
  "copy_group_id": "<UUID v5 from leader_bet_id + follower_user_id>",
  "copy_subscription_id": "<subscription.id>"
}
```

### `copy_trade_log`

One row per copy attempt (success or fail), for auditability.

---

## Sampler Algorithm

```python
def sample_cycle():
    subs = db.query("SELECT * FROM copy_subscriptions WHERE active = true")
    
    for sub in subs:
        reset_daily_counter_if_needed(sub)
        
        if sub.leader_source == 'winbig':
            new_bets = get_new_winbig_bets(sub)
        else:
            new_bets = get_new_polymarket_activity(sub)
        
        for leader_bet in new_bets:
            copy_group_id = uuid5(NAMESPACE, f"{leader_bet.id}:{sub.follower_user_id}")
            
            # Idempotency check
            if already_copied(copy_group_id):
                log_skip(sub, leader_bet, "duplicate")
                continue
            
            # Daily limit check
            amount = calculate_amount(sub, leader_bet)
            if sub.daily_used_usd + amount > sub.max_daily_usd:
                log_skip(sub, leader_bet, "daily_limit")
                pause_subscription(sub, "daily_limit")
                continue
            
            # Insert follower bet
            follower_bet_id = insert_follower_bet(sub, leader_bet, amount, copy_group_id)
            
            # Update counters
            sub.daily_used_usd += amount
            sub.last_copy_bet_id = follower_bet_id
            
            log_success(sub, leader_bet, follower_bet_id, amount, copy_group_id)
        
        update_snapshot(sub)
```

### WinBig Leader Detection

```sql
SELECT * FROM bets
WHERE user_id = :leader_user_id
  AND id > :last_copy_bet_id
  AND is_copy_trade = false
  AND status IN ('pending', 'executed')
ORDER BY id ASC
```

### Polymarket Leader Detection

For `leader_source = 'polymarket'`, the sampler calls the Polymarket CLOB API:
- `GET https://clob.polymarket.com/positions?user=<polymarket_address>`
- Diff against `last_snapshot_hash` (hash of sorted position IDs + sizes)
- New or increased positions → generate copy bets

---

## Amount Calculation

```python
def calculate_amount(sub, leader_bet):
    if sub.scale_mode == 'fixed':
        raw = sub.fixed_amount
    else:
        raw = leader_bet.amount * sub.proportional_pct
    
    return min(raw, sub.max_per_trade)
```

The platform fee (3%) is applied to produce `net_to_market`:

```python
net_to_market = amount * (1 - PLATFORM_FEE_RATE)
```

---

## Safety Features

| Feature | Implementation |
|---------|----------------|
| **Idempotency** | `copy_group_id = UUID5(leader_bet_id + follower_user_id)` checked before insert |
| **Daily limit** | `daily_used_usd` counter, auto-pauses subscription when exceeded |
| **Daily reset** | Compare `daily_reset_at` to current UTC day; zero counter if stale |
| **Max per trade** | Clamp amount to `max_per_trade` |
| **Pause on error** | If 3+ consecutive failures, set `active = false, paused_reason = 'error'` |
| **Market closed** | Skip if market has resolved (check Polymarket API or WinBig market cache) |
| **Kill switch** | Global env var `COPY_TRADING_ENABLED=false` stops all processing |

---

## Environment Variables

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
COPY_TRADING_ENABLED=true
SAMPLE_INTERVAL_SECONDS=30
MAX_FOLLOWERS_PER_CYCLE=100
POLYMARKET_CLOB_URL=https://clob.polymarket.com
PLATFORM_FEE_RATE=0.03
```

---

## Deployment

- **Runtime:** Python 3.11+
- **Framework:** Standalone script with `schedule` or `APScheduler`, or a simple `while True` loop with `time.sleep()`
- **Platform:** Railway (same as hedger)
- **Health check:** HTTP endpoint on `/health` returning sampler status and last cycle timestamp

---

## Future Enhancements

1. **Supabase Realtime** — Subscribe to `bets` INSERT events instead of polling, for near-instant copying of WinBig leaders.
2. **Proportional mode** — Mirror leader's position size as a percentage (requires knowing leader's bankroll).
3. **Leader leaderboard** — Rank leaders by win rate / ROI for discoverability.
4. **Notifications** — Push / email when a copy trade executes or daily limit is hit.
5. **Smart stop-loss** — Auto-pause if cumulative P&L from a leader drops below a threshold.
