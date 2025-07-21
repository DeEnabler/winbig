import { createClient, SupabaseClient } from '@supabase/supabase-js'

console.log('🔧 Initializing Supabase client...');

// For client-side (browser) usage, we only need NEXT_PUBLIC_ prefixed variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🌐 NEXT_PUBLIC_SUPABASE_URL exists:', !!supabaseUrl);
console.log('🔑 NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);

let supabase: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not found - betting backend disabled');
  console.warn('💡 To enable betting backend, add these environment variables in Vercel:');
  console.warn('   NEXT_PUBLIC_SUPABASE_URL');
  console.warn('   NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.warn('🎯 Wallet functionality will still work for testing purposes');
} else {
  console.log('✅ Supabase environment variables found, creating client...');
  console.log('🔧 Using URL:', supabaseUrl);
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client created successfully');
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
  timestamp?: string
  status: 'pending' | 'executed' | 'failed' | 'cancelled'
  
  // Backend fields (filled by hedger)
  execution_price?: number | null
  execution_timestamp?: string | null
  shares_received?: number | null
  gas_fee_pol?: number | null
  gas_fee_usd?: number | null
  tx_hash?: string | null
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
      console.error('❌ Supabase client not initialized - check environment variables');
      return { success: false, error: 'Supabase client not initialized - check environment variables' };
    }
    
    console.log('🔧 Supabase client configured and ready');
    
    // Create a bet record that matches the current table structure
    const simplifiedBet = {
      user_id: bet.user_id,
      market_id: bet.market_id,
      outcome: bet.outcome,
      amount: bet.amount,
      odds_shown_to_user: bet.odds_shown_to_user,
      execution_price: bet.execution_price || null,
      status: bet.status || 'pending'
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
      return { success: false, error: 'Supabase client not initialized' };
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

// Helper function to update bet execution details
export async function updateBetExecution(betId: number, executionData: Partial<BetRecord>): Promise<{ success: boolean; data?: BetRecord; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
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
      return { success: false, error: 'Supabase client not initialized' };
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

// Real-time subscription for bet updates
export function subscribeToBetUpdates(userId: string, callback: (bet: BetRecord) => void) {
  if (!supabase) {
    console.error('❌ Cannot subscribe to bet updates - Supabase client not initialized');
    return { unsubscribe: () => {} }; // Return dummy subscription
  }
  
  return supabase
    .channel('bet-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'bets',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as BetRecord)
        }
      }
    )
    .subscribe()
} 