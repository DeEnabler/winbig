// src/components/challenges/ChallengeInvite.tsx
'use client';

import type { ChallengeInviteProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';

export default function ChallengeInvite({ matchId, referrerName, predictionQuestion }: ChallengeInviteProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { appendEntryParams } = useEntryContext();

  const handleAccept = async (choice: 'YES' | 'NO') => {
    console.log(`Accepted challenge ${matchId} from ${referrerName} with choice ${choice}`);
    // TODO: Implement API call: POST /api/bets with { userId (from auth), matchId, side: choice }
    // For now, simulate success and navigate
    
    toast({
      title: "Challenge Accepted!",
      description: `You bet ${choice} on "${predictionQuestion.substring(0,30)}...".`,
    });

    // Navigate to the match view, preserving source parameters
    // The matchId here should be the one that represents the market/prediction.
    // A new bet might generate a new specific bet ID, but the match view is for the market.
    const baseUrl = `/match/${matchId}?betPlaced=true`; // Add param to indicate bet was just placed
    const urlWithEntryParams = appendEntryParams(baseUrl);
    router.push(urlWithEntryParams);
  };

  const handleDecline = () => {
    console.log(`Declined challenge ${matchId} from ${referrerName}`);
    // Navigate back to feed or show next card
    // For now, navigate to home, preserving source parameters
    const baseUrl = `/`;
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
