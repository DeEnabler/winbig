// src/lib/bonus-service.ts
// Core bonus system business logic

import { supabase } from './supabase-server';

// ============================================
// TYPES
// ============================================

export interface Bonus {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  bonus_type: 'personal' | 'sharable';
  source: string | null;
  source_gift_id: number | null;
  total_amount: number;
  remaining_amount: number;
  volume_requirement_multiplier: number;
  volume_completed: number;
  pending_profits: number;
  unlocked_profits: number;
  expires_at: string | null;
  status: 'active' | 'exhausted' | 'expired' | 'forfeited';
  ip_address: string | null;
  notes: string | null;
}

export interface BonusGift {
  id: number;
  created_at: string;
  gift_code: string;
  source_bonus_id: number;
  gifter_user_id: string;
  gifter_username: string | null;
  gifter_avatar: string | null;
  recipient_user_id: string | null;
  recipient_bonus_id: number | null;
  amount: number;
  status: 'pending' | 'claimed' | 'expired' | 'revoked';
  claimed_at: string | null;
  expires_at: string;
  claim_ip: string | null;
  notes: string | null;
}

export interface BonusTransaction {
  id: number;
  created_at: string;
  user_id: string;
  bonus_id: number | null;
  transaction_type: 
    | 'credit' 
    | 'debit_bet' 
    | 'debit_gift' 
    | 'gift_received' 
    | 'profit_locked' 
    | 'profit_unlocked'
    | 'expired'
    | 'forfeited';
  amount: number;
  balance_after: number | null;
  bet_id: number | null;
  gift_id: number | null;
  notes: string | null;
}

export interface BonusBalanceSummary {
  total_balance: number;
  personal_balance: number;
  sharable_balance: number;
  pending_profits: number;
  unlocked_profits: number;
  volume_required: number;
  volume_completed: number;
  volume_progress_percent: number;
}

export interface GiftHistoryItem {
  id: number;
  gift_code: string;
  amount: number;
  status: string;
  direction: 'sent' | 'received';
  other_user_id: string | null;
  other_username: string | null;
  created_at: string;
  claimed_at: string | null;
}

// ============================================
// CONSTANTS
// ============================================

export const GIFT_CODE_LENGTH = 8;
export const MIN_GIFT_AMOUNT = 10;
export const MAX_GIFT_AMOUNT = 500;
export const DEFAULT_VOLUME_MULTIPLIER = 30;
export const GIFT_EXPIRY_DAYS = 30;

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateGiftCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
  let code = '';
  for (let i = 0; i < GIFT_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// BONUS BALANCE FUNCTIONS
// ============================================

/**
 * Get comprehensive bonus balance summary for a user
 */
export async function getUserBonusBalance(userId: string): Promise<{
  success: boolean;
  data?: BonusBalanceSummary;
  error?: string;
}> {
  try {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    const normalizedUserId = userId.toLowerCase();

    // Get all active bonuses for user
    const { data: bonuses, error } = await supabase
      .from('bonuses')
      .select('*')
      .ilike('user_id', normalizedUserId)
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.now()');

    if (error) {
      console.error('Error fetching bonuses:', error);
      return { success: false, error: error.message };
    }

    // Calculate totals
    const summary: BonusBalanceSummary = {
      total_balance: 0,
      personal_balance: 0,
      sharable_balance: 0,
      pending_profits: 0,
      unlocked_profits: 0,
      volume_required: 0,
      volume_completed: 0,
      volume_progress_percent: 0,
    };

    for (const bonus of bonuses || []) {
      summary.total_balance += bonus.remaining_amount || 0;
      summary.pending_profits += bonus.pending_profits || 0;
      summary.unlocked_profits += bonus.unlocked_profits || 0;
      summary.volume_required += (bonus.total_amount || 0) * (bonus.volume_requirement_multiplier || DEFAULT_VOLUME_MULTIPLIER);
      summary.volume_completed += bonus.volume_completed || 0;

      if (bonus.bonus_type === 'personal') {
        summary.personal_balance += bonus.remaining_amount || 0;
      } else if (bonus.bonus_type === 'sharable') {
        summary.sharable_balance += bonus.remaining_amount || 0;
      }
    }

    // Calculate progress percentage
    summary.volume_progress_percent = summary.volume_required > 0
      ? Math.min(100, (summary.volume_completed / summary.volume_required) * 100)
      : 0;

    return { success: true, data: summary };
  } catch (err) {
    console.error('Exception in getUserBonusBalance:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get all active bonuses for a user (detailed)
 */
export async function getUserBonuses(userId: string): Promise<{
  success: boolean;
  data?: Bonus[];
  error?: string;
}> {
  try {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    const { data, error } = await supabase
      .from('bonuses')
      .select('*')
      .ilike('user_id', userId.toLowerCase())
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user bonuses:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Exception in getUserBonuses:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================
// BONUS DEDUCTION (FOR BETTING)
// ============================================

/**
 * Deduct bonus for a bet
 * Returns how much bonus was used and which bonus it came from
 */
export async function deductBonusForBet(
  userId: string,
  betAmount: number,
  betId: number
): Promise<{
  success: boolean;
  data?: {
    bonus_used: number;
    cash_required: number;
    source_bonus_id: number | null;
  };
  error?: string;
}> {
  try {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    const normalizedUserId = userId.toLowerCase();

    // Get user's active bonuses, ordered by type (personal first, then sharable)
    // and by expiry (soonest expiring first)
    const { data: bonuses, error: fetchError } = await supabase
      .from('bonuses')
      .select('*')
      .ilike('user_id', normalizedUserId)
      .eq('status', 'active')
      .gt('remaining_amount', 0)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('bonus_type', { ascending: true }) // 'personal' before 'sharable'
      .order('expires_at', { ascending: true, nullsFirst: false });

    if (fetchError) {
      console.error('Error fetching bonuses for bet:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!bonuses || bonuses.length === 0) {
      // No bonus available, full cash required
      return {
        success: true,
        data: {
          bonus_used: 0,
          cash_required: betAmount,
          source_bonus_id: null,
        },
      };
    }

    // Calculate how much bonus to use
    let remainingBetAmount = betAmount;
    let totalBonusUsed = 0;
    let primaryBonusId: number | null = null;

    for (const bonus of bonuses) {
      if (remainingBetAmount <= 0) break;

      const bonusToUse = Math.min(bonus.remaining_amount, remainingBetAmount);
      
      if (bonusToUse > 0) {
        // Update the bonus balance
        const newRemaining = bonus.remaining_amount - bonusToUse;
        const newStatus = newRemaining <= 0 ? 'exhausted' : 'active';

        const { error: updateError } = await supabase
          .from('bonuses')
          .update({
            remaining_amount: newRemaining,
            status: newStatus,
            volume_completed: (bonus.volume_completed || 0) + bonusToUse, // Track volume
          })
          .eq('id', bonus.id);

        if (updateError) {
          console.error('Error updating bonus:', updateError);
          // Continue to try other bonuses
          continue;
        }

        // Record transaction
        await supabase.from('bonus_transactions').insert({
          user_id: normalizedUserId,
          bonus_id: bonus.id,
          transaction_type: 'debit_bet',
          amount: bonusToUse,
          balance_after: newRemaining,
          bet_id: betId,
          notes: `Bet deduction: $${bonusToUse.toFixed(2)}`,
        });

        totalBonusUsed += bonusToUse;
        remainingBetAmount -= bonusToUse;
        
        // Track the first (primary) bonus used
        if (!primaryBonusId) {
          primaryBonusId = bonus.id;
        }
      }
    }

    return {
      success: true,
      data: {
        bonus_used: totalBonusUsed,
        cash_required: Math.max(0, betAmount - totalBonusUsed),
        source_bonus_id: primaryBonusId,
      },
    };
  } catch (err) {
    console.error('Exception in deductBonusForBet:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================
// GIFT FUNCTIONS
// ============================================

/**
 * Create a gift link from user's sharable bonus pool
 */
export async function createBonusGift(
  gifterUserId: string,
  amount: number,
  gifterUsername?: string,
  gifterAvatar?: string
): Promise<{
  success: boolean;
  data?: {
    gift_code: string;
    gift_url: string;
    gift: BonusGift;
  };
  error?: string;
}> {
  try {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    // Validate amount
    if (amount < MIN_GIFT_AMOUNT) {
      return { success: false, error: `Minimum gift amount is $${MIN_GIFT_AMOUNT}` };
    }
    if (amount > MAX_GIFT_AMOUNT) {
      return { success: false, error: `Maximum gift amount is $${MAX_GIFT_AMOUNT}` };
    }

    const normalizedGifterId = gifterUserId.toLowerCase();

    // Get user's sharable bonuses with sufficient balance
    const { data: sharableBonuses, error: fetchError } = await supabase
      .from('bonuses')
      .select('*')
      .ilike('user_id', normalizedGifterId)
      .eq('bonus_type', 'sharable')
      .eq('status', 'active')
      .gte('remaining_amount', amount)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('expires_at', { ascending: true, nullsFirst: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching sharable bonuses:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!sharableBonuses || sharableBonuses.length === 0) {
      return { success: false, error: 'Insufficient sharable bonus balance' };
    }

    const sourceBonus = sharableBonuses[0];

    // Generate unique gift code
    let giftCode = generateGiftCode();
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('bonus_gifts')
        .select('id')
        .eq('gift_code', giftCode)
        .single();

      if (!existing) break;
      giftCode = generateGiftCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return { success: false, error: 'Failed to generate unique gift code' };
    }

    // Deduct from source bonus
    const newRemaining = sourceBonus.remaining_amount - amount;
    const { error: updateError } = await supabase
      .from('bonuses')
      .update({
        remaining_amount: newRemaining,
        status: newRemaining <= 0 ? 'exhausted' : 'active',
      })
      .eq('id', sourceBonus.id);

    if (updateError) {
      console.error('Error updating source bonus:', updateError);
      return { success: false, error: updateError.message };
    }

    // Create gift record
    const { data: gift, error: insertError } = await supabase
      .from('bonus_gifts')
      .insert({
        gift_code: giftCode,
        source_bonus_id: sourceBonus.id,
        gifter_user_id: normalizedGifterId,
        gifter_username: gifterUsername || null,
        gifter_avatar: gifterAvatar || null,
        amount: amount,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating gift:', insertError);
      // Try to restore the bonus
      await supabase
        .from('bonuses')
        .update({ remaining_amount: sourceBonus.remaining_amount, status: 'active' })
        .eq('id', sourceBonus.id);
      return { success: false, error: insertError.message };
    }

    // Record transaction
    await supabase.from('bonus_transactions').insert({
      user_id: normalizedGifterId,
      bonus_id: sourceBonus.id,
      transaction_type: 'debit_gift',
      amount: amount,
      balance_after: newRemaining,
      gift_id: gift.id,
      notes: `Gift created: ${giftCode}`,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun';
    const giftUrl = `${appUrl}/gift/${giftCode}`;

    return {
      success: true,
      data: {
        gift_code: giftCode,
        gift_url: giftUrl,
        gift: gift as BonusGift,
      },
    };
  } catch (err) {
    console.error('Exception in createBonusGift:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get gift details by code (for claim page)
 */
export async function getGiftByCode(giftCode: string): Promise<{
  success: boolean;
  data?: BonusGift;
  error?: string;
}> {
  try {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    const { data, error } = await supabase
      .from('bonus_gifts')
      .select('*')
      .eq('gift_code', giftCode.toUpperCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Gift not found' };
      }
      console.error('Error fetching gift:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as BonusGift };
  } catch (err) {
    console.error('Exception in getGiftByCode:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Claim a bonus gift
 */
export async function claimBonusGift(
  giftCode: string,
  recipientUserId: string,
  claimIp?: string
): Promise<{
  success: boolean;
  data?: {
    bonus: Bonus;
    gift: BonusGift;
  };
  error?: string;
}> {
  try {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    const normalizedRecipientId = recipientUserId.toLowerCase();

    // Get the gift
    const { data: gift, error: giftError } = await supabase
      .from('bonus_gifts')
      .select('*')
      .eq('gift_code', giftCode.toUpperCase())
      .single();

    if (giftError || !gift) {
      return { success: false, error: 'Gift not found' };
    }

    // Validate gift status
    if (gift.status === 'claimed') {
      return { success: false, error: 'This gift has already been claimed' };
    }
    if (gift.status === 'expired') {
      return { success: false, error: 'This gift has expired' };
    }
    if (gift.status === 'revoked') {
      return { success: false, error: 'This gift has been revoked' };
    }
    if (new Date(gift.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('bonus_gifts')
        .update({ status: 'expired' })
        .eq('id', gift.id);
      return { success: false, error: 'This gift has expired' };
    }

    // Prevent self-claim
    if (gift.gifter_user_id.toLowerCase() === normalizedRecipientId) {
      return { success: false, error: 'You cannot claim your own gift' };
    }

    // Create a new personal bonus for recipient
    const { data: newBonus, error: bonusError } = await supabase
      .from('bonuses')
      .insert({
        user_id: normalizedRecipientId,
        bonus_type: 'personal', // Gifted bonuses become personal (non-transferable)
        source: 'gift_received',
        source_gift_id: gift.id,
        total_amount: gift.amount,
        remaining_amount: gift.amount,
        volume_requirement_multiplier: DEFAULT_VOLUME_MULTIPLIER,
        volume_completed: 0,
        pending_profits: 0,
        unlocked_profits: 0,
        ip_address: claimIp || null,
        notes: `Gift from ${gift.gifter_username || gift.gifter_user_id.slice(0, 10)}`,
      })
      .select()
      .single();

    if (bonusError) {
      console.error('Error creating bonus for recipient:', bonusError);
      return { success: false, error: bonusError.message };
    }

    // Update gift status
    const { data: updatedGift, error: updateError } = await supabase
      .from('bonus_gifts')
      .update({
        status: 'claimed',
        recipient_user_id: normalizedRecipientId,
        recipient_bonus_id: newBonus.id,
        claimed_at: new Date().toISOString(),
        claim_ip: claimIp || null,
      })
      .eq('id', gift.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating gift status:', updateError);
      // Don't fail - bonus was created
    }

    // Record transactions
    await supabase.from('bonus_transactions').insert([
      {
        user_id: normalizedRecipientId,
        bonus_id: newBonus.id,
        transaction_type: 'credit',
        amount: gift.amount,
        balance_after: gift.amount,
        gift_id: gift.id,
        notes: `Gift claimed from ${gift.gifter_username || 'anonymous'}`,
      },
      {
        user_id: normalizedRecipientId,
        bonus_id: newBonus.id,
        transaction_type: 'gift_received',
        amount: gift.amount,
        balance_after: gift.amount,
        gift_id: gift.id,
        notes: `Received gift: ${giftCode}`,
      },
    ]);

    return {
      success: true,
      data: {
        bonus: newBonus as Bonus,
        gift: (updatedGift || gift) as BonusGift,
      },
    };
  } catch (err) {
    console.error('Exception in claimBonusGift:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get user's gift history
 */
export async function getUserGiftHistory(
  userId: string,
  limit: number = 20
): Promise<{
  success: boolean;
  data?: GiftHistoryItem[];
  error?: string;
}> {
  try {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    const normalizedUserId = userId.toLowerCase();

    const { data, error } = await supabase
      .from('bonus_gifts')
      .select('*')
      .or(`gifter_user_id.ilike.${normalizedUserId},recipient_user_id.ilike.${normalizedUserId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching gift history:', error);
      return { success: false, error: error.message };
    }

    const history: GiftHistoryItem[] = (data || []).map((gift) => ({
      id: gift.id,
      gift_code: gift.gift_code,
      amount: gift.amount,
      status: gift.status,
      direction: gift.gifter_user_id.toLowerCase() === normalizedUserId ? 'sent' : 'received',
      other_user_id: gift.gifter_user_id.toLowerCase() === normalizedUserId 
        ? gift.recipient_user_id 
        : gift.gifter_user_id,
      other_username: gift.gifter_user_id.toLowerCase() === normalizedUserId 
        ? null 
        : gift.gifter_username,
      created_at: gift.created_at,
      claimed_at: gift.claimed_at,
    }));

    return { success: true, data: history };
  } catch (err) {
    console.error('Exception in getUserGiftHistory:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================
// VOLUME & PROFIT TRACKING
// ============================================

/**
 * Lock profit from a bonus-funded winning bet
 */
export async function lockBonusProfit(
  userId: string,
  bonusId: number,
  profitAmount: number,
  betId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    const { data: bonus, error: fetchError } = await supabase
      .from('bonuses')
      .select('pending_profits')
      .eq('id', bonusId)
      .single();

    if (fetchError) {
      console.error('Error fetching bonus for profit lock:', fetchError);
      return { success: false, error: fetchError.message };
    }

    const newPendingProfits = (bonus?.pending_profits || 0) + profitAmount;

    const { error: updateError } = await supabase
      .from('bonuses')
      .update({ pending_profits: newPendingProfits })
      .eq('id', bonusId);

    if (updateError) {
      console.error('Error locking profit:', updateError);
      return { success: false, error: updateError.message };
    }

    // Record transaction
    await supabase.from('bonus_transactions').insert({
      user_id: userId.toLowerCase(),
      bonus_id: bonusId,
      transaction_type: 'profit_locked',
      amount: profitAmount,
      balance_after: newPendingProfits,
      bet_id: betId,
      notes: `Profit locked: $${profitAmount.toFixed(2)}`,
    });

    return { success: true };
  } catch (err) {
    console.error('Exception in lockBonusProfit:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Check and unlock profits if volume requirement is met
 */
export async function checkAndUnlockProfits(userId: string): Promise<{
  success: boolean;
  data?: {
    unlocked_amount: number;
    bonuses_unlocked: number;
  };
  error?: string;
}> {
  try {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    const normalizedUserId = userId.toLowerCase();

    // Get all active bonuses with pending profits
    const { data: bonuses, error: fetchError } = await supabase
      .from('bonuses')
      .select('*')
      .ilike('user_id', normalizedUserId)
      .eq('status', 'active')
      .gt('pending_profits', 0);

    if (fetchError) {
      console.error('Error fetching bonuses for unlock:', fetchError);
      return { success: false, error: fetchError.message };
    }

    let totalUnlocked = 0;
    let bonusesUnlocked = 0;

    for (const bonus of bonuses || []) {
      const volumeRequired = bonus.total_amount * bonus.volume_requirement_multiplier;
      
      if (bonus.volume_completed >= volumeRequired) {
        // Volume requirement met! Unlock profits
        const profitToUnlock = bonus.pending_profits;
        
        const { error: updateError } = await supabase
          .from('bonuses')
          .update({
            pending_profits: 0,
            unlocked_profits: (bonus.unlocked_profits || 0) + profitToUnlock,
          })
          .eq('id', bonus.id);

        if (updateError) {
          console.error('Error unlocking profits:', updateError);
          continue;
        }

        // Record transaction
        await supabase.from('bonus_transactions').insert({
          user_id: normalizedUserId,
          bonus_id: bonus.id,
          transaction_type: 'profit_unlocked',
          amount: profitToUnlock,
          balance_after: (bonus.unlocked_profits || 0) + profitToUnlock,
          notes: `Profit unlocked after meeting ${bonus.volume_requirement_multiplier}x volume requirement`,
        });

        totalUnlocked += profitToUnlock;
        bonusesUnlocked++;
      }
    }

    return {
      success: true,
      data: {
        unlocked_amount: totalUnlocked,
        bonuses_unlocked: bonusesUnlocked,
      },
    };
  } catch (err) {
    console.error('Exception in checkAndUnlockProfits:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Update volume tracking after a bet (regardless of win/loss)
 */
export async function updateBonusVolume(
  bonusId: number,
  betAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Database not initialized' };
    }

    const { data: bonus, error: fetchError } = await supabase
      .from('bonuses')
      .select('volume_completed')
      .eq('id', bonusId)
      .single();

    if (fetchError) {
      console.error('Error fetching bonus for volume update:', fetchError);
      return { success: false, error: fetchError.message };
    }

    const { error: updateError } = await supabase
      .from('bonuses')
      .update({
        volume_completed: (bonus?.volume_completed || 0) + betAmount,
      })
      .eq('id', bonusId);

    if (updateError) {
      console.error('Error updating volume:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception in updateBonusVolume:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
