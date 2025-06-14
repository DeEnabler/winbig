// src/app/page.tsx
'use client';

import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import type { ChallengeInviteProps } from '@/types';
import { mockOpponentUser, mockPredictions } from '@/lib/mockData'; // Opponent and predictions for props

export default function HomePage() {
  // Prepare props for ChallengeInvite using mock data
  const challengeProps: ChallengeInviteProps = {
    matchId: 'challengeAsTest1', // Example matchId
    referrerName: mockOpponentUser.username, // Use a mock opponent
    predictionQuestion: mockPredictions[0].text, // Use the first mock prediction question
    predictionId: mockPredictions[0].id,
    referrerOriginalChoice: 'YES', // Mock referrer's choice
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-8">
      <ChallengeInvite {...challengeProps} />
    </div>
  );
}
