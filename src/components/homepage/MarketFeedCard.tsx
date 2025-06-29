
// src/components/homepage/MarketFeedCard.tsx
'use client';

import type { LiveMarket } from '@/types';
import { Badge } from '@/components/ui/badge';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChart2 } from 'lucide-react';
import Link from 'next/link';

interface MarketFeedCardProps {
  market: LiveMarket;
}

export default function MarketFeedCard({ market }: MarketFeedCardProps) {
  const displayTitle = market.question.length > 70
    ? market.question.substring(0, 70) + '...'
    : market.question;

  // Use the new, more accurate implied probability for the main display
  const yesPercent = Math.floor(market.odds.yesImpliedProbability * 100);
  const noPercent = 100 - yesPercent;

  console.log(`[MarketFeedCard UI] ID: ${market.id}, received yesImpliedProbability: ${market.odds.yesImpliedProbability}, calculated yesPercent: ${yesPercent}`);

  const detailUrl = `/match/${market.id}?predictionId=${market.id}`;

  return (
    <Card className="flex flex-col h-full overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-base leading-tight font-semibold line-clamp-2 h-12">
          {displayTitle}
        </CardTitle>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center space-x-2">
            <Users className="w-3 h-3" />
            <span>{Math.floor(Math.random() * 500 + 50)} Bettors</span>
          </div>
          {market.category && <Badge variant="outline" className="text-xs">{market.category}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 py-2">
        <div className="flex justify-between items-center text-sm">
          <span className="font-bold text-green-600">YES {yesPercent}%</span>
          <span className="font-bold text-red-600">NO {noPercent}%</span>
        </div>
        <div className="relative w-full h-2 bg-red-500/30 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-green-500/50"
            style={{ width: `${yesPercent}%` }}
          ></div>
        </div>
        <div className="text-center text-xs text-muted-foreground pt-1">
            Buy YES for ${market.pricing.yes.buy.toFixed(2)}
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-3 px-4">
        <Button asChild className="w-full" size="sm">
            <Link href={detailUrl} prefetch={false}>
                 <BarChart2 className="w-4 h-4 mr-2" />
                 View Details & Bet
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
