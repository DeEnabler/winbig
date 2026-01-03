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

// FOMO messages for social shares
const FOMO_MESSAGES = {
  YES: [
    "thinks this is happening! 🔥 Prove them wrong?",
    "is betting on YES! 💪 Think they're wrong?",
    "is ALL IN on this! Are you brave enough to challenge?",
    "says YES! 🎯 Got the guts to go against them?",
  ],
  NO: [
    "says NO WAY! 🚫 Think they're missing something?",
    "is betting against this! Ready to prove them wrong?",
    "doesn't believe it! 💥 Show them what's up!",
    "is calling BS! 😤 Agree or challenge?",
  ],
};

function getRandomFomoMessage(outcome: 'YES' | 'NO'): string {
  const messages = FOMO_MESSAGES[outcome];
  return messages[Math.floor(Math.random() * messages.length)];
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
    description = `${shortWallet} ${getRandomFomoMessage(outcome as 'YES' | 'NO')} "${predictionText.substring(0, 80)}..."`;
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
  const bet = betResult.success ? betResult.data : null;
  
  // Try prediction share if no bet
  const predictionShare = bet ? null : await getPredictionShare(code);
  
  if (!bet && !predictionShare) {
    notFound();
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

  // If still no profile, try by username from prediction share
  const shareUsername = predictionShare?.username;
  console.log('🔍 Challenge Page: shareUsername from prediction_share:', shareUsername);
  
  if (!userProfile && shareUsername) {
    const profileResult = await getUserProfileByUsername(shareUsername);
    console.log('🔍 Challenge Page: Username lookup result:', profileResult.success, profileResult.data?.x_username);
    if (profileResult.success && profileResult.data) {
      userProfile = profileResult.data;
    }
  }
  
  console.log('🔍 Challenge Page: Final userProfile:', userProfile?.x_username, userProfile?.x_avatar);
  
  // Priority: 1. X username with @, 2. X display name, 3. prediction share username, 4. Anonymous (never expose wallet)
  const referrerName = userProfile?.x_username 
    ? `@${userProfile.x_username}`
    : userProfile?.x_name 
      ? userProfile.x_name
      : shareUsername 
        ? shareUsername
        : 'A WinBig Predictor';
  
  const referrerAvatar = userProfile?.x_avatar || null;

  const matchId = `share_${code}`;
  const isBetShare = !!bet;
  const fomoMessage = getRandomFomoMessage(outcome as 'YES' | 'NO');

  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-4">An error occurred displaying the challenge.</p>}>
      <div className="flex flex-col items-center space-y-6 md:space-y-8 py-6 md:py-8">
        <Suspense fallback={<div className="w-full h-96 flex items-center justify-center"><LoadingSpinner message="Loading Challenge..." /></div>}>
          <div className="w-full max-w-md mx-auto px-4">
            
            {/* FOMO Header - Different for bet vs prediction shares */}
            {isBetShare ? (
              // Bet share - show money with social profile
              <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {referrerAvatar ? (
                      <img 
                        src={referrerAvatar} 
                        alt={referrerName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center text-white font-bold">
                        {referrerName.replace('@', '').charAt(0).toUpperCase()}
                      </div>
                    )}
                    {userProfile?.x_username && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1DA1F2] rounded-full flex items-center justify-center border-2 border-background">
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Shared bet from</p>
                    <p className="font-semibold">{referrerName}</p>
                  </div>
                  
                  {/* Bet amount */}
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Their bet</p>
                    <p className="font-bold">
                      <span className={outcome === 'YES' ? 'text-green-500' : 'text-red-500'}>
                        ${bet?.amount} on {outcome}
                      </span>
                    </p>
                  </div>
                </div>
                {bet?.odds_shown_to_user && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Odds at bet time: {(bet.odds_shown_to_user * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            ) : (
              // Prediction share - FOMO social style (no money shown)
              <div className="mb-4">
                {/* Animated FOMO banner */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 p-1">
                  <div className="bg-background/95 backdrop-blur rounded-lg p-4">
                    {/* Profile section */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        {referrerAvatar ? (
                          <img 
                            src={referrerAvatar} 
                            alt={referrerName}
                            className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                            {referrerName.replace('@', '').charAt(0).toUpperCase()}
                          </div>
                        )}
                        {userProfile?.x_username && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1DA1F2] rounded-full flex items-center justify-center border-2 border-background">
                            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg">{referrerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {userProfile?.x_username ? 'Verified Predictor' : 'Active Predictor'}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full font-bold text-sm ${
                        outcome === 'YES'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        Predicts {outcome}
                      </div>
                    </div>
                    
                    {/* FOMO message */}
                    <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-lg p-3 mb-3">
                      <p className="text-center font-medium">
                        <span className="text-primary">@{referrerName}</span>{' '}
                        {fomoMessage}
                      </p>
                    </div>
                    
                    {/* Stats row for social proof */}
                    <div className="flex justify-around text-center text-xs text-muted-foreground">
                      <div>
                        <p className="font-bold text-foreground text-lg">🔥</p>
                        <p>Hot Take</p>
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-lg">{Math.floor(Math.random() * 50) + 10}</p>
                        <p>Views</p>
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-lg">{Math.floor(Math.random() * 20) + 5}</p>
                        <p>Challengers</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Urgency banner */}
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <span className="animate-pulse">⚡</span>
                  <span className="text-muted-foreground">
                    <span className="text-orange-500 font-semibold">{Math.floor(Math.random() * 10) + 3} people</span> are viewing this right now
                  </span>
                </div>
              </div>
            )}

            {/* Challenge invite component */}
            <ChallengeInvite
              matchId={matchId}
              referrerName={referrerName}
              predictionQuestion={market.question}
              predictionId={market.id}
              referrerOriginalChoice={outcome as 'YES' | 'NO'}
              initialYesPrice={market.yesImpliedProbability}
              referrerBetId={bet?.id}
              referrerUserId={userId}
            />

            {/* Footer CTA */}
            <div className="mt-4 text-center">
              {isBetShare ? (
                <p className="text-sm text-muted-foreground">
                  Place your bet and share to earn rewards! 🎁
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-primary">
                    Think you know better? Put your money where your mouth is! 💰
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Join thousands of predictors and earn by sharing your bets
                  </p>
                </div>
              )}
            </div>
          </div>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
