-- ============================================
-- MIGRATION: Affiliate Earnings Ledger
-- ============================================
-- This table tracks ALL affiliate commission events for the 2-layer system.
-- Every time a referred user places a bet, we create earnings entries for:
-- - Tier 1: The direct referrer (8% commission)
-- - Tier 2: The referrer's referrer (2% commission)
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

CREATE TABLE IF NOT EXISTS affiliate_earnings (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamptz DEFAULT now(),
    
    -- Who is earning the commission
    affiliate_user_id text NOT NULL,
    
    -- Who generated this earning (the bettor)
    source_user_id text NOT NULL,
    
    -- Which bet triggered this earning
    source_bet_id bigint REFERENCES bets(id),
    
    -- The tier level (1 = direct referral, 2 = sub-referral)
    tier integer NOT NULL CHECK (tier IN (1, 2)),
    
    -- Commission details
    commission_rate numeric NOT NULL,  -- 0.08 for tier 1, 0.02 for tier 2
    platform_fee_rate numeric DEFAULT 0.05, -- 5% platform fee on bets
    bet_amount numeric NOT NULL,
    
    -- Calculated earnings: bet_amount * platform_fee_rate * commission_rate
    earnings_amount numeric NOT NULL,
    
    -- Status tracking
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'withdrawn', 'cancelled')),
    
    -- For withdrawals
    withdrawn_at timestamptz,
    withdrawal_tx_hash text,
    
    -- Additional context
    notes text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_affiliate_user_id ON affiliate_earnings(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_source_user_id ON affiliate_earnings(source_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_source_bet_id ON affiliate_earnings(source_bet_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_status ON affiliate_earnings(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_created_at ON affiliate_earnings(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_tier ON affiliate_earnings(tier);

-- Enable Row Level Security (RLS)
ALTER TABLE affiliate_earnings ENABLE ROW LEVEL SECURITY;

-- Allow reading own earnings
CREATE POLICY "Users can read own affiliate earnings" ON affiliate_earnings
    FOR SELECT USING (true); -- Public read for now, can restrict later

-- Allow inserting earnings (service role)
CREATE POLICY "Service can insert affiliate earnings" ON affiliate_earnings
    FOR INSERT WITH CHECK (true);

-- Allow updating earnings (service role for status changes)
CREATE POLICY "Service can update affiliate earnings" ON affiliate_earnings
    FOR UPDATE USING (true);

-- Grant permissions
GRANT ALL ON affiliate_earnings TO authenticated;
GRANT ALL ON affiliate_earnings TO service_role;
GRANT USAGE ON SEQUENCE affiliate_earnings_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE affiliate_earnings_id_seq TO service_role;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get total earnings for a user
CREATE OR REPLACE FUNCTION get_affiliate_earnings_summary(target_user_id text)
RETURNS TABLE (
    total_earnings numeric,
    tier1_earnings numeric,
    tier2_earnings numeric,
    pending_earnings numeric,
    available_earnings numeric,
    withdrawn_earnings numeric,
    total_referrals bigint,
    tier1_referrals bigint,
    tier2_referrals bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(earnings_amount), 0) as total_earnings,
        COALESCE(SUM(CASE WHEN tier = 1 THEN earnings_amount ELSE 0 END), 0) as tier1_earnings,
        COALESCE(SUM(CASE WHEN tier = 2 THEN earnings_amount ELSE 0 END), 0) as tier2_earnings,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN earnings_amount ELSE 0 END), 0) as pending_earnings,
        COALESCE(SUM(CASE WHEN status = 'available' THEN earnings_amount ELSE 0 END), 0) as available_earnings,
        COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN earnings_amount ELSE 0 END), 0) as withdrawn_earnings,
        COUNT(DISTINCT source_user_id) as total_referrals,
        COUNT(DISTINCT CASE WHEN tier = 1 THEN source_user_id END) as tier1_referrals,
        COUNT(DISTINCT CASE WHEN tier = 2 THEN source_user_id END) as tier2_referrals
    FROM affiliate_earnings 
    WHERE LOWER(affiliate_user_id) = LOWER(target_user_id)
    AND status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent earnings for a user
CREATE OR REPLACE FUNCTION get_recent_affiliate_earnings(target_user_id text, limit_count integer DEFAULT 20)
RETURNS TABLE (
    id bigint,
    created_at timestamptz,
    source_user_id text,
    tier integer,
    bet_amount numeric,
    earnings_amount numeric,
    status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.id,
        ae.created_at,
        ae.source_user_id,
        ae.tier,
        ae.bet_amount,
        ae.earnings_amount,
        ae.status
    FROM affiliate_earnings ae
    WHERE LOWER(ae.affiliate_user_id) = LOWER(target_user_id)
    ORDER BY ae.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that table was created:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'affiliate_earnings';

-- Check earnings summary function:
-- SELECT * FROM get_affiliate_earnings_summary('0x1234...');

-- Check recent earnings:
-- SELECT * FROM get_recent_affiliate_earnings('0x1234...', 10);
