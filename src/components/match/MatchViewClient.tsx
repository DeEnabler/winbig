// src/components/match/MatchViewClient.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useEstimateGas,
} from 'wagmi';
import { parseUnits, encodeFunctionData } from 'viem';

import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { useCurrentChainId } from '@/hooks/useCurrentChainId';
import { appKit } from '@/components/providers/wagmi-config';

import { supabase } from '@/lib/supabase';
import type { BetRecord } from '@/lib/supabase';
import { mockCurrentUser } from '@/lib/mockData';
import type { Match, ExecutionPreview, MatchViewProps } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import ShareDialog from '@/components/sharing/ShareDialog'; 
import { ExecutionPreviewDisplay } from '@/components/match/ExecutionPreviewDisplay';

import { Loader2, Share2, Zap } from 'lucide-react';

const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const BETTING_WALLET_ADDRESS = '0x4Eaf22CA76bC525551a59bbD45D37A42284F9671';
const USDT_ABI = [
  {"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
] as const;

function formatTimeLeft(ends: number) {
  const diff = ends - Date.now();
  if (diff <= 0) return "00:00:00";
  const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
  const minutes = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
  const seconds = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export default function MatchViewClient({ match: initialMatch }: MatchViewProps) {
  const router = useRouter();
  const { appendEntryParams } = useEntryContext();
  const { toast } = useToast();
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  const [match, setMatch] = useState(initialMatch);
  const [betAmountState, setBetAmountState] = useState(match.betAmount || 10);
  const [isBetting, setIsBetting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<'YES' | 'NO' | null>(match.userChoice || null);
  const [betPlaced, setBetPlaced] = useState(!!match.userBet);
  
  const transferData = useMemo(() => {
    if (!betAmountState || !selectedChoice) return undefined;
    
    const amountInWei = parseUnits(betAmountState.toString(), 18);
    const data = encodeFunctionData({
      abi: USDT_ABI,
      functionName: 'transfer',
      args: [BETTING_WALLET_ADDRESS, amountInWei],
    });
    
    return data;
  }, [betAmountState, selectedChoice]);

  // Add gas estimation for accurate fees
  const { data: gasEstimate } = useEstimateGas(
    transferData
      ? {
          to: USDT_CONTRACT_ADDRESS,
          data: transferData,
        }
      : undefined
  );

  const { data: txHash, sendTransaction, error: sendError, isPending: isSubmitting } = useSendTransaction();

  // Log gas estimates for monitoring
  useEffect(() => {
    if (gasEstimate) {
      console.log('⛽ Gas estimate:', gasEstimate.toString(), 'units');
    }
  }, [gasEstimate]);

  const { isSuccess: isConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(match.countdownEnds));
  const [countdownProgress, setCountdownProgress] = useState(100);
  const [shareMessage, setShareMessage] = useState<string>('');
  const [isLoadingShareMessage, setIsLoadingShareMessage] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [executionPreview, setExecutionPreview] = useState<ExecutionPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const debouncedBetAmount = useDebounce(betAmountState, 300);

  useEffect(() => {
    if (!selectedChoice || debouncedBetAmount <= 0) {
      setExecutionPreview(null);
      return;
    }
    setIsLoadingPreview(true);
    const apiUrl = `/api/execution-analysis?condition_id=${match.predictionId}&outcome=${selectedChoice}&amount=${debouncedBetAmount}&side=BUY`;
    fetch(apiUrl)
      .then(res => res.ok ? res.json() : res.json().then(err => { throw new Error(err.error || 'API Error') }))
      .then((data: ExecutionPreview) => setExecutionPreview(data))
      .catch(err => {
        console.error("Critical execution preview fetch error:", err);
        setExecutionPreview({ success: false, error: err.message || 'Could not fetch preview.' });
      })
      .finally(() => setIsLoadingPreview(false));
  }, [debouncedBetAmount, selectedChoice, match.predictionId]);

  const appUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');

  const ogImageUrl = useMemo(() => {
    const url = new URL(`${appUrl}/api/og`);
    url.searchParams.set('v', Date.now().toString());
    url.searchParams.set('predictionText', match.predictionText);
    if (selectedChoice) url.searchParams.set('userChoice', selectedChoice);
    url.searchParams.set('userAvatar', match.user1AvatarUrl || mockCurrentUser.avatarUrl || 'https://placehold.co/128x128.png?text=WB');
    url.searchParams.set('username', match.user1Username === 'You' ? 'I' : match.user1Username);
    url.searchParams.set('outcome', betPlaced ? 'PENDING' : 'CHALLENGE');
    const displayBetAmount = betPlaced ? (match.userBet?.amount || betAmountState) : betAmountState;
    url.searchParams.set('betAmount', (displayBetAmount || 0).toString());
    if (match.betSize) url.searchParams.set('betSize', match.betSize);
    if (match.streak) url.searchParams.set('streak', match.streak);
    if (match.rank) url.searchParams.set('rank', match.rank);
    if (match.rankCategory) url.searchParams.set('rankCategory', match.rankCategory);
    if (match.bonusApplied) url.searchParams.set('bonus', 'true');
    return url.toString();
  }, [match, appUrl, betAmountState, selectedChoice, betPlaced]);

  useEffect(() => {
    const initialDuration = Math.max(0, match.countdownEnds - Date.now());
    if (initialDuration === 0) {
      setTimeLeft("Match Ended");
      setCountdownProgress(0);
      return;
    }
    const timer = setInterval(() => {
      const newTimeLeft = match.countdownEnds - Date.now();
      if (newTimeLeft <= 0) {
        setTimeLeft("Match Ended");
        setCountdownProgress(0);
        clearInterval(timer);
      } else {
        setTimeLeft(formatTimeLeft(match.countdownEnds));
        setCountdownProgress((newTimeLeft / initialDuration) * 100);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [match.countdownEnds]);

  const handleGenerateShareMessage = async () => {
    if (shareMessage && !isLoadingShareMessage) return;
    if (!betPlaced && !match.isConfirmingChallenge) {
      setShareMessage("Place your bet to generate a share message!");
      return;
    }
    setIsLoadingShareMessage(true);
    let defaultMsg = `I just bet $${match.userBet?.amount || betAmountState} that "${match.predictionText}"! Potential winnings: $${executionPreview?.potentialPayout?.toFixed(2)}! #WinBig`;
    if (match.bonusApplied || match.userBet?.bonusApplied) {
      defaultMsg += " (includes +20% Bonus!)";
    }
    setShareMessage(defaultMsg);
    setIsLoadingShareMessage(false);
  };

  const openShareDialog = () => {
    if (!betPlaced) {
      toast({ title: "Action Required", description: "Please place your bet before sharing." });
      return;
    }
    handleGenerateShareMessage();
    setIsShareDialogOpen(true);
  };

  const handlePlaceBet = async () => {
    if (!selectedChoice) {
      toast({ variant: 'destructive', title: 'Selection Required', description: 'Please choose YES or NO.' });
      return;
    }
    if (!isConnected) {
      toast({ title: 'Connect Wallet', description: 'Please connect your wallet to place a bet.' });
      appKit.open();
      return;
    }
    if (chain?.id !== 56) {
      // BSC Mainnet
      toast({ title: 'Switching to BSC', description: 'Please approve the network switch to continue.' });
      try {
        await switchChain({ chainId: 56 });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Network Switch Failed', description: 'Please switch to BSC manually.' });
        return;
      }
    }

    if (!transferData) {
      toast({ variant: 'destructive', title: 'Transaction Error', description: 'Could not prepare transaction data.' });
      return;
    }

    // Log final transaction parameters
    console.log('💰 Sending USDT transfer:', betAmountState, 'USDT, Gas:', gasEstimate?.toString() || 'wallet-managed');

    if (sendTransaction) {
      setIsBetting(true);
      toast({ title: 'Confirming...', description: 'Please confirm the transaction in your wallet.' });
      sendTransaction({
        to: USDT_CONTRACT_ADDRESS,
        data: transferData,
        gas: gasEstimate || null, // Use estimated gas or let wallet handle
      });
    }
  };

  const proceedWithBetPlacement = useCallback(async () => {
    try {
      if (!selectedChoice) return;
      
      const betPayload = {
        userId: mockCurrentUser.id,
        challengeMatchId: match.id,
        predictionId: match.predictionId,
        choice: selectedChoice,
        amount: betAmountState,
        referrerName: match.originalReferrer,
        bonusApplied: match.bonusApplied ?? false,
      };
      
      // If Supabase is not configured, simulate successful bet placement for testing
      if (!supabase) {
        console.warn('⚠️ Supabase not configured - simulating bet placement for testing');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        
        toast({ title: "Bet Confirmed!", description: `Your ${selectedChoice} bet is in! (Demo mode - no backend)` });
        setMatch(prev => ({ 
          ...prev, 
          userBet: { 
            side: selectedChoice, 
            amount: betAmountState, 
            status: 'PENDING', 
            bonusApplied: betPayload.bonusApplied 
          } 
        }));
        setBetPlaced(true);
        return;
      }
      
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betPayload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to place bet via API.');
      }
      toast({ title: "Bet Confirmed!", description: `Your ${selectedChoice} bet is in!` });
      setMatch(prev => ({ ...prev, userBet: { side: selectedChoice, amount: betAmountState, status: 'PENDING', bonusApplied: result.data?.bonusApplied ?? false } }));
      setBetPlaced(true);
      
      // Set up real-time subscription only if Supabase is available
      if (supabase && result.data?.betId) {
        const channel = supabase
          .channel(`bet-status:${result.data.betId}`)
          .on<BetRecord>(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'bets', filter: `id=eq.${result.data.betId}` },
            (payload: { new: BetRecord }) => {
              console.log('📬 Bet status update received:', payload.new);
              const updatedBet = payload.new;
              if (updatedBet.status === 'executed' || updatedBet.status === 'failed') {
                setMatch(prev => ({
                  ...prev,
                  userBet: {
                    ...prev.userBet!,
                    status: updatedBet.status === 'executed' ? 'WON' : 'LOST',
                  }
                }));
                toast({
                  title: `Bet ${updatedBet.status}!`,
                  description: `Your bet has been ${updatedBet.status}.`,
                  variant: updatedBet.status === 'failed' ? 'destructive' : 'default'
                });
                channel.unsubscribe();
              }
            }
          )
          .subscribe();
      }
    } catch (error: any) {
      console.error("Bet placement API error:", error);
      toast({
        variant: "destructive",
        title: "Bet Placement Failed",
        description: error.message || 'An unexpected error occurred.'
      });
    } finally {
      setIsBetting(false);
    }
  }, [selectedChoice, betAmountState, match, supabase, toast]);

  useEffect(() => {
    if (sendError) {
      setIsBetting(false);
      // NOTE: We access `shortMessage` for a user-friendly error, as per wagmi's BaseError type.
      toast({ variant: 'destructive', title: 'Transaction Failed', description: (sendError as any).shortMessage || 'An unknown error occurred.' });
    }
    if (txHash) {
      toast({ title: 'Transaction Sent!', description: `Waiting for confirmation... Tx: ${txHash.slice(0, 10)}...` });
    }
  }, [sendError, txHash, toast]);

  useEffect(() => {
    if (isConfirmed) {
      setIsBetting(false);
      toast({ title: "Transaction Confirmed!", description: "Your payment is confirmed. Placing bet..." });
      proceedWithBetPlacement();
    }
  }, [isConfirmed, proceedWithBetPlacement, toast]);

  const totalPot = useMemo(() => {
    const yesBets = 1000;
    const noBets = 500;
    return yesBets + noBets;
  }, []);

  const choiceData = useMemo(() => {
    const yesPrice = executionPreview?.success ? (executionPreview.vwap || 0) * 100 : 50;
    const noPrice = 100 - yesPrice;
    return {
      YES: { label: 'YES', price: yesPrice, color: 'text-green-500', gradient: 'from-green-500/10 to-transparent' },
      NO: { label: 'NO', price: noPrice, color: 'text-red-500', gradient: 'from-red-500/10 to-transparent' },
    };
  }, [executionPreview]);

  return (
    <div className="max-w-2xl mx-auto">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-lg mx-auto shadow-xl rounded-lg"
        >
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={match.user1AvatarUrl} alt={match.user1Username} />
                    <AvatarFallback>{match.user1Username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm">{match.user1Username}</h3>
                    <p className="text-xs text-muted-foreground">Predictor</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Pot</p>
                  <p className="font-bold text-lg">${totalPot.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-lg font-semibold text-center my-3">{match.predictionText}</p>
            </CardHeader>
            
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(choiceData).map(([key, data]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedChoice(key as 'YES' | 'NO')}
                    className={`relative p-3 rounded-lg border-2 text-center transition-all duration-200 ${selectedChoice === key ? 'border-primary shadow-lg' : 'border-border'}`}
                  >
                    <p className="text-2xl font-bold">{data.label}</p>
                    <p className={`text-xl font-semibold ${data.color}`}>{data.price.toFixed(1)}%</p>
                    {isLoadingPreview && !executionPreview && <Skeleton className="h-5 w-1/2 mx-auto mt-1" />}
                  </button>
                ))}
              </div>
              
              <div className={`p-3 rounded-lg transition-all ${!selectedChoice ? 'bg-muted/50' : 'bg-transparent'}`}>
                <div className="flex items-center justify-between">
                  <Label htmlFor="betAmount" className="text-lg">Your Bet</Label>
                  <div className="flex items-center space-x-1">
                    <span className="text-2xl font-bold">$</span>
                    <Input
                      id="betAmount"
                      type="number"
                      value={betAmountState}
                      onChange={(e) => setBetAmountState(Number(e.target.value))}
                      placeholder="10"
                      min={1}
                      className="w-full h-10 text-xl font-bold text-right bg-transparent border-0 shadow-none focus-visible:ring-0 p-0"
                      disabled={isBetting || isConfirming}
                    />
                  </div>
                </div>
                <Slider
                  defaultValue={[10]}
                  max={100}
                  step={1}
                  value={[betAmountState]}
                  onValueChange={(value) => setBetAmountState(value[0])}
                  disabled={isBetting || isConfirming}
                />
              </div>

              {executionPreview && (
                <ExecutionPreviewDisplay preview={executionPreview} isLoading={isLoadingPreview} />
              )}

            </CardContent>

            <CardFooter className="p-4 flex flex-col space-y-3">
              <Button
                onClick={handlePlaceBet}
                size="lg"
                className="w-full font-bold text-lg"
                disabled={isBetting || isConfirming || isSubmitting || !sendTransaction}
              >
                {isBetting || isConfirming || isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-5 w-5" />
                )}
                {isConfirming ? 'Confirming...' : isSubmitting ? 'Check Wallet...' : isBetting ? 'Processing...' : `Place Bet on ${selectedChoice || ''}`}
              </Button>
              <Button
                onClick={openShareDialog}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={!betPlaced}
              >
                <Share2 className="mr-2 h-5 w-5" /> Share Challenge
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>

      <ShareDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        shareMessage={shareMessage}
        isLoading={isLoadingShareMessage}
        ogImageUrl={ogImageUrl}
        shareUrl={`${appUrl}/match/${match.id}?predictionId=${match.predictionId}${match.bonusApplied ? '&bonusApplied=true' : ''}`}
        entityContext="match_challenge"
      />
    </div>
  );
}