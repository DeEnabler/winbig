-- Migration: Add tx_hash idempotency to bets table
-- This migration makes tx_hash required and adds unique constraint for duplicate prevention

-- Step 1: Add NOT NULL constraint to tx_hash column
-- Note: This will fail if there are existing NULL values
-- In production, you may need to handle existing NULL values first
ALTER TABLE bets 
ALTER COLUMN tx_hash SET NOT NULL;

-- Step 2: Add unique constraint on tx_hash to prevent duplicates
-- This is the critical fix for the duplicate betting bug
ALTER TABLE bets 
ADD CONSTRAINT unique_bet_tx_hash UNIQUE (tx_hash);

-- Step 3: Add index for performance on tx_hash lookups
CREATE INDEX IF NOT EXISTS idx_bets_tx_hash ON bets(tx_hash);

-- Step 4: Add comment to document the field purpose
COMMENT ON COLUMN bets.tx_hash IS 'Required transaction hash for idempotency and duplicate prevention';

-- Verification queries (run these to test the migration):
-- 1. Check the constraint was added:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'bets'::regclass AND contype = 'u';

-- 2. Test duplicate prevention (should fail):
-- INSERT INTO bets (user_id, market_id, outcome, amount, odds_shown_to_user, tx_hash) 
-- VALUES ('test_user', 'test_market', 'YES', 10, 0.5, '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
-- INSERT INTO bets (user_id, market_id, outcome, amount, odds_shown_to_user, tx_hash) 
-- VALUES ('test_user2', 'test_market2', 'NO', 20, 0.7, '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
-- -- The second insert should fail with: duplicate key value violates unique constraint

-- 3. Clean up test data:
-- DELETE FROM bets WHERE tx_hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';