
// src/components/challenges/ChallengeInvite.tsx
'use client';

import type { ChallengeInviteProps } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Swords, ShieldCheck, Users, Zap, BarChartHorizontalBig, Clock, AlertTriangle, Crown, Coins } from 'lucide-react';
import { mockOpponentUser } from '@/lib/mockData';
import { useAccount } from 'wagmi';
import { appKitModal } from '@/context/index';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { networks } from '@/config/index';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const REWARD_AMOUNT = 100;
const REWARD_CURRENCY = "ViralPoints";
const REWARD_GIVEN_STORAGE_KEY = 'viralBetWalletConnectRewardGiven_v1_reown';

const BONUS_DURATION_SECONDS = 120; // 2 minutes
const BONUS_PERCENTAGE = 20;

interface ReferrerStats {
  winStreak: number;
  totalWinnings: string;
  predictionRank: string;
}

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
    bonusApplied: boolean;
  } | null>(null);

  const referrerAvatar = referrerName === mockOpponentUser.username
    ? mockOpponentUser.avatarUrl
    : `https://placehold.co/40x40.png?text=${referrerName.substring(0,2).toUpperCase()}`;

  const referrerStats = useMemo((): ReferrerStats | null => {
    if (referrerName === mockOpponentUser.username) {
      return {
        winStreak: mockOpponentUser.betStreak || 0,
        totalWinnings: mockOpponentUser.totalWinnings || "Not Available",
        predictionRank: mockOpponentUser.predictionRank || "Unranked",
      };
    }
    // For other referrers, provide some default/generic stats or null if none
    // For now, returning null for non-CryptoKing88 for simplicity
    return null; 
    // Or for generic stats:
    // return {
    //   winStreak: Math.floor(Math.random() * 5),
    //   totalWinnings: `${Math.floor(Math.random() * 100)} XYZ`,
    //   predictionRank: `Top ${Math.floor(Math.random() * 40) + 10}%`,
    // };
  }, [referrerName]);


  const [yesBettors, setYesBettors] = useState(Math.floor(Math.random() * 15) + 8);
  const [noBettors, setNoBettors] = useState(Math.floor(Math.random() * 15) + 7);
  const [showPlusOneYes, setShowPlusOneYes] = useState(false);
  const [showPlusOneNo, setShowPlusOneNo] = useState(false);
  const [oddsYes, setOddsYes] = useState(50);
  const [oddsPulse, setOddsPulse] = useState(false);

  const [bonusTimeLeft, setBonusTimeLeft] = useState(BONUS_DURATION_SECONDS);
  const [isBonusOfferActive, setIsBonusOfferActive] = useState(true);
  const [bonusSuccessfullyClaimed, setBonusSuccessfullyClaimed] = useState(false);

  useEffect(() => {
    const calculateOdds = (yes: number, no: number) => {
      const total = yes + no;
      return total > 0 ? (yes / total) * 100 : 50;
    };
    setOddsYes(calculateOdds(yesBettors, noBettors));
  }, [yesBettors, noBettors]);

  useEffect(() => {
    const activityInterval = setInterval(() => {
      const isAddingYes = Math.random() < 0.6;
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
      if (isAddingYes || isAddingNo) {
        setOddsPulse(true);
        setTimeout(() => setOddsPulse(false), 700);
      }
    }, 2500 + Math.random() * 2000);
    return () => clearInterval(activityInterval);
  }, []);

  useEffect(() => {
    if (!isBonusOfferActive || bonusSuccessfullyClaimed) return;

    if (bonusTimeLeft <= 0) {
      setIsBonusOfferActive(false);
      return;
    }

    const timerId = setInterval(() => {
      setBonusTimeLeft((prevTime) => prevTime - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [isBonusOfferActive, bonusSuccessfullyClaimed, bonusTimeLeft]);

  useEffect(() => {
    if (bonusTimeLeft <= 0 && isBonusOfferActive && !bonusSuccessfullyClaimed) {
      setIsBonusOfferActive(false);
    }
  }, [bonusTimeLeft, isBonusOfferActive, bonusSuccessfullyClaimed]);


  const proceedWithNavigation = useCallback((userAction: 'with' | 'against', actualUserChoice: 'YES' | 'NO', bonusApplied = false) => {
    console.log('Analytics: challenge_responded', {
      matchId: originalChallengeMatchId,
      userAction: userAction,
      actualUserChoice: actualUserChoice,
      referrer: referrerName,
      predictionId: predictionId,
      bonusApplied: bonusApplied,
    });

    const baseUrl = `/match/${originalChallengeMatchId}?predictionId=${predictionId}&choice=${actualUserChoice}&confirmChallenge=true&referrer=${referrerName}${bonusApplied ? '&bonusApplied=true' : ''}`;
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
      proceedWithNavigation(pendingActionData.userAction, pendingActionData.actualUserChoice, pendingActionData.bonusApplied);
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

    let bonusAppliedForThisAction = false;
    if (isBonusOfferActive && !bonusSuccessfullyClaimed) {
      setBonusSuccessfullyClaimed(true);
      setIsBonusOfferActive(false); 
      bonusAppliedForThisAction = true;
      toast({
        title: "Bonus Locked In! 🌟",
        description: `You’ll get +${BONUS_PERCENTAGE}% extra if you win. Good luck!`,
        duration: 5000,
      });
    }

    if (!isConnected) {
      setPendingActionData({ userAction, actualUserChoice, bonusApplied: bonusAppliedForThisAction });
      const rewardAlreadyGiven = !!address && localStorage.getItem(REWARD_GIVEN_STORAGE_KEY) === address;
      let toastTitle = "Connect Wallet";
      let toastDescription = "Please connect your wallet to continue.";

      if (!rewardAlreadyGiven) {
        toastTitle = "Connect Wallet & Earn!";
        toastDescription = `Connect your wallet to proceed and earn ${REWARD_AMOUNT} ${REWARD_CURRENCY} instantly!`;
      }
       if (bonusAppliedForThisAction && !rewardAlreadyGiven) {
        toastDescription += ` Your +${BONUS_PERCENTAGE}% bonus is also waiting!`;
      } else if (bonusAppliedForThisAction) {
        toastDescription += ` Your +${BONUS_PERCENTAGE}% bonus will be applied.`;
      }

      toast({ title: toastTitle, description: toastDescription });

      if (appKitModal && typeof appKitModal.open === 'function') {
        appKitModal.open();
      } else {
        console.error('ChallengeInvite: appKitModal or appKitModal.open is not available.');
        toast({
          variant: "destructive",
          title: "Wallet Error",
          description: "Could not initiate wallet connection.",
        });
      }
      return;
    }
    proceedWithNavigation(userAction, actualUserChoice, bonusAppliedForThisAction);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const oppositeChoice = referrerOriginalChoice === 'YES' ? 'NO' : 'YES';

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl rounded-lg text-center overflow-hidden">
      <CardHeader className="bg-muted/50 p-6 space-y-3">
        <div className="flex flex-col items-center space-y-2">
          <Avatar className="w-16 h-16 border-2 border-primary">
            <AvatarImage src={referrerAvatar} alt={referrerName} data-ai-hint="person avatar" />
            <AvatarFallback>{referrerName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-xl">
            {referrerName === mockOpponentUser.username && "👑 "}@{referrerName}
          </CardTitle>
          <CardDescription>
            is betting <span className={referrerOriginalChoice === 'YES' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{referrerOriginalChoice}</span>
          </CardDescription>
        </div>

        {referrerStats && (
          <div className="border-2 border-primary/50 rounded-lg p-3 bg-background/70 shadow-md w-full max-w-xs mx-auto">
            <h3 className="text-sm font-semibold text-primary mb-2 text-center">Referrer Stats</h3>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center text-sm">
                <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                <span>Win Streak: <strong>{referrerStats.winStreak}</strong></span>
              </div>
              <div className="flex items-center text-sm">
                <Coins className="w-4 h-4 mr-2 text-green-500" />
                <span>Total Won: <strong>{referrerStats.totalWinnings}</strong></span>
              </div>
              <div className="flex items-center text-sm">
                <Crown className="w-4 h-4 mr-2 text-purple-500" />
                <span>Rank: <strong>{referrerStats.predictionRank}</strong></span>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <p className="italic text-xl font-semibold text-foreground leading-tight">
          “{predictionQuestion}”
        </p>

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

        <AnimatePresence mode="wait">
          {isBonusOfferActive && !bonusSuccessfullyClaimed && (
            <motion.div
              key="bonus-active"
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0, transition: { duration: 0.2 } }}
              className="text-center p-3 my-4 rounded-lg border-2 border-dashed border-yellow-500 bg-yellow-500/10 space-y-2 overflow-hidden"
            >
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 flex items-center justify-center">
                <Clock className="w-4 h-4 mr-1.5" /> 🎉 Limited Bonus: +{BONUS_PERCENTAGE}% payout if you bet before the timer ends!
              </p>
              <Progress value={(bonusTimeLeft / BONUS_DURATION_SECONDS) * 100} className="h-2 [&>div]:bg-yellow-500" />
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-300">{formatTime(bonusTimeLeft)}</p>
            </motion.div>
          )}
          {!isBonusOfferActive && !bonusSuccessfullyClaimed && (
            <motion.div
              key="bonus-expired"
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0, transition: { duration: 0.2 } }}
              className="text-center p-3 my-4 rounded-lg bg-muted/70 overflow-hidden"
            >
              <p className="text-sm font-semibold flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 text-muted-foreground" /> ⏱️ Bonus expired – try again next time!
              </p>
            </motion.div>
          )}
          {bonusSuccessfullyClaimed && (
            <motion.div
              key="bonus-claimed"
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0, transition: { duration: 0.2 } }}
              className="text-center p-3 my-4 rounded-lg bg-green-500/10 border border-green-600 overflow-hidden"
            >
              <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 mr-1.5" /> ✅ Bonus Locked In! You’ll get +{BONUS_PERCENTAGE}% extra if you win.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

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
