
// src/components/homepage/MarketFeedCard.tsx
'use client';

import type { LiveMarket } from '@/types';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, Users, Zap, CalendarDays, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEntryContext } from '@/contexts/EntryContext';

interface MarketFeedCardProps {
  market: LiveMarket;
}

export default function MarketFeedCard({ market }: MarketFeedCardProps) {
  const router = useRouter();
  const { appendEntryParams } = useEntryContext();

  if (!market || !market.id) {
    return (
      <Card className="w-full min-h-[100px] p-4 border-destructive">
        <CardTitle className="text-sm text-destructive">Error: Invalid Market Data</CardTitle>
        <CardContent>
          <p className="text-xs">Market data is missing or incomplete.</p>
        </CardContent>
      </Card>
    );
  }

  const handleBetClick = (choice: 'YES' | 'NO') => {
    // Navigate to a match confirmation page, passing relevant info
    // For MVP, this could be a simplified match page or a bet confirmation modal (future)
    const params = new URLSearchParams();
    params.set('predictionId', market.id);
    params.set('choice', choice);
    // A default bet amount, or it could be configurable on the next screen
    params.set('amount', '5'); // Example amount
    // Assuming a direct bet on a market, not a challenge response here
    // You might want a different matchId generation strategy for feed items
    const matchId = `feed_bet_${market.id}_${Date.now()}`;
    
    const path = `/match/${matchId}?${params.toString()}&confirmChallenge=true&referrer=MarketFeed`;
    router.push(appendEntryParams(path));
  };

  const formattedTimeLeft = market.endsAt
    ? `${formatDistanceToNow(market.endsAt, { addSuffix: true })}`
    : 'N/A';

  const endsOrEnded = market.endsAt && market.endsAt.getTime() < Date.now() ? 'Ended' : 'Ends';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full" // Ensure motion div takes full width of grid cell
    >
      <Card className="w-full bg-card text-card-foreground rounded-2xl shadow-lg hover:shadow-xl p-0 flex flex-col min-h-[320px] transform transition-all hover:scale-[1.02] duration-300 ease-out overflow-hidden">
        {market.imageUrl && (
          <div className="relative w-full h-36">
            <NextImage
              src={market.imageUrl || 'https://placehold.co/600x300.png?text=Image'}
              alt={market.question || 'Market image'}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
              data-ai-hint={market.aiHint || market.category || "event"}
              className="rounded-t-2xl"
              priority={false} // Generally false for feed images
            />
          </div>
        )}
        <CardHeader className="p-4 pb-2 flex-shrink-0">
          <CardTitle className="text-base font-semibold leading-tight line-clamp-2 h-10">
            {market.question}
          </CardTitle>
          <div className="flex items-center text-xs text-muted-foreground pt-1">
            {market.category && (
              <>
                <Tag className="w-3 h-3 mr-1" /> {market.category}
                <span className="mx-1.5">·</span>
              </>
            )}
            <CalendarDays className="w-3 h-3 mr-1" />
            {endsOrEnded} {formattedTimeLeft.replace("about ", "")}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1 flex-grow space-y-1.5">
           <div className="text-sm text-primary font-medium">
            YES: {(market.yesPrice * 100).toFixed(0)}% | NO: {(market.noPrice * 100).toFixed(0)}%
          </div>
          {(market as any).payoutTeaser && (
            <div className="text-xs text-muted-foreground">{(market as any).payoutTeaser}</div>
          )}
          <div className="flex items-center space-x-2 text-xs">
            {(market as any).streakCount > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300 py-0.5 px-1.5">
                <Zap className="w-2.5 h-2.5 mr-0.5" /> {(market as any).streakCount}-streak
              </Badge>
            )}
            {(market as any).facePileCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300 py-0.5 px-1.5">
                <Users className="w-2.5 h-2.5 mr-0.5" /> {(market as any).facePileCount} bettors
              </Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-0 mt-auto flex-shrink-0">
          <div className="grid grid-cols-2 w-full">
            <Button
              variant="ghost"
              className="w-full h-12 rounded-none rounded-bl-2xl bg-green-500/20 hover:bg-green-500/30 text-green-700 dark:text-green-400 text-base font-bold"
              onClick={() => handleBetClick('YES')}
            >
              <ThumbsUp className="w-5 h-5 mr-2" /> YES
            </Button>
            <Button
              variant="ghost"
              className="w-full h-12 rounded-none rounded-br-2xl bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-400 text-base font-bold"
              onClick={() => handleBetClick('NO')}
            >
              <ThumbsDown className="w-5 h-5 mr-2" /> NO
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
