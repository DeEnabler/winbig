
// src/components/challenges/ChallengeInvite.tsx
'use client';

import type { ChallengeInviteProps } from '@/types';
import { Button } from '@/components/ui/button'; // Keeping for potential future use, but buttons are custom now
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export default function ChallengeInvite({ 
  matchId: originalChallengeMatchId, 
  referrerName, 
  predictionQuestion, 
  predictionId,
  referrerOriginalChoice // e.g., 'YES' or 'NO'
}: ChallengeInviteProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { appendEntryParams } = useEntryContext();

  const handleChallengeResponse = (userAction: 'agree' | 'disagree') => {
    let actualUserChoice: 'YES' | 'NO';

    if (userAction === 'agree') {
      actualUserChoice = referrerOriginalChoice;
    } else { // 'disagree'
      actualUserChoice = referrerOriginalChoice === 'YES' ? 'NO' : 'YES';
    }

    // Placeholder for analytics
    console.log('Analytics: challenge_responded', {
      matchId: originalChallengeMatchId,
      userAction: userAction, // 'agree' or 'disagree'
      actualUserChoice: actualUserChoice, // 'YES' or 'NO'
      referrer: referrerName,
      predictionId: predictionId,
    });

    toast({
      title: "Great Choice!",
      description: `You chose to bet ${actualUserChoice}. Let's confirm your bet!`,
    });

    // Pass the actual choice and predictionId to the match confirmation page
    const baseUrl = `/match/${originalChallengeMatchId}?predictionId=${predictionId}&choice=${actualUserChoice}&confirmChallenge=true&referrer=${referrerName}`;
    const urlWithEntryParams = appendEntryParams(baseUrl);
    router.push(urlWithEntryParams);
  };

  const opponentActionText = referrerOriginalChoice === 'YES' ? 'NO' : 'YES';

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl rounded-lg text-center">
      <CardHeader>
        <CardTitle className="text-2xl">
          @{referrerName} is betting <span className={referrerOriginalChoice === 'YES' ? 'text-green-500' : 'text-red-500'}>{referrerOriginalChoice}</span>:
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="italic text-lg font-semibold text-foreground">
          “{predictionQuestion}”
        </p>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
            onClick={() => handleChallengeResponse('agree')}
          >
            I agree with the {referrerOriginalChoice} call
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
            onClick={() => handleChallengeResponse('disagree')}
          >
            I'll take the {opponentActionText} side — prove them wrong
          </motion.button>
        </div>
      </CardContent>
    </Card>
  );
}
