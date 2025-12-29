-- Migration: Create user_profiles table for X (Twitter) login feature
-- Run this in your Supabase SQL Editor

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- X (Twitter) user data
  x_user_id TEXT NOT NULL UNIQUE,
  x_username TEXT NOT NULL,
  x_avatar TEXT,
  x_name TEXT,
  
  -- Wallet linking
  wallet_address TEXT,
  linked_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet_address ON user_profiles(wallet_address);

-- Create index for X user ID lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_x_user_id ON user_profiles(x_user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid()::text = x_user_id OR auth.jwt() ->> 'sub' = x_user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = x_user_id OR auth.jwt() ->> 'sub' = x_user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid()::text = x_user_id OR auth.jwt() ->> 'sub' = x_user_id);

-- Policy: Allow anon users to read profiles by wallet address (for public profile lookup)
CREATE POLICY "Anyone can read profiles by wallet" ON user_profiles
  FOR SELECT
  USING (wallet_address IS NOT NULL);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions for authenticated and anon users
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;
GRANT INSERT ON user_profiles TO authenticated;
GRANT UPDATE ON user_profiles TO authenticated;