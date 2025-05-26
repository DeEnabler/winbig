// src/app/match/[matchId]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';
import MatchViewClient from '@/components/match/MatchViewClient';
import type { Match } from '@/types';
import { Suspense } from 'react';
import { getMatchDetailsForOg, getMatchDisplayData } from '@/lib/matchData';
import { mockCurrentUser } from '@/lib/mockData'; // For avatar fallback

type MatchPageProps = {
  params: { matchId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params, searchParams }: MatchPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const matchId = params.matchId;
  // Pass all searchParams to getMatchDetailsForOg so it can pick up streak, betSize, rank, etc.
  const ogData = await getMatchDetailsForOg(matchId, searchParams);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  const ogImageUrl = new URL(`${appUrl}/api/og`);
  ogImageUrl.searchParams.set('v', Date.now().toString()); // Cache busting

  ogImageUrl.searchParams.set('predictionText', ogData.predictionText);
  ogImageUrl.searchParams.set('userChoice', ogData.userChoice);
  ogImageUrl.searchParams.set('userAvatar', ogData.userAvatar || mockCurrentUser.avatarUrl || 'https://placehold.co/128x128.png?text=VB');
  ogImageUrl.searchParams.set('username', ogData.username);
  ogImageUrl.searchParams.set('outcome', ogData.outcome || 'PENDING');
  ogImageUrl.searchParams.set('betAmount', ogData.betAmount.toString()); // Original bet amount for context

  // Pass new dynamic badge parameters
  if (ogData.betSize) ogImageUrl.searchParams.set('betSize', ogData.betSize);
  if (ogData.streak) ogImageUrl.searchParams.set('streak', ogData.streak);
  if (ogData.rank) ogImageUrl.searchParams.set('rank', ogData.rank);
  if (ogData.rankCategory) ogImageUrl.searchParams.set('rankCategory', ogData.rankCategory);


  const title = `${ogData.username} bet ${ogData.userChoice} on: "${ogData.predictionText.substring(0, 40)}..."`;
  let description = `Challenge ${ogData.username === 'I' ? 'my' : ogData.username + "'s"} ${ogData.betSize ? ogData.betSize + " SOL bet" : "$" + ogData.betAmount + " bet"} on ViralBet!`;
  if (ogData.outcome === 'WON') {
    description += ` I called it! Can you?`;
  } else if (ogData.outcome === 'LOST') {
    description += ` Think you’re smarter?`;
  } else {
    description += ` Can you predict better?`;
  }
  
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
      // site: '@ViralBet', // Optional: Your app's Twitter handle
      // creator: `@${searchParams.userTwitterHandle || 'ViralBetPlayer'}`, // Optional: User's Twitter handle if known
    },
  };
}

function MatchPageClientContentWrapper({ matchData }: { matchData: Match }) {
  return <MatchViewClient match={matchData} />;
}

export default async function MatchPage({ params, searchParams }: MatchPageProps) {
  const matchDisplayData = await getMatchDisplayData(params.matchId, searchParams);

  return (
    <Suspense fallback={<div className="text-center p-10">Loading match details...</div>}>
      <MatchPageClientContentWrapper matchData={matchDisplayData} />
    </Suspense>
  );
}
