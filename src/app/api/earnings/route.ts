// src/app/api/earnings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserBets, 
  getReferralStats, 
  getAffiliateEarningsSummary,
  getRecentAffiliateEarnings,
  getOrCreateAffiliateCode,
  BetRecord,
  AffiliateEarning,
} from '@/lib/supabase-server';

export interface EarningsStats {
  // Overall balance
  totalBalance: number;
  availableBalance: number;
  pendingBalance: number;
  
  // Betting performance
  totalBets: number;
  winningBets: number;
  losingBets: number;
  pendingBets: number;
  winRate: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netPnL: number;
  
  // Referral earnings (from affiliate_earnings table - 2-layer system)
  referralEarnings: number;
  tier1Earnings: number;        // Direct referral earnings (8%)
  tier2Earnings: number;        // Sub-referral earnings (2%)
  pendingReferralEarnings: number;
  availableReferralEarnings: number;
  withdrawnReferralEarnings: number;
  totalReferrals: number;
  tier1Referrals: number;       // Direct referrals count
  tier2Referrals: number;       // Sub-referrals count
  referredVolume: number;
  
  // Recent activity
  recentBets: BetRecord[];
  recentReferrals: BetRecord[];
  recentAffiliateEarnings: AffiliateEarning[];
  
  // Time-based stats
  todayPnL: number;
  weekPnL: number;
  monthPnL: number;
  
  // Streak info
  currentStreak: number;
  bestStreak: number;
  
  // User's affiliate info
  affiliateCode?: string;
  affiliateUrl?: string;
}

/**
 * GET /api/earnings?user_id=0x...
 * 
 * Fetches comprehensive earnings and stats for a user.
 * Includes real 2-layer affiliate earnings from the affiliate_earnings table.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing user_id parameter' },
        { status: 400 }
      );
    }
    
    console.log('📊 Fetching earnings for user:', userId);
    
    // Fetch user's bets
    const betsResult = await getUserBets(userId, 100);
    const bets = betsResult.data || [];
    
    // Fetch referral stats (old method - for referred volume)
    const referralResult = await getReferralStats(userId);
    const referralData = referralResult.data || { total_referrals: 0, total_referred_volume: 0, referrals: [] };
    
    // Fetch REAL affiliate earnings from the affiliate_earnings table (2-layer system)
    const affiliateEarningsResult = await getAffiliateEarningsSummary(userId);
    const affiliateData = affiliateEarningsResult.data || {
      total_earnings: 0,
      tier1_earnings: 0,
      tier2_earnings: 0,
      pending_earnings: 0,
      available_earnings: 0,
      withdrawn_earnings: 0,
      total_referrals: 0,
      tier1_referrals: 0,
      tier2_referrals: 0,
    };
    
    // Fetch recent affiliate earnings
    const recentAffiliateResult = await getRecentAffiliateEarnings(userId, 10);
    const recentAffiliateEarnings = recentAffiliateResult.data || [];
    
    // Get or create user's affiliate code
    const affiliateCodeResult = await getOrCreateAffiliateCode(userId);
    const affiliateCode = affiliateCodeResult.data;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun';
    const affiliateUrl = affiliateCode ? `${appUrl}/ref/${affiliateCode}` : undefined;
    
    // Calculate betting stats
    const executedBets = bets.filter(b => b.status === 'executed');
    const pendingBetsList = bets.filter(b => b.status === 'pending');
    const winningBets = executedBets.filter(b => b.success === true);
    const losingBets = executedBets.filter(b => b.success === false);
    
    const totalWagered = bets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalWon = winningBets.reduce((sum, b) => sum + (b.shares_received || b.potential_payout || 0), 0);
    const totalLost = losingBets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const pendingAmount = pendingBetsList.reduce((sum, b) => sum + (b.amount || 0), 0);
    
    // Calculate PnL
    const netPnL = totalWon - totalLost;
    
    // Use REAL affiliate earnings from the ledger table
    const referralEarnings = affiliateData.total_earnings;
    
    // Calculate time-based PnL
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const calculatePnLForPeriod = (startDate: Date): number => {
      return executedBets
        .filter(b => new Date(b.created_at || '') >= startDate)
        .reduce((sum, b) => {
          if (b.success) {
            return sum + (b.shares_received || b.potential_payout || 0) - (b.amount || 0);
          } else {
            return sum - (b.amount || 0);
          }
        }, 0);
    };
    
    const todayPnL = calculatePnLForPeriod(todayStart);
    const weekPnL = calculatePnLForPeriod(weekStart);
    const monthPnL = calculatePnLForPeriod(monthStart);
    
    // Calculate streaks (simplified - consecutive wins)
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    const sortedBets = [...executedBets].sort((a, b) => 
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
    
    for (const bet of sortedBets) {
      if (bet.success) {
        tempStreak++;
        if (currentStreak === 0) currentStreak = tempStreak;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        if (currentStreak === 0) currentStreak = 0; // First non-win ends current streak
        tempStreak = 0;
      }
    }
    
    // Build response with comprehensive affiliate data
    const stats: EarningsStats = {
      totalBalance: netPnL + referralEarnings,
      availableBalance: Math.max(0, netPnL + affiliateData.available_earnings - pendingAmount),
      pendingBalance: pendingAmount + affiliateData.pending_earnings,
      
      totalBets: bets.length,
      winningBets: winningBets.length,
      losingBets: losingBets.length,
      pendingBets: pendingBetsList.length,
      winRate: executedBets.length > 0 ? (winningBets.length / executedBets.length) * 100 : 0,
      totalWagered,
      totalWon,
      totalLost,
      netPnL,
      
      // Real 2-layer affiliate earnings
      referralEarnings,
      tier1Earnings: affiliateData.tier1_earnings,
      tier2Earnings: affiliateData.tier2_earnings,
      pendingReferralEarnings: affiliateData.pending_earnings,
      availableReferralEarnings: affiliateData.available_earnings,
      withdrawnReferralEarnings: affiliateData.withdrawn_earnings,
      totalReferrals: affiliateData.total_referrals,
      tier1Referrals: affiliateData.tier1_referrals,
      tier2Referrals: affiliateData.tier2_referrals,
      referredVolume: referralData.total_referred_volume,
      
      recentBets: bets.slice(0, 10),
      recentReferrals: referralData.referrals.slice(0, 5),
      recentAffiliateEarnings,
      
      todayPnL,
      weekPnL,
      monthPnL,
      
      currentStreak,
      bestStreak,
      
      // User's affiliate link info
      affiliateCode,
      affiliateUrl,
    };
    
    console.log('✅ Earnings stats calculated:', {
      totalBalance: stats.totalBalance,
      totalBets: stats.totalBets,
      winRate: stats.winRate.toFixed(1) + '%',
      referralEarnings: stats.referralEarnings,
      tier1Earnings: stats.tier1Earnings,
      tier2Earnings: stats.tier2Earnings,
    });
    
    return NextResponse.json({
      success: true,
      data: stats,
    });
    
  } catch (error) {
    console.error('❌ Error fetching earnings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}
