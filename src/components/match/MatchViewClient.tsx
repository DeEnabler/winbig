
// src/components/match/MatchViewClient.tsx
'use client';

import type { MatchViewProps, ShareMessageDetails, ExecutionPreview } from '@/types';
import { mockCurrentUser, mockOpponentUser } from '@/lib/mockData';
import NextImage from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Share2, ArrowLeft, TrendingUp, CheckCircle, Sparkles, Loader2, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateXShareMessage } from '@/ai/flows/generate-x-share-message';
import Link from 'next/link';
import ShareDialog from '@/components/sharing/ShareDialog';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

function formatTimeLeft(endDate: number) {
  const totalSeconds = Math.max(0, Math.floor((endDate - Date.now()) / 1000));
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  if (seconds > 0) return `${seconds}s left`;
  return "Match Ended";
}

// Debounce hook
function useDebounce(value: any, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export default function MatchViewClient({ match: initialMatch }: MatchViewProps) {
  const router = useRouter();
  const { appendEntryParams } = useEntryContext();
  const { toast } = useToast();

  const [match, setMatch] = useState(initialMatch);
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(match.countdownEnds));
  const [countdownProgress, setCountdownProgress] = useState(100);

  const [shareMessage, setShareMessage] = useState<string>('');
  const [isLoadingShareMessage, setIsLoadingShareMessage] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const [betAmountState, setBetAmountState] = useState(match.betAmount || 10);
  const [isBetting, setIsBetting] = useState(false);
  
  const [selectedChoice, setSelectedChoice] = useState<'YES' | 'NO' | null>(match.userChoice || null);
  const [betPlaced, setBetPlaced] = useState(!!match.userBet);
  
  const [executionPreview, setExecutionPreview] = useState<ExecutionPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [usingFallbackPrice, setUsingFallbackPrice] = useState(false);

  const debouncedBetAmount = useDebounce(betAmountState, 300);

  useEffect(() => {
    if (!selectedChoice || debouncedBetAmount <= 0) {
      setExecutionPreview(null);
      return;
    }

    const assetId = selectedChoice === 'YES' ? match.yesAssetId : match.noAssetId;
    if (!assetId) return;

    setIsLoadingPreview(true);
    setUsingFallbackPrice(false);

    fetch(`/api/execution-analysis?asset_id=${assetId}&amount=${debouncedBetAmount}&side=BUY`)
      .then(res => {
        if (!res.ok) {
          // This happens on 404 (order book not found) or 500 errors
          return res.json().then(errData => Promise.reject(errData));
        }
        return res.json();
      })
      .then((data: ExecutionPreview) => {
        if (data.success) {
          setExecutionPreview(data);
        } else {
           // This case is for success:false but 200 OK, less likely but safe to handle
          throw new Error(data.error || "Could not fetch preview.");
        }
      })
      .catch(err => {
        console.warn("Execution preview fetch failed, using fallback pricing. Reason:", err.error || err);
        setExecutionPreview(null); // Clear any stale preview data
        setUsingFallbackPrice(true); // Set flag to use fallback price
      })
      .finally(() => {
        setIsLoadingPreview(false);
      });

  }, [debouncedBetAmount, selectedChoice, match.yesAssetId, match.noAssetId]);


  const potentialPayout = useMemo(() => {
    if (!selectedChoice) return '0.00';

    // Primary: Use VWAP from successful execution preview
    if (executionPreview?.success && executionPreview.vwap && executionPreview.vwap > 0) {
      let payout = betAmountState / executionPreview.vwap;
      if (match.bonusApplied) {
          payout *= 1.20;
      }
      return payout.toFixed(2);
    }

    // Fallback: Use the simple 'buy' price from the market data
    if (match.liveMarketData) {
      const priceData = selectedChoice === 'YES' ? match.liveMarketData.pricing.yes : match.liveMarketData.pricing.no;
      if (priceData && priceData.buy > 0) {
        let payout = betAmountState / priceData.buy;
        if (match.bonusApplied) {
            payout *= 1.20;
        }
        return payout.toFixed(2);
      }
    }

    return '0.00';
  }, [betAmountState, selectedChoice, match.bonusApplied, executionPreview, match.liveMarketData, usingFallbackPrice]);


  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const appUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');

  const ogImageUrl = useMemo(() => {
    const url = new URL(`${appUrl}/api/og`);
    url.searchParams.set('v', Date.now().toString());
    url.searchParams.set('predictionText', match.predictionText);
    if(selectedChoice) url.searchParams.set('userChoice', selectedChoice);
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
    try {
      const baseBetAmount = match.userBet?.amount || betAmountState;
      const details: ShareMessageDetails = {
        predictionText: match.predictionText,
        betAmount: baseBetAmount,
        potentialWinnings: parseFloat(potentialPayout),
        opponentUsername: typeof match.opponent === 'string' ? match.opponent : match.opponent?.username || 'a Rival',
      };
      const result = await generateXShareMessage(details);
      let finalMessage = result.shareMessage;
      if (match.bonusApplied || match.userBet?.bonusApplied) {
        finalMessage += " (+20% Bonus!)";
      }
      setShareMessage(finalMessage);
    } catch (error) {
      console.error("Failed to generate share message:", error);
      let defaultMsg = `I just bet $${match.userBet?.amount || betAmountState} that "${match.predictionText}"! Potential winnings: $${potentialPayout}! #WinBig`;
      if (match.bonusApplied || match.userBet?.bonusApplied) {
        defaultMsg += " (includes +20% Bonus!)";
      }
      setShareMessage(defaultMsg);
      toast({ variant: "destructive", title: "Error", description: "Could not generate AI share message. Using default." });
    } finally {
      setIsLoadingShareMessage(false);
    }
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
    if (!selectedChoice || !match.predictionId) return;
    setIsBetting(true);
    toast({
        title: "Placing your bet...",
        description: `You chose ${selectedChoice} for "${match.predictionText.substring(0,30)}...". Amount: $${betAmountState}${match.bonusApplied ? " (+20% Bonus!)" : ""}`,
    });

    try {
        const response = await fetch('/api/bets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: mockCurrentUser.id,
                challengeMatchId: match.id,
                predictionId: match.predictionId,
                choice: selectedChoice,
                amount: betAmountState,
                referrerName: match.originalReferrer,
                bonusApplied: match.bonusApplied ?? false,
            }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to place bet via API.');
        }

        toast({
            title: "Bet Confirmed & Placed!",
            description: `Your ${selectedChoice} bet for $${betAmountState} is in! Good luck!${result.data?.bonusApplied ? " Bonus applied!" : ""}`,
        });

        setMatch(prevMatch => ({
            ...prevMatch,
            isConfirmingChallenge: false,
            userBet: {
                side: selectedChoice,
                amount: betAmountState,
                status: 'PENDING',
                bonusApplied: result.data?.bonusApplied ?? false,
            },
            betAmount: betAmountState,
            bonusApplied: result.data?.bonusApplied ?? false,
        }));
        setBetPlaced(true);

    } catch (error) {
        console.error("Error confirming bet:", error);
        toast({
            variant: "destructive",
            title: "Bet Confirmation Failed",
            description: error instanceof Error ? error.message : "Could not place your bet. Please try again.",
        });
    } finally {
        setIsBetting(false);
    }
  };


  return (
    <>
      <Card className="w-full max-w-lg mx-auto shadow-xl rounded-lg">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="text-xl font-bold text-center grow">{match.predictionText}</CardTitle>
            <div className="w-8"></div> {/* Spacer */}
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="relative w-full h-40 md:h-48 rounded-md overflow-hidden mb-4 shadow-md">
              <NextImage
                src={match.imageUrl || 'https://placehold.co/600x400.png'}
                alt={match.predictionText}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
                data-ai-hint={match.aiHint || 'prediction'}
              />
          </div>

          <div className="flex justify-around items-center text-center">
            <div className="flex flex-col items-center space-y-1">
              <Avatar className="w-16 h-16 border-2 border-primary">
                <AvatarImage src={match.user1AvatarUrl} alt={match.user1Username} data-ai-hint="person portrait" />
                <AvatarFallback>{match.user1Username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-semibold">{match.user1Username}</span>
            </div>
            <span className="text-3xl font-bold text-muted-foreground px-2">VS</span>
            <div className="flex flex-col items-center space-y-1">
              <Avatar className="w-16 h-16 border-2 border-secondary">
                <AvatarImage src={match.user2AvatarUrl} alt={match.user2Username} data-ai-hint="person portrait" />
                <AvatarFallback>{match.user2Username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-semibold">{match.user2Username}</span>
            </div>
          </div>
          
           {!betPlaced ? (
             <>
                <div className="space-y-2">
                  <p className="text-center text-sm font-medium text-muted-foreground">1. Make your prediction</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                        onClick={() => setSelectedChoice('YES')} 
                        variant={selectedChoice === 'YES' ? 'default' : 'outline'}
                        className={cn("h-14 text-xl font-bold border-2", selectedChoice === 'YES' && "border-primary bg-green-500/10 text-green-700 dark:text-green-300")}
                    >
                      YES
                    </Button>
                    <Button 
                        onClick={() => setSelectedChoice('NO')} 
                        variant={selectedChoice === 'NO' ? 'destructive' : 'outline'}
                        className={cn("h-14 text-xl font-bold border-2", selectedChoice === 'NO' && "border-destructive bg-red-500/10 text-red-700 dark:text-red-400")}
                    >
                      NO
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-center text-sm font-medium text-muted-foreground">2. Set your amount</p>
                  
                  <div className="flex justify-between items-center gap-4">
                    <label htmlFor="betAmountInput" className="text-base font-semibold text-foreground shrink-0">
                      Your Bet
                    </label>
                    <div className="flex items-center gap-1 border rounded-lg px-3 py-1 focus-within:ring-2 focus-within:ring-ring w-full max-w-[150px] ml-auto">
                      <span className="text-lg font-bold text-muted-foreground">$</span>
                      <Input
                        id="betAmountInput"
                        type="number"
                        value={betAmountState}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                          if (!isNaN(value)) {
                            const newAmount = Math.max(1, value);
                            setBetAmountState(newAmount);
                          }
                        }}
                        min={1}
                        className="w-full h-10 text-xl font-bold text-right bg-transparent border-0 shadow-none focus-visible:ring-0 p-0"
                        disabled={isBetting}
                      />
                    </div>
                  </div>

                  <Slider
                    id="betAmountSlider"
                    min={1}
                    max={Math.max(100, betAmountState)}
                    step={1}
                    value={[betAmountState]}
                    onValueChange={(value) => setBetAmountState(value[0])}
                    disabled={isBetting}
                  />

                  <div className="text-center p-3 bg-muted/50 rounded-lg space-y-1.5 text-sm">
                      {isLoadingPreview && <Skeleton className="h-5 w-3/4 mx-auto" />}
                      {!isLoadingPreview && executionPreview?.success && (
                        <>
                          <div className="font-semibold">Avg. Execution Price: <span className="text-primary">${executionPreview.vwap}</span></div>
                          <div className="text-xs text-muted-foreground">{executionPreview.summary}</div>
                        </>
                      )}
                      {usingFallbackPrice && (
                         <div className="text-muted-foreground text-xs flex items-center justify-center gap-1.5"><Info className="w-3.5 h-3.5" /> Using best available price. Deep analysis unavailable.</div>
                      )}

                      <div className="text-lg font-bold">
                        Potential Payout: <span className="text-green-600 dark:text-green-400">${potentialPayout}</span>
                        {match.bonusApplied && (
                          <Badge variant="default" className="ml-2 bg-yellow-400 text-yellow-900 hover:bg-yellow-400/90 text-xs">
                            <Sparkles className="w-3 h-3 mr-1" /> +20% Bonus
                          </Badge>
                        )}
                      </div>
                  </div>
                </div>
              </>
            ) : (
                <div className="text-center text-lg pt-4 pb-2 border-y my-4">
                  <p className="flex items-center justify-center text-green-600 font-bold text-2xl">
                    <CheckCircle className="w-8 h-8 mr-2"/>
                    Bet Placed!
                  </p>
                  <p className="mt-2">You bet <span className="font-bold text-primary">${betAmountState} on {selectedChoice}</span>.</p>
                  <p>
                    Potential Payout: <span className="font-bold text-green-600 dark:text-green-400">${potentialPayout}</span>
                    {match.bonusApplied && (
                      <Badge variant="default" className="ml-2 bg-yellow-400 text-yellow-900 hover:bg-yellow-400/90 text-xs">
                        <Sparkles className="w-3 h-3 mr-1" /> +20% Bonus
                      </Badge>
                    )}
                  </p>
                </div>
            )}

          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Time Remaining</span>
              <span>{timeLeft}</span>
            </div>
            <Progress value={countdownProgress} className="w-full h-2 bg-primary/30 [&>span]:bg-primary" />
          </div>
        </CardContent>

        <CardFooter className="p-4 flex flex-col gap-3">
           {betPlaced ? (
             <Button onClick={openShareDialog} size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <Share2 className="w-5 h-5 mr-2" /> Share Your Bet
             </Button>
           ) : (
             <Button onClick={handlePlaceBet} disabled={isBetting || !selectedChoice || isLoadingPreview} size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-glow">
                {isBetting ? "Placing Bet..." : (isLoadingPreview ? <Loader2 className="w-5 h-5 animate-spin" /> : "Place Bet")}
             </Button>
           )}
           <Button size="lg" variant="outline" className="w-full" asChild={isClient}>
              {isClient ? (
                <Link href={appendEntryParams("/")}>
                  <span className="inline-flex items-center justify-center gap-2">
                    <TrendingUp className="w-5 h-5" /> Find More Bets
                  </span>
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <TrendingUp className="w-5 h-5" /> Find More Bets
                </span>
              )}
           </Button>
        </CardFooter>
      </Card>

      <ShareDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        ogImageUrl={ogImageUrl}
        currentShareMessage={isLoadingShareMessage ? "Generating share message..." : shareMessage}
        onShareMessageChange={setShareMessage}
        shareUrl={match.shareUrl || `${appUrl}/match/${match.id}?predictionId=${match.predictionId}${match.bonusApplied ? '&bonusApplied=true' : ''}`}
        entityContext="match_challenge"
      />
    </>
  );
}
