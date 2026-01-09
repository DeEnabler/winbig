-- ============================================
-- MIGRATION: Add Affiliate Tracking to User Profiles
-- ============================================
-- This migration adds user-level referrer tracking for the 2-layer affiliate system.
-- When a user signs up through a referral link, we store WHO referred them.
-- This enables tier-2 commission calculations.
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- Add referrer tracking columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referred_at TIMESTAMPTZ;

-- Add persistent affiliate code for user referral links (e.g., /ref/alice123)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS affiliate_code TEXT UNIQUE;

-- Create index for faster referrer lookups (who did this user refer?)
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by);

-- Create index for affiliate code lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_affiliate_code ON user_profiles(affiliate_code);

-- ============================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================

-- Check that columns were added:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_profiles' 
-- AND column_name IN ('referred_by', 'referred_at', 'affiliate_code');

-- Check sample profiles:
-- SELECT id, x_username, wallet_address, referred_by, affiliate_code
-- FROM user_profiles
-- LIMIT 5;

-- ============================================
-- GENERATE AFFILIATE CODES FOR EXISTING USERS
-- ============================================
-- Run this to backfill affiliate codes for existing users who don't have one.
-- Uses their x_username as the base for the code.

-- UPDATE user_profiles 
-- SET affiliate_code = LOWER(x_username) || '_' || SUBSTRING(md5(random()::text), 1, 4)
-- WHERE affiliate_code IS NULL AND x_username IS NOT NULL;

-- For users without X username, generate from wallet address:
-- UPDATE user_profiles 
-- SET affiliate_code = 'user_' || SUBSTRING(wallet_address, 3, 6) || '_' || SUBSTRING(md5(random()::text), 1, 4)
-- WHERE affiliate_code IS NULL AND wallet_address IS NOT NULL;
