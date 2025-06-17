// src/components/homepage/MarketFeedCard.tsx
'use client';

import type { LiveMarket } from '@/types';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, CalendarDays, TrendingUp, Tag, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNowStrict } from 'date-fns';
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
    params.set('choice', choice);
    // For feed cards, we generally don't pre-fill challenge details unless a specific flow demands it
    // params.set('confirmChallenge', 'true'); // This would imply direct bet confirmation intent
    
    const url = appendEntryParams(`/match/feed_bet_${market.id}?${params.toString()}`);
    router.push(url);
  };

  const endsAtTime = market.endsAt ? market.endsAt.getTime() : Date.now() + 2 * 60 * 60 * 1000; // Default 2 hours if no endsAt
  const timeLeft = formatDistanceToNowStrict(endsAtTime, { addSuffix: true });
  const isEndingSoon = endsAtTime - Date.now() < 3 * 60 * 60 * 1000; // Less than 3 hours
  const hasEnded = endsAtTime < Date.now();

  const oddsYesPercentage = Math.round(market.yesPrice * 100);
  const oddsNoPercentage = 100 - oddsYesPercentage;

  // Simplified Payout Teaser
  const payoutYes = market.yesPrice > 0 ? (1 / market.yesPrice).toFixed(1) : 'N/A';
  const payoutNo = market.noPrice > 0 ? (1 / market.noPrice).toFixed(1) : 'N/A';


  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(var(--primary-rgb), 0.1)"}} // Use CSS variable for shadow if defined
    >
    <Card className="bg-card text-card-foreground rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out overflow-hidden flex flex-col h-full">
      {market.imageUrl && (
        <div className="relative w-full h-36">
          <NextImage
            src={market.imageUrl || `https://placehold.co/600x300.png?text=${encodeURIComponent(market.category || 'Market')}`}
            alt={market.question}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
            data-ai-hint={market.aiHint || market.category || "general event"}
            className="rounded-t-xl"
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
        <div className="flex items-center text-xs text-muted-foreground mt-1.5 space-x-2">
            <div className="flex items-center animate-pulse">
                 <TrendingUp className="w-3 h-3 mr-1 text-primary" /> <span>Trending</span>
            </div>
            {/* Optional: Add more badges like bettor count if available in LiveMarket type */}
        </div>
      </CardContent>
      <CardFooter className="p-0 border-t">
        <div className="grid grid-cols-2 w-full">
          <Button
            variant="ghost"
            className="w-full h-12 rounded-none rounded-bl-xl bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 text-sm font-semibold"
            onClick={() => handleBetNavigation('YES')}
            disabled={hasEnded}
            aria-label={`Bet YES on ${market.question}`}
          >
            <ThumbsUp className="w-4 h-4 mr-1.5" /> YES
          </Button>
          <Button
            variant="ghost"
            className="w-full h-12 rounded-none rounded-br-xl bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 text-sm font-semibold"
            onClick={() => handleBetNavigation('NO')}
            disabled={hasEnded}
            aria-label={`Bet NO on ${market.question}`}
          >
            <ThumbsDown className="w-4 h-4 mr-1.5" /> NO
          </Button>
        </div>
      </CardFooter>
    </Card>
    </motion.div>
  );
}
