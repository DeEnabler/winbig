-- Supabase Database Schema for Betting System
-- Run this in your Supabase SQL Editor

-- Create the bets table
CREATE TABLE IF NOT EXISTS bets (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamptz DEFAULT now(),
    
    -- Frontend fields (written by user interface)
    user_id text NOT NULL,
    session_id text,
    market_id text NOT NULL,
    outcome text NOT NULL CHECK (outcome IN ('YES', 'NO')),
    amount numeric NOT NULL CHECK (amount > 0),
    odds_shown_to_user numeric NOT NULL CHECK (odds_shown_to_user > 0),
    timestamp timestamptz DEFAULT now(),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')),
    
    -- Backend fields (filled by hedger)
    execution_price numeric,
    execution_timestamp timestamptz,
    shares_received numeric,
    gas_fee_pol numeric,
    gas_fee_usd numeric,
    tx_hash text,
    order_id text,
    wallet_address text,
    success boolean,
    error_message text,
    notes text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_market_id ON bets(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at);
CREATE INDEX IF NOT EXISTS idx_bets_outcome ON bets(outcome);

-- Enable Row Level Security (RLS)
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Users can read their own bets
CREATE POLICY "Users can view own bets" ON bets
    FOR SELECT USING (auth.uid()::text = user_id);

-- Users can insert their own bets
CREATE POLICY "Users can insert own bets" ON bets
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Backend service can read and update all bets (using service role key)
-- This policy applies to service role key operations
CREATE POLICY "Service role can manage all bets" ON bets
    FOR ALL USING (auth.role() = 'service_role');

-- Create a function to get user betting stats
CREATE OR REPLACE FUNCTION get_user_betting_stats(target_user_id text)
RETURNS TABLE (
    total_bets bigint,
    total_wagered numeric,
    successful_bets bigint,
    total_winnings numeric,
    success_rate numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_bets,
        COALESCE(SUM(amount), 0) as total_wagered,
        COUNT(*) FILTER (WHERE success = true) as successful_bets,
        COALESCE(SUM(CASE WHEN success = true THEN shares_received ELSE 0 END), 0) as total_winnings,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(*) FILTER (WHERE success = true))::numeric / COUNT(*)::numeric
            ELSE 0
        END as success_rate
    FROM bets 
    WHERE user_id = target_user_id 
    AND status IN ('executed', 'failed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get recent market activity
CREATE OR REPLACE FUNCTION get_recent_market_activity(target_market_id text, limit_count integer DEFAULT 10)
RETURNS TABLE (
    user_id text,
    outcome text,
    amount numeric,
    status text,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.user_id,
        b.outcome,
        b.amount,
        b.status,
        b.created_at
    FROM bets b
    WHERE b.market_id = target_market_id
    ORDER BY b.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample data for testing (optional)
-- Uncomment the lines below if you want to insert test data

/*
INSERT INTO bets (user_id, session_id, market_id, outcome, amount, odds_shown_to_user, status) VALUES
('test_user_1', 'session_123', 'market_sample_1', 'YES', 10.00, 0.65, 'pending'),
('test_user_2', 'session_456', 'market_sample_1', 'NO', 25.00, 0.35, 'pending'),
('test_user_1', 'session_789', 'market_sample_2', 'YES', 50.00, 0.80, 'executed');
*/

-- Grant necessary permissions
GRANT ALL ON bets TO authenticated;
GRANT ALL ON bets TO service_role;
GRANT USAGE ON SEQUENCE bets_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE bets_id_seq TO service_role; 