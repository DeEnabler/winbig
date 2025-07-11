
// src/components/challenges/ChallengeInvite.tsx
'use client';

import type { ChallengeInviteProps } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Swords, ShieldCheck, Users, Zap, BarChartHorizontalBig, Clock, AlertTriangle, Crown, Coins, Info, Flame } from 'lucide-react';
import { mockOpponentUser } from '@/lib/mockData';
import { useAccount } from 'wagmi';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BonusDisplay from './BonusDisplay';

const REWARD_AMOUNT = 100;
const REWARD_CURRENCY = "WinPoints";
const REWARD_GIVEN_STORAGE_KEY = 'winBigWalletConnectRewardGiven_v1_reown';

const BONUS_DURATION_SECONDS = 120;
const BONUS_PERCENTAGE = 20;
const BONUS_LOW_TIME_THRESHOLD = 30;
const BONUS_REVEAL_DELAY = 1800;

interface ReferrerStats {
  winStreak: number;
  totalWinnings: string;
  predictionRank: string;
}

// Function to initialize bettors based on price
// Uses a base total to make numbers more relatable (e.g., out of 100)
const initializeBettorsFromPrice = (yesPrice?: number, baseTotalBettors = 50) => {
  if (typeof yesPrice === 'number' && yesPrice >= 0 && yesPrice <= 1) {
    const initialYes = Math.round(yesPrice * baseTotalBettors);
    const initialNo = baseTotalBettors - initialYes;
    return { yesBettors: Math.max(1, initialYes), noBettors: Math.max(1, initialNo) }; // Ensure at least 1 bettor
  }
  // Fallback to random if no price or invalid price
  return {
    yesBettors: Math.floor(Math.random() * 15) + 8,
    noBettors: Math.floor(Math.random() * 15) + 7,
  };
};


export default function ChallengeInvite({
  matchId: originalChallengeMatchId,
  referrerName,
  predictionQuestion,
  predictionId,
  referrerOriginalChoice,
  initialYesPrice // New prop for initial odds
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
        totalWinnings: mockOpponentUser.totalWinnings || "N/A",
        predictionRank: mockOpponentUser.predictionRank || "Unranked",
      };
    }
    return null;
  }, [referrerName]);

  const initialBettorCounts = useMemo(() => initializeBettorsFromPrice(initialYesPrice), [initialYesPrice]);
  const [yesBettors, setYesBettors] = useState(initialBettorCounts.yesBettors);
  const [noBettors, setNoBettors] = useState(initialBettorCounts.noBettors);

  const [showPlusOneYes, setShowPlusOneYes] = useState(false);
  const [showPlusOneNo, setShowPlusOneNo] = useState(false);
  
  // displayedApiOddsYes will hold the percentage for "YES" (e.g., 70 for 70%)
  // It's initialized from initialYesPrice and will be the source of truth for displayed odds percentages.
  const [displayedApiOddsYes, setDisplayedApiOddsYes] = useState(() => {
    return typeof initialYesPrice === 'number' ? Math.max(1, Math.min(99, initialYesPrice * 100)) : 50;
  });

  const [oddsPulse, setOddsPulse] = useState(false);

  const [bonusTimeLeft, setBonusTimeLeft] = useState(BONUS_DURATION_SECONDS);
  const [isBonusOfferActive, setIsBonusOfferActive] = useState(true);
  const [bonusSuccessfullyClaimed, setBonusSuccessfullyClaimed] = useState(false);
  const [showBonusSection, setShowBonusSection] = useState(false);


  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBonusSection(true);
    }, BONUS_REVEAL_DELAY);
    return () => clearTimeout(timer);
  }, []);


  useEffect(() => {
    if (!isBonusOfferActive || bonusSuccessfullyClaimed || !showBonusSection) return;

    const timerId = setInterval(() => {
      setBonusTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timerId);
          setIsBonusOfferActive(false);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isBonusOfferActive, bonusSuccessfullyClaimed, showBonusSection]);


  useEffect(() => {
    if (bonusTimeLeft <= 0 && isBonusOfferActive && !bonusSuccessfullyClaimed && showBonusSection) {
      setIsBonusOfferActive(false);
    }
  }, [bonusTimeLeft, isBonusOfferActive, bonusSuccessfullyClaimed, showBonusSection]);

  // Update displayedApiOddsYes if initialYesPrice prop changes
  useEffect(() => {
    if (typeof initialYesPrice === 'number') {
      setDisplayedApiOddsYes(Math.max(1, Math.min(99, initialYesPrice * 100)));
    }
  }, [initialYesPrice]);


  // Effect to re-initialize bettors if initialYesPrice changes after mount (e.g., async load)
  // This only affects the *counts* of bettors for visual display.
  useEffect(() => {
    const newInitialBettors = initializeBettorsFromPrice(initialYesPrice);
    setYesBettors(newInitialBettors.yesBettors);
    setNoBettors(newInitialBettors.noBettors);
  }, [initialYesPrice]);


  // This useEffect handles the "fictional live activity" for bettor counts and pulsing.
  // It no longer directly drives the displayed odds percentages.
  useEffect(() => {
    const activityInterval = setInterval(() => {
      let madeChange = false;
      const isAddingYes = Math.random() < 0.3; 
      const isAddingNo = Math.random() < 0.25;

      if (isAddingYes) {
        setYesBettors(prev => prev + 1);
        setShowPlusOneYes(true);
        setTimeout(() => setShowPlusOneYes(false), 800);
        madeChange = true;
      }
      if (isAddingNo) {
        setNoBettors(prev => prev + 1);
        setShowPlusOneNo(true);
        setTimeout(() => setShowPlusOneNo(false), 800);
        madeChange = true;
      }
      if (madeChange) { // Only pulse if bettor counts actually changed
        setOddsPulse(true);
        setTimeout(() => setOddsPulse(false), 700);
      }
    }, 3500 + Math.random() * 2500); 
    return () => clearInterval(activityInterval);
  }, []);


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
    if (isBonusOfferActive && !bonusSuccessfullyClaimed && showBonusSection) {
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
        toastTitle = `Connect for Bonus & ${REWARD_AMOUNT} ${REWARD_CURRENCY}!`;
        toastDescription = `Connect your wallet to lock in a +${BONUS_PERCENTAGE}% bonus and get free points!`;
      }

      toast({
        title: toastTitle,
        description: toastDescription,
        duration: 8000
      });
      return;
    }

    proceedWithNavigation(userAction, actualUserChoice, bonusAppliedForThisAction);
  };

  const handleWalletConnectAndEarn = () => {
    // This function is now redundant as handleBetAction covers the logic.
    // It can be removed or repurposed if needed.
    // For now, we can have it just trigger the toast and open the modal.
    const rewardAlreadyGiven = !!address && localStorage.getItem(REWARD_GIVEN_STORAGE_KEY) === address;
    let toastTitle = "Connect Wallet";
      let toastDescription = "Please connect your wallet to continue.";
      if (!rewardAlreadyGiven) {
        toastTitle = "Connect Wallet & Earn!";
        toastDescription = `Connect your wallet to proceed and earn ${REWARD_AMOUNT} ${REWARD_CURRENCY} instantly!`;
    }
    toast({
      title: toastTitle,
      description: toastDescription,
        duration: 8000
    });
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(1, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const oppositeChoice = referrerOriginalChoice === 'YES' ? 'NO' : 'YES';

  const egoHookMessage = useMemo(() => {
    let message = "Do you trust their instincts – or bet against them?";
    if (referrerStats) {
      const cleanReferrerName = referrerName.replace(/^👑\s*@/, '@');
      if (referrerStats.winStreak > 7) {
        message = `🔥 @${cleanReferrerName} is on a ${referrerStats.winStreak}W tear. Think you can break it?`;
      } else if (referrerStats.winStreak >= 3) { 
        message = `They're on a ${referrerStats.winStreak}W streak. Feeling lucky?`;
      } else if (referrerStats.predictionRank && (referrerStats.predictionRank.includes("Top") || referrerStats.predictionRank.includes("#"))) {
        message = `${cleanReferrerName} is ${referrerStats.predictionRank}. Challenge the champ?`;
      }
    }
    return message;
  }, [referrerStats, referrerName]);

  const totalBettors = yesBettors + noBettors;

  return (
    <>
      <Card className="w-full max-w-md mx-auto shadow-xl rounded-lg text-center overflow-hidden">
        <CardHeader className="bg-muted/30 p-3 md:p-4 space-y-1">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12 md:w-16 md:h-16 border-2 border-primary">
              <AvatarImage src={referrerAvatar} alt={referrerName} data-ai-hint="person avatar" />
              <AvatarFallback>{referrerName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <h2 className="text-base md:text-lg font-semibold text-foreground">
                {referrerName === mockOpponentUser.username && "👑 "}@{referrerName}
                <span className="text-sm md:text-base font-normal text-muted-foreground"> bet <span className={referrerOriginalChoice === 'YES' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{referrerOriginalChoice}</span></span>
              </h2>
              {referrerStats && (
                <>
                  <div className="flex items-center space-x-2 md:space-x-3 mt-1">
                    {referrerStats.winStreak >= 3 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-1 text-xs text-yellow-500">
                              <Flame className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              <span className="font-bold">{referrerStats.winStreak}W</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Win Streak: {referrerStats.winStreak} wins in a row</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Coins className="w-3 h-3 md:w-4 md:h-4 mr-1 text-green-500" />
                            <span className="font-bold">{referrerStats.totalWinnings.split(' ')[0]}</span>
                            <span className="ml-0.5">{referrerStats.totalWinnings.split(' ')[1]}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Total Won: {referrerStats.totalWinnings}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Crown className="w-3 h-3 md:w-4 md:h-4 mr-1 text-purple-500" />
                            <span className="font-bold">{referrerStats.predictionRank}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Prediction Rank: {referrerStats.predictionRank}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground italic mt-1.5 text-center sm:text-left">
                    {egoHookMessage}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <p className="italic text-lg md:text-xl font-semibold text-foreground leading-tight">
            “{predictionQuestion}”
          </p>

          <div className="my-3 space-y-2 py-2 border-y border-border/30">
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Live Activity</p>
              <div className="flex justify-around items-start">
                <div className="text-center relative px-1">
                  <div className="relative inline-block">
                    <span className="text-2xl md:text-3xl font-bold text-green-500">{yesBettors}</span>
                    {showPlusOneYes && (
                      <span className="absolute -top-1.5 -right-3 text-xs md:text-sm text-green-500 animate-fade-in-out-briefly font-semibold">+1</span>
                    )}
                  </div>
                  <p className="text-xxs md:text-xs text-muted-foreground mt-0.5">Betting YES</p>
                </div>
                <div className="text-center relative px-1">
                  <div className="relative inline-block">
                    <span className="text-2xl md:text-3xl font-bold text-red-500">{noBettors}</span>
                    {showPlusOneNo && (
                      <span className="absolute -top-1.5 -right-3 text-xs md:text-sm text-red-500 animate-fade-in-out-briefly font-semibold">+1</span>
                    )}
                  </div>
                  <p className="text-xxs md:text-xs text-muted-foreground mt-0.5">Betting NO</p>
                </div>
              </div>
            </div>
            <div
              className={`text-center p-1.5 rounded-md transition-all duration-300 ${oddsPulse ? 'animate-pulse-once bg-primary/10' : 'bg-muted/30'}`}
            >
              <p className="text-xs text-muted-foreground">Current Odds:</p>
              <p className="text-base md:text-lg font-semibold">
                <span className="text-green-500">YES {displayedApiOddsYes.toFixed(0)}%</span> / <span className="text-red-500">NO {(100 - displayedApiOddsYes).toFixed(0)}%</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="flex-1 h-12 px-3 bg-gradient-to-br from-green-500 to-green-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 flex items-center justify-center space-x-1.5 text-base animate-pulse-glow"
                    onClick={() => handleBetAction('with')}
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>I'm In</span>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bet {referrerOriginalChoice} with @{referrerName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="flex-1 h-12 px-3 bg-gradient-to-br from-red-500 to-red-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 flex items-center justify-center space-x-1.5 text-base animate-pulse-glow"
                    onClick={() => handleBetAction('against')}
                  >
                    <Swords className="w-5 h-5" />
                    <span>Challenge</span>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bet {oppositeChoice} & Challenge @{referrerName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-xs text-muted-foreground mt-3 space-y-1">
            <p>🛡️ Fast, secure bets – Powered by smart contracts</p>
            <p>Go big! Share your bet to X and earn WinPoints.</p>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-3 bg-muted/20 border-t text-xs text-muted-foreground">
          
          <div className="flex items-center space-x-3">
              <div className="flex items-center">
                  <Users className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 text-blue-500" /> 12k+ Bettors
              </div>
              <div className="flex items-center">
                  <BarChartHorizontalBig className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 text-purple-500" /> 500+ Markets
              </div>
          </div>
        </CardFooter>
      </Card>

      {showBonusSection && isBonusOfferActive && !bonusSuccessfullyClaimed && (
        <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
          <BonusDisplay
            isActive={isBonusOfferActive} 
            isClaimed={bonusSuccessfullyClaimed} 
            timeLeftSeconds={bonusTimeLeft}
            durationSeconds={BONUS_DURATION_SECONDS}
            lowTimeThreshold={BONUS_LOW_TIME_THRESHOLD}
            percentage={BONUS_PERCENTAGE}
            formatTime={formatTime}
          />
        </div>
      )}
    </>
  );
}

