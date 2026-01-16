// src/app/api/profile/[identifier]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getUserProfileByWallet,
  getUserProfileByUsername,
  getUserBets,
  getAffiliateEarningsSummary,
  BetRecord,
  UserProfile,
} from '@/lib/supabase-server';

export interface ProfileData {
  // User info
  profile: UserProfile | null;
  isVerified: boolean; // Has linked X account
  
  // Betting stats
  totalBets: number;
  winningBets: number;
  losingBets: number;
  pendingBets: number;
  winRate: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netPnL: number;
  netPnLPercent: number;
  
  // Portfolio
  portfolioValue: number;
  
  // Affiliate stats
  referralEarnings: number;
  totalReferrals: number;
  
  // Time-based P&L
  todayPnL: number;
  weekPnL: number;
  monthPnL: number;
  
  // Streaks
  currentStreak: number;
  bestStreak: number;
  
  // Recent activity
  recentBets: BetRecord[];
  
  // Identifier used
  identifier: string;
  walletAddress: string | null;
}

function isWalletAddress(identifier: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(identifier);
}

/**
 * GET /api/profile/[identifier]
 * 
 * Fetches profile data for a user by username or wallet address.
 * Supports:
 * - @username (X/Twitter username)
 * - 0x... (wallet address)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params;
    
    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Missing identifier parameter' },
        { status: 400 }
      );
    }

    console.log('👤 Fetching profile for identifier:', identifier);

    let profile: UserProfile | null = null;
    let walletAddress: string | null = null;

    // Determine if it's a wallet address or username
    if (isWalletAddress(identifier)) {
      // It's a wallet address
      walletAddress = identifier.toLowerCase();
      const result = await getUserProfileByWallet(walletAddress);
      if (result.success && result.data) {
        profile = result.data;
      }
    } else {
      // It's a username (remove @ if present)
      const username = identifier.startsWith('@') ? identifier.substring(1) : identifier;
      const result = await getUserProfileByUsername(username);
      if (result.success && result.data) {
        profile = result.data;
        walletAddress = result.data.wallet_address || null;
      }
    }

    // If no profile found but we have a wallet address, we can still show betting data
    if (!profile && !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get wallet address from profile if not already set
    if (!walletAddress && profile?.wallet_address) {
      walletAddress = profile.wallet_address;
    }

    // Fetch betting data if we have a wallet address
    let bets: BetRecord[] = [];
    if (walletAddress) {
      const betsResult = await getUserBets(walletAddress, 100);
      bets = betsResult.data || [];
    }

    // Fetch affiliate earnings if we have a wallet address
    let affiliateData = {
      total_earnings: 0,
      total_referrals: 0,
    };
    if (walletAddress) {
      const affiliateResult = await getAffiliateEarningsSummary(walletAddress);
      if (affiliateResult.success && affiliateResult.data) {
        affiliateData = {
          total_earnings: affiliateResult.data.total_earnings,
          total_referrals: affiliateResult.data.total_referrals,
        };
      }
    }

    // Calculate betting stats
    const executedBets = bets.filter(b => b.status === 'executed');
    const pendingBetsList = bets.filter(b => b.status === 'pending');
    const winningBets = executedBets.filter(b => b.success === true);
    const losingBets = executedBets.filter(b => b.success === false);

    const totalWagered = bets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalWon = winningBets.reduce((sum, b) => sum + (b.shares_received || b.potential_payout || 0), 0);
    const totalLost = losingBets.reduce((sum, b) => sum + (b.amount || 0), 0);

    // Calculate P&L
    const netPnL = totalWon - totalLost;
    const netPnLPercent = totalWagered > 0 ? (netPnL / totalWagered) * 100 : 0;

    // Estimate portfolio value (pending bets + unrealized gains)
    const pendingAmount = pendingBetsList.reduce((sum, b) => sum + (b.amount || 0), 0);
    const portfolioValue = pendingAmount + Math.max(0, netPnL);

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

    // Calculate streaks
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
        if (currentStreak === 0) currentStreak = 0;
        tempStreak = 0;
      }
    }

    // Build response
    const profileData: ProfileData = {
      profile,
      isVerified: !!(profile?.x_user_id),
      
      totalBets: bets.length,
      winningBets: winningBets.length,
      losingBets: losingBets.length,
      pendingBets: pendingBetsList.length,
      winRate: executedBets.length > 0 ? (winningBets.length / executedBets.length) * 100 : 0,
      totalWagered,
      totalWon,
      totalLost,
      netPnL,
      netPnLPercent,
      
      portfolioValue,
      
      referralEarnings: affiliateData.total_earnings,
      totalReferrals: affiliateData.total_referrals,
      
      todayPnL,
      weekPnL,
      monthPnL,
      
      currentStreak,
      bestStreak,
      
      recentBets: bets.slice(0, 20),
      
      identifier,
      walletAddress,
    };

    console.log('✅ Profile data fetched:', {
      identifier,
      hasProfile: !!profile,
      totalBets: profileData.totalBets,
      winRate: profileData.winRate.toFixed(1) + '%',
    });

    return NextResponse.json({
      success: true,
      data: profileData,
    });

  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
