-- ============================================
-- MIGRATION: Data Model Consolidation (Removing Duplication)
-- ============================================
-- This migration cleans up redundant columns and unifies the social sharing system.
--
-- 1. Moves any existing share_codes from 'bets' to 'prediction_shares'
-- 2. Removes redundant 'username' and 'share_code' columns from 'bets'
-- 3. Removes redundant 'username' from 'prediction_shares'
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. BACKFILL: Move existing bet share codes to prediction_shares
INSERT INTO prediction_shares (share_code, user_id, market_id, predicted_outcome, bet_id, created_at)
SELECT 
    share_code, 
    user_id, 
    market_id, 
    outcome as predicted_outcome, 
    id as bet_id, 
    created_at
FROM bets
WHERE share_code IS NOT NULL
ON CONFLICT (share_code) DO NOTHING;

-- 2. CLEANUP: Remove redundant columns from bets
ALTER TABLE bets DROP COLUMN IF EXISTS share_code;
ALTER TABLE bets DROP COLUMN IF EXISTS username;

-- 3. CLEANUP: Remove redundant username from prediction_shares
ALTER TABLE prediction_shares DROP COLUMN IF EXISTS username;

-- 4. OPTIMIZATION: Ensure foreign key for bet_id exists and is indexed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prediction_shares_bet_id_fkey') THEN
        ALTER TABLE prediction_shares 
        ADD CONSTRAINT prediction_shares_bet_id_fkey 
        FOREIGN KEY (bet_id) REFERENCES bets(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prediction_shares_bet_id ON prediction_shares(bet_id);

-- 5. VIEW: Create a view for easy challenge lookups (joining profiles for usernames)
CREATE OR REPLACE VIEW challenge_shares_view AS
SELECT 
    ps.*,
    up.x_username,
    up.x_avatar,
    up.x_name,
    b.amount as bet_amount,
    b.status as bet_status
FROM prediction_shares ps
LEFT JOIN user_profiles up ON ps.user_id = up.wallet_address
LEFT JOIN bets b ON ps.bet_id = b.id;

-- Grant permissions
GRANT SELECT ON challenge_shares_view TO authenticated;
GRANT SELECT ON challenge_shares_view TO anon;
GRANT SELECT ON challenge_shares_view TO service_role;
