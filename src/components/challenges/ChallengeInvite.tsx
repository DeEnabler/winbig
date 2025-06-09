
// src/components/challenges/ChallengeInvite.tsx
'use client';

import type { ChallengeInviteProps } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { CheckCircle, Swords, ShieldCheck, Users, Zap, BarChartHorizontalBig } from 'lucide-react';
import { mockOpponentUser } from '@/lib/mockData';
import { useAccount } from 'wagmi';
import { appKitModal } from '@/context/index'; 
import { useState, useEffect, useCallback } from 'react';
import { networks } from '@/config/index'; 
import { Badge } from '@/components/ui/badge';

const REWARD_AMOUNT = 100;
const REWARD_CURRENCY = "ViralPoints";
const REWARD_GIVEN_STORAGE_KEY = 'viralBetWalletConnectRewardGiven_v1_reown';

const DEFAULT_EXAMPLE_BET_AMOUNT = 10; 
const EXAMPLE_PAYOUT_MULTIPLIER = 1.85; 

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
  const { isConnected, address } = useAccount();

  const [pendingActionData, setPendingActionData] = useState<{
    userAction: 'with' | 'against';
    actualUserChoice: 'YES' | 'NO';
  } | null>(null);

  const referrerAvatar = referrerName === mockOpponentUser.username 
    ? mockOpponentUser.avatarUrl 
    : `https://placehold.co/40x40.png?text=${referrerName.substring(0,2).toUpperCase()}`;

  const examplePotentialWinnings = (DEFAULT_EXAMPLE_BET_AMOUNT * EXAMPLE_PAYOUT_MULTIPLIER).toFixed(2); 

  const [yesBettors, setYesBettors] = useState(Math.floor(Math.random() * 15) + 8); // Start with some base
  const [noBettors, setNoBettors] = useState(Math.floor(Math.random() * 15) + 7);
  const [showPlusOneYes, setShowPlusOneYes] = useState(false);
  const [showPlusOneNo, setShowPlusOneNo] = useState(false);
  const [oddsYes, setOddsYes] = useState(50);
  const [oddsPulse, setOddsPulse] = useState(false);

  useEffect(() => {
    const calculateOdds = (yes: number, no: number) => {
      const total = yes + no;
      return total > 0 ? (yes / total) * 100 : 50;
    };
    setOddsYes(calculateOdds(yesBettors, noBettors));
  }, [yesBettors, noBettors]);

  useEffect(() => {
    const activityInterval = setInterval(() => {
      const isAddingYes = Math.random() < 0.6; // More likely to add to YES for seeding
      const isAddingNo = Math.random() < 0.45;

      if (isAddingYes) {
        setYesBettors(prev => prev + 1);
        setShowPlusOneYes(true);
        setTimeout(() => setShowPlusOneYes(false), 800);
      }
      if (isAddingNo) {
        setNoBettors(prev => prev + 1);
        setShowPlusOneNo(true);
        setTimeout(() => setShowPlusOneNo(false), 800);
      }

      // Trigger odds pulse if counts changed
      if (isAddingYes || isAddingNo) {
        setOddsPulse(true);
        setTimeout(() => setOddsPulse(false), 700);
      }
    }, 2500 + Math.random() * 2000); // Random interval between 2.5s and 4.5s

    return () => clearInterval(activityInterval);
  }, []);


  const proceedWithNavigation = useCallback((userAction: 'with' | 'against', actualUserChoice: 'YES' | 'NO') => {
    console.log('Analytics: challenge_responded', {
      matchId: originalChallengeMatchId,
      userAction: userAction, 
      actualUserChoice: actualUserChoice,
      referrer: referrerName,
      predictionId: predictionId,
    });

    const baseUrl = `/match/${originalChallengeMatchId}?predictionId=${predictionId}&choice=${actualUserChoice}&confirmChallenge=true&referrer=${referrerName}`;
    const urlWithEntryParams = appendEntryParams(baseUrl);
    router.push(urlWithEntryParams);
  }, [originalChallengeMatchId, predictionId, referrerName, appendEntryParams, router]);


  useEffect(() => {
    if (isConnected && pendingActionData && address) {
      const rewardAlreadyGiven = localStorage.getItem(REWARD_GIVEN_STORAGE_KEY) === address;

      if (!rewardAlreadyGiven) {
        localStorage.setItem(REWARD_GIVEN_STORAGE_KEY, address); 
        toast({
          title: "Wallet Connected! 🎉",
          description: `You've earned ${REWARD_AMOUNT} ${REWARD_CURRENCY}! Your XP will update soon.`,
          duration: 5000,
        });
      }
      
      proceedWithNavigation(pendingActionData.userAction, pendingActionData.actualUserChoice);
      setPendingActionData(null);
    }
  }, [isConnected, pendingActionData, address, toast, proceedWithNavigation]);


  const handleBetAction = (userAction: 'with' | 'against') => {
    let actualUserChoice: 'YES' | 'NO';
    if (userAction === 'with') {
      actualUserChoice = referrerOriginalChoice;
    } else { 
      actualUserChoice = referrerOriginalChoice === 'YES' ? 'NO' : 'YES';
    }

    if (!isConnected) {
      setPendingActionData({ userAction, actualUserChoice });
      const rewardAlreadyGiven = !!address && localStorage.getItem(REWARD_GIVEN_STORAGE_KEY) === address; 

      if (!rewardAlreadyGiven) { 
        toast({
          title: "Connect Wallet & Earn!",
          description: `Connect your wallet to proceed and earn ${REWARD_AMOUNT} ${REWARD_CURRENCY} instantly!`,
        });
      } else {
         toast({
          title: "Connect Wallet",
          description: "Please connect your wallet to continue.",
        });
      }

      if (appKitModal && typeof appKitModal.open === 'function') {
        appKitModal.open();
      } else {
        console.error('ChallengeInvite: appKitModal or appKitModal.open is not available. Wallet connection cannot be initiated.');
        toast({
          variant: "destructive",
          title: "Wallet Error",
          description: "Could not initiate wallet connection. Please try the 'Connect Wallet' button in the header.",
        });
      }
      return;
    }
    proceedWithNavigation(userAction, actualUserChoice);
  };
  
  const supportedNetworkNames = networks.slice(0, 2).map(n => n.name).join(', '); 
  const oppositeChoice = referrerOriginalChoice === 'YES' ? 'NO' : 'YES';

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

        <div className="text-center p-3 bg-background rounded-md border border-dashed border-primary/50">
            <p className="text-sm text-muted-foreground">Example Bet & Potential Return:</p>
            <p className="text-lg font-semibold text-primary">
                Bet {DEFAULT_EXAMPLE_BET_AMOUNT} SOL → Win {examplePotentialWinnings} SOL!
            </p>
            <p className="text-xs text-muted-foreground">
              (Nearly {EXAMPLE_PAYOUT_MULTIPLIER}x Payout based on live market odds. Set your amount next!)
            </p>
        </div>

        {/* Live Activity Section */}
        <div className="my-4 space-y-3 py-3 border-y border-border/50">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Live Activity</p>
            <div className="flex justify-around items-start">
              <div className="text-center relative px-2">
                <div className="relative inline-block">
                  <span className="text-3xl font-bold text-green-500">{yesBettors}</span>
                  {showPlusOneYes && (
                    <span className="absolute -top-2 -right-4 text-sm text-green-500 animate-fade-in-out-briefly font-semibold">+1</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Betting YES</p>
              </div>
              <div className="text-center relative px-2">
                 <div className="relative inline-block">
                  <span className="text-3xl font-bold text-red-500">{noBettors}</span>
                  {showPlusOneNo && (
                    <span className="absolute -top-2 -right-4 text-sm text-red-500 animate-fade-in-out-briefly font-semibold">+1</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Betting NO</p>
              </div>
            </div>
          </div>
          <div 
            className={`text-center p-2 rounded-md transition-all duration-300 ${oddsPulse ? 'animate-pulse-once bg-primary/10' : 'bg-muted/30'}`}
          >
            <p className="text-sm text-muted-foreground">Current Odds:</p>
            <p className="text-lg font-semibold">
              <span className="text-green-500">YES {oddsYes.toFixed(0)}%</span> / <span className="text-red-500">NO {(100 - oddsYes).toFixed(0)}%</span>
            </p>
          </div>
        </div>
        {/* End Live Activity Section */}


        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="flex-1 py-4 px-4 bg-gradient-to-br from-green-500 to-green-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 flex items-center justify-center space-x-2"
            onClick={() => handleBetAction('with')}
          >
            <CheckCircle className="w-5 h-5" />
            <span>I'm IN – Bet {referrerOriginalChoice}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="flex-1 py-4 px-4 bg-gradient-to-br from-red-500 to-red-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 flex items-center justify-center space-x-2"
            onClick={() => handleBetAction('against')}
          >
            <Swords className="w-5 h-5" />
            <span>Challenge 'Em & Bet {oppositeChoice}</span>
          </motion.button>
        </div>
         <div className="text-sm text-muted-foreground mt-4 space-y-1">
          <p>Challenge friends and go viral! Share your bet to X and earn ViralPoints.</p>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-center justify-center p-4 bg-muted/30 border-t space-y-2">
        <div className="flex items-center text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 mr-1.5 text-primary" />
           Fast, secure bets on leading blockchains like Ethereum and Polygon.
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Badge variant="secondary" className="py-0.5 px-1.5">
                <Users className="w-3 h-3 mr-1 text-blue-500" /> 12,000+ Bettors
            </Badge>
            <Badge variant="secondary" className="py-0.5 px-1.5">
                <BarChartHorizontalBig className="w-3 h-3 mr-1 text-purple-500" /> 500+ Active Predictions
            </Badge>
        </div>
      </CardFooter>
    </Card>
  );
}
