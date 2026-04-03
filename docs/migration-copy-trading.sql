-- ============================================
-- MIGRATION: Copy Trading — Subscriptions Only
-- ============================================
-- Tracks who is copying whom. Does NOT trigger real orders.
-- The bets table is intentionally left untouched — no copy trades
-- are inserted into the order pipeline until this is explicitly enabled.
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- ============================================
-- TABLE: copy_subscriptions
-- ============================================
-- One row per follower→leader relationship. Active flag = currently copying.
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

    -- Copy preferences (saved for future use when real execution is enabled)
    fixed_amount NUMERIC DEFAULT 10.0,          -- USD per copied trade
    max_per_trade NUMERIC DEFAULT 100.0,        -- hard cap per trade
    max_daily_usd NUMERIC DEFAULT 500.0,        -- daily notional cap

    -- State
    active BOOLEAN DEFAULT TRUE,
    paused_reason TEXT,                         -- 'user_paused', 'daily_limit', 'error', etc.

    -- Prevent duplicate subscriptions
    UNIQUE (follower_user_id, leader_identifier)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_copy_subs_follower ON copy_subscriptions(follower_user_id);
CREATE INDEX IF NOT EXISTS idx_copy_subs_leader ON copy_subscriptions(leader_identifier);
CREATE INDEX IF NOT EXISTS idx_copy_subs_active ON copy_subscriptions(active) WHERE active = TRUE;

-- RLS
ALTER TABLE copy_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view copy subscriptions"
    ON copy_subscriptions FOR SELECT USING (true);

CREATE POLICY "Users can create copy subscriptions"
    ON copy_subscriptions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update copy subscriptions"
    ON copy_subscriptions FOR UPDATE USING (true);

CREATE POLICY "Users can delete copy subscriptions"
    ON copy_subscriptions FOR DELETE USING (true);

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
