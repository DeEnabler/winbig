'use client';

import type { Prediction, BetPlacement } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, CalendarDays, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict } from 'date-fns';

interface PredictionCardProps {
  prediction: Prediction;
  onBet: (bet: BetPlacement) => void;
}

export default function PredictionCard({ prediction, onBet }: PredictionCardProps) {
  const handleBet = (choice: 'YES' | 'NO') => {
    onBet({ predictionId: prediction.id, choice, amount: 10 }); // Default bet amount 10
  };

  const timeLeft = prediction.endsAt ? formatDistanceToNowStrict(prediction.endsAt, { addSuffix: true }) : 'Ongoing';

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl overflow-hidden rounded-xl transform transition-all hover:scale-105 duration-300 ease-out">
      {prediction.imageUrl && (
        <div className="relative h-48 w-full">
          <Image
            src={prediction.imageUrl}
            alt={prediction.text}
            layout="fill"
            objectFit="cover"
            data-ai-hint={prediction.aiHint || "general event"}
          />
        </div>
      )}
      <CardHeader className="p-4">
        <CardTitle className="text-xl font-semibold leading-tight">{prediction.text}</CardTitle>
        <CardDescription className="flex items-center text-xs text-muted-foreground pt-2">
          <Tag className="w-3 h-3 mr-1.5" /> {prediction.category}
          {prediction.endsAt && (
            <>
              <span className="mx-2">·</span>
              <CalendarDays className="w-3 h-3 mr-1.5" />
              Ends {timeLeft}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Potential additional info like odds, volume, etc. can go here */}
        <div className="text-sm text-muted-foreground">
          Place your bet! Will this prediction come true?
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
