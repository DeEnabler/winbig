
// src/app/match/[matchId]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';
import MatchViewClient from '@/components/match/MatchViewClient';
import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import type { Match, ChallengeInviteProps } from '@/types';
import { Suspense } from 'react';
import { getMatchDetailsForOg, getMatchDisplayData } from '@/lib/matchData';
import { mockCurrentUser, mockPredictions } from '@/lib/mockData'; 
import { redirect } from 'next/navigation';

type MatchPageProps = {
  params: { matchId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params, searchParams }: MatchPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const matchId = params.matchId;

  let predictionIdForOg: string | undefined;
  const predictionIdSearchParam = searchParams.predictionId;
  if (typeof predictionIdSearchParam === 'string') {
    predictionIdForOg = predictionIdSearchParam;
  } else if (Array.isArray(predictionIdSearchParam) && predictionIdSearchParam.length > 0 && typeof predictionIdSearchParam[0] === 'string') {
    predictionIdForOg = predictionIdSearchParam[0];
  }

  if (!predictionIdForOg) {
    console.warn(`OG Metadata: predictionId missing for matchId: ${matchId}. Using generic OG.`);
    return {
      title: "ViralBet Match",
      description: "View the match details on ViralBet.",
      twitter: {
        card: 'summary_large_image',
        title: "ViralBet Match",
        description: "View the match details on ViralBet.",
      }
    };
  }
  
  const ogData = await getMatchDetailsForOg(matchId, { ...searchParams, predictionId: predictionIdForOg });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  const ogImageUrl = new URL(`${appUrl}/api/og`);
  ogImageUrl.searchParams.set('v', Date.now().toString()); 

  ogImageUrl.searchParams.set('predictionText', ogData.predictionText);
  ogImageUrl.searchParams.set('userChoice', ogData.userChoice);
  ogImageUrl.searchParams.set('userAvatar', ogData.userAvatar || mockCurrentUser.avatarUrl || 'https://placehold.co/128x128.png?text=VB');
  ogImageUrl.searchParams.set('username', ogData.username);
  ogImageUrl.searchParams.set('outcome', ogData.outcome || 'PENDING');
  ogImageUrl.searchParams.set('betAmount', (ogData.betAmount || 0).toString());

  if (ogData.betSize) ogImageUrl.searchParams.set('betSize', ogData.betSize);
  if (ogData.streak) ogImageUrl.searchParams.set('streak', ogData.streak);
  if (ogData.rank) ogImageUrl.searchParams.set('rank', ogData.rank);
  if (ogData.rankCategory) ogImageUrl.searchParams.set('rankCategory', ogData.rankCategory);

  const isInitialChallengeLink = searchParams.challenge === 'true' && searchParams.referrer && !searchParams.confirmChallenge;
  let referrerForOg: string | undefined;
  const referrerSearchParamForOg = searchParams.referrer;
  if (typeof referrerSearchParamForOg === 'string') {
    referrerForOg = referrerSearchParamForOg;
  } else if (Array.isArray(referrerSearchParamForOg) && referrerSearchParamForOg.length > 0) {
    referrerForOg = referrerSearchParamForOg[0];
  }


  let title = `${ogData.username} bet ${ogData.userChoice} on: "${ogData.predictionText.substring(0, 40)}..."`;
  let description = `Challenge ${ogData.username === 'I' ? 'my' : `${ogData.username}'s`} ${ogData.betSize ? `${ogData.betSize} SOL bet` : `$${ogData.betAmount} bet`} on ViralBet!`;

  if (isInitialChallengeLink && referrerForOg) {
    title = `@${referrerForOg} challenged you on ViralBet: "${ogData.predictionText.substring(0, 40)}..."`;
    description = `Accept the challenge from @${referrerForOg} and bet on "${ogData.predictionText.substring(0,50)}..."!`;
  } else if (searchParams.confirmChallenge === 'true' && referrerForOg) {
    title = `Confirm your bet against @${referrerForOg} on: "${ogData.predictionText.substring(0, 40)}..."`;
    description = `You've accepted @${referrerForOg}'s challenge. Confirm your ${ogData.userChoice} bet on "${ogData.predictionText.substring(0,50)}..."!`;
  }
  else { 
    if (ogData.outcome === 'WON') description += ` I called it! Can you?`;
    else if (ogData.outcome === 'LOST') description += ` Think you’re smarter?`;
    else description += ` Can you predict better?`;
  }
  
  const currentPath = `/match/${matchId}`;
  const queryForCanonical = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (typeof value === 'string') {
      queryForCanonical.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach(vItem => {
        if(typeof vItem === 'string'){
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

function MatchViewWrapper({ matchData }: { matchData: Match }) {
  return <MatchViewClient match={matchData} />;
}

function ChallengeInviteWrapper({ challengeProps }: { challengeProps: ChallengeInviteProps }) {
  return (
    <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <ChallengeInvite {...challengeProps} />
    </div>
  );
}

export default async function MatchPage({ params, searchParams }: MatchPageProps) {
  const matchId = params.matchId; 

  let referrer: string | undefined = undefined;
  const referrerSearchParam = searchParams.referrer;
  if (typeof referrerSearchParam === 'string' && referrerSearchParam.length > 0) {
    referrer = referrerSearchParam;
  } else if (Array.isArray(referrerSearchParam) && referrerSearchParam.length > 0 && typeof referrerSearchParam[0] === 'string' && referrerSearchParam[0].length > 0) {
    referrer = referrerSearchParam[0];
  }

  const isInitialChallenge = searchParams.challenge === 'true' && !!referrer;
  const isConfirmingChallenge = searchParams.confirmChallenge === 'true' && !!searchParams.choice && !!searchParams.predictionId;
  
  let predictionIdFromSearch: string | undefined;
  const predIdSearchParam = searchParams.predictionId;
  if (typeof predIdSearchParam === 'string') {
    predictionIdFromSearch = predIdSearchParam;
  } else if (Array.isArray(predIdSearchParam) && predIdSearchParam.length > 0 && typeof predIdSearchParam[0] === 'string') {
    predictionIdFromSearch = predIdSearchParam[0];
  }


  if (isInitialChallenge && !isConfirmingChallenge) { 
    if (!predictionIdFromSearch) {
      console.error("Challenge invite missing predictionId for matchId:", matchId);
      return <div className="text-center p-10 text-destructive">Error: Invalid challenge link. Prediction details missing.</div>;
    }
    const prediction = mockPredictions.find(p => p.id === predictionIdFromSearch);
    if (!prediction) {
       console.warn(`Challenge invite for unknown predictionId: ${predictionIdFromSearch}. Using default question.`);
       return <div className="text-center p-10 text-destructive">Error: Prediction not found for this challenge.</div>;
    }

    // MOCK: In a real system, the referrer's original choice would come from the backend or be part of the challenge link.
    const referrerOriginalChoice: 'YES' | 'NO' = 'YES'; // Assuming referrer bet YES for mock purposes

    const challengeProps: ChallengeInviteProps = {
      matchId: matchId,
      referrerName: referrer as string, 
      predictionQuestion: prediction.text,
      predictionId: predictionIdFromSearch,
      referrerOriginalChoice: referrerOriginalChoice,
    };
    return (
      <Suspense fallback={<div className="text-center p-10">Loading challenge...</div>}>
        <ChallengeInviteWrapper challengeProps={challengeProps} />
      </Suspense>
    );
  } else { 
    try {
      const matchDisplayData = await getMatchDisplayData(matchId, searchParams);
      return (
        <Suspense fallback={<div className="text-center p-10">Loading match details...</div>}>
          <MatchViewWrapper matchData={matchDisplayData} />
        </Suspense>
      );
    } catch (error) {
        console.error("Error preparing match display data:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not load match details.";
        return <div className="text-center p-10 text-destructive">Error: {errorMessage}</div>;
    }
  }
}
