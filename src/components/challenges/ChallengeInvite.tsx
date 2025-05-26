
// src/components/challenges/ChallengeInvite.tsx
'use client';

import type { ChallengeInviteProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { mockCurrentUser } from '@/lib/mockData'; // For mock userId

export default function ChallengeInvite({ matchId: originalChallengeMatchId, referrerName, predictionQuestion, predictionId }: ChallengeInviteProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { appendEntryParams } = useEntryContext();

  const handleAccept = async (choice: 'YES' | 'NO') => {
    const betAmount = 5; // Default bet amount for challenges for now

    toast({
      title: "Placing your bet...",
      description: `You chose ${choice} for "${predictionQuestion.substring(0,30)}...".`,
    });

    try {
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: mockCurrentUser.id, // In a real app, get this from auth session
          challengeMatchId: originalChallengeMatchId, // The ID from the URL, e.g., "challengeAsTest1"
          predictionId: predictionId, // The actual ID of the prediction content
          choice: choice,
          amount: betAmount,
          referrerName: referrerName, // Good to log who initiated this accepted challenge
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to place bet.');
      }

      toast({
        title: "Challenge Accepted & Bet Placed!",
        description: `Your ${choice} bet for $${betAmount} on "${predictionQuestion.substring(0,30)}..." is in!`,
      });

      // Navigate to the match view. The `originalChallengeMatchId` might be the market ID.
      // Or, if the API returned a specific match ID for this new bet, use that.
      // For now, assuming originalChallengeMatchId is the identifier for the general prediction market.
      const baseUrl = `/match/${originalChallengeMatchId}?betPlaced=true&choice=${choice}&predictionId=${predictionId}&amount=${betAmount}&referrer=${referrerName}`;
      const urlWithEntryParams = appendEntryParams(baseUrl);
      router.push(urlWithEntryParams);

    } catch (error) {
      console.error("Error accepting challenge:", error);
      toast({
        variant: "destructive",
        title: "Bet Failed",
        description: error instanceof Error ? error.message : "Could not place your bet. Please try again.",
      });
    }
  };

  const handleDecline = () => {
    console.log(`Declined challenge ${originalChallengeMatchId} from ${referrerName}`);
    toast({
      title: "Challenge Declined",
      description: "You decided not to take on the challenge this time.",
    });
    const baseUrl = `/`; // Navigate back to feed or show next card
    const urlWithEntryParams = appendEntryParams(baseUrl);
    router.push(urlWithEntryParams);
  };

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
         <Button
            onClick={handleDecline}
            variant="outline"
            className="w-full py-3 text-md font-bold rounded-xl mt-2"
          >
            DECLINE CHALLENGE
          </Button>
      </CardContent>
    </Card>
  );
}
