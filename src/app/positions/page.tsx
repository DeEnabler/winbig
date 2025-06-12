
// src/app/positions/page.tsx
'use client';

import type { OpenPosition } from '@/types';
import { mockOpenPositions } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, TrendingDown, Clock, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import NextImage from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { useEntryContext } from '@/contexts/EntryContext';

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export default function PositionsPage() {
  const openPositions: OpenPosition[] = mockOpenPositions; // In a real app, fetch this for the current user
  const { appendEntryParams } = useEntryContext();

  if (openPositions.length === 0) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold mb-4">No Open Positions</h1>
        <p className="text-muted-foreground mb-6">You haven't placed any bets yet, or all your bets are settled.</p>
        <Button asChild size="lg">
          <Link href={appendEntryParams('/')}>Find Predictions to Bet On</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          My Open Positions
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Track your active bets and their current status.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {openPositions.map((position, index) => {
          const timeDiff = position.endsAt.getTime() - Date.now();
          const isEndingSoon = timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000; // Less than 1 day
          const statusText = position.status === 'ENDING_SOON' || (isEndingSoon && position.status === 'LIVE') ? 'Ending Soon' : 'Live';
          const statusColor = statusText === 'Ending Soon' ? 'text-orange-500' : 'text-green-500';

          const valueChange = position.currentValue - position.betAmount;
          const valueChangeColor = valueChange >= 0 ? 'text-green-500' : 'text-red-500';
          const ValueChangeIcon = valueChange >= 0 ? TrendingUp : TrendingDown;

          const matchLink = appendEntryParams(`/match/${position.matchId}?predictionId=${position.predictionId}&choice=${position.userChoice}&amount=${position.betAmount}${position.bonusApplied ? '&bonusApplied=true' : ''}&outcome=PENDING`);


          return (
            <motion.div
              key={position.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                {position.imageUrl && (
                  <div className="relative w-full h-40">
                    <NextImage
                      src={position.imageUrl}
                      alt={position.predictionText}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                      data-ai-hint={position.aiHint || position.category}
                    />
                    {position.bonusApplied && (
                        <Badge className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 hover:bg-yellow-400/90 shadow-md">
                            <Sparkles className="w-3.5 h-3.5 mr-1" /> Bonus Active
                        </Badge>
                    )}
                  </div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg leading-tight">{position.predictionText}</CardTitle>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5">
                    <Badge variant="outline">{position.category}</Badge>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDistanceToNow(position.endsAt, { addSuffix: true })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div className="text-sm">
                    Your Bet: <span className={`font-bold ${position.userChoice === 'YES' ? 'text-green-600' : 'text-red-600'}`}>{position.userChoice}</span> for {formatCurrency(position.betAmount)}
                  </div>
                  <div className="text-sm">
                    Potential Payout: <span className="font-bold text-primary">{formatCurrency(position.potentialPayout)}</span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-md">
                     <div className="flex justify-between items-center text-sm mb-1">
                       <span className="text-muted-foreground">Current Value:</span>
                       <span className={`font-bold text-lg ${valueChangeColor}`}>
                         {formatCurrency(position.currentValue)}
                       </span>
                     </div>
                     <div className={`flex items-center text-xs ${valueChangeColor}`}>
                        <ValueChangeIcon className="w-3.5 h-3.5 mr-1" />
                        {valueChange >= 0 ? '+' : ''}{formatCurrency(valueChange)} ({((valueChange / position.betAmount) * 100).toFixed(1)}%)
                     </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Status: <span className={`font-semibold ${statusColor}`}>{statusText}</span>
                    {position.opponentUsername && <span> vs @{position.opponentUsername}</span>}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" variant="outline">
                    <Link href={matchLink}>
                      View Match <ExternalLink className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
