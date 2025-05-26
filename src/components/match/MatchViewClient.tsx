// src/components/match/MatchViewClient.tsx
'use client';

import type { MatchViewProps, ShareMessageDetails } from '@/types';
import { mockCurrentUser, mockOpponentUser, mockPredictions } from '@/lib/mockData'; // Keep for fallbacks/structure
import NextImage from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Share2, MessageSquare, Repeat, ArrowLeft, TrendingUp, Crown } from 'lucide-react'; // Added icons
import { Progress } from '@/components/ui/progress';
import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateXShareMessage } from '@/ai/flows/generate-x-share-message';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import ShareDialog from '@/components/sharing/ShareDialog'; // Import new ShareDialog
import { Slider } from '@/components/ui/slider'; // Import Slider
import { Badge } from '@/components/ui/badge'; // Import Badge
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';


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

export default function MatchViewClient({ match }: MatchViewProps) {
  const router = useRouter();
  const { appendEntryParams } = useEntryContext();
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(match.countdownEnds));
  const [countdownProgress, setCountdownProgress] = useState(100);
  
  const [shareMessage, setShareMessage] = useState<string>('');
  const [isLoadingShareMessage, setIsLoadingShareMessage] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  
  const [betAmountState, setBetAmountState] = useState(match.userBet?.amount || 10); // Default to 10 if not set
  const potentialPayout = useMemo(() => (betAmountState * 1.9).toFixed(2), [betAmountState]); // Example payout calc

  const { toast } = useToast();
  
  const appUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}` 
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');

  const ogImageUrl = useMemo(() => {
    const url = new URL(`${appUrl}/api/og`);
    url.searchParams.set('v', Date.now().toString()); // Cache busting
    url.searchParams.set('predictionText', match.predictionText);
    url.searchParams.set('userChoice', match.userChoice || 'YES');
    url.searchParams.set('userAvatar', match.user1AvatarUrl || mockCurrentUser.avatarUrl || 'https://placehold.co/128x128.png?text=VB');
    url.searchParams.set('username', match.user1Username === 'You' ? 'I' : match.user1Username);
    url.searchParams.set('outcome', match.outcome || 'PENDING');
    url.searchParams.set('betAmount', (match.userBet?.amount || betAmountState).toString());

    if (match.betSize) url.searchParams.set('betSize', match.betSize); // e.g., "5 SOL"
    if (match.streak) url.searchParams.set('streak', match.streak);
    if (match.rank) url.searchParams.set('rank', match.rank);
    if (match.rankCategory) url.searchParams.set('rankCategory', match.rankCategory);
    
    return url.toString();
  }, [match, appUrl, betAmountState]);

  useEffect(() => {
    const initialDuration = Math.max(0, match.countdownEnds - Date.now());
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

    setIsLoadingShareMessage(true);
    try {
      const details: ShareMessageDetails = {
        prediction: match.predictionText,
        betAmount: match.userBet?.amount || betAmountState,
        potentialWinnings: parseFloat(potentialPayout),
        opponentUsername: typeof match.opponent === 'string' ? match.opponent : match.opponent?.username || 'a Rival',
      };
      const result = await generateXShareMessage(details);
      setShareMessage(result.shareMessage);
    } catch (error) {
      console.error("Failed to generate share message:", error);
      let defaultMsg = `I just bet ${match.betSize || (match.userBet?.amount || betAmountState)} SOL that "${match.predictionText}" against @${typeof match.opponent === 'string' ? match.opponent : match.opponent?.username || 'a_Rival'}! Potential winnings: ${potentialPayout} SOL! #ViralBet`;
      setShareMessage(defaultMsg);
      toast({ variant: "destructive", title: "Error", description: "Could not generate AI share message. Using default." });
    } finally {
      setIsLoadingShareMessage(false);
    }
  };

  const openShareDialog = () => {
    handleGenerateShareMessage(); // Pre-generate message
    setIsShareDialogOpen(true);
  };
  
  const user1 = { username: match.user1Username, avatarUrl: match.user1AvatarUrl || mockCurrentUser.avatarUrl };
  const user2 = typeof match.opponent === 'object' 
    ? { username: match.opponent.username, avatarUrl: match.opponent.avatarUrl || mockOpponentUser.avatarUrl, winRate: match.opponent.winRate } 
    : { username: 'System Pool', avatarUrl: 'https://placehold.co/40x40.png?text=S', winRate: undefined };

  // Find corresponding mock prediction for image, or use a default
  const predictionDetails = mockPredictions.find(p => p.id === match.predictionId || p.text === match.predictionText);
  const predictionImage = predictionDetails?.imageUrl || 'https://placehold.co/600x300.png';
  const predictionAiHint = predictionDetails?.aiHint || 'abstract event';

  const confidenceYes = match.confidence?.yesPercentage || 50; // Default to 50% if not provided

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
          {/* Animated flip from card could be a parent component managing transition */}
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="relative w-full h-40 md:h-48 rounded-md overflow-hidden mb-4 shadow-md">
              <NextImage src={predictionImage} alt={match.predictionText} layout="fill" objectFit="cover" data-ai-hint={predictionAiHint}/>
          </div>

          <div className="flex justify-around items-center text-center">
            <div className="flex flex-col items-center space-y-1">
              <Avatar className="w-16 h-16 border-2 border-primary">
                <AvatarImage src={user1.avatarUrl} alt={user1.username} data-ai-hint="person portrait" />
                <AvatarFallback>{user1.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-semibold">{user1.username}</span>
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

          {/* Confidence Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-muted-foreground px-1">
              <span>{confidenceYes}% YES</span>
              <span>{100-confidenceYes}% NO</span>
            </div>
            <Progress value={confidenceYes} className="w-full h-2" />
          </div>

          {/* Badges */}
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
          
          {/* Bet Slider and Payout */}
          {match.outcome === 'PENDING' && !match.userBet && ( // Show slider only if it's a challenge being accepted, or bet can be adjusted
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label htmlFor="betAmountSlider" className="text-sm font-medium">Bet Amount: ${betAmountState}</label>
                 <span className="text-sm text-muted-foreground">Min $1, Max $100</span>
              </div>
              <Slider
                id="betAmountSlider"
                min={1}
                max={100}
                step={1}
                defaultValue={[betAmountState]}
                onValueChange={(value) => setBetAmountState(value[0])}
              />
              <p className="text-center text-lg">
                Potential Payout: <span className="font-bold text-green-600 dark:text-green-400">${potentialPayout}</span>
              </p>
            </div>
          )}
          {match.userBet && ( // Display fixed bet if already placed
             <div className="text-center text-lg pt-2">
                <p>Your Bet: <span className="font-bold text-primary">${match.userBet.amount}</span></p>
                <p>Potential Payout: <span className="font-bold text-green-600 dark:text-green-400">${(match.userBet.amount * 1.9).toFixed(2)}</span></p>
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
           <Button size="lg" variant="outline" className="w-full" asChild>
              <Link href={appendEntryParams("/")}>
                <ExternalLink className="w-5 h-5 mr-2" /> Find More Bets
              </Link>
           </Button>
        </CardFooter>
      </Card>

      <ShareDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        matchId={match.id}
        ogImageUrl={ogImageUrl} // Pass generated OG image URL
        currentShareMessage={isLoadingShareMessage ? "Generating viral message..." : shareMessage}
        onShareMessageChange={setShareMessage}
        shareUrl={match.shareUrl || `${appUrl}/match/${match.id}`} // Fallback share URL
        // tweetTemplates={["Template 1", "Template 2"]} // Optional
        // rewardIncentive="+1 Free Token for sharing!" // Optional
      />
    </>
  );
}
