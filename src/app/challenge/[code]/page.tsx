// src/app/challenge/[code]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getBetById, getUserProfileByWallet, supabase } from '@/lib/supabase-server';
import { getMarketDetails } from '@/lib/marketService';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import { isValidShareCode } from '@/lib/shareCode';

type ChallengePageProps = {
  params: Promise<{ code: string }>;
};

// Generate dynamic OG metadata
export async function generateMetadata(
  { params }: ChallengePageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const { code } = resolvedParams;

  if (!isValidShareCode(code)) {
    return {
      title: 'Invalid Link - WinBig',
      description: 'This share link is invalid.',
    };
  }

  if (!supabase) return {};

  // Centralized lookup via prediction_shares table
  const { data: share, error: shareError } = await supabase
    .from('prediction_shares')
    .select('*')
    .eq('share_code', code)
    .eq('is_active', true)
    .single();
  
  if (shareError || !share) {
    return {
      title: 'Link Not Found - WinBig',
      description: 'This share link could not be found.',
    };
  }

  // Get associated bet if any
  let bet = null;
  if (share.bet_id) {
    const betResult = await getBetById(share.bet_id);
    bet = betResult.success ? betResult.data : null;
  }

  const marketId = share.market_id;
  const market = await getMarketDetails(marketId);
  const predictionText = market?.question || 'A WinBig Prediction';
  const outcome = share.predicted_outcome || 'YES';
  const userId = share.user_id;

  // Fetch user's social profile for OG metadata (latest from user_profiles)
  let userProfile = null;
  if (userId) {
    const profileResult = await getUserProfileByWallet(userId);
    if (profileResult.success && profileResult.data) {
      userProfile = profileResult.data;
    }
  }

  // Use social username if available - NEVER expose wallet addresses
  const displayName = userProfile?.x_username 
    ? `@${userProfile.x_username}`
    : userProfile?.x_name 
      ? userProfile.x_name
      : 'A WinBig Predictor';
  
  const shortWallet = displayName;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun';
  const ogImageUrl = new URL(`${appUrl}/api/og`);
  
  ogImageUrl.searchParams.set('v', Date.now().toString());
  ogImageUrl.searchParams.set('predictionText', predictionText);
  ogImageUrl.searchParams.set('userChoice', outcome);
  ogImageUrl.searchParams.set('username', shortWallet);
  ogImageUrl.searchParams.set('outcome', 'CHALLENGE');
  ogImageUrl.searchParams.set('ogType', 'match_challenge');
  
  if (bet?.amount) {
    ogImageUrl.searchParams.set('betAmount', bet.amount.toString());
  }

  // Snappy, ego-inducing, click-bait copy 🔥
  let title: string;
  let description: string;
  
  // Shorten the prediction for titles (keep it punchy)
  const shortPrediction = predictionText.length > 60 
    ? predictionText.substring(0, 57) + '...' 
    : predictionText;
  
  if (bet) {
    title = `💰 $${bet.amount} says ${outcome}: ${shortPrediction}`;
    description = `Think I'm wrong? Prove it. 👀`;
  } else {
    title = `🎯 ${outcome}: ${shortPrediction}`;
    description = `I called it. Can you? 🔥`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl.toString(), width: 1200, height: 630, alt: `WinBig: ${predictionText}` }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl.toString()],
    },
  };
}

// Main page component
export default async function ChallengePage({ params }: ChallengePageProps) {
  const resolvedParams = await params;
  const { code } = resolvedParams;

  if (!isValidShareCode(code)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Invalid Share Link</h1>
        <p className="text-muted-foreground">This share link format is not valid.</p>
      </div>
    );
  }

  if (!supabase) return null;

  // Centralized lookup via prediction_shares table
  const { data: share, error: shareError } = await supabase
    .from('prediction_shares')
    .select('*')
    .eq('share_code', code)
    .eq('is_active', true)
    .single();
  
  if (shareError || !share) {
    notFound();
  }

  // Get associated bet if any
  let bet = null;
  if (share.bet_id) {
    const betResult = await getBetById(share.bet_id);
    bet = betResult.success ? betResult.data : null;
  }

  // SMART LOOKUP: If we only found a prediction share, check if this user 
  // has actually placed a bet on this market so we can show the real amount.
  if (!bet && share) {
    console.log('🔍 Smart Lookup: Link is prediction-only, checking for associated bet...');
    const { data: latestBet } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', share.user_id)
      .eq('market_id', share.market_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (latestBet) {
      console.log('✅ Smart Lookup: Found real bet to display:', latestBet.amount);
      bet = latestBet;
    }
  }

  const marketId = share.market_id;
  const market = await getMarketDetails(marketId);

  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Market Not Found</h1>
        <p className="text-muted-foreground">The market for this prediction could not be found.</p>
      </div>
    );
  }

  const outcome = share.predicted_outcome || 'YES';
  const userId = share.user_id;
  
  // Fetch user's social profile (latest from user_profiles)
  let userProfile = null;
  if (userId) {
    const profileResult = await getUserProfileByWallet(userId);
    if (profileResult.success && profileResult.data) {
      userProfile = profileResult.data;
    }
  }

  // Priority: 1. X username with @, 2. X display name, 3. Wallet prefix (never expose full wallet)
  const referrerName = userProfile?.x_username 
    ? `@${userProfile.x_username}`
    : userProfile?.x_name 
      ? userProfile.x_name
      : userId 
        ? `User ${userId.substring(0, 6)}...` // Show start of wallet if no name
        : 'A WinBig Predictor';
  
  const referrerAvatar = userProfile?.x_avatar || null;
  const matchId = `share_${code}`;

  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-4">An error occurred displaying the challenge.</p>}>
      <div className="flex flex-col items-center py-6 md:py-8">
        <Suspense fallback={<div className="w-full h-96 flex items-center justify-center"><LoadingSpinner message="Loading Challenge..." /></div>}>
          <div className="w-full max-w-md mx-auto px-4">
            <ChallengeInvite
              matchId={matchId}
              referrerName={referrerName}
              referrerAvatar={referrerAvatar}
              isVerified={!!userProfile?.x_username}
              predictionQuestion={market.question}
              predictionId={market.id}
              referrerOriginalChoice={outcome as 'YES' | 'NO'}
              initialYesPrice={market.yesImpliedProbability}
              betAmount={bet?.amount}
              referrerBetId={bet?.id}
              referrerUserId={userId}
            />
          </div>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
