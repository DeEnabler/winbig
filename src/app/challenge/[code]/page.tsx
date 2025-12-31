// src/app/challenge/[code]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getBetByShareCode } from '@/lib/supabase-server';
import { getMarketDetails } from '@/lib/marketService';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import { isValidShareCode } from '@/lib/shareCode';

type ChallengePageProps = {
  params: Promise<{ code: string }>;
};

// Generate dynamic OG metadata for the shared bet
export async function generateMetadata(
  { params }: ChallengePageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const { code } = resolvedParams;

  // Validate share code format
  if (!isValidShareCode(code)) {
    return {
      title: 'Invalid Link - WinBig',
      description: 'This share link is invalid.',
    };
  }

  // Fetch the bet by share code
  const betResult = await getBetByShareCode(code);
  
  if (!betResult.success || !betResult.data) {
    return {
      title: 'Link Not Found - WinBig',
      description: 'This share link could not be found.',
    };
  }

  const bet = betResult.data;

  // Fetch market details for the prediction text
  const market = await getMarketDetails(bet.market_id);
  const predictionText = market?.question || 'A WinBig Prediction';

  // Build OG image URL with bet details
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun';
  const ogImageUrl = new URL(`${appUrl}/api/og`);
  
  ogImageUrl.searchParams.set('v', Date.now().toString());
  ogImageUrl.searchParams.set('predictionText', predictionText);
  ogImageUrl.searchParams.set('userChoice', bet.outcome);
  ogImageUrl.searchParams.set('betAmount', bet.amount.toString());
  ogImageUrl.searchParams.set('outcome', 'CHALLENGE');
  ogImageUrl.searchParams.set('ogType', 'match_challenge');
  
  // Shorten wallet address for display
  const shortWallet = bet.user_id 
    ? `${bet.user_id.slice(0, 6)}...${bet.user_id.slice(-4)}`
    : 'Someone';
  ogImageUrl.searchParams.set('username', shortWallet);

  const title = `${shortWallet} bet $${bet.amount} on ${bet.outcome} - WinBig`;
  const description = `Challenge this bet: "${predictionText.substring(0, 100)}..."`;

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

// Server component for the challenge page
export default async function ChallengePage({ params }: ChallengePageProps) {
  const resolvedParams = await params;
  const { code } = resolvedParams;

  // Validate share code format
  if (!isValidShareCode(code)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Invalid Share Link</h1>
        <p className="text-muted-foreground">This share link format is not valid.</p>
      </div>
    );
  }

  // Fetch the bet by share code
  const betResult = await getBetByShareCode(code);

  if (!betResult.success || !betResult.data) {
    notFound();
  }

  const bet = betResult.data;

  // Fetch live market data
  const market = await getMarketDetails(bet.market_id);

  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Market Not Found</h1>
        <p className="text-muted-foreground">The market for this bet could not be found.</p>
      </div>
    );
  }

  // Format referrer name from wallet address
  const referrerName = bet.user_id 
    ? `${bet.user_id.slice(0, 6)}...${bet.user_id.slice(-4)}`
    : 'Anonymous';

  // Create a unique match ID for this challenge
  const matchId = `share_${code}`;

  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-4">An error occurred displaying the challenge.</p>}>
      <div className="flex flex-col items-center space-y-8 md:space-y-12 py-8">
        <Suspense fallback={<div className="w-full h-96 flex items-center justify-center"><LoadingSpinner message="Loading Challenge..." /></div>}>
          <div className="w-full max-w-md mx-auto">
            {/* Referrer bet info banner */}
            <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Shared bet from</p>
                  <p className="font-semibold">{referrerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Their bet</p>
                  <p className="font-bold">
                    <span className={bet.outcome === 'YES' ? 'text-green-500' : 'text-red-500'}>
                      ${bet.amount} on {bet.outcome}
                    </span>
                  </p>
                </div>
              </div>
              {bet.odds_shown_to_user && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Odds at bet time: {(bet.odds_shown_to_user * 100).toFixed(0)}%
                </p>
              )}
            </div>

            {/* Challenge invite component */}
            <ChallengeInvite
              matchId={matchId}
              referrerName={referrerName}
              predictionQuestion={market.question}
              predictionId={market.id}
              referrerOriginalChoice={bet.outcome}
              initialYesPrice={market.yesImpliedProbability}
              referrerBetId={bet.id}
              referrerUserId={bet.user_id}
            />

            {/* Additional context */}
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>Place your bet and share to earn rewards!</p>
            </div>
          </div>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
