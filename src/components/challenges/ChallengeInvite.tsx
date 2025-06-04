
// src/components/challenges/ChallengeInvite.tsx
'use client';

import type { ChallengeInviteProps } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { CheckCircle, Swords } from 'lucide-react';
import { mockOpponentUser } from '@/lib/mockData';
import { useAccount } from 'wagmi'; // Added
import { appKitModal } from '@/components/providers/WalletKitProvider'; // Added

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
  const { isConnected } = useAccount(); // Get wallet connection status

  const referrerAvatar = referrerName === mockOpponentUser.username 
    ? mockOpponentUser.avatarUrl 
    : `https://placehold.co/40x40.png?text=${referrerName.substring(0,2).toUpperCase()}`;

  const handleBetAction = (userAction: 'with' | 'against') => {
    if (!isConnected) {
      // If wallet is not connected, open the wallet connection modal
      if (appKitModal && typeof appKitModal.open === 'function') {
        console.log('ChallengeInvite: Wallet not connected, opening appKitModal.');
        appKitModal.open();
      } else {
        console.error('ChallengeInvite: appKitModal.open is not available. Wallet connection cannot be initiated.');
        toast({
          variant: "destructive",
          title: "Wallet Error",
          description: "Could not initiate wallet connection. Please try the 'Connect Wallet' button in the header.",
        });
      }
      return; // Stop further processing until wallet is connected
    }

    // Wallet is connected, proceed with bet logic
    let actualUserChoice: 'YES' | 'NO';

    if (userAction === 'with') {
      actualUserChoice = referrerOriginalChoice;
    } else { // 'against'
      actualUserChoice = referrerOriginalChoice === 'YES' ? 'NO' : 'YES';
    }

    console.log('Analytics: challenge_responded', {
      matchId: originalChallengeMatchId,
      userAction: userAction, 
      actualUserChoice: actualUserChoice,
      referrer: referrerName,
      predictionId: predictionId,
    });

    toast({
      title: "Great Choice!",
      description: `You chose to bet ${actualUserChoice}. Let's confirm your bet!`,
    });

    const baseUrl = `/match/${originalChallengeMatchId}?predictionId=${predictionId}&choice=${actualUserChoice}&confirmChallenge=true&referrer=${referrerName}`;
    const urlWithEntryParams = appendEntryParams(baseUrl);
    router.push(urlWithEntryParams);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl rounded-lg text-center overflow-hidden">
      <CardHeader className="bg-muted/50 p-6">
        <div className="flex flex-col items-center space-y-2">
          <Avatar className="w-16 h-16 border-2 border-primary">
            <AvatarImage src={referrerAvatar} alt={referrerName} data-ai-hint="person avatar" />
            <AvatarFallback>{referrerName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-xl">
            @{referrerName} is betting <span className={referrerOriginalChoice === 'YES' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{referrerOriginalChoice}</span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <p className="italic text-xl font-semibold text-foreground leading-tight">
          “{predictionQuestion}”
        </p>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="flex-1 py-4 px-4 bg-gradient-to-br from-green-500 to-green-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 flex items-center justify-center space-x-2"
            onClick={() => handleBetAction('with')}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Agree & Bet {referrerOriginalChoice}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="flex-1 py-4 px-4 bg-gradient-to-br from-red-500 to-red-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 flex items-center justify-center space-x-2"
            onClick={() => handleBetAction('against')}
          >
            <Swords className="w-5 h-5" />
            <span>Bet {referrerOriginalChoice === 'YES' ? 'NO' : 'YES'} & Challenge</span>
          </motion.button>
        </div>
      </CardContent>
    </Card>
  );
}
