import { createClient, SupabaseClient } from '@supabase/supabase-js'

console.log('🔧 Initializing server-side Supabase client...');

// Server-side environment variables (consistent with Vercel naming)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('🌐 Server SUPABASE_URL exists:', !!supabaseUrl);
console.log('🔑 Server SUPABASE_KEY exists:', !!supabaseKey);

let supabase: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing server-side Supabase environment variables!');
  console.error('SUPABASE_URL:', supabaseUrl || 'MISSING');
  console.error('SUPABASE_KEY:', supabaseKey || 'MISSING');
  console.error('⚠️ Server-side Supabase client not initialized - betting will not work');
} else {
  console.log('✅ Server-side Supabase environment variables found, creating client...');
  console.log('🔧 Using URL:', supabaseUrl);
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Server-side Supabase client created successfully');
}

export { supabase };

// Type for the bets table matching the schema from the guide
export interface BetRecord {
  // Database fields
  id?: number
  created_at?: string
  
  // Frontend fields (written by user interface)
  user_id: string
  session_id?: string | null
  market_id: string
  outcome: 'YES' | 'NO'
  amount: number
  odds_shown_to_user: number
  potential_payout?: number | null // ADDED
  timestamp?: string
  status: 'pending' | 'executed' | 'failed' | 'cancelled'
  tx_hash: string // REQUIRED: Transaction hash for idempotency and tracking
  
  // Affiliate/referral tracking fields
  share_code?: string | null // Unique code for shareable affiliate links
  referrer_bet_id?: number | null // ID of the bet that referred this user
  referrer_user_id?: string | null // Wallet address of the referrer (for earnings)
  username?: string | null // X/Twitter username for social profile display
  
  // Backend fields (filled by hedger)
  execution_price?: number | null
  execution_timestamp?: string | null
  shares_received?: number | null
  gas_fee_pol?: number | null
  gas_fee_usd?: number | null
  order_id?: string | null
  wallet_address?: string | null
  success?: boolean | null
  error_message?: string | null
  notes?: string | null
}

// Helper function to insert a new bet
export async function insertBet(bet: Omit<BetRecord, 'id' | 'created_at'>): Promise<{ success: boolean; data?: BetRecord; error?: string }> {
  try {
    console.log('🎯 insertBet called with:', bet);
    
    if (!supabase) {
      console.error('❌ Server-side Supabase client not initialized - check environment variables');
      return { success: false, error: 'Server-side Supabase client not initialized - check environment variables' };
    }
    
    console.log('🔧 Server-side Supabase client configured and ready');
    console.log('👤 User ID (original):', bet.user_id, '-> (normalized):', bet.user_id.toLowerCase());
    
    // CRITICAL FIX: Check for existing bet with same tx_hash first
    console.log('🔍 Checking for existing bet with tx_hash:', bet.tx_hash);
    const { data: existingBet, error: checkError } = await supabase
      .from('bets')
      .select('*')
      .eq('tx_hash', bet.tx_hash)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is what we want
      console.error('❌ Error checking for existing bet:', checkError);
      return { success: false, error: `Database check failed: ${checkError.message}` };
    }
    
    if (existingBet) {
      console.log('🔄 Bet with this tx_hash already exists, returning existing:', existingBet);
      return { success: true, data: existingBet };
    }
    
    // Create a bet record that matches the current table structure
    // IMPORTANT: Normalize wallet addresses to lowercase for consistent storage and lookup
    const simplifiedBet: Record<string, any> = {
      user_id: bet.user_id.toLowerCase(), // Normalize to lowercase
      market_id: bet.market_id,
      outcome: bet.outcome,
      amount: bet.amount,
      odds_shown_to_user: bet.odds_shown_to_user,
      potential_payout: bet.potential_payout || null,
      execution_price: bet.execution_price || null,
      status: bet.status || 'pending',
      tx_hash: bet.tx_hash, // CRITICAL: Include transaction hash for idempotency
    };
    
    // Only add optional affiliate/social fields if they have values
    // This prevents errors if the columns don't exist yet (before migration)
    if (bet.referrer_bet_id) {
      simplifiedBet.referrer_bet_id = bet.referrer_bet_id;
    }
    if (bet.referrer_user_id) {
      simplifiedBet.referrer_user_id = bet.referrer_user_id.toLowerCase();
    }
    if (bet.username) {
      simplifiedBet.username = bet.username;
    }
    
    console.log('🚀 Executing Supabase insert query with simplified bet:', simplifiedBet);
    const { data, error } = await supabase
      .from('bets')
      .insert([simplifiedBet])
      .select()
      .single()

    console.log('📥 Supabase response:', { data, error });

    if (error) {
      console.error('❌ Supabase error details:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return { success: false, error: error.message }
    }

    console.log('✅ Bet inserted successfully:', data);

    // Create affiliate earnings entries (tier-1 and tier-2) if there's a referrer
    if (data && data.referrer_user_id) {
      console.log('💰 Creating affiliate earnings for bet with referrer...');
      try {
        const affiliateResult = await createAffiliateEarnings(data as BetRecord);
        console.log('💰 Affiliate earnings result:', affiliateResult);
      } catch (affiliateErr) {
        // Don't fail the bet insertion if affiliate earnings fail
        console.error('⚠️ Failed to create affiliate earnings (non-blocking):', affiliateErr);
      }
    }

    return { success: true, data }
  } catch (err) {
    console.error('❌ Unexpected error in insertBet:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error message:', errorMessage);
    return { success: false, error: errorMessage }
  }
}

// Helper function to get user's betting history
export async function getUserBets(userId: string, limit: number = 10): Promise<{ success: boolean; data?: BetRecord[]; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }
    
    // Use case-insensitive matching for wallet addresses
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .ilike('user_id', userId.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching user bets:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (err) {
    console.error('Exception fetching user bets:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// User profile type for social info (with affiliate fields)
export interface UserProfile {
  id: string;
  x_user_id: string;
  x_username: string;
  x_avatar?: string | null;
  x_name?: string | null;
  wallet_address?: string | null;
  linked_at?: string | null;
  created_at?: string;
  updated_at?: string;
  // Affiliate tracking fields
  referred_by?: string | null;       // Wallet address of who referred this user
  referred_at?: string | null;       // When they were referred
  affiliate_code?: string | null;    // Unique code for their referral links
}

// Affiliate earnings record type
export interface AffiliateEarning {
  id?: number;
  created_at?: string;
  affiliate_user_id: string;
  source_user_id: string;
  source_bet_id: number;
  tier: 1 | 2;
  commission_rate: number;
  platform_fee_rate: number;
  bet_amount: number;
  earnings_amount: number;
  status: 'pending' | 'available' | 'withdrawn' | 'cancelled';
  withdrawn_at?: string | null;
  withdrawal_tx_hash?: string | null;
  notes?: string | null;
}

// Commission rates for the 2-layer affiliate system
const TIER_1_COMMISSION_RATE = 0.08; // 8% of platform fee
const TIER_2_COMMISSION_RATE = 0.02; // 2% of platform fee
const PLATFORM_FEE_RATE = 0.05;      // 5% platform fee on bets

// Helper function to get user profile by wallet address
export async function getUserProfileByWallet(walletAddress: string): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }
    
    console.log('🔍 getUserProfileByWallet: Looking for wallet:', walletAddress);
    
    // Try case-insensitive match using ilike
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .maybeSingle();

    console.log('🔍 getUserProfileByWallet: Result:', { found: !!data, username: data?.x_username, error: error?.message });

    if (error) {
      console.error('Error fetching user profile:', error);
      return { success: false, error: error.message };
    }

    return { success: !!data, data: data || undefined };
  } catch (err) {
    console.error('Exception fetching user profile:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Helper function to get user profile by X username
export async function getUserProfileByUsername(username: string): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }
    
    // Remove @ if present
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .ilike('x_username', cleanUsername)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile by username:', error);
      return { success: false, error: error.message };
    }

    return { success: !!data, data: data || undefined };
  } catch (err) {
    console.error('Exception fetching user profile by username:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Helper function to update bet execution details
export async function updateBetExecution(betId: number, executionData: Partial<BetRecord>): Promise<{ success: boolean; data?: BetRecord; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }
    
    const { data, error } = await supabase
      .from('bets')
      .update(executionData)
      .eq('id', betId)
      .select()
      .single()

    if (error) {
      console.error('Error updating bet:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Exception updating bet:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Helper function to get pending bets (for backend hedger)
export async function getPendingBets(limit: number = 10): Promise<{ success: boolean; data?: BetRecord[]; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }
    
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching pending bets:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (err) {
    console.error('Exception fetching pending bets:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================
// AFFILIATE LINK TRACKING FUNCTIONS
// ============================================

// Get a bet by its ID
export async function getBetById(betId: number): Promise<{ success: boolean; data?: BetRecord; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }
    
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('id', betId)
      .single();

    if (error) {
      console.error('Error fetching bet by ID:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception fetching bet by ID:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Get a bet by its share code (for affiliate link lookups)
export async function getBetByShareCode(shareCode: string): Promise<{ success: boolean; data?: BetRecord; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }
    
    console.log('🔍 Looking up bet by share_code:', shareCode);
    
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('share_code', shareCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ No bet found with share_code:', shareCode);
        return { success: false, error: 'Share link not found' };
      }
      console.error('Error fetching bet by share_code:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Found bet with share_code:', shareCode);
    return { success: true, data };
  } catch (err) {
    console.error('Exception fetching bet by share_code:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Update a bet with a share code (used when generating affiliate link)
export async function updateBetShareCode(betId: number, shareCode: string): Promise<{ success: boolean; data?: BetRecord; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }
    
    console.log('🔗 Updating bet', betId, 'with share_code:', shareCode);
    
    const { data, error } = await supabase
      .from('bets')
      .update({ share_code: shareCode })
      .eq('id', betId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bet share_code:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Share code updated successfully for bet:', betId);
    return { success: true, data };
  } catch (err) {
    console.error('Exception updating bet share_code:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Get referral stats for a user (wallet address)
export async function getReferralStats(userId: string): Promise<{ 
  success: boolean; 
  data?: { 
    total_referrals: number; 
    total_referred_volume: number;
    referrals: BetRecord[];
  }; 
  error?: string 
}> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }
    
    console.log('📊 Getting referral stats for user:', userId);
    
    // Use case-insensitive matching for wallet addresses
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .ilike('referrer_user_id', userId.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referral stats:', error);
      return { success: false, error: error.message };
    }

    const referrals = data || [];
    const total_referrals = referrals.length;
    const total_referred_volume = referrals.reduce((sum, bet) => sum + (bet.amount || 0), 0);

    console.log('✅ Referral stats:', { total_referrals, total_referred_volume });
    return { 
      success: true, 
      data: { total_referrals, total_referred_volume, referrals } 
    };
  } catch (err) {
    console.error('Exception fetching referral stats:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================
// 2-LAYER AFFILIATE SYSTEM FUNCTIONS
// ============================================

// Get who referred a user (for tier-2 calculation)
export async function getUserReferrer(userId: string): Promise<{ success: boolean; data?: string | null; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }
    
    console.log('🔍 Looking up referrer for user:', userId);
    
    // First, check user_profiles for the referred_by field
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('referred_by')
      .ilike('wallet_address', userId.toLowerCase())
      .maybeSingle();

    if (profileError) {
      console.error('Error looking up user referrer:', profileError);
      // Don't fail - try the fallback
    }

    if (profile?.referred_by) {
      console.log('✅ Found referrer in user_profiles:', profile.referred_by);
      return { success: true, data: profile.referred_by };
    }

    // Fallback: Look at the user's first bet to find their original referrer
    const { data: firstBet, error: betError } = await supabase
      .from('bets')
      .select('referrer_user_id')
      .ilike('user_id', userId.toLowerCase())
      .not('referrer_user_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (betError) {
      console.error('Error looking up first bet referrer:', betError);
    }

    if (firstBet?.referrer_user_id) {
      console.log('✅ Found referrer from first bet:', firstBet.referrer_user_id);
      return { success: true, data: firstBet.referrer_user_id };
    }

    console.log('ℹ️ No referrer found for user:', userId);
    return { success: true, data: null };
  } catch (err) {
    console.error('Exception looking up user referrer:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Create affiliate earnings entries for a bet (tier-1 and tier-2)
export async function createAffiliateEarnings(
  bet: BetRecord
): Promise<{ success: boolean; tier1Created: boolean; tier2Created: boolean; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, tier1Created: false, tier2Created: false, error: 'Supabase not initialized' };
    }

    if (!bet.id || !bet.referrer_user_id) {
      console.log('ℹ️ No referrer for this bet, skipping affiliate earnings');
      return { success: true, tier1Created: false, tier2Created: false };
    }

    const betAmount = bet.amount;
    const bettorUserId = bet.user_id.toLowerCase();
    const tier1Referrer = bet.referrer_user_id.toLowerCase();

    console.log('💰 Creating affiliate earnings for bet:', bet.id);
    console.log('   Bettor:', bettorUserId);
    console.log('   Tier-1 Referrer:', tier1Referrer);
    console.log('   Bet Amount:', betAmount);

    let tier1Created = false;
    let tier2Created = false;

    // Create Tier-1 earnings (direct referrer)
    const tier1Earnings = betAmount * PLATFORM_FEE_RATE * TIER_1_COMMISSION_RATE;
    const tier1Record: Omit<AffiliateEarning, 'id' | 'created_at'> = {
      affiliate_user_id: tier1Referrer,
      source_user_id: bettorUserId,
      source_bet_id: bet.id,
      tier: 1,
      commission_rate: TIER_1_COMMISSION_RATE,
      platform_fee_rate: PLATFORM_FEE_RATE,
      bet_amount: betAmount,
      earnings_amount: tier1Earnings,
      status: 'pending',
    };

    const { error: tier1Error } = await supabase
      .from('affiliate_earnings')
      .insert([tier1Record]);

    if (tier1Error) {
      console.error('❌ Error creating tier-1 earnings:', tier1Error);
      // Continue to try tier-2 even if tier-1 fails
    } else {
      console.log('✅ Tier-1 earnings created:', tier1Earnings, 'for', tier1Referrer);
      tier1Created = true;
    }

    // Look up tier-2 referrer (who referred the tier-1 referrer?)
    const tier2Result = await getUserReferrer(tier1Referrer);
    
    if (tier2Result.success && tier2Result.data) {
      const tier2Referrer = tier2Result.data.toLowerCase();
      
      // Make sure tier-2 referrer is not the same as the bettor (prevent self-referral loops)
      if (tier2Referrer !== bettorUserId && tier2Referrer !== tier1Referrer) {
        console.log('   Tier-2 Referrer:', tier2Referrer);

        const tier2Earnings = betAmount * PLATFORM_FEE_RATE * TIER_2_COMMISSION_RATE;
        const tier2Record: Omit<AffiliateEarning, 'id' | 'created_at'> = {
          affiliate_user_id: tier2Referrer,
          source_user_id: bettorUserId,
          source_bet_id: bet.id,
          tier: 2,
          commission_rate: TIER_2_COMMISSION_RATE,
          platform_fee_rate: PLATFORM_FEE_RATE,
          bet_amount: betAmount,
          earnings_amount: tier2Earnings,
          status: 'pending',
        };

        const { error: tier2Error } = await supabase
          .from('affiliate_earnings')
          .insert([tier2Record]);

        if (tier2Error) {
          console.error('❌ Error creating tier-2 earnings:', tier2Error);
        } else {
          console.log('✅ Tier-2 earnings created:', tier2Earnings, 'for', tier2Referrer);
          tier2Created = true;
        }
      }
    }

    return { success: true, tier1Created, tier2Created };
  } catch (err) {
    console.error('❌ Exception creating affiliate earnings:', err);
    return { 
      success: false, 
      tier1Created: false, 
      tier2Created: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

// Get affiliate earnings summary for a user
export async function getAffiliateEarningsSummary(userId: string): Promise<{
  success: boolean;
  data?: {
    total_earnings: number;
    tier1_earnings: number;
    tier2_earnings: number;
    pending_earnings: number;
    available_earnings: number;
    withdrawn_earnings: number;
    total_referrals: number;
    tier1_referrals: number;
    tier2_referrals: number;
  };
  error?: string;
}> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }

    console.log('📊 Getting affiliate earnings summary for:', userId);

    const { data, error } = await supabase
      .from('affiliate_earnings')
      .select('*')
      .ilike('affiliate_user_id', userId.toLowerCase())
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error fetching affiliate earnings:', error);
      return { success: false, error: error.message };
    }

    const earnings = data || [];

    // Calculate summaries
    const total_earnings = earnings.reduce((sum, e) => sum + (e.earnings_amount || 0), 0);
    const tier1_earnings = earnings.filter(e => e.tier === 1).reduce((sum, e) => sum + (e.earnings_amount || 0), 0);
    const tier2_earnings = earnings.filter(e => e.tier === 2).reduce((sum, e) => sum + (e.earnings_amount || 0), 0);
    const pending_earnings = earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.earnings_amount || 0), 0);
    const available_earnings = earnings.filter(e => e.status === 'available').reduce((sum, e) => sum + (e.earnings_amount || 0), 0);
    const withdrawn_earnings = earnings.filter(e => e.status === 'withdrawn').reduce((sum, e) => sum + (e.earnings_amount || 0), 0);

    // Count unique referrals
    const uniqueSourceUsers = new Set(earnings.map(e => e.source_user_id.toLowerCase()));
    const tier1SourceUsers = new Set(earnings.filter(e => e.tier === 1).map(e => e.source_user_id.toLowerCase()));
    const tier2SourceUsers = new Set(earnings.filter(e => e.tier === 2).map(e => e.source_user_id.toLowerCase()));

    console.log('✅ Affiliate summary calculated:', { total_earnings, tier1_earnings, tier2_earnings });

    return {
      success: true,
      data: {
        total_earnings,
        tier1_earnings,
        tier2_earnings,
        pending_earnings,
        available_earnings,
        withdrawn_earnings,
        total_referrals: uniqueSourceUsers.size,
        tier1_referrals: tier1SourceUsers.size,
        tier2_referrals: tier2SourceUsers.size,
      },
    };
  } catch (err) {
    console.error('Exception getting affiliate earnings summary:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Get recent affiliate earnings for a user
export async function getRecentAffiliateEarnings(
  userId: string,
  limit: number = 20
): Promise<{ success: boolean; data?: AffiliateEarning[]; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }

    const { data, error } = await supabase
      .from('affiliate_earnings')
      .select('*')
      .ilike('affiliate_user_id', userId.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent affiliate earnings:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Exception fetching recent affiliate earnings:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Update user's referrer (called when they first join via referral link)
export async function setUserReferrer(
  userId: string,
  referrerUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }

    console.log('🔗 Setting referrer for user:', userId, '-> referred by:', referrerUserId);

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id, referred_by')
      .ilike('wallet_address', userId.toLowerCase())
      .maybeSingle();

    if (existingProfile?.referred_by) {
      console.log('ℹ️ User already has a referrer, not updating');
      return { success: true };
    }

    if (existingProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          referred_by: referrerUserId.toLowerCase(),
          referred_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id);

      if (error) {
        console.error('Error updating user referrer:', error);
        return { success: false, error: error.message };
      }
    }
    // Note: If no profile exists yet, the referrer will be set from the first bet's referrer_user_id

    console.log('✅ User referrer set successfully');
    return { success: true };
  } catch (err) {
    console.error('Exception setting user referrer:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Get or generate affiliate code for a user
export async function getOrCreateAffiliateCode(userId: string): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }

    // Check if user already has an affiliate code
    const { data: profile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('affiliate_code, x_username')
      .ilike('wallet_address', userId.toLowerCase())
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching affiliate code:', fetchError);
    }

    if (profile?.affiliate_code) {
      return { success: true, data: profile.affiliate_code };
    }

    // Generate a new affiliate code
    const baseCode = profile?.x_username 
      ? profile.x_username.toLowerCase().replace(/[^a-z0-9]/g, '')
      : `user${userId.substring(2, 8).toLowerCase()}`;
    
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const affiliateCode = `${baseCode}_${randomSuffix}`;

    // If profile exists, update it
    if (profile) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ affiliate_code: affiliateCode })
        .ilike('wallet_address', userId.toLowerCase());

      if (updateError) {
        console.error('Error updating affiliate code:', updateError);
        return { success: false, error: updateError.message };
      }
    }

    return { success: true, data: affiliateCode };
  } catch (err) {
    console.error('Exception with affiliate code:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Look up user by affiliate code
export async function getUserByAffiliateCode(affiliateCode: string): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('affiliate_code', affiliateCode.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error fetching user by affiliate code:', error);
      return { success: false, error: error.message };
    }

    return { success: !!data, data: data || undefined };
  } catch (err) {
    console.error('Exception fetching user by affiliate code:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
} 