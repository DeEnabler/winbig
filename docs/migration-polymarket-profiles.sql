-- Migration: Polymarket Profile Mirroring
-- This creates tables to store mirrored Polymarket profile data

-- ============================================
-- POLYMARKET PROFILES TABLE
-- Stores mirrored profile data from Polymarket
-- ============================================
CREATE TABLE IF NOT EXISTS polymarket_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_synced_at timestamptz DEFAULT now(),
    
    -- Polymarket identifiers
    polymarket_address text UNIQUE NOT NULL, -- Their proxy wallet address
    polymarket_username text, -- Their @username on Polymarket
    
    -- Profile info (from /public-profile)
    display_name text,
    pseudonym text,
    bio text,
    profile_image_url text,
    x_username text, -- Twitter/X handle
    is_verified boolean DEFAULT false,
    display_username_public boolean DEFAULT true,
    joined_at timestamptz,
    
    -- Portfolio summary (from /value and calculated)
    portfolio_value numeric DEFAULT 0,
    total_positions integer DEFAULT 0,
    total_trades integer DEFAULT 0,
    
    -- P&L metrics (calculated from positions)
    total_pnl numeric DEFAULT 0,
    total_pnl_percent numeric DEFAULT 0,
    realized_pnl numeric DEFAULT 0,
    unrealized_pnl numeric DEFAULT 0,
    
    -- Win/loss tracking
    positions_won integer DEFAULT 0,
    positions_lost integer DEFAULT 0,
    win_rate numeric DEFAULT 0,
    
    -- Volume metrics
    total_volume_traded numeric DEFAULT 0,
    
    -- Link to our user (if they've connected)
    linked_user_id text, -- Our user's wallet address
    
    -- Raw JSON data for reference
    raw_profile_data jsonb,
    raw_positions_data jsonb,
    raw_activity_data jsonb
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_polymarket_profiles_address ON polymarket_profiles(polymarket_address);
CREATE INDEX IF NOT EXISTS idx_polymarket_profiles_username ON polymarket_profiles(polymarket_username);
CREATE INDEX IF NOT EXISTS idx_polymarket_profiles_linked_user ON polymarket_profiles(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_polymarket_profiles_portfolio_value ON polymarket_profiles(portfolio_value DESC);

-- ============================================
-- POLYMARKET POSITIONS TABLE
-- Stores individual positions for each profile
-- ============================================
CREATE TABLE IF NOT EXISTS polymarket_positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Foreign key to profile
    profile_id uuid REFERENCES polymarket_profiles(id) ON DELETE CASCADE,
    polymarket_address text NOT NULL,
    
    -- Position identifiers
    condition_id text NOT NULL,
    asset_id text,
    market_slug text,
    
    -- Market info
    market_title text,
    market_question text,
    outcome text, -- YES/NO or specific outcome
    end_date timestamptz,
    
    -- Position details
    size numeric NOT NULL DEFAULT 0, -- Number of shares
    avg_price numeric NOT NULL DEFAULT 0, -- Average entry price
    initial_value numeric DEFAULT 0, -- What they paid
    current_value numeric DEFAULT 0, -- Current market value
    
    -- P&L
    cash_pnl numeric DEFAULT 0, -- Absolute P&L in $
    percent_pnl numeric DEFAULT 0, -- Percentage P&L
    realized_pnl numeric DEFAULT 0,
    percent_realized_pnl numeric DEFAULT 0,
    
    -- Position status
    is_active boolean DEFAULT true,
    is_redeemable boolean DEFAULT false,
    is_mergeable boolean DEFAULT false,
    
    -- Raw data
    raw_data jsonb,
    
    UNIQUE(polymarket_address, condition_id, outcome)
);

CREATE INDEX IF NOT EXISTS idx_polymarket_positions_profile ON polymarket_positions(profile_id);
CREATE INDEX IF NOT EXISTS idx_polymarket_positions_address ON polymarket_positions(polymarket_address);
CREATE INDEX IF NOT EXISTS idx_polymarket_positions_active ON polymarket_positions(is_active);

-- ============================================
-- POLYMARKET ACTIVITY TABLE
-- Stores activity/trade history
-- ============================================
CREATE TABLE IF NOT EXISTS polymarket_activity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    
    -- Foreign key to profile
    profile_id uuid REFERENCES polymarket_profiles(id) ON DELETE CASCADE,
    polymarket_address text NOT NULL,
    
    -- Activity info
    activity_type text NOT NULL, -- TRADE, SPLIT, MERGE, REDEEM, etc.
    timestamp timestamptz NOT NULL,
    
    -- Market info
    condition_id text,
    market_slug text,
    market_title text,
    outcome text,
    
    -- Transaction details
    side text, -- BUY/SELL
    price numeric,
    size numeric,
    value numeric, -- price * size
    
    -- Blockchain reference
    transaction_hash text,
    
    -- Raw data
    raw_data jsonb,
    
    UNIQUE(polymarket_address, transaction_hash, activity_type)
);

CREATE INDEX IF NOT EXISTS idx_polymarket_activity_profile ON polymarket_activity(profile_id);
CREATE INDEX IF NOT EXISTS idx_polymarket_activity_address ON polymarket_activity(polymarket_address);
CREATE INDEX IF NOT EXISTS idx_polymarket_activity_timestamp ON polymarket_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_polymarket_activity_type ON polymarket_activity(activity_type);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE polymarket_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polymarket_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE polymarket_activity ENABLE ROW LEVEL SECURITY;

-- Allow public read access to mirrored profiles
CREATE POLICY "Allow public read polymarket_profiles" ON polymarket_profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow public read polymarket_positions" ON polymarket_positions
    FOR SELECT USING (true);

CREATE POLICY "Allow public read polymarket_activity" ON polymarket_activity
    FOR SELECT USING (true);

-- Allow service role to manage all data
CREATE POLICY "Service role manages polymarket_profiles" ON polymarket_profiles
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages polymarket_positions" ON polymarket_positions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages polymarket_activity" ON polymarket_activity
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- HELPER FUNCTION: Get or create profile by address
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_polymarket_profile(p_address text)
RETURNS uuid AS $$
DECLARE
    profile_id uuid;
BEGIN
    SELECT id INTO profile_id FROM polymarket_profiles WHERE polymarket_address = lower(p_address);
    
    IF profile_id IS NULL THEN
        INSERT INTO polymarket_profiles (polymarket_address)
        VALUES (lower(p_address))
        RETURNING id INTO profile_id;
    END IF;
    
    RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
