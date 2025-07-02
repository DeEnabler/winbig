
// src/app/match/[matchId]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';
import MatchViewClient from '@/components/match/MatchViewClient';
import type { Match } from '@/types';
import { Suspense } from 'react';
import { getMatchDetailsForOg, getMatchDisplayData } from '@/lib/matchData';
import { mockCurrentUser } from '@/lib/mockData'; 

type MatchPageProps = {
  params: { matchId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params, searchParams }: MatchPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const matchId = params.matchId;

  // The predictionId in the search params IS the marketId for our purposes here.
  const predictionIdForOg = searchParams.predictionId as string;

  if (!predictionIdForOg) {
    console.warn(`OG Metadata: predictionId missing for matchId: ${matchId}. Using generic OG.`);
    return {
      title: "ViralBet Match",
      description: "View the match details on ViralBet.",
    };
  }
  
  // This function now correctly fetches live data
  const ogData = await getMatchDetailsForOg(matchId, { ...searchParams, predictionId: predictionIdForOg });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  const ogImageUrl = new URL(`${appUrl}/api/og`);
  ogImageUrl.searchParams.set('v', Date.now().toString()); 

  ogImageUrl.searchParams.set('predictionText', ogData.predictionText);
  if(ogData.userChoice) ogImageUrl.searchParams.set('userChoice', ogData.userChoice);
  ogImageUrl.searchParams.set('userAvatar', ogData.userAvatar || mockCurrentUser.avatarUrl || 'https://placehold.co/128x128.png?text=VB');
  if(ogData.username) ogImageUrl.searchParams.set('username', ogData.username);
  if(ogData.outcome) ogImageUrl.searchParams.set('outcome', ogData.outcome);
  if(ogData.betAmount) ogImageUrl.searchParams.set('betAmount', (ogData.betAmount || 0).toString());

  if (ogData.betSize) ogImageUrl.searchParams.set('betSize', ogData.betSize);
  if (ogData.streak) ogImageUrl.searchParams.set('streak', ogData.streak);
  if (ogData.rank) ogImageUrl.searchParams.set('rank', ogData.rank);
  if (ogData.rankCategory) ogImageUrl.searchParams.set('rankCategory', ogData.rankCategory);
  if (ogData.bonusApplied) ogImageUrl.searchParams.set('bonus', 'true');

  const title = ogData.titleOverride || `${ogData.username || 'Someone'} bet on: "${ogData.predictionText.substring(0, 40)}..."`;
  const description = ogData.descriptionOverride || `Challenge their bet on ViralBet! Can you predict better?`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl.toString(), width: 1200, height: 630, alt: `ViralBet: ${ogData.predictionText}` }],
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


export default async function MatchPage({ params, searchParams }: MatchPageProps) {
    try {
      // This function is now corrected to fetch live data from Redis.
      // The complex logic for challenges is removed to simplify and fix the core flow.
      const matchDisplayData = await getMatchDisplayData(params.matchId, searchParams);
      
      return (
        <Suspense fallback={<div className="text-center p-10">Loading match details...</div>}>
          <MatchViewClient match={matchDisplayData} />
        </Suspense>
      );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Could not load match details.";
        console.error("Error preparing match display data:", error);
        return <div className="text-center p-10 text-destructive">Error: {errorMessage}</div>;
    }
}
