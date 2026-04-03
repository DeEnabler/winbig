-- ============================================
-- MIGRATION: Copy Trading System
-- ============================================
-- Implements copy-trading subscriptions where a follower
-- mirrors trades from a leader (WinBig user or Polymarket profile).
-- A separate sampler worker reads this table, diffs leader activity,
-- and inserts follower bets rows that the existing hedger webhook executes.
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- ============================================
-- TABLE: copy_subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS copy_subscriptions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Follower (the person copying)
    follower_user_id TEXT NOT NULL,             -- wallet address (lowercase)

    -- Leader (the person being copied)
    leader_user_id TEXT,                        -- wallet address if WinBig user
    leader_identifier TEXT NOT NULL,            -- display handle: wallet, @username, or polymarket:address
    leader_source TEXT NOT NULL DEFAULT 'winbig' CHECK (leader_source IN ('winbig', 'polymarket')),

    -- Copy rules
    scale_mode TEXT NOT NULL DEFAULT 'fixed' CHECK (scale_mode IN ('fixed', 'proportional')),
    fixed_amount NUMERIC DEFAULT 10.0,          -- USD per copied trade when scale_mode = 'fixed'
    proportional_pct NUMERIC DEFAULT 1.0,       -- multiplier of leader amount when scale_mode = 'proportional' (1.0 = same size)
    max_per_trade NUMERIC DEFAULT 100.0,        -- hard cap per individual copied trade
    max_daily_usd NUMERIC DEFAULT 500.0,        -- daily notional cap
    daily_used_usd NUMERIC DEFAULT 0.0,         -- rolling daily spend (reset by sampler or cron)
    daily_reset_at TIMESTAMPTZ DEFAULT NOW(),   -- when daily_used_usd was last zeroed

    -- State
    active BOOLEAN DEFAULT TRUE,
    paused_reason TEXT,                         -- 'user_paused', 'daily_limit', 'error', etc.

    -- Snapshot: last known leader state hash (for diff-based sampling)
    last_snapshot_hash TEXT,
    last_sampled_at TIMESTAMPTZ,
    last_copy_bet_id BIGINT,                   -- most recent bet inserted for this subscription

    -- Prevent duplicate subscriptions
    UNIQUE (follower_user_id, leader_identifier)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_copy_subs_follower ON copy_subscriptions(follower_user_id);
CREATE INDEX IF NOT EXISTS idx_copy_subs_leader ON copy_subscriptions(leader_identifier);
CREATE INDEX IF NOT EXISTS idx_copy_subs_active ON copy_subscriptions(active) WHERE active = TRUE;

-- RLS
ALTER TABLE copy_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own copy subscriptions"
    ON copy_subscriptions FOR SELECT USING (true);

CREATE POLICY "Users can manage own copy subscriptions"
    ON copy_subscriptions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own copy subscriptions"
    ON copy_subscriptions FOR UPDATE USING (true);

CREATE POLICY "Users can delete own copy subscriptions"
    ON copy_subscriptions FOR DELETE USING (true);

-- ============================================
-- TABLE: copy_trade_log
-- ============================================
-- Audit trail for every copy trade attempt (success or failure)
CREATE TABLE IF NOT EXISTS copy_trade_log (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    subscription_id BIGINT NOT NULL REFERENCES copy_subscriptions(id) ON DELETE CASCADE,
    follower_user_id TEXT NOT NULL,
    leader_user_id TEXT,

    -- What triggered this copy
    leader_bet_id BIGINT,                      -- the leader's bet row id (if WinBig source)
    leader_market_id TEXT NOT NULL,
    leader_outcome TEXT NOT NULL,
    leader_amount NUMERIC,

    -- What we did for the follower
    follower_bet_id BIGINT,                    -- the inserted follower bet row id (null if skipped/failed)
    follower_amount NUMERIC,
    copy_group_id UUID NOT NULL,               -- idempotency: leader_event + follower combo

    -- Result
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'inserted', 'skipped', 'failed')),
    skip_reason TEXT,                          -- 'market_closed', 'daily_limit', 'duplicate', etc.
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_copy_log_sub ON copy_trade_log(subscription_id);
CREATE INDEX IF NOT EXISTS idx_copy_log_group ON copy_trade_log(copy_group_id);
CREATE INDEX IF NOT EXISTS idx_copy_log_follower ON copy_trade_log(follower_user_id);

ALTER TABLE copy_trade_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read copy trade log" ON copy_trade_log FOR SELECT USING (true);
CREATE POLICY "Service insert copy trade log" ON copy_trade_log FOR INSERT WITH CHECK (true);

-- ============================================
-- ADD COPY METADATA COLUMNS TO bets TABLE
-- ============================================
-- These columns let the hedger and UI distinguish copy trades from manual bets.
ALTER TABLE bets ADD COLUMN IF NOT EXISTS is_copy_trade BOOLEAN DEFAULT FALSE;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS leader_user_id TEXT;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS leader_bet_id BIGINT;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS copy_group_id UUID;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS copy_subscription_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_bets_copy_group ON bets(copy_group_id) WHERE copy_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bets_copy_sub ON bets(copy_subscription_id) WHERE copy_subscription_id IS NOT NULL;

-- ============================================
-- HELPER: updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_copy_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_copy_subscriptions_updated_at
    BEFORE UPDATE ON copy_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_copy_subscriptions_updated_at();

-- ============================================
-- GRANTS
-- ============================================
GRANT ALL ON copy_subscriptions TO authenticated;
GRANT ALL ON copy_subscriptions TO service_role;
GRANT USAGE ON SEQUENCE copy_subscriptions_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE copy_subscriptions_id_seq TO service_role;

GRANT ALL ON copy_trade_log TO authenticated;
GRANT ALL ON copy_trade_log TO service_role;
GRANT USAGE ON SEQUENCE copy_trade_log_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE copy_trade_log_id_seq TO service_role;
