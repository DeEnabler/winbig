
// src/components/match/MatchViewClient.tsx
'use client';

import type { MatchViewProps, ShareMessageDetails, Match } from '@/types';
import { mockCurrentUser, mockOpponentUser, mockPredictions } from '@/lib/mockData';
import NextImage from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Share2, MessageSquare, Repeat, ArrowLeft, TrendingUp, Crown, ExternalLink, CheckCircle, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateXShareMessage } from '@/ai/flows/generate-x-share-message';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import ShareDialog from '@/components/sharing/ShareDialog';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';

const STANDARD_PAYOUT_MULTIPLIER = 1.9;
const BONUS_PAYOUT_INCREASE_FACTOR = 1.2; // 20% bonus

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

export default function MatchViewClient({ match: initialMatch }: MatchViewProps) {
  const router = useRouter();
  const { appendEntryParams } = useEntryContext();
  const { toast } = useToast();

  const [match, setMatch] = useState<Match>(initialMatch);
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(match.countdownEnds));
  const [countdownProgress, setCountdownProgress] = useState(100);

  const [shareMessage, setShareMessage] = useState<string>('');
  const [isLoadingShareMessage, setIsLoadingShareMessage] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const [betAmountState, setBetAmountState] = useState(match.userBet?.amount || match.betAmount || 10);
  const [isBetting, setIsBetting] = useState(false);

  const potentialPayout = useMemo(() => {
    let payout = betAmountState * STANDARD_PAYOUT_MULTIPLIER;
    if (match.bonusApplied) {
      payout *= BONUS_PAYOUT_INCREASE_FACTOR;
    }
    return payout.toFixed(2);
  }, [betAmountState, match.bonusApplied]);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const appUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');

  const ogImageUrl = useMemo(() => {
    const url = new URL(`${appUrl}/api/og`);
    url.searchParams.set('v', Date.now().toString());
    url.searchParams.set('predictionText', match.predictionText);
    url.searchParams.set('userChoice', match.userChoice || 'YES');
    url.searchParams.set('userAvatar', match.user1AvatarUrl || mockCurrentUser.avatarUrl || 'https://placehold.co/128x128.png?text=WB');
    url.searchParams.set('username', match.user1Username === 'You' ? 'I' : match.user1Username);
    url.searchParams.set('outcome', match.outcome || 'PENDING');

    const displayBetAmount = match.userBet?.amount || (match.isConfirmingChallenge ? betAmountState : match.betAmount);
    url.searchParams.set('betAmount', (displayBetAmount || 0).toString());

    if (match.betSize) url.searchParams.set('betSize', match.betSize);
    if (match.streak) url.searchParams.set('streak', match.streak);
    if (match.rank) url.searchParams.set('rank', match.rank);
    if (match.rankCategory) url.searchParams.set('rankCategory', match.rankCategory);
    if (match.bonusApplied) url.searchParams.set('bonus', 'true'); // Add bonus flag for OG image

    return url.toString();
  }, [match, appUrl, betAmountState]);

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
    if (match.isConfirmingChallenge) {
        setShareMessage("Confirm your bet to generate a share message!");
        return;
    }

    setIsLoadingShareMessage(true);
    try {
      const baseBetAmount = match.userBet?.amount || betAmountState;
      let effectivePotentialWinnings = baseBetAmount * STANDARD_PAYOUT_MULTIPLIER;
      if (match.bonusApplied || match.userBet?.bonusApplied) {
        effectivePotentialWinnings *= BONUS_PAYOUT_INCREASE_FACTOR;
      }

      const details: ShareMessageDetails = {
        predictionText: match.predictionText, // Corrected from prediction to predictionText
        betAmount: baseBetAmount,
        potentialWinnings: parseFloat(effectivePotentialWinnings.toFixed(2)),
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
      let defaultMsg = `I just bet ${match.betSize || (match.userBet?.amount || betAmountState)} SOL that "${match.predictionText}" against @${typeof match.opponent === 'string' ? match.opponent : match.opponent?.username || 'a_Rival'}! Potential winnings: ${potentialPayout} SOL! #WinBig`;
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
    if (match.isConfirmingChallenge) {
        toast({ title: "Action Required", description: "Please confirm your bet before sharing." });
        return;
    }
    handleGenerateShareMessage();
    setIsShareDialogOpen(true);
  };

  const user1 = { username: match.user1Username, avatarUrl: match.user1AvatarUrl || mockCurrentUser.avatarUrl };
  const user2 = typeof match.opponent === 'object'
    ? { username: match.opponent.username, avatarUrl: match.opponent.avatarUrl || mockOpponentUser.avatarUrl, winRate: match.opponent.winRate }
    : { username: 'System Pool', avatarUrl: 'https://placehold.co/40x40.png?text=S', winRate: undefined };

  const predictionDetails = mockPredictions.find(p => p.id === match.predictionId);
  const predictionImage = predictionDetails?.imageUrl || 'https://placehold.co/600x300.png';
  const predictionAiHint = predictionDetails?.aiHint || 'abstract event';

  const confidenceYes = match.confidence?.yesPercentage || 50;

  const handleConfirmBet = async () => {
    if (!match.isConfirmingChallenge || !match.userChoice || !match.predictionId) return;
    setIsBetting(true);
    toast({
        title: "Placing your bet...",
        description: `You chose ${match.userChoice} for "${match.predictionText.substring(0,30)}...". Amount: $${betAmountState}${match.bonusApplied ? " (+20% Bonus!)" : ""}`,
    });

    try {
        const response = await fetch('/api/bets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: mockCurrentUser.id,
                challengeMatchId: match.id,
                predictionId: match.predictionId,
                choice: match.userChoice,
                amount: betAmountState,
                referrerName: match.originalReferrer,
                bonusApplied: match.bonusApplied ?? false, // Send bonus status to API
            }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to place bet via API.');
        }

        toast({
            title: "Bet Confirmed & Placed!",
            description: `Your ${match.userChoice} bet for $${betAmountState} is in! Good luck!${result.data?.bonusApplied ? " Bonus applied!" : ""}`,
        });

        setMatch(prevMatch => ({
            ...prevMatch,
            isConfirmingChallenge: false,
            userBet: {
                side: prevMatch.userChoice!,
                amount: betAmountState,
                status: 'PENDING',
                bonusApplied: result.data?.bonusApplied ?? false,
            },
            betAmount: betAmountState,
            // potentialWinnings will be recalculated by potentialPayout useMemo
            bonusApplied: result.data?.bonusApplied ?? false, // Update match bonus status from API response
        }));

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
          {match.isConfirmingChallenge && (
            <div className="text-center">
              <p className="text-sm text-accent font-semibold">
                You chose: {match.userChoice}. Confirm your bet against @{match.originalReferrer || 'your challenger'}!
              </p>
              {match.bonusApplied && (
                <Badge variant="default" className="mt-1 bg-yellow-500 text-yellow-900 hover:bg-yellow-500/90">
                  <Sparkles className="w-4 h-4 mr-1.5" /> +20% Bonus Active!
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="relative w-full h-40 md:h-48 rounded-md overflow-hidden mb-4 shadow-md">
              <NextImage
                src={predictionImage}
                alt={match.predictionText}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
                data-ai-hint={predictionAiHint}
              />
          </div>

          <div className="flex justify-around items-center text-center">
            <div className="flex flex-col items-center space-y-1">
              <Avatar className="w-16 h-16 border-2 border-primary">
                <AvatarImage src={user1.avatarUrl} alt={user1.username} data-ai-hint="person portrait" />
                <AvatarFallback>{user1.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-semibold">{user1.username}</span>
               {match.isConfirmingChallenge && match.userChoice && (
                <Badge variant={match.userChoice === 'YES' ? 'default' : 'destructive'} className="mt-1">
                  {match.userChoice}
                </Badge>
              )}
            </div>
            <span className="text-3xl font-bold text-muted-foreground px-2">VS</span>
            <div className="flex flex-col items-center space-y-1">
              <Avatar className="w-16 h-16 border-2 border-secondary">
                <AvatarImage src={user2.avatarUrl} alt={user2.username} data-ai-hint="person portrait" />
                <AvatarFallback>{user2.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-semibold">{user2.username}</span>
              {user2.winRate && <span className="text-xs text-muted-foreground">{user2.winRate}% Win Rate</span>}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-muted-foreground px-1">
              <span>{confidenceYes}% YES</span>
              <span>{100-confidenceYes}% NO</span>
            </div>
            <Progress value={confidenceYes} className="w-full h-2" />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {match.streak && parseInt(match.streak) > 0 && (
              <Badge variant="secondary" className="text-sm bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300">
                <TrendingUp className="w-4 h-4 mr-1.5" /> {match.streak}-Win Streak
              </Badge>
            )}
            {match.rank && (
              <Badge variant="secondary" className="text-sm bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300">
                <Crown className="w-4 h-4 mr-1.5" /> Rank #{match.rank} {match.rankCategory && `in ${match.rankCategory}`}
              </Badge>
            )}
          </div>

          {(match.isConfirmingChallenge || !match.userBet) && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label htmlFor="betAmountSlider" className="text-sm font-medium">
                  Bet Amount: <span className="text-primary font-bold">${betAmountState}</span>
                </label>
                 <span className="text-xs text-muted-foreground">Min $1, Max $100</span>
              </div>
              <Slider
                id="betAmountSlider"
                min={1}
                max={100}
                step={1}
                defaultValue={[betAmountState]}
                onValueChange={(value) => setBetAmountState(value[0])}
                disabled={isBetting || (!!match.userBet && !match.isConfirmingChallenge)}
              />
              <div className="text-center text-lg">
                Potential Payout: <span className="font-bold text-green-600 dark:text-green-400">${potentialPayout}</span>
                {(match.bonusApplied || match.userBet?.bonusApplied) && !match.isConfirmingChallenge && (
                   <Badge variant="default" className="ml-2 bg-yellow-500 text-yellow-900 hover:bg-yellow-500/90 text-xs">
                     <Sparkles className="w-3 h-3 mr-1" /> +20% Bonus
                   </Badge>
                )}
              </div>
            </div>
          )}
          {match.userBet && !match.isConfirmingChallenge && (
             <div className="text-center text-lg pt-2">
                <p>Your Bet: <span className="font-bold text-primary">${match.userBet.amount} on {match.userBet.side}</span></p>
                <div>Status: <Badge variant={match.userBet.status === 'WON' ? 'default' : match.userBet.status === 'LOST' ? 'destructive' : 'secondary'}>{match.userBet.status}</Badge></div>
                <p>
                  Potential Payout: <span className="font-bold text-green-600 dark:text-green-400">${potentialPayout}</span>
                  {match.userBet.bonusApplied && (
                    <Badge variant="default" className="ml-2 bg-yellow-500 text-yellow-900 hover:bg-yellow-500/90 text-xs">
                      <Sparkles className="w-3 h-3 mr-1" /> +20% Bonus
                    </Badge>
                  )}
                </p>
             </div>
          )}


          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Time Remaining</span>
              <span>{timeLeft}</span>
            </div>
            <Progress value={countdownProgress} className="w-full h-2 bg-primary/30" />
          </div>
        </CardContent>

        <CardFooter className="p-4 flex flex-col gap-3">
           {match.isConfirmingChallenge ? (
             <Button onClick={handleConfirmBet} disabled={isBetting} size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-glow">
                <CheckCircle className="w-5 h-5 mr-2" /> {isBetting ? "Confirming..." : "Confirm Bet"}
             </Button>
           ) : (
             <div className="grid grid-cols-3 gap-2 w-full">
                <Button variant="outline" className="w-full" onClick={() => toast({title: "Coming Soon!", description:"Trash talk feature is under development."})}>
                    <MessageSquare className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Trash-Talk</span>
                </Button>
                <Button variant="outline" className="w-full" onClick={() => toast({title: "Coming Soon!", description:"Rematch feature is under development."})}>
                    <Repeat className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Rematch</span>
                </Button>
                <Button onClick={openShareDialog} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Share2 className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Share</span>
                </Button>
             </div>
           )}
           <Button size="lg" variant="outline" className="w-full" asChild={isClient}>
              {isClient ? (
                <Link href={appendEntryParams("/")}>
                  <span className="inline-flex items-center justify-center gap-2">
                    <ExternalLink className="w-5 h-5" /> Find More Bets
                  </span>
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <ExternalLink className="w-5 h-5" /> Find More Bets
                </span>
              )}
           </Button>
        </CardFooter>
      </Card>

      <ShareDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        matchId={match.id}
        ogImageUrl={ogImageUrl}
        currentShareMessage={isLoadingShareMessage ? "Generating share message..." : shareMessage}
        onShareMessageChange={setShareMessage}
        shareUrl={match.shareUrl || `${appUrl}/match/${match.id}?predictionId=${match.predictionId}${match.bonusApplied ? '&bonusApplied=true' : ''}`}
      />
    </>
  );
}
