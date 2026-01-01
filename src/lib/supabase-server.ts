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
    const simplifiedBet: Record<string, any> = {
      user_id: bet.user_id,
      market_id: bet.market_id,
      outcome: bet.outcome,
      amount: bet.amount,
      odds_shown_to_user: bet.odds_shown_to_user,
      potential_payout: bet.potential_payout || null,
      execution_price: bet.execution_price || null,
      status: bet.status || 'pending',
      tx_hash: bet.tx_hash, // CRITICAL: Include transaction hash for idempotency
      // Affiliate tracking fields
      referrer_bet_id: bet.referrer_bet_id || null,
      referrer_user_id: bet.referrer_user_id || null,
    };
    
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
    
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', userId)
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

// User profile type for social info
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
}

// Helper function to get user profile by wallet address
export async function getUserProfileByWallet(walletAddress: string): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Server-side Supabase client not initialized' };
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    // Also try with original case if not found
    if (!data && !error?.message?.includes('multiple')) {
      const { data: dataOriginal, error: errorOriginal } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();
      
      if (dataOriginal) {
        return { success: true, data: dataOriginal };
      }
    }

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching user profile:', error);
      return { success: false, error: error.message };
    }

    return { success: !!data, data: data || undefined };
  } catch (err) {
    console.error('Exception fetching user profile:', err);
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
    
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('referrer_user_id', userId)
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