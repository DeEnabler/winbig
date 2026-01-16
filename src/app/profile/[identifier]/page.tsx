// src/app/profile/[identifier]/page.tsx
import { Suspense } from 'react';
import { Metadata } from 'next';
import {
  getUserProfileByWallet,
  getUserProfileByUsername,
  getUserBets,
  getAffiliateEarningsSummary,
  BetRecord,
} from '@/lib/supabase-server';
import ProfileClient from '@/components/profile/ProfileClient';
import PolymarketProfileClient from '@/components/profile/PolymarketProfileClient';
import type { ProfileData } from '@/app/api/profile/[identifier]/route';

export const dynamic = 'force-dynamic';

// Check if identifier looks like a Polymarket profile request
function isPolymarketRequest(identifier: string): boolean {
  // Polymarket profiles: @username format that's not in our database
  // or explicit polymarket: prefix
  return identifier.startsWith('polymarket:') || identifier.startsWith('pm:');
}

interface PageProps {
  params: Promise<{ identifier: string }>;
}

function isWalletAddress(identifier: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(identifier);
}

async function getProfileData(identifier: string): Promise<{ data: ProfileData | null; error: string | null }> {
  try {
    let profile = null;
    let walletAddress: string | null = null;

    // Determine if it's a wallet address or username
    if (isWalletAddress(identifier)) {
      walletAddress = identifier.toLowerCase();
      const result = await getUserProfileByWallet(walletAddress);
      if (result.success && result.data) {
        profile = result.data;
      }
    } else {
      const username = identifier.startsWith('@') ? identifier.substring(1) : identifier;
      const result = await getUserProfileByUsername(username);
      if (result.success && result.data) {
        profile = result.data;
        walletAddress = result.data.wallet_address || null;
      }
    }

    // If no profile and no wallet address, return not found
    if (!profile && !walletAddress) {
      return { data: null, error: 'User not found' };
    }

    // Get wallet address from profile if not set
    if (!walletAddress && profile?.wallet_address) {
      walletAddress = profile.wallet_address;
    }

    // Fetch betting data
    let bets: BetRecord[] = [];
    if (walletAddress) {
      const betsResult = await getUserBets(walletAddress, 100);
      bets = betsResult.data || [];
    }

    // Fetch affiliate data
    let affiliateData = { total_earnings: 0, total_referrals: 0 };
    if (walletAddress) {
      const affiliateResult = await getAffiliateEarningsSummary(walletAddress);
      if (affiliateResult.success && affiliateResult.data) {
        affiliateData = {
          total_earnings: affiliateResult.data.total_earnings,
          total_referrals: affiliateResult.data.total_referrals,
        };
      }
    }

    // Calculate stats
    const executedBets = bets.filter(b => b.status === 'executed');
    const pendingBetsList = bets.filter(b => b.status === 'pending');
    const winningBets = executedBets.filter(b => b.success === true);
    const losingBets = executedBets.filter(b => b.success === false);

    const totalWagered = bets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalWon = winningBets.reduce((sum, b) => sum + (b.shares_received || b.potential_payout || 0), 0);
    const totalLost = losingBets.reduce((sum, b) => sum + (b.amount || 0), 0);

    const netPnL = totalWon - totalLost;
    const netPnLPercent = totalWagered > 0 ? (netPnL / totalWagered) * 100 : 0;

    const pendingAmount = pendingBetsList.reduce((sum, b) => sum + (b.amount || 0), 0);
    const portfolioValue = pendingAmount + Math.max(0, netPnL);

    // Time-based PnL
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
      todayPnL: calculatePnLForPeriod(todayStart),
      weekPnL: calculatePnLForPeriod(weekStart),
      monthPnL: calculatePnLForPeriod(monthStart),
      currentStreak,
      bestStreak,
      recentBets: bets.slice(0, 20),
      identifier,
      walletAddress,
    };

    return { data: profileData, error: null };
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return { data: null, error: 'Failed to load profile' };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { identifier } = await params;
  const decodedIdentifier = decodeURIComponent(identifier);
  
  // Check if Polymarket profile
  if (isPolymarketRequest(decodedIdentifier)) {
    const polymarketId = decodedIdentifier.replace(/^(polymarket:|pm:)/, '');
    return {
      title: `${polymarketId} | Polymarket Profile`,
      description: `View ${polymarketId}'s Polymarket positions and trading activity.`,
    };
  }
  
  // Try to get profile for better metadata
  const { data } = await getProfileData(decodedIdentifier);
  
  // If no local data and looks like username, assume Polymarket
  if (!data && !decodedIdentifier.startsWith('0x')) {
    const cleanId = decodedIdentifier.startsWith('@') ? decodedIdentifier.substring(1) : decodedIdentifier;
    return {
      title: `@${cleanId} | Polymarket Profile`,
      description: `View @${cleanId}'s Polymarket positions and trading activity.`,
    };
  }
  
  const displayName = data?.profile?.x_name || data?.profile?.x_username || decodedIdentifier;
  const username = data?.profile?.x_username;
  
  return {
    title: `${displayName} | WinBig Profile`,
    description: username 
      ? `View @${username}'s betting profile, positions, and performance on WinBig.`
      : `View ${displayName}'s betting profile on WinBig.`,
    openGraph: {
      title: `${displayName} on WinBig`,
      description: data 
        ? `${data.totalBets} bets | ${data.winRate.toFixed(0)}% win rate | ${data.netPnL >= 0 ? '+' : ''}$${data.netPnL.toFixed(2)} P&L`
        : 'View betting profile on WinBig',
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { identifier } = await params;
  const decodedIdentifier = decodeURIComponent(identifier);
  
  // Check if this is an explicit Polymarket profile request
  if (isPolymarketRequest(decodedIdentifier)) {
    const polymarketId = decodedIdentifier.replace(/^(polymarket:|pm:)/, '');
    return (
      <Suspense fallback={<ProfileLoadingFallback />}>
        <PolymarketProfileClient identifier={polymarketId} />
      </Suspense>
    );
  }

  // Try to get local profile first
  const { data, error } = await getProfileData(decodedIdentifier);

  // If no local profile found and it looks like a username, try Polymarket
  if (!data && !decodedIdentifier.startsWith('0x')) {
    // Could be a Polymarket username - show Polymarket profile
    return (
      <Suspense fallback={<ProfileLoadingFallback />}>
        <PolymarketProfileClient identifier={decodedIdentifier} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ProfileLoadingFallback />}>
      <ProfileClient
        initialData={data}
        initialError={error}
        identifier={decodedIdentifier}
      />
    </Suspense>
  );
}

function ProfileLoadingFallback() {
  return (
    <div className="container mx-auto py-6 md:py-10 max-w-5xl">
      <div className="space-y-6">
        <div className="animate-pulse rounded-2xl bg-muted h-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-muted h-28" />
          ))}
        </div>
        <div className="animate-pulse rounded-xl bg-muted h-64" />
      </div>
    </div>
  );
}
