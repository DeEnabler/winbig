
'use client';

import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import type { ChallengeInviteProps } from '@/types';
import { mockOpponentUser, mockPredictions } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  // Use the first mock prediction and mock opponent for the invite
  const firstPrediction = mockPredictions[0] || {
    id: 'fallbackPredId',
    text: 'Will this fallback prediction work?',
    category: 'Fallback',
  };

  const challengeProps: ChallengeInviteProps = {
    matchId: `challengeMatch_${firstPrediction.id}_${Date.now()}`,
    referrerName: mockOpponentUser.username,
    predictionQuestion: firstPrediction.text,
    predictionId: firstPrediction.id,
    referrerOriginalChoice: 'YES', // Defaulting to YES for the mock referrer
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-8">
      {/* Diagnostic Card - can be removed if ChallengeInvite works well */}
      <Card className="w-full max-w-lg mb-8">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            ViralBet Homepage
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
           <p className="text-lg text-center">Attempting to render ChallengeInvite below.</p>
        </CardContent>
      </Card>
      
      <ChallengeInvite {...challengeProps} />

    </div>
  );
}
