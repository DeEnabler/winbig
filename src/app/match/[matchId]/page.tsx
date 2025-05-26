
// src/app/match/[matchId]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';
import MatchViewClient from '@/components/match/MatchViewClient';
import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import type { Match, ChallengeInviteProps } from '@/types';
import { Suspense } from 'react';
import { getMatchDetailsForOg, getMatchDisplayData } from '@/lib/matchData';
import { mockCurrentUser, mockPredictions } from '@/lib/mockData'; 
import { redirect } from 'next/navigation'; // Import redirect

type MatchPageProps = {
  params: { matchId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params, searchParams }: MatchPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const matchId = params.matchId;
  
  // Robust referrer extraction for metadata
  let referrerMeta: string | undefined = undefined;
  const referrerSearchParamMeta = searchParams.referrer;
  if (typeof referrerSearchParamMeta === 'string') {
    referrerMeta = referrerSearchParamMeta;
  } else if (Array.isArray(referrerSearchParamMeta) && referrerSearchParamMeta.length > 0 && typeof referrerSearchParamMeta[0] === 'string') {
    referrerMeta = referrerSearchParamMeta[0];
  }

  const isChallengeMeta = searchParams.challenge === 'true';
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

  let title = `${ogData.username} bet ${ogData.userChoice} on: "${ogData.predictionText.substring(0, 40)}..."`;
  let description = `Challenge ${ogData.username === 'I' ? 'my' : ogData.username + "'s"} ${ogData.betSize ? ogData.betSize + " SOL bet" : "$" + ogData.betAmount + " bet"} on ViralBet!`;

  if (isChallengeMeta && referrerMeta) {
    title = `@${referrerMeta} challenged you on ViralBet: "${ogData.predictionText.substring(0, 40)}..."`;
    description = `Accept the challenge from @${referrerMeta} and bet on "${ogData.predictionText.substring(0,50)}..."!`;
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
  
  let referrer: string | undefined = undefined;
  const referrerSearchParam = searchParams.referrer;

  if (typeof referrerSearchParam === 'string' && referrerSearchParam.length > 0) {
    referrer = referrerSearchParam;
  } else if (Array.isArray(referrerSearchParam) && referrerSearchParam.length > 0 && typeof referrerSearchParam[0] === 'string' && referrerSearchParam[0].length > 0) {
    referrer = referrerSearchParam[0];
  }
  
  const userHasBet = searchParams.betPlaced === 'true';

  if (isChallenge && referrer && !userHasBet) {
    // Phase 0: Challenge Invite
    const predictionId = searchParams.predictionId as string;
    const prediction = mockPredictions.find(p => p.id === predictionId); // Find prediction
    
    let predictionQuestionText: string;
    if (!prediction) {
      // This is a fallback if the predictionId from the URL is invalid or not found.
      // In a real app, you might redirect to an error page or the main feed.
      console.warn(`Challenge invite for unknown predictionId: ${predictionId}. Using default question.`);
      predictionQuestionText = "This prediction is no longer available. Accept the challenge?";
    } else {
      predictionQuestionText = prediction.text;
    }
    
    const challengeProps: ChallengeInviteProps = {
      matchId: matchId, // This is "challengeAsTest1" or whatever is in the URL
      referrerName: referrer,
      predictionQuestion: predictionQuestionText,
    };

    return (
      <Suspense fallback={<div className="text-center p-10">Loading challenge...</div>}>
        <ChallengeInviteWrapper challengeProps={challengeProps} />
      </Suspense>
    );
  } else {
    // Phase 2: Match View
    const matchDisplayData = await getMatchDisplayData(matchId, searchParams);
    return (
      <Suspense fallback={<div className="text-center p-10">Loading match details...</div>}>
        <MatchViewWrapper matchData={matchDisplayData} />
      </Suspense>
    );
  }
}
