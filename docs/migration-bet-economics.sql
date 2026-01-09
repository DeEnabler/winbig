-- ============================================
-- MIGRATION: Bet Economics Tracking
-- ============================================
-- This migration adds columns to track the full economic breakdown of each bet,
-- including platform fees, Polymarket spread, and actual shares received.
--
-- This enables:
-- 1. Accurate P&L tracking based on real on-chain shares
-- 2. Platform revenue tracking from markup fees
-- 3. Spread analysis and monitoring
-- 4. Proper affiliate earnings calculations
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- ============================================
-- ADD NEW COLUMNS TO BETS TABLE
-- ============================================

-- Gross amount: What the user paid (the amount shown to them)
ALTER TABLE bets ADD COLUMN IF NOT EXISTS gross_amount numeric;

-- Net to market: What actually goes to Polymarket after platform fee
ALTER TABLE bets ADD COLUMN IF NOT EXISTS net_to_market numeric;

-- Platform fee: WinBig's captured fee (gross_amount - net_to_market)
ALTER TABLE bets ADD COLUMN IF NOT EXISTS platform_fee numeric;

-- Platform markup percentage at time of bet (e.g., 0.02 for 2%)
ALTER TABLE bets ADD COLUMN IF NOT EXISTS platform_markup_percent numeric DEFAULT 0.02;

-- Polymarket spread at time of execution (from orderbook bid-ask)
ALTER TABLE bets ADD COLUMN IF NOT EXISTS polymarket_spread numeric;

-- Total effective spread (platform markup + polymarket spread)
ALTER TABLE bets ADD COLUMN IF NOT EXISTS total_effective_spread numeric;

-- Expected shares: Calculated at bet time from execution preview
ALTER TABLE bets ADD COLUMN IF NOT EXISTS expected_shares numeric;

-- Actual shares: Confirmed from hedger/on-chain (may differ from expected)
-- Note: This is separate from shares_received which may already exist
ALTER TABLE bets ADD COLUMN IF NOT EXISTS actual_shares numeric;

-- VWAP: Volume-weighted average price at execution
ALTER TABLE bets ADD COLUMN IF NOT EXISTS vwap numeric;

-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================
-- For existing bets, backfill with estimated values

-- Set gross_amount from existing amount column
UPDATE bets 
SET gross_amount = amount 
WHERE gross_amount IS NULL AND amount IS NOT NULL;

-- Estimate platform fee (2% of amount) for historical bets
UPDATE bets 
SET platform_fee = amount * 0.02
WHERE platform_fee IS NULL AND amount IS NOT NULL;

-- Estimate net_to_market for historical bets
UPDATE bets 
SET net_to_market = amount * 0.98
WHERE net_to_market IS NULL AND amount IS NOT NULL;

-- Copy shares_received to actual_shares if exists
UPDATE bets 
SET actual_shares = shares_received
WHERE actual_shares IS NULL AND shares_received IS NOT NULL;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bets_gross_amount ON bets(gross_amount);
CREATE INDEX IF NOT EXISTS idx_bets_platform_fee ON bets(platform_fee);
CREATE INDEX IF NOT EXISTS idx_bets_actual_shares ON bets(actual_shares);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate platform revenue for a time period
CREATE OR REPLACE FUNCTION get_platform_revenue(
    start_date timestamptz DEFAULT (NOW() - INTERVAL '30 days'),
    end_date timestamptz DEFAULT NOW()
)
RETURNS TABLE (
    total_volume numeric,
    total_platform_fees numeric,
    total_affiliate_payouts numeric,
    net_platform_revenue numeric,
    avg_effective_spread numeric,
    bet_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(gross_amount), 0) as total_volume,
        COALESCE(SUM(platform_fee), 0) as total_platform_fees,
        COALESCE(SUM(gross_amount * 0.005), 0) as total_affiliate_payouts, -- 0.5% to affiliates
        COALESCE(SUM(platform_fee) - SUM(gross_amount * 0.005), 0) as net_platform_revenue,
        COALESCE(AVG(total_effective_spread), 0) as avg_effective_spread,
        COUNT(*) as bet_count
    FROM bets 
    WHERE created_at >= start_date 
    AND created_at <= end_date
    AND status = 'executed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get spread analysis by market
CREATE OR REPLACE FUNCTION get_spread_analysis(
    target_market_id text DEFAULT NULL,
    limit_count integer DEFAULT 100
)
RETURNS TABLE (
    market_id text,
    avg_polymarket_spread numeric,
    avg_platform_markup numeric,
    avg_total_spread numeric,
    total_volume numeric,
    total_fees numeric,
    bet_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.market_id,
        COALESCE(AVG(b.polymarket_spread), 0) as avg_polymarket_spread,
        COALESCE(AVG(b.platform_markup_percent), 0) as avg_platform_markup,
        COALESCE(AVG(b.total_effective_spread), 0) as avg_total_spread,
        COALESCE(SUM(b.gross_amount), 0) as total_volume,
        COALESCE(SUM(b.platform_fee), 0) as total_fees,
        COUNT(*) as bet_count
    FROM bets b
    WHERE (target_market_id IS NULL OR b.market_id = target_market_id)
    AND b.status = 'executed'
    GROUP BY b.market_id
    ORDER BY total_volume DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that columns were added:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'bets' 
-- AND column_name IN ('gross_amount', 'net_to_market', 'platform_fee', 'polymarket_spread', 'actual_shares');

-- Check platform revenue:
-- SELECT * FROM get_platform_revenue();

-- Check spread analysis:
-- SELECT * FROM get_spread_analysis() LIMIT 10;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_platform_revenue TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_revenue TO service_role;
GRANT EXECUTE ON FUNCTION get_spread_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION get_spread_analysis TO service_role;
