// src/components/homepage/MarketFeedCard.tsx
'use client';

import type { LiveMarket } from '@/types';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Tag, ThumbsUp, ThumbsDown, TrendingUp, BarChart2 } from 'lucide-react'; // Added BarChart2 for volume
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';
import { motion } from 'framer-motion';

interface MarketFeedCardProps {
  market: LiveMarket;
}

export default function MarketFeedCard({ market }: MarketFeedCardProps) {
  const router = useRouter();
  const { appendEntryParams } = useEntryContext();

  const handleBetNavigation = (choice: 'YES' | 'NO') => {
    const params = new URLSearchParams();
    params.set('predictionId', market.id);
    // Create a unique matchId for this bet attempt from the feed
    const challengeMatchId = `feed_bet_${market.id}_${Date.now()}`;
    params.set('choice', choice);
    // This implies the user is confirming a bet choice by clicking on the feed card.
    params.set('confirmChallenge', 'true'); 
    // Optional: could pass referrer if relevant, but homepage feed typically doesn't have one per card.

    const url = appendEntryParams(`/match/${challengeMatchId}?${params.toString()}`);
    router.push(url);
  };

  const endsAtDate = typeof market.endsAt === 'string' ? parseISO(market.endsAt) : market.endsAt;
  const endsAtTime = endsAtDate ? endsAtDate.getTime() : Date.now() + 2 * 60 * 60 * 1000; // Fallback if no endsAt
  const timeLeft = formatDistanceToNowStrict(endsAtTime, { addSuffix: true });
  const isEndingSoon = endsAtTime - Date.now() < 3 * 60 * 60 * 1000; // Example: less than 3 hours
  const hasEnded = endsAtTime < Date.now();

  // Ensure prices are valid numbers and within 0.01-0.99 range for display
  const validYesPrice = typeof market.yesPrice === 'number' ? Math.max(0.01, Math.min(0.99, market.yesPrice)) : 0.5;
  const validNoPrice = typeof market.noPrice === 'number' ? Math.max(0.01, Math.min(0.99, market.noPrice)) : 0.5;

  const oddsYesPercentage = Math.round(validYesPrice * 100);
  const oddsNoPercentage = Math.round(validNoPrice * 100);
  
  // Payout calculation should reflect the cost
  const payoutYes = validYesPrice > 0 && validYesPrice < 1 ? (1 / validYesPrice).toFixed(1) : 'N/A';
  const payoutNo = validNoPrice > 0 && validNoPrice < 1 ? (1 / validNoPrice).toFixed(1) : 'N/A';


  const imageUrl = market.imageUrl || `https://placehold.co/600x300.png?text=${encodeURIComponent(market.category || 'Market')}`;
  const aiHintText = market.aiHint || market.category || "general event";

  // Placeholder for volume - this would need to come from API
  const volumeTraded = Math.floor(Math.random() * 100000) + 5000; 

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -5 }}
    >
    <Card className="w-full bg-card text-card-foreground rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out overflow-hidden flex flex-col h-full">
      {imageUrl && (
        <div className="relative w-full h-36">
          <NextImage
            src={imageUrl}
            alt={market.question}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
            data-ai-hint={aiHintText}
            className="rounded-t-xl"
            priority={false}
          />
        </div>
      )}
      <CardHeader className="p-3 pb-1.5">
        <CardTitle className="text-base font-semibold leading-tight line-clamp-2 h-10">{market.question}</CardTitle>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 space-x-2">
          {market.category && (
             <Badge variant="outline" className="truncate max-w-[100px] py-0.5 px-1.5">
                <Tag className="w-3 h-3 mr-1 shrink-0" /> {market.category}
             </Badge>
          )}
          <div className="flex items-center text-xs whitespace-nowrap">
            <CalendarDays className="w-3 h-3 mr-1 shrink-0" />
            {hasEnded ? 'Ended' : (isEndingSoon ? `⏳ ${timeLeft}` : `Ends ${timeLeft}`)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 flex-grow">
        <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-green-600 dark:text-green-400">YES {oddsYesPercentage}% (Win {payoutYes}x)</span>
                <span className="text-red-600 dark:text-red-400">{oddsNoPercentage}% NO (Win {payoutNo}x)</span>
            </div>
            <Progress value={oddsYesPercentage} className="h-1.5 rounded-full"
                aria-label={`Odds: Yes ${oddsYesPercentage}%, No ${oddsNoPercentage}%`}
            />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5 space-x-2">
            <div className="flex items-center">
                 <BarChart2 className="w-3 h-3 mr-1 text-blue-500" /> <span>Vol: ${volumeTraded.toLocaleString()}</span>
            </div>
            <div className="flex items-center animate-pulse">
                 <TrendingUp className="w-3 h-3 mr-1 text-primary" /> <span>Trending</span>
            </div>
        </div>
      </CardContent>
      {/* "Place Bet" button, now as part of the card, potentially opening a modal or navigating */}
      <CardFooter className="p-0 border-t">
        {/* Full width button for placing bet, or separate YES/NO if preferred */}
        <Button
            variant="ghost"
            className="w-full h-12 rounded-none rounded-b-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold"
            onClick={() => handleBetNavigation('YES')} // Defaulting to YES for simplicity, ideally modal would let choose
            disabled={hasEnded}
            aria-label={`Place Bet on ${market.question}`}
          >
            Place Bet
          </Button>
        {/* Or keep Yes/No if that's preferred for quick choice */}
        {/* <div className="grid grid-cols-2 w-full">
          <Button
            variant="ghost"
            className="w-full h-12 rounded-none rounded-bl-xl bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 text-sm font-semibold"
            onClick={() => handleBetNavigation('YES')}
            disabled={hasEnded}
          >
            <ThumbsUp className="w-4 h-4 mr-1.5" /> YES
          </Button>
          <Button
            variant="ghost"
            className="w-full h-12 rounded-none rounded-br-xl bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 text-sm font-semibold"
            onClick={() => handleBetNavigation('NO')}
            disabled={hasEnded}
          >
            <ThumbsDown className="w-4 h-4 mr-1.5" /> NO
          </Button>
        </div> */}
      </CardFooter>
    </Card>
    </motion.div>
  );
}
