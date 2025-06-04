// src/app/page.tsx
'use client';

import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import type { ChallengeInviteProps } from '@/types';
import { mockOpponentUser, mockPredictions } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Keep for layout consistency if needed

// This page will now directly show a ChallengeInvite for development purposes.

export default function HomePage() {
  // Use the first mock prediction for the challenge
  const mockPredictionForChallenge = mockPredictions[0] || {
    id: 'default-pred-id',
    text: 'Will this default prediction work for the challenge?',
    category: 'General',
  };

  const challengeProps: ChallengeInviteProps = {
    matchId: 'homePageChallengeMatch', // A mock matchId for this direct challenge
    referrerName: mockOpponentUser.username, // Mock referrer
    predictionQuestion: mockPredictionForChallenge.text,
    predictionId: mockPredictionForChallenge.id,
    referrerOriginalChoice: 'YES', // Mock referrer's original choice
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-8">
      <Card className="w-full max-w-lg mb-8">
        <CardHeader>
          <CardTitle className="text-center text-lg text-muted-foreground">
            Development: Direct Challenge Invite
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
           <p className="text-sm text-center">The homepage is currently set to display a direct challenge invite to focus on this UI flow.</p>
        </CardContent>
      </Card>
      
      <ChallengeInvite {...challengeProps} />

      {/* You can add other debug/info cards here if needed */}
      <Card className="w-full max-w-md mt-8 bg-background/70">
        <CardHeader>
          <CardTitle className="text-lg text-center">Note for Development</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>This page is currently showing a direct <code>ChallengeInvite</code> component.</p>
          <p>The usual prediction feed is bypassed.</p>
          <p>When ready, revert <code>src/app/page.tsx</code> to show the prediction card feed.</p>
        </CardContent>
      </Card>
    </div>
  );
}
