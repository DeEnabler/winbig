'use client';

import type { Match, ShareMessageDetails } from '@/types';
import { mockCurrentUser, mockOpponentUser, mockPredictions } from '@/lib/mockData';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Share2, Copy, ExternalLink, Twitter } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateXShareMessage } from '@/ai/flows/generate-x-share-message';
import Link from 'next/link';

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
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [isLoadingShareMessage, setIsLoadingShareMessage] = useState(false);
  const { toast } = useToast();

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
    setIsLoadingShareMessage(true);
    try {
      const details: ShareMessageDetails = {
        prediction: match.predictionText,
        betAmount: match.betAmount,
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
        description: "Could not generate share message. Please try again.",
      });
      setShareMessage(`I just bet ${match.betAmount} that "${match.predictionText}" against @${match.user2Username}! Potential winnings: ${match.potentialWinnings}! Who's with me? #ViralBet #PredictionChallenge`);
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
  
  const predictionImage = mockPredictions.find(p => p.text === match.predictionText)?.imageUrl || 'https://placehold.co/600x300.png';
  const predictionAiHint = mockPredictions.find(p => p.text === match.predictionText)?.aiHint || 'abstract random';


  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl rounded-lg">
      <CardHeader className="text-center p-6 bg-gradient-to-r from-primary to-accent rounded-t-lg">
        <CardTitle className="text-2xl font-bold text-primary-foreground">HEAD-TO-HEAD CHALLENGE</CardTitle>
        <CardDescription className="text-primary-foreground/80">{match.predictionText}</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="relative w-full h-40 md:h-48 rounded-md overflow-hidden mb-4">
            <Image src={predictionImage} alt={match.predictionText} layout="fill" objectFit="cover" data-ai-hint={predictionAiHint}/>
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
            <span className="text-primary font-bold">${match.betAmount}</span>
          </div>
          <div className="text-lg">
            <span className="font-medium">Potential Winnings: </span>
            <span className="text-green-600 dark:text-green-400 font-bold">${match.potentialWinnings}</span>
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
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleGenerateShareMessage}>
              <Share2 className="w-5 h-5 mr-2" /> Share Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Share on X (Twitter)</DialogTitle>
              <DialogDescription>
                Copy the message below and share it to challenge your friends!
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {isLoadingShareMessage ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="ml-2 text-muted-foreground">Generating viral message...</p>
                </div>
              ) : (
                <Textarea
                  value={shareMessage || 'Loading...'}
                  readOnly
                  rows={5}
                  className="bg-muted/50"
                />
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => shareMessage && copyToClipboard(shareMessage)} disabled={isLoadingShareMessage || !shareMessage}>
                    <Copy className="w-4 h-4 mr-2" /> Copy
                </Button>
                <Button asChild disabled={isLoadingShareMessage || !shareMessage} className="bg-blue-500 hover:bg-blue-600 text-white">
                  <a 
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage || '')}${match.shareUrl ? `&url=${encodeURIComponent(match.shareUrl)}` : ''}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Twitter className="w-4 h-4 mr-2" /> Tweet
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
