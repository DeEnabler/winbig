
// src/components/homepage/MarketFeedCard.tsx
'use client';

import type { LiveMarket } from '@/types';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Tag, ThumbsUp, ThumbsDown, TrendingUp, BarChart2 } from 'lucide-react';
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
    const challengeMatchId = `feed_bet_${market.id}_${Date.now()}`;
    params.set('choice', choice);
    params.set('confirmChallenge', 'true'); 

    const url = appendEntryParams(`/match/${challengeMatchId}?${params.toString()}`);
    router.push(url);
  };

  const endsAtDate = typeof market.endsAt === 'string' ? parseISO(market.endsAt) : market.endsAt;
  const endsAtTime = endsAtDate ? endsAtDate.getTime() : Date.now() + 2 * 60 * 60 * 1000;
  const timeLeft = formatDistanceToNowStrict(endsAtTime, { addSuffix: true });
  const isEndingSoon = endsAtTime - Date.now() < 3 * 60 * 60 * 1000;
  const hasEnded = endsAtTime < Date.now();

  const validYesPrice = typeof market.yesPrice === 'number' ? Math.max(0.01, Math.min(0.99, market.yesPrice)) : 0.5;
  const validNoPrice = typeof market.noPrice === 'number' ? Math.max(0.01, Math.min(0.99, market.noPrice)) : 0.5;

  const oddsYesPercentage = Math.round(validYesPrice * 100);
  const oddsNoPercentage = Math.round(validNoPrice * 100);
  
  const payoutYes = validYesPrice > 0 && validYesPrice < 1 ? (1 / validYesPrice).toFixed(1) : 'N/A';
  const payoutNo = validNoPrice > 0 && validNoPrice < 1 ? (1 / validNoPrice).toFixed(1) : 'N/A';

  const imageUrl = market.imageUrl || 'https://placehold.co/600x300.png?text=Error';
  const aiHintText = market.aiHint || market.category?.toLowerCase().split(' ').slice(0,2).join(' ') || "general event";

  const volumeTraded = Math.floor(Math.random() * 100000) + 5000; 

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -5 }}
        // No h-full on motion.div, let it wrap the Card's height
    >
    {/* Added min-h-[400px] to ensure card has a minimum height */}
    <Card className="w-full bg-card text-card-foreground rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-out overflow-hidden flex flex-col min-h-[420px]">
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
      {/* flex-grow will allow this section to take available space */}
      <CardContent className="p-3 pt-1 flex-grow flex flex-col justify-between">
        <div>
            <div className="space-y-1.5 mb-2">
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
        </div>
      </CardContent>
      <CardFooter className="p-0 border-t mt-auto"> {/* mt-auto pushes footer to bottom if content is short */}
        <Button
            variant="ghost"
            className="w-full h-12 rounded-none rounded-b-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold"
            onClick={() => handleBetNavigation('YES')}
            disabled={hasEnded}
            aria-label={`Place Bet on ${market.question}`}
          >
            Place Bet
          </Button>
      </CardFooter>
    </Card>
    </motion.div>
  );
}
