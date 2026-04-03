# Copy-Trader Sampler — Service Specification

> **Current status:** The copy-trader feature is **subscription-only**. Users can
> follow/unfollow leaders and their preferences are persisted, but **no real
> orders are placed**. The `bets` table is intentionally untouched. This spec
> describes the future sampler that would bridge subscriptions to real execution
> once enabled.

## What Exists Today

| Layer | Status |
|-------|--------|
| `copy_subscriptions` table | Live — stores follower → leader intent |
| `/api/copy-trader` (GET/POST/DELETE) | Live — CRUD for subscriptions |
| `CopyTraderButton` UI component | Live — on WinBig + Polymarket profiles |
| `copy_trade_log` table | **Not created yet** — add when execution is enabled |
| `bets` copy-trade columns | **Not added** — add when execution is enabled |
| Sampler worker | **Not built** — this spec |

## High-Level Flow (Future)

```
WinBig Frontend
  └─ User clicks "Copy Trader" → POST /api/copy-trader
  └─ Row created in copy_subscriptions (active = true)

Sampler Worker (future)
  └─ Polls active copy_subscriptions
  └─ Diffs leader activity vs. last snapshot
  └─ INSERTs follower rows into bets (with is_copy_trade = true)

Supabase Webhook → Hedger
  └─ Picks up new bets INSERTs → executes on Polymarket CLOB
```

## When to Enable Real Execution

Before the sampler writes to `bets`, these must be in place:

1. **Run the execution migration** — add `copy_trade_log` table and `is_copy_trade` / `leader_user_id` / `copy_group_id` / `copy_subscription_id` columns to `bets`.
2. **Idempotency** — `copy_group_id = UUID5(leader_bet_id + follower_user_id)` dedup before INSERT.
3. **Per-follower daily limit** — enforce `max_daily_usd` and pause subscription when exceeded.
4. **Kill switch** — global env `COPY_TRADING_ENABLED=false` stops all sampler writes.
5. **Hedger safety** — the hedger should handle higher throughput from fan-out INSERTs.

## Recommended Architecture

Standalone Python service on Railway (same stack as hedger). Polls every 30–60s,
reads `copy_subscriptions WHERE active = true`, diffs leader bets, and inserts
follower bets. The existing Supabase webhook → hedger flow handles execution
with zero changes.

## Amount Calculation (Future)

```
raw = subscription.fixed_amount
capped = min(raw, subscription.max_per_trade)
net_to_market = capped * (1 - PLATFORM_FEE_RATE)
```

## Safety Features (Future)

| Feature | How |
|---------|-----|
| Idempotency | `copy_group_id` unique constraint |
| Daily limit | `daily_used_usd` counter, auto-pause |
| Max per trade | Clamp to `max_per_trade` |
| Pause on error | 3+ consecutive failures → `active = false` |
| Market closed | Skip resolved markets |
| Kill switch | `COPY_TRADING_ENABLED` env var |
