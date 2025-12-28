-- MIGRATION FIX: Update user_profiles to use Supabase auth.uid() properly
-- Run this in your Supabase SQL Editor

-- First, add an auth_id column to link to Supabase auth.users
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS auth_id UUID;

-- Create an index on auth_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_id ON user_profiles(auth_id);

-- Drop existing policies (they have wrong logic)
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can read profiles by wallet" ON user_profiles;

-- Create new policies using auth.uid()
-- Policy: Users can read their own profile (by auth_id)
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = auth_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = auth_id);

-- Policy: Allow anyone to read profiles by wallet address (for public display)
CREATE POLICY "Anyone can read profiles by wallet" ON user_profiles
  FOR SELECT
  USING (wallet_address IS NOT NULL);

-- Policy: Allow authenticated users to insert (for new profile creation)
CREATE POLICY "Authenticated users can insert profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
