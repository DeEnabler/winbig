'use client'
// Using 'use client' for the page to easily access searchParams
// In a real app, [matchId] would be used to fetch data server-side if possible.

import MatchViewClient from '@/components/match/MatchViewClient';
import type { Match } from '@/types';
import { mockCurrentUser, mockOpponentUser, mockPredictions } from '@/lib/mockData';
import { useSearchParams, useParams } from 'next/navigation';
import { Suspense } from 'react';

function MatchPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = typeof params.matchId === 'string' ? params.matchId : 'default-match-id';
  
  const predictionId = searchParams.get('predictionId');
  const userChoice = searchParams.get('choice'); // 'YES' or 'NO'
  const betAmountStr = searchParams.get('amount');

  const prediction = mockPredictions.find(p => p.id === predictionId) || mockPredictions[0];
  const betAmount = betAmountStr ? parseFloat(betAmountStr) : 50; // Default bet amount
  const potentialWinnings = betAmount * 1.9; // Simplified odds: 1.9x payout

  // Construct mock match data based on URL params or defaults
  const currentMatch: Match = {
    id: matchId,
    predictionText: prediction.text,
    user1Username: mockCurrentUser.username,
    user1AvatarUrl: mockCurrentUser.avatarUrl,
    user2Username: mockOpponentUser.username, // Could be a random user or system pool
    user2AvatarUrl: mockOpponentUser.avatarUrl,
    betAmount: betAmount,
    potentialWinnings: potentialWinnings,
    // Countdown to prediction end or a fixed duration like 3 hours from now
    countdownEnds: prediction.endsAt ? prediction.endsAt.getTime() : Date.now() + 3 * 60 * 60 * 1000,
    shareUrl: typeof window !== 'undefined' ? `${window.location.origin}/match/${matchId}?predictionId=${prediction.id}&ref=${mockCurrentUser.username}` : `/match/${matchId}?predictionId=${prediction.id}&ref=${mockCurrentUser.username}`,
  };

  return <MatchViewClient match={currentMatch} />;
}


export default function MatchPage() {
  return (
    // Suspense is good practice if searchParams causes any delayed rendering,
    // though with this simple client-side fetch it might not be strictly necessary.
    <Suspense fallback={<div className="text-center p-10">Loading match details...</div>}>
      <MatchPageContent/>
    </Suspense>
  );
}
