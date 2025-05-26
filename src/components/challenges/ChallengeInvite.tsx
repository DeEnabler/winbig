
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
  referrerOriginalChoice 
}: ChallengeInviteProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { appendEntryParams } = useEntryContext();

  const handleChallengeResponse = (userSide: 'with' | 'against') => {
    // Determine the user's actual 'YES' or 'NO' choice
    let actualChoice: 'YES' | 'NO';
    if (userSide === 'with') {
      actualChoice = referrerOriginalChoice;
    } else { // 'against'
      actualChoice = referrerOriginalChoice === 'YES' ? 'NO' : 'YES';
    }

    // Placeholder for analytics
    console.log('Analytics: challenge_responded', {
      matchId: originalChallengeMatchId,
      side: userSide,
      referrer: referrerName,
      userActualChoice: actualChoice,
      predictionId: predictionId
    });

    toast({
      title: "Great Choice!",
      description: `You chose to go ${userSide} @${referrerName}. Let's confirm your bet!`,
    });

    const baseUrl = `/match/${originalChallengeMatchId}?predictionId=${predictionId}&choice=${actualChoice}&confirmChallenge=true&referrer=${referrerName}`;
    const urlWithEntryParams = appendEntryParams(baseUrl);
    router.push(urlWithEntryParams);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl rounded-lg text-center">
      <CardHeader>
        <CardTitle className="text-2xl">
          @{referrerName} made a bold call:
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="italic text-lg font-semibold text-foreground">
          “{predictionQuestion}”
        </p>
        <div className="flex space-x-4 mt-6">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
            onClick={() => handleChallengeResponse('with')}
          >
            I’m with @{referrerName}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
            onClick={() => handleChallengeResponse('against')}
          >
            I’ll prove them wrong
          </motion.button>
        </div>
      </CardContent>
    </Card>
  );
}
