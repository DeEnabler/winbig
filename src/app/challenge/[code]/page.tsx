// src/app/challenge/[code]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getBetByShareCode, getUserProfileByWallet, getUserProfileByUsername, supabase } from '@/lib/supabase-server';
import { getMarketDetails } from '@/lib/marketService';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import { isValidShareCode } from '@/lib/shareCode';
import type { PredictionShare } from '@/app/api/predict/route';

type ChallengePageProps = {
  params: Promise<{ code: string }>;
};

// Helper to fetch prediction share
async function getPredictionShare(code: string): Promise<PredictionShare | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('prediction_shares')
    .select('*')
    .eq('share_code', code)
    .eq('is_active', true)
    .single();
  
  if (error || !data) return null;
  
  // Increment click count (fire and forget)
  supabase
    .from('prediction_shares')
    .update({ clicks: (data.clicks || 0) + 1 })
    .eq('id', data.id);
  
  return data;
}


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

  // Try bet share first
  const betResult = await getBetByShareCode(code);
  const bet = betResult.success ? betResult.data : null;
  
  // Try prediction share if no bet
  const predictionShare = bet ? null : await getPredictionShare(code);
  
  if (!bet && !predictionShare) {
    return {
      title: 'Link Not Found - WinBig',
      description: 'This share link could not be found.',
    };
  }

  const marketId = bet?.market_id || predictionShare?.market_id || '';
  const market = await getMarketDetails(marketId);
  const predictionText = market?.question || 'A WinBig Prediction';
  const outcome = bet?.outcome || predictionShare?.predicted_outcome || 'YES';
  const userId = bet?.user_id || predictionShare?.user_id || '';
  const username = predictionShare?.username;

  // Fetch user's social profile for OG metadata
  let userProfile = null;
  console.log('🔍 Challenge OG: Looking up profile for userId:', userId, 'username:', username);
  
  if (userId) {
    const profileResult = await getUserProfileByWallet(userId);
    console.log('🔍 Challenge OG: Wallet lookup result:', profileResult.success, profileResult.data?.x_username);
    if (profileResult.success && profileResult.data) {
      userProfile = profileResult.data;
    }
  }

  // If still no profile, try by username from prediction share
  if (!userProfile && username) {
    const profileResult = await getUserProfileByUsername(username);
    console.log('🔍 Challenge OG: Username lookup result:', profileResult.success, profileResult.data?.x_username);
    if (profileResult.success && profileResult.data) {
      userProfile = profileResult.data;
    }
  }
  
  console.log('🔍 Challenge OG: Final userProfile:', userProfile?.x_username, userProfile?.x_avatar);

  // Use social username if available - NEVER expose wallet addresses
  const displayName = userProfile?.x_username 
    ? `@${userProfile.x_username}`
    : userProfile?.x_name 
      ? userProfile.x_name
      : username || 'A WinBig Predictor';
  
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

  // Different title/description for bet vs prediction shares
  let title: string;
  let description: string;
  
  if (bet) {
    title = `${shortWallet} bet $${bet.amount} on ${outcome} - WinBig`;
    description = `Challenge this bet: "${predictionText.substring(0, 100)}..."`;
  } else {
    title = `${shortWallet} predicts ${outcome}! - WinBig`;
    description = `Think ${shortWallet} is wrong? Prove it! "${predictionText.substring(0, 80)}..."`;
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

  // Try bet share first
  const betResult = await getBetByShareCode(code);
  let bet = betResult.success ? betResult.data : null;
  
  // Try prediction share if no bet
  const predictionShare = bet ? null : await getPredictionShare(code);
  
  if (!bet && !predictionShare) {
    notFound();
  }

  // SMART LOOKUP: If we only found a prediction share, check if this user 
  // has actually placed a bet on this market so we can show the real amount.
  if (!bet && predictionShare && supabase) {
    console.log('🔍 Smart Lookup: Link is prediction-only, checking for associated bet...');
    const { data: latestBet } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', predictionShare.user_id)
      .eq('market_id', predictionShare.market_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (latestBet) {
      console.log('✅ Smart Lookup: Found real bet to display:', latestBet.amount);
      bet = latestBet;
    }
  }

  const marketId = bet?.market_id || predictionShare?.market_id || '';
  const market = await getMarketDetails(marketId);

  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Market Not Found</h1>
        <p className="text-muted-foreground">The market for this prediction could not be found.</p>
      </div>
    );
  }

  const outcome = bet?.outcome || predictionShare?.predicted_outcome || 'YES';
  const userId = bet?.user_id || predictionShare?.user_id || '';
  
  // Fetch user's social profile (X/Twitter username) if we have a wallet address
  let userProfile = null;
  console.log('🔍 Challenge Page: Looking up profile for userId:', userId);
  
  if (userId) {
    const profileResult = await getUserProfileByWallet(userId);
    console.log('🔍 Challenge Page: Wallet lookup result:', profileResult.success, profileResult.data?.x_username, profileResult.error);
    if (profileResult.success && profileResult.data) {
      userProfile = profileResult.data;
    }
  }

  // If still no profile, try by username from bet or prediction share
  // Priority: bet.username (new field) > predictionShare.username
  const shareUsername = (bet as any)?.username || predictionShare?.username;
  console.log('🔍 Challenge Page: shareUsername:', shareUsername, '(from bet:', !!(bet as any)?.username, ', from prediction:', !!predictionShare?.username, ')');
  
  if (!userProfile && shareUsername) {
    const profileResult = await getUserProfileByUsername(shareUsername);
    console.log('🔍 Challenge Page: Username lookup result:', profileResult.success, profileResult.data?.x_username);
    if (profileResult.success && profileResult.data) {
      userProfile = profileResult.data;
    }
  }
  
  console.log('🔍 Challenge Page: Final userProfile:', userProfile?.x_username, userProfile?.x_avatar);
  
  // Priority: 1. X username with @, 2. X display name, 3. bet/share username, 4. Wallet prefix (never expose full wallet)
  const referrerName = userProfile?.x_username 
    ? `@${userProfile.x_username}`
    : userProfile?.x_name 
      ? userProfile.x_name
      : shareUsername 
        ? (shareUsername.startsWith('@') ? shareUsername : `@${shareUsername}`)
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
            {/* Single unified ChallengeInvite - all data in one place */}
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
