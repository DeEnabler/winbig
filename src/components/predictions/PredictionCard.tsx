
// src/components/predictions/PredictionCard.tsx
'use client';

import type { PredictionCardProps } from '@/types'; // BetPlacement removed as it's not used here directly
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, Users, Zap, CalendarDays, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

// InternalPredictionCardProps is identical to PredictionCardProps here as per types/index.ts
// So we can directly use PredictionCardProps
export default function PredictionCard({
  id,
  question,
  thumbnailUrl,
  aiHint, // Added aiHint to destructuring
  payoutTeaser,
  streakCount,
  facePileCount,
  category,
  timeLeft,
  endsAt,
  onBet,
}: PredictionCardProps) {

  const handleBet = async (choice: 'YES' | 'NO') => {
    await onBet({ predictionId: id, choice, amount: 5 }); // Default bet amount
  };

  const formattedTimeLeft = endsAt
    ? `${formatDistanceToNow(endsAt, { addSuffix: true })}`
    : timeLeft || 'N/A';

  const endsOrEnded = endsAt && endsAt.getTime() < Date.now() ? 'Ended' : 'Ends';

  return (
    <Card className="bg-card text-card-foreground rounded-2xl shadow-lg hover:shadow-xl p-0 mb-4 w-full max-w-md mx-auto transform transition-all hover:scale-[1.02] duration-300 ease-out overflow-hidden">
      {thumbnailUrl && (
        <div className="relative w-full h-48"> {/* Removed object-cover from here */}
          <NextImage
            src={thumbnailUrl}
            alt={question}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // Example sizes, adjust as needed
            style={{ objectFit: 'cover' }} // Added objectFit via style prop
            data-ai-hint={aiHint || category || "general event"} // Use aiHint first, then category
            className="rounded-t-2xl"
          />
        </div>
      )}
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xl font-semibold leading-tight">{question}</CardTitle>

        <div className="flex items-center text-xs text-muted-foreground pt-2">
          {category && (
            <>
              <Tag className="w-3 h-3 mr-1.5" /> {category}
              <span className="mx-2">·</span>
            </>
          )}
          <CalendarDays className="w-3 h-3 mr-1.5" />
          {endsOrEnded} {formattedTimeLeft.replace("about ", "")}
        </div>

      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-sm text-primary font-medium mb-2">{payoutTeaser}</div>
        <div className="flex items-center space-x-2 text-xs">
          {streakCount && streakCount > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300 py-1">
              <Zap className="w-3 h-3 mr-1" /> {streakCount}-in-a-row
            </Badge>
          )}
          {facePileCount && facePileCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300 py-1">
              <Users className="w-3 h-3 mr-1" /> {facePileCount} bettors
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-0">
        <div className="grid grid-cols-2 w-full">
          <Button
            variant="ghost"
            className="w-full h-16 rounded-none rounded-bl-xl bg-green-500/20 hover:bg-green-500/30 text-green-700 dark:text-green-400 text-lg font-bold"
            onClick={() => handleBet('YES')}
          >
            <ThumbsUp className="w-6 h-6 mr-2" /> YES
          </Button>
          <Button
            variant="ghost"
            className="w-full h-16 rounded-none rounded-br-xl bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-400 text-lg font-bold"
            onClick={() => handleBet('NO')}
          >
            <ThumbsDown className="w-6 h-6 mr-2" /> NO
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
