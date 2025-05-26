// src/app/match/[matchId]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';
import MatchViewClient from '@/components/match/MatchViewClient';
import ChallengeInvite from '@/components/challenges/ChallengeInvite'; // Added
import type { Match, ChallengeInviteProps } from '@/types';
import { Suspense } from 'react';
import { getMatchDetailsForOg, getMatchDisplayData } from '@/lib/matchData';
import { mockCurrentUser, mockPredictions } from '@/lib/mockData'; 

type MatchPageProps = {
  params: { matchId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params, searchParams }: MatchPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const matchId = params.matchId;
  const ogData = await getMatchDetailsForOg(matchId, searchParams);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  const ogImageUrl = new URL(`${appUrl}/api/og`);
  ogImageUrl.searchParams.set('v', Date.now().toString()); // Cache busting

  ogImageUrl.searchParams.set('predictionText', ogData.predictionText);
  ogImageUrl.searchParams.set('userChoice', ogData.userChoice);
  ogImageUrl.searchParams.set('userAvatar', ogData.userAvatar || mockCurrentUser.avatarUrl || 'https://placehold.co/128x128.png?text=VB');
  ogImageUrl.searchParams.set('username', ogData.username);
  ogImageUrl.searchParams.set('outcome', ogData.outcome || 'PENDING');
  ogImageUrl.searchParams.set('betAmount', ogData.betAmount.toString());

  if (ogData.betSize) ogImageUrl.searchParams.set('betSize', ogData.betSize);
  if (ogData.streak) ogImageUrl.searchParams.set('streak', ogData.streak);
  if (ogData.rank) ogImageUrl.searchParams.set('rank', ogData.rank);
  if (ogData.rankCategory) ogImageUrl.searchParams.set('rankCategory', ogData.rankCategory);

  const isChallenge = searchParams.challenge === 'true';
  const referrer = searchParams.referrer as string;

  let title = `${ogData.username} bet ${ogData.userChoice} on: "${ogData.predictionText.substring(0, 40)}..."`;
  let description = `Challenge ${ogData.username === 'I' ? 'my' : ogData.username + "'s"} ${ogData.betSize ? ogData.betSize + " SOL bet" : "$" + ogData.betAmount + " bet"} on ViralBet!`;

  if (isChallenge && referrer) {
    title = `@${referrer} challenged you on ViralBet: "${ogData.predictionText.substring(0, 40)}..."`;
    description = `Accept the challenge from @${referrer} and bet on "${ogData.predictionText.substring(0,50)}..."!`;
  } else {
    if (ogData.outcome === 'WON') description += ` I called it! Can you?`;
    else if (ogData.outcome === 'LOST') description += ` Think you’re smarter?`;
    else description += ` Can you predict better?`;
  }
  
  const currentPath = `/match/${matchId}`;
  const queryForCanonical = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      queryForCanonical.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach(vItem => {
        if (typeof vItem === 'string') {
          queryForCanonical.append(key, vItem);
        }
      });
    }
  }
  const currentQueryParams = queryForCanonical.toString();
  const canonicalUrl = `${appUrl}${currentPath}${currentQueryParams ? `?${currentQueryParams}` : ''}`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [{ url: ogImageUrl.toString(), width: 1200, height: 630, alt: `ViralBet: ${ogData.predictionText}` }],
      type: 'website',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [ogImageUrl.toString()],
    },
  };
}

// Wrapper for MatchViewClient if needed, or can be used directly if MatchViewClient handles its own client logic
function MatchViewWrapper({ matchData }: { matchData: Match }) {
  return <MatchViewClient match={matchData} />;
}

// Wrapper for ChallengeInvite
function ChallengeInviteWrapper({ challengeProps }: { challengeProps: ChallengeInviteProps }) {
  return (
    <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <ChallengeInvite {...challengeProps} />
    </div>
  );
}

export default async function MatchPage({ params, searchParams }: MatchPageProps) {
  const matchId = params.matchId;
  const isChallenge = searchParams.challenge === 'true';
  const referrer = searchParams.referrer as string | undefined;
  // const marketId = searchParams.market as string | undefined; // from market=12345
  
  // TODO: Add logic to check if user has already bet on this matchId (marketId)
  // For now, if challenge=true, assume it's Phase 0 (Challenge Invite)
  // Otherwise, it's Phase 2 (Match View)
  const userHasBet = searchParams.betPlaced === 'true'; // Simple check if user just placed a bet via ChallengeInvite

  if (isChallenge && referrer && !userHasBet) {
    // Phase 0: Challenge Invite
    // Fetch minimal prediction details based on matchId (which might be a marketId)
    // For now, using mock data, assuming matchId can find a prediction.
    const prediction = mockPredictions.find(p => p.id === (searchParams.predictionId as string) || p.id === matchId || p.text.toLowerCase().includes(matchId.substring(0,5))) || mockPredictions[0];
    
    const challengeProps: ChallengeInviteProps = {
      matchId: matchId, // This is the market or original bet ID being challenged
      referrerName: referrer,
      predictionQuestion: prediction.text,
    };

    return (
      <Suspense fallback={<div className="text-center p-10">Loading challenge...</div>}>
        <ChallengeInviteWrapper challengeProps={challengeProps} />
      </Suspense>
    );
  } else {
    // Phase 2: Match View
    // This means either it's not a challenge link, or the user has already accepted the challenge.
    const matchDisplayData = await getMatchDisplayData(matchId, searchParams);
    return (
      <Suspense fallback={<div className="text-center p-10">Loading match details...</div>}>
        <MatchViewWrapper matchData={matchDisplayData} />
      </Suspense>
    );
  }
}
