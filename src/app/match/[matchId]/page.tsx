// src/app/match/[matchId]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';
import MatchViewClient from '@/components/match/MatchViewClient';
import type { Match } from '@/types';
import { Suspense } from 'react';
import { getMatchDetailsForOg, getMatchDisplayData } from '@/lib/matchData';

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

  // Parameters for OG image
  ogImageUrl.searchParams.set('predictionText', ogData.predictionText);
  ogImageUrl.searchParams.set('userChoice', ogData.userChoice);
  if(ogData.userAvatar) ogImageUrl.searchParams.set('userAvatar', ogData.userAvatar);
  ogImageUrl.searchParams.set('username', ogData.username);
  ogImageUrl.searchParams.set('outcome', ogData.outcome || 'PENDING');
  ogImageUrl.searchParams.set('betAmount', ogData.betAmount.toString());
  // Add bonus fields if getMatchDetailsForOg provides them and you want them in the image
  // if (ogData.streak) ogImageUrl.searchParams.set('streak', ogData.streak.toString());
  // if (ogData.rank) ogImageUrl.searchParams.set('rank', ogData.rank);


  const title = `${ogData.username} bet ${ogData.userChoice} on: "${ogData.predictionText.substring(0, 40)}..."`;
  const description = `Challenge ${ogData.username === 'I' ? 'my' : ogData.username + "'s"} $${ogData.betAmount} bet on ViralBet! Can you predict better?`;
  
  const currentPath = `/match/${matchId}`;
  const currentQueryParams = new URLSearchParams(searchParams as Record<string, string>).toString();
  const canonicalUrl = `${appUrl}${currentPath}${currentQueryParams ? `?${currentQueryParams}` : ''}`;


  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [{ url: ogImageUrl.toString(), width: 1200, height: 630, alt: `ViralBet Challenge: ${ogData.predictionText}` }],
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

// This client component wrapper ensures that MatchViewClient, 
// which uses client-side hooks like useEffect, useState,
// is correctly handled when the page itself is a Server Component.
function MatchPageClientContentWrapper({ matchData }: { matchData: Match }) {
  return <MatchViewClient match={matchData} />;
}

export default async function MatchPage({ params, searchParams }: MatchPageProps) {
  // Fetch the full match data needed for displaying the page
  const matchDisplayData = await getMatchDisplayData(params.matchId, searchParams);

  return (
    <Suspense fallback={<div className="text-center p-10">Loading match details...</div>}>
      <MatchPageClientContentWrapper matchData={matchDisplayData} />
    </Suspense>
  );
}
