// src/lib/supabase-auth.ts
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Client-side Supabase client for auth (with cookies/session support)
// Use consistent environment variable naming (matches supabase.ts)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

console.log('🔐 Initializing Supabase Auth client...');
console.log('🌐 Auth SUPABASE_URL exists:', !!supabaseUrl);
console.log('🔑 Auth SUPABASE_KEY exists:', !!supabaseAnonKey);

let supabaseAuth: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  console.log('✅ Supabase Auth client created successfully');
} else {
  console.error('❌ Missing Supabase environment variables for auth!');
}

export { supabaseAuth };

// Types for X (Twitter) user profile
export interface XUserProfile {
  id: string;
  x_user_id: string;
  x_username: string;
  x_avatar: string | null;
  x_name: string | null;
  wallet_address: string | null;
  linked_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Sign in with X (Twitter) using Supabase OAuth
 * This will redirect the user to X for authentication
 */
export async function signInWithX(): Promise<{ error: Error | null }> {
  if (!supabaseAuth) {
    return { error: new Error('Supabase auth client not initialized') };
  }

  const { error } = await supabaseAuth.auth.signInWithOAuth({
    provider: 'twitter',
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
    },
  });

  if (error) {
    console.error('Error signing in with X:', error);
    return { error };
  }

  return { error: null };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: Error | null }> {
  if (!supabaseAuth) {
    return { error: new Error('Supabase auth client not initialized') };
  }

  const { error } = await supabaseAuth.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    return { error };
  }

  return { error: null };
}

/**
 * Get the current session
 */
export async function getSession(): Promise<{ session: Session | null; error: Error | null }> {
  if (!supabaseAuth) {
    return { session: null, error: new Error('Supabase auth client not initialized') };
  }

  const { data: { session }, error } = await supabaseAuth.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return { session: null, error };
  }

  return { session, error: null };
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<{ user: User | null; error: Error | null }> {
  if (!supabaseAuth) {
    return { user: null, error: new Error('Supabase auth client not initialized') };
  }

  const { data: { user }, error } = await supabaseAuth.auth.getUser();

  if (error) {
    console.error('Error getting user:', error);
    return { user: null, error };
  }

  return { user, error: null };
}

/**
 * Get or create user profile from Supabase
 */
export async function getOrCreateUserProfile(user: User): Promise<{ profile: XUserProfile | null; error: Error | null }> {
  if (!supabaseAuth) {
    return { profile: null, error: new Error('Supabase auth client not initialized') };
  }

  // Extract X (Twitter) user data from Supabase user metadata
  const xUserData = user.user_metadata;
  const xUserId = xUserData?.provider_id || xUserData?.sub || user.id;
  const xUsername = xUserData?.user_name || xUserData?.preferred_username || '';
  const xAvatar = xUserData?.avatar_url || xUserData?.picture || null;
  const xName = xUserData?.full_name || xUserData?.name || null;

  // Try to get existing profile
  const { data: existingProfile, error: fetchError } = await supabaseAuth
    .from('user_profiles')
    .select('*')
    .eq('x_user_id', xUserId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is expected for new users
    console.error('Error fetching user profile:', fetchError);
    return { profile: null, error: fetchError };
  }

  if (existingProfile) {
    // Update profile with latest X data
    const { data: updatedProfile, error: updateError } = await supabaseAuth
      .from('user_profiles')
      .update({
        x_username: xUsername,
        x_avatar: xAvatar,
        x_name: xName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProfile.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return { profile: existingProfile, error: null }; // Return existing profile anyway
    }

    return { profile: updatedProfile, error: null };
  }

  // Create new profile
  const { data: newProfile, error: createError } = await supabaseAuth
    .from('user_profiles')
    .insert({
      x_user_id: xUserId,
      x_username: xUsername,
      x_avatar: xAvatar,
      x_name: xName,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating user profile:', createError);
    return { profile: null, error: createError };
  }

  return { profile: newProfile, error: null };
}

/**
 * Link a wallet address to the user profile
 */
export async function linkWalletToProfile(
  profileId: string,
  walletAddress: string
): Promise<{ profile: XUserProfile | null; error: Error | null }> {
  if (!supabaseAuth) {
    return { profile: null, error: new Error('Supabase auth client not initialized') };
  }

  const { data: profile, error } = await supabaseAuth
    .from('user_profiles')
    .update({
      wallet_address: walletAddress,
      linked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    console.error('Error linking wallet to profile:', error);
    return { profile: null, error };
  }

  return { profile, error: null };
}

/**
 * Get user profile by wallet address
 */
export async function getProfileByWallet(
  walletAddress: string
): Promise<{ profile: XUserProfile | null; error: Error | null }> {
  if (!supabaseAuth) {
    return { profile: null, error: new Error('Supabase auth client not initialized') };
  }

  const { data: profile, error } = await supabaseAuth
    .from('user_profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile by wallet:', error);
    return { profile: null, error };
  }

  return { profile: profile || null, error: null };
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): { unsubscribe: () => void } {
  if (!supabaseAuth) {
    console.error('Cannot subscribe to auth state changes - Supabase auth client not initialized');
    return { unsubscribe: () => {} };
  }

  const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return { unsubscribe: () => subscription.unsubscribe() };
}
