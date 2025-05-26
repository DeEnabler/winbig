// src/components/match/MatchViewClient.tsx
'use client';

import type { Match, ShareMessageDetails } from '@/types';
import { mockCurrentUser, mockOpponentUser, mockPredictions } from '@/lib/mockData';
import NextImage from 'next/image'; // Renamed to avoid conflict with local Image component
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Share2, Copy, ExternalLink, Twitter, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateXShareMessage } from '@/ai/flows/generate-x-share-message';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

interface MatchViewClientProps {
  match: Match;
}

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

export default function MatchViewClient({ match }: MatchViewClientProps) {
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(match.countdownEnds));
  const [progress, setProgress] = useState(100);
  const [shareMessage, setShareMessage] = useState<string>('');
  const [isLoadingShareMessage, setIsLoadingShareMessage] = useState(false);
  const [isPreviewOgImageLoading, setIsPreviewOgImageLoading] = useState(true);
  const { toast } = useToast();
  
  const appUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}` 
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');


  const ogPreviewImageUrl = useMemo(() => {
    const url = new URL(`${appUrl}/api/og`);
    url.searchParams.set('v', Date.now().toString()); // Cache busting
    url.searchParams.set('predictionText', match.predictionText);
    url.searchParams.set('userChoice', match.userChoice || 'YES'); // Fallback for userChoice
    url.searchParams.set('userAvatar', match.user1AvatarUrl || mockCurrentUser.avatarUrl || 'https://placehold.co/128x128.png?text=VB');
    url.searchParams.set('username', match.user1Username === 'You' ? 'I' : match.user1Username);
    url.searchParams.set('outcome', match.outcome || 'PENDING');
    url.searchParams.set('betAmount', match.betAmount.toString());

    if (match.betSize) url.searchParams.set('betSize', match.betSize);
    if (match.streak) url.searchParams.set('streak', match.streak);
    if (match.rank) url.searchParams.set('rank', match.rank);
    if (match.rankCategory) url.searchParams.set('rankCategory', match.rankCategory);
    
    return url.toString();
  }, [match, appUrl]);

  useEffect(() => {
    const initialDuration = Math.max(0, match.countdownEnds - Date.now());
    const timer = setInterval(() => {
      const newTimeLeft = match.countdownEnds - Date.now();
      if (newTimeLeft <= 0) {
        setTimeLeft("Match Ended");
        setProgress(0);
        clearInterval(timer);
      } else {
        setTimeLeft(formatTimeLeft(match.countdownEnds));
        setProgress((newTimeLeft / initialDuration) * 100);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [match.countdownEnds]);

  const handleGenerateShareMessage = async () => {
    if (shareMessage && !isLoadingShareMessage) return; // Don't regenerate if already exists unless forced

    setIsLoadingShareMessage(true);
    setIsPreviewOgImageLoading(true); // Reset preview loading state
    try {
      const details: ShareMessageDetails = {
        prediction: match.predictionText,
        betAmount: match.betAmount, // Using core bet amount for AI
        potentialWinnings: match.potentialWinnings,
        opponentUsername: match.user2Username,
      };
      const result = await generateXShareMessage(details);
      setShareMessage(result.shareMessage);
    } catch (error) {
      console.error("Failed to generate share message:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate AI share message. Using a default.",
      });
      // Fallback message
      let defaultMsg = `I just bet ${match.betSize || match.betAmount} SOL that "${match.predictionText}" against @${match.user2Username}! Potential winnings: ${match.potentialWinnings} SOL!`;
      if (match.outcome === 'WON') defaultMsg += ` I totally nailed it!`;
      else if (match.outcome === 'LOST') defaultMsg += ` So close! Think you can do better?`;
      else defaultMsg += ` Who's with me?`;
      defaultMsg += ` #ViralBet #PredictionChallenge`;
      setShareMessage(defaultMsg);
    } finally {
      setIsLoadingShareMessage(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: "Share message copied to clipboard." });
    }).catch(err => {
      console.error("Failed to copy:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to copy message." });
    });
  };

  const user1 = { username: match.user1Username, avatarUrl: match.user1AvatarUrl || mockCurrentUser.avatarUrl };
  const user2 = { username: match.user2Username, avatarUrl: match.user2AvatarUrl || mockOpponentUser.avatarUrl };
  
  const predictionImage = mockPredictions.find(p => p.id === match.predictionId || p.text === match.predictionText)?.imageUrl || 'https://placehold.co/600x300.png';
  const predictionAiHint = mockPredictions.find(p => p.id === match.predictionId || p.text === match.predictionText)?.aiHint || 'abstract random';

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl rounded-lg">
      <CardHeader className="text-center p-6 bg-gradient-to-r from-primary to-accent rounded-t-lg">
        <CardTitle className="text-2xl font-bold text-primary-foreground">HEAD-TO-HEAD CHALLENGE</CardTitle>
        <CardDescription className="text-primary-foreground/80">{match.predictionText}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="relative w-full h-40 md:h-48 rounded-md overflow-hidden mb-4">
            <NextImage src={predictionImage} alt={match.predictionText} layout="fill" objectFit="cover" data-ai-hint={predictionAiHint}/>
        </div>
        <div className="flex justify-around items-center text-center">
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="w-16 h-16 border-2 border-primary">
              <AvatarImage src={user1.avatarUrl} alt={user1.username} data-ai-hint="person portrait" />
              <AvatarFallback>{user1.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-lg">{user1.username}</span>
          </div>
          <span className="text-4xl font-bold text-muted-foreground">VS</span>
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="w-16 h-16 border-2 border-secondary">
              <AvatarImage src={user2.avatarUrl} alt={user2.username} data-ai-hint="person portrait" />
              <AvatarFallback>{user2.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-lg">{user2.username}</span>
          </div>
        </div>

        <div className="space-y-3 text-center">
          <div className="text-lg">
            <span className="font-medium">Your Bet: </span>
            <span className="text-primary font-bold">{match.betSize || match.betAmount} SOL</span>
          </div>
          <div className="text-lg">
            <span className="font-medium">Potential Winnings: </span>
            <span className="text-green-600 dark:text-green-400 font-bold">{match.potentialWinnings} SOL</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Time Remaining</span>
            <span>{timeLeft}</span>
          </div>
          <Progress value={progress} className="w-full h-3" />
        </div>
      </CardContent>
      <CardFooter className="p-6 flex flex-col sm:flex-row gap-2 justify-center">
        <Dialog onOpenChange={(open) => { if (open) handleGenerateShareMessage(); else setIsPreviewOgImageLoading(true); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
              <Share2 className="w-5 h-5 mr-2" /> Share Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share on X (Twitter)</DialogTitle>
              <DialogDescription>
                Your challenge will look like this on X. Edit the message if you like!
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                {isPreviewOgImageLoading && <Skeleton className="w-full aspect-[1200/630]" />}
                <NextImage
                  src={ogPreviewImageUrl}
                  alt="Share Preview"
                  width={1200}
                  height={630}
                  className={`w-full h-auto ${isPreviewOgImageLoading ? 'hidden' : 'block'}`}
                  onLoad={() => setIsPreviewOgImageLoading(false)}
                  onError={() => {
                    setIsPreviewOgImageLoading(false); // Stop loading on error too
                    toast({variant: "destructive", title:"Preview Error", description: "Could not load share image preview."})
                  }}
                  unoptimized // Useful for dynamic images that change often based on params
                />
              </div>
              {isLoadingShareMessage && !shareMessage ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="ml-2 text-muted-foreground">Generating viral message...</p>
                </div>
              ) : (
                <Textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  rows={4}
                  className="bg-muted/50"
                  placeholder="Your viral tweet..."
                />
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => shareMessage && copyToClipboard(shareMessage)} disabled={isLoadingShareMessage && !shareMessage}>
                    <Copy className="w-4 h-4 mr-2" /> Copy Text
                </Button>
                <Button asChild disabled={isLoadingShareMessage && !shareMessage} className="bg-blue-500 hover:bg-blue-600 text-white">
                  <a 
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage || '')}${match.shareUrl ? `&url=${encodeURIComponent(match.shareUrl)}` : ''}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Twitter className="w-4 h-4 mr-2" /> Share to X
                  </a>
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
          <Link href="/">
            <ExternalLink className="w-5 h-5 mr-2" /> Find More Bets
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
