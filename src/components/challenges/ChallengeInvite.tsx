
// src/components/challenges/ChallengeInvite.tsx
'use client';

import type { ChallengeInviteProps } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Swords, ShieldCheck, Users, Zap, BarChartHorizontalBig, Clock, AlertTriangle, Crown, Coins, Info, Flame, Share2, Loader2, Copy, Check } from 'lucide-react';
import { mockOpponentUser } from '@/lib/mockData';
import { useAccount } from 'wagmi';
import { useUser } from '@/contexts/UserContext';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BonusDisplay from './BonusDisplay';
import { useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';

const REWARD_AMOUNT = 100;
const REWARD_CURRENCY = "WinPoints";
const REWARD_GIVEN_STORAGE_KEY = 'winBigWalletConnectRewardGiven_v1_reown';

const BONUS_DURATION_SECONDS = 120;
const BONUS_PERCENTAGE = 20;
const BONUS_LOW_TIME_THRESHOLD = 30;
const BONUS_REVEAL_DELAY = 1800;

const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955'; // BSC Mainnet USDT
const BETTING_WALLET_ADDRESS = '0x4Eaf22CA76bC525551a59bbD45D37A42284F9671'; // Your dedicated betting wallet
const USDT_ABI = [
  {"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
];

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
  referrerAvatar: passedAvatar,
  isVerified = false,
  predictionQuestion,
  predictionId,
  referrerOriginalChoice,
  initialYesPrice,
  betAmount: referrerBetAmount,
  referrerBetId,
  referrerUserId,
}: ChallengeInviteProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { appendEntryParams } = useEntryContext();
  const { address, isConnected, chain } = useAccount();
  const { xProfile } = useUser();
  const { data: hash, writeContract } = useWriteContract();

  const [pendingActionData, setPendingActionData] = useState<{
    userAction: 'with' | 'against';
    actualUserChoice: 'YES' | 'NO';
    bonusApplied: boolean;
  } | null>(null);

  const [lastUserAction, setLastUserAction] = useState<'with' | 'against' | null>(null);

  const [hasSufficientBalance, setHasSufficientBalance] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [betAmount, setBetAmount] = useState(10);

  // Use passed avatar or generate fallback
  const referrerAvatar = passedAvatar || null;
  
  // Clean display name (remove @ if present for initials)
  const cleanName = referrerName.replace('@', '');

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
  
  // Prediction share state (for sharing without betting)
  const [isGeneratingPredictionShare, setIsGeneratingPredictionShare] = useState(false);
  const [predictionShareUrl, setPredictionShareUrl] = useState<string | null>(null);
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);


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


  const proceedWithNavigation = useCallback((userAction: 'with' | 'against', actualUserChoice: 'YES' | 'NO', bonusApplied: boolean) => {
    const params = new URLSearchParams();
    params.set('matchId', originalChallengeMatchId);
    params.set('predictionId', predictionId);
    params.set('userChoice', actualUserChoice);
    if (bonusApplied) {
      params.set('bonusApplied', 'true');
    }

    const path = appendEntryParams(`/match/${originalChallengeMatchId}?${params.toString()}`);
    router.push(path);
  }, [router, appendEntryParams, originalChallengeMatchId, predictionId]);

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


    const handleBetAction = async (userAction: 'with' | 'against') => {
    if (!isConnected || !address) {
      // Logic for non-connected users (toast, etc.) remains the same
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to place a bet.",
        duration: 5000
      });
      return;
    }

    if (chain?.id !== 56) { // 56 is the chain ID for BSC Mainnet
      toast({
        title: "Wrong Network",
        description: "Please switch to the Binance Smart Chain network to place a bet.",
        duration: 5000
      });
      // Optionally, you can trigger a network switch request here
      return;
    }

    // Store the userAction for use after transaction success
    setLastUserAction(userAction);

    setIsConfirming(true);
    toast({
      title: 'Confirming Transaction...',
      description: 'Please confirm the transaction in your wallet.',
      duration: 10000,
    });

    try {
             writeContract({
        address: USDT_CONTRACT_ADDRESS,
        abi: USDT_ABI,
        functionName: 'transfer',
        args: [BETTING_WALLET_ADDRESS, parseUnits(betAmount.toString(), 18)], // USDT has 18 decimals
      });
    } catch (error) {
      setIsConfirming(false);
      setLastUserAction(null); // Clear on error
      toast({
        title: 'Transaction Failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      });
      console.error("Transaction error:", error);
    }
  };

  const recordBetInSupabase = useCallback(async (txHash: string, userAction: 'with' | 'against', actualUserChoice: 'YES' | 'NO', bonusApplied: boolean) => {
    try {
      console.log('🎯 Recording bet in Supabase for transaction:', txHash);

      // Get market odds (simplified - you might want to fetch real odds)
      const yesPrice = displayedApiOddsYes / 100; // Convert percentage to decimal
      const noPrice = (100 - displayedApiOddsYes) / 100;

      const betData = {
        user_id: address || 'unknown_user', // Use wallet address
        market_id: predictionId,
        outcome: actualUserChoice,
        amount: betAmount,
        odds_shown_to_user: actualUserChoice === 'YES' ? yesPrice : noPrice,
        potential_payout: betAmount * (actualUserChoice === 'YES' ? (1 / yesPrice) : (1 / noPrice)), // Simple calculation
        status: 'pending' as const,
        tx_hash: txHash, // Include transaction hash for idempotency
        // Affiliate tracking: link this bet to the referrer
        referrer_bet_id: referrerBetId || null,
        referrer_user_id: referrerUserId || null,
      };

      console.log('📝 Bet data to record:', betData);
      if (referrerBetId || referrerUserId) {
        console.log('🔗 Affiliate referral attached:', { referrerBetId, referrerUserId });
      }

      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData),
      });

      const result = await response.json();
      console.log('📥 Supabase API response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to record bet in database.');
      }

      console.log('✅ Bet recorded successfully in Supabase:', result.data);

      toast({
        title: 'Bet Recorded!',
        description: 'Your bet has been saved to our database.',
        duration: 3000,
      });

    } catch (error: any) {
      console.error('❌ Failed to record bet in Supabase:', error);
      toast({
        variant: 'destructive',
        title: 'Database Error',
        description: 'Bet recorded on blockchain but failed to save to database. Please contact support.',
        duration: 10000,
      });
    }
  }, [address, predictionId, betAmount, displayedApiOddsYes, toast, referrerBetId, referrerUserId]);

  // Handler for generating a prediction share link (no bet required)
  const handleSharePrediction = useCallback(async (stance: 'YES' | 'NO') => {
    if (!address) {
      toast({
        title: "Connect Wallet",
        description: "Connect your wallet to share your prediction!",
        duration: 5000,
      });
      return;
    }

    setIsGeneratingPredictionShare(true);
    
    try {
      console.log('🔗 Generating prediction share for:', { stance, predictionId, address });
      
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: address,
          username: xProfile?.x_username || null,
          market_id: predictionId,
          predicted_outcome: stance,
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data?.share_url) {
        setPredictionShareUrl(result.data.share_url);
        
        // Copy to clipboard
        await navigator.clipboard.writeText(result.data.share_url);
        setShowCopiedTooltip(true);
        setTimeout(() => setShowCopiedTooltip(false), 2000);
        
        toast({
          title: "🔗 Share Link Created!",
          description: "Link copied to clipboard. Share it to challenge your friends!",
          duration: 5000,
        });
        
        console.log('✅ Prediction share link generated:', result.data.share_url);
      } else {
        throw new Error(result.error || 'Failed to create share link');
      }
    } catch (error: any) {
      console.error('❌ Error generating prediction share:', error);
      toast({
        variant: 'destructive',
        title: 'Share Error',
        description: error.message || 'Could not create share link',
      });
    } finally {
      setIsGeneratingPredictionShare(false);
    }
  }, [address, predictionId, toast]);

  useEffect(() => {
    if (hash) {
      setIsConfirming(false);
      toast({
        title: 'Transaction Successful!',
        description: `Your bet has been placed. Transaction hash: ${hash.slice(0, 10)}...`,
        duration: 8000,
        action: (
          <a href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noopener noreferrer">
            View on BscScan
          </a>
        ),
      });

      let actualUserChoice: 'YES' | 'NO';
      // Use the stored userAction from when the transaction was initiated
      const userAction = lastUserAction || 'with'; // Fallback to 'with' if somehow not set

      if (userAction === 'with') {
        actualUserChoice = referrerOriginalChoice;
      } else {
        actualUserChoice = referrerOriginalChoice === 'YES' ? 'NO' : 'YES';
      }

      // CRITICAL FIX: Record the bet in Supabase
      recordBetInSupabase(hash, userAction, actualUserChoice, bonusSuccessfullyClaimed);

      // Navigate after successful transaction
      proceedWithNavigation(userAction, actualUserChoice, bonusSuccessfullyClaimed);

      // Clear the stored action
      setLastUserAction(null);

    }
  }, [hash, bonusSuccessfullyClaimed, proceedWithNavigation, referrerOriginalChoice, recordBetInSupabase, lastUserAction]);


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
      <Card className="w-full max-w-md mx-auto shadow-xl rounded-2xl overflow-hidden border-0 bg-gradient-to-br from-card via-card to-muted/20">
        {/* Clean unified header */}
        <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 md:p-5">
          <div className="flex items-center gap-4">
            {/* Avatar with verified badge */}
            <div className="relative shrink-0">
              {referrerAvatar ? (
                <img 
                  src={referrerAvatar} 
                  alt={cleanName}
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 border-primary/30 shadow-lg"
                />
              ) : (
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {cleanName.charAt(0).toUpperCase()}
                </div>
              )}
              {isVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1DA1F2] rounded-full flex items-center justify-center border-2 border-background shadow">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-foreground">
                  {referrerName}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {isVerified ? 'Verified Predictor' : 'Predictor'}
              </p>
            </div>
            
            {/* Their stance */}
            <div className="text-right">
              <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-sm ${
                referrerOriginalChoice === 'YES'
                  ? 'bg-green-500/15 text-green-500 border border-green-500/30'
                  : 'bg-red-500/15 text-red-500 border border-red-500/30'
              }`}>
                {referrerOriginalChoice === 'YES' ? '👍' : '👎'} {referrerOriginalChoice}
              </div>
              {referrerBetAmount && (
                <p className="text-xs text-muted-foreground mt-1">
                  ${referrerBetAmount} bet
                </p>
              )}
            </div>
          </div>
          
          {/* Challenge prompt */}
          <div className="mt-4 p-3 bg-background/60 rounded-xl border border-border/50">
            <p className="text-sm text-center">
              <span className="text-muted-foreground">Think </span>
              <span className="font-semibold">{referrerName}</span>
              <span className="text-muted-foreground"> is wrong? </span>
              <span className="font-bold text-primary">Prove it!</span>
            </p>
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
        <CardFooter className="flex flex-col gap-3 p-3 bg-muted/20 border-t">
          {/* Share Prediction Button */}
          <div className="w-full">
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip open={showCopiedTooltip}>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSharePrediction(referrerOriginalChoice)}
                      disabled={isGeneratingPredictionShare}
                      className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 hover:border-purple-500/50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      {isGeneratingPredictionShare ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : showCopiedTooltip ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Share2 className="w-4 h-4 text-purple-500" />
                      )}
                      {isGeneratingPredictionShare ? 'Creating...' : predictionShareUrl ? 'Copied!' : 'Share My Prediction'}
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Link copied! 🎉</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {predictionShareUrl && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    await navigator.clipboard.writeText(predictionShareUrl);
                    setShowCopiedTooltip(true);
                    setTimeout(() => setShowCopiedTooltip(false), 2000);
                    toast({ title: "Copied!", description: "Link copied to clipboard" });
                  }}
                  className="py-2 px-3 rounded-lg bg-muted hover:bg-muted/80 transition-all"
                >
                  <Copy className="w-4 h-4" />
                </motion.button>
              )}
            </div>
            {!isConnected && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Connect wallet to share your prediction 👆
              </p>
            )}
          </div>
          
          {/* Stats row */}
          <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 text-blue-500" /> 12k+ Bettors
              </div>
              <div className="flex items-center">
                <BarChartHorizontalBig className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 text-purple-500" /> 500+ Markets
              </div>
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

