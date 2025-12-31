-- ============================================
-- MIGRATION: Prediction Shares (Social Sharing)
-- ============================================
-- This allows users to share predictions WITHOUT placing a bet.
-- Perfect for viral social sharing and testing affiliate flows.

CREATE TABLE IF NOT EXISTS prediction_shares (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamptz DEFAULT now(),
    
    -- Share code (for URL: /challenge/abc123)
    share_code text NOT NULL UNIQUE,
    
    -- Who created the share
    user_id text NOT NULL, -- Wallet address
    username text, -- Display name (optional)
    
    -- The prediction/market
    market_id text NOT NULL,
    
    -- Their stance
    predicted_outcome text NOT NULL CHECK (predicted_outcome IN ('YES', 'NO')),
    
    -- Optional: If they later place a bet, link it
    bet_id bigint REFERENCES bets(id),
    
    -- Tracking
    clicks integer DEFAULT 0,
    conversions integer DEFAULT 0, -- Users who placed bets through this
    
    -- Status
    is_active boolean DEFAULT true,
    expires_at timestamptz
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prediction_shares_share_code ON prediction_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_prediction_shares_user_id ON prediction_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_shares_market_id ON prediction_shares(market_id);

-- Enable RLS
ALTER TABLE prediction_shares ENABLE ROW LEVEL SECURITY;

-- Allow public read (for share link lookups)
CREATE POLICY "Allow public read prediction_shares" ON prediction_shares
    FOR SELECT USING (true);

-- Allow authenticated insert
CREATE POLICY "Allow insert prediction_shares" ON prediction_shares
    FOR INSERT WITH CHECK (true);

-- Allow update for click tracking
CREATE POLICY "Allow update prediction_shares" ON prediction_shares
    FOR UPDATE USING (true);

-- Grant permissions
GRANT ALL ON prediction_shares TO authenticated;
GRANT ALL ON prediction_shares TO service_role;
GRANT SELECT ON prediction_shares TO anon;
GRANT USAGE ON SEQUENCE prediction_shares_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE prediction_shares_id_seq TO service_role;
