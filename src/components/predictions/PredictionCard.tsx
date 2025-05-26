// src/components/predictions/PredictionCard.tsx
'use client';

import type { PredictionCardProps, BetPlacement } from '@/types'; // Updated props type
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, Users, Zap, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
// import { motion } from 'framer-motion'; // For later animations

interface InternalPredictionCardProps extends PredictionCardProps {
  onBet: (bet: BetPlacement) => void;
}


export default function PredictionCard({
  id,
  question,
  thumbnailUrl,
  payoutTeaser,
  streakCount,
  facePileCount,
  category,
  timeLeft,
  onBet,
}: InternalPredictionCardProps) {
  
  const handleBet = (choice: 'YES' | 'NO') => {
    // Call the onBet prop passed from the page, which will handle navigation
    onBet({ predictionId: id, choice, amount: 5 }); // Default bet amount, can be dynamic later
  };

  return (
    // Container: bg-white rounded-2xl shadow p-4 mb-4 (Tailwind equivalent)
    // For dark mode compatibility, use bg-card and text-card-foreground
    <Card className="bg-card text-card-foreground rounded-2xl shadow-lg p-4 mb-4 w-full max-w-md mx-auto transform transition-all hover:scale-105 duration-300 ease-out">
      {thumbnailUrl && (
        <div className="relative w-full h-32 object-cover rounded-lg overflow-hidden">
          <NextImage
            src={thumbnailUrl}
            alt={question}
            layout="fill"
            objectFit="cover"
            data-ai-hint={category || "general event"}
          />
        </div>
      )}
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xl font-semibold">{question}</CardTitle>
        {category && (
          <Badge variant="outline" className="mt-1 w-fit">{category}</Badge>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-2">
        <p className="text-sm text-primary font-medium">{payoutTeaser}</p>
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          {streakCount && streakCount > 0 && (
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-700 dark:text-orange-400">
              <Zap className="w-3 h-3 mr-1" /> {streakCount}-in-a-row
            </Badge>
          )}
          {facePileCount && facePileCount > 0 && (
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-400">
              <Users className="w-3 h-3 mr-1" /> {facePileCount} bettors
            </Badge>
          )}
        </div>
        {timeLeft && (
           <div className="flex items-center text-xs text-muted-foreground">
             <CalendarDays className="w-3 h-3 mr-1.5" /> Closes in {timeLeft}
           </div>
        )}
      </CardContent>
      <CardFooter className="p-0">
        <div className="grid grid-cols-2 w-full">
          <Button
            // className: w-1/2 py-3 m-1 text-lg font-bold rounded-xl bg-indigo-600 text-white
            // Adapting to ShadCN variants and full width split
            variant="ghost"
            className="w-full py-3 text-lg font-bold rounded-none rounded-bl-2xl bg-green-600/90 hover:bg-green-600 text-white h-14"
            onClick={() => handleBet('YES')}
          >
            <ThumbsUp className="w-5 h-5 mr-2" /> YES
          </Button>
          <Button
            variant="ghost"
            className="w-full py-3 text-lg font-bold rounded-none rounded-br-2xl bg-red-600/90 hover:bg-red-600 text-white h-14"
            onClick={() => handleBet('NO')}
          >
            <ThumbsDown className="w-5 h-5 mr-2" /> NO
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
