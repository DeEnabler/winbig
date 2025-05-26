
// src/components/challenges/ChallengeInvite.tsx
'use client';

import type { ChallengeInviteProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';

export default function ChallengeInvite({ matchId: originalChallengeMatchId, referrerName, predictionQuestion, predictionId }: ChallengeInviteProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { appendEntryParams } = useEntryContext();

  const handleAccept = (choice: 'YES' | 'NO') => {
    toast({
      title: "Challenge Accepted!",
      description: `You chose ${choice} for "${predictionQuestion.substring(0,30)}...". Please confirm your bet.`,
    });

    // Navigate to the match view for confirmation, passing necessary details
    // originalChallengeMatchId is used as the base for the match page URL
    // predictionId is the specific prediction content
    // choice is the user's decision on the challenge
    // confirmChallenge=true indicates this needs bet confirmation
    // referrerName is passed along for context
    const baseUrl = `/match/${originalChallengeMatchId}?predictionId=${predictionId}&choice=${choice}&confirmChallenge=true&referrer=${referrerName}`;
    const urlWithEntryParams = appendEntryParams(baseUrl);
    router.push(urlWithEntryParams);
  };

  // The handleDecline function and its corresponding button are removed as per the request.
  // If a user doesn't accept, they would typically navigate away or close the app/tab.
  // A "skip" or "next" functionality would be more suited for a feed of challenges,
  // not a direct singular challenge invite screen.

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl rounded-lg text-center">
      <CardHeader>
        <CardTitle className="text-2xl">You've Been Challenged!</CardTitle>
        <CardDescription className="text-lg pt-2">
          <span className="font-semibold text-primary">@{referrerName}</span> challenged you on:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xl font-medium text-foreground">
          "{predictionQuestion}"
        </p>
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Button
            onClick={() => handleAccept('YES')}
            className="w-full py-3 text-lg font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white h-14"
          >
            ACCEPT (YES)
          </Button>
          <Button
            onClick={() => handleAccept('NO')}
            className="w-full py-3 text-lg font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white h-14"
          >
            ACCEPT (NO)
          </Button>
        </div>
         {/* The "DECLINE CHALLENGE" button has been removed from here. */}
      </CardContent>
    </Card>
  );
}
