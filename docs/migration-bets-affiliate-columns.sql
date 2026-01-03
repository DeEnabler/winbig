-- ============================================
-- MIGRATION: Add Affiliate/Share Columns to Bets Table
-- ============================================
-- This migration adds the missing columns needed for:
-- 1. Share link generation after placing a bet
-- 2. Affiliate referral tracking
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- Add share_code column for affiliate links
ALTER TABLE bets ADD COLUMN IF NOT EXISTS share_code text UNIQUE;

-- Add referrer tracking columns
ALTER TABLE bets ADD COLUMN IF NOT EXISTS referrer_bet_id bigint REFERENCES bets(id);
ALTER TABLE bets ADD COLUMN IF NOT EXISTS referrer_user_id text;

-- Create index for fast share_code lookups
CREATE INDEX IF NOT EXISTS idx_bets_share_code ON bets(share_code);

-- Create index for referral queries (who referred who)
CREATE INDEX IF NOT EXISTS idx_bets_referrer_user_id ON bets(referrer_user_id);

-- ============================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================

-- Check that columns were added:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'bets' 
-- AND column_name IN ('share_code', 'referrer_bet_id', 'referrer_user_id');

-- Check a sample bet:
-- SELECT id, user_id, amount, share_code, referrer_bet_id, referrer_user_id 
-- FROM bets 
-- LIMIT 5;
