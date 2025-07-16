import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_KEY!

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

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
    const { data, error } = await supabase
      .from('bets')
      .insert([bet])
      .select()
      .single()

    if (error) {
      console.error('Error inserting bet:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Exception inserting bet:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Helper function to get user's betting history
export async function getUserBets(userId: string, limit: number = 10): Promise<{ success: boolean; data?: BetRecord[]; error?: string }> {
  try {
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