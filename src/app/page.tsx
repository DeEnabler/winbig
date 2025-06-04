
// src/app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import PredictionCardComponent from '@/components/predictions/PredictionCard';
import type { Prediction, BetPlacement } from '@/types';
import { mockCurrentUser, mockPredictions as staticMockPredictions } from '@/lib/mockData'; // Use static mock predictions
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { appendEntryParams } = useEntryContext();
  const [predictions, setPredictions] = useState<Prediction[]>(staticMockPredictions); // Initialize with static mock data
  const [currentIndex, setCurrentIndex] = useState(0);
  // Removed isLoadingPredictions and predictionError states related to AI fetching

  // Effect to set initial predictions from static mock data
  useEffect(() => {
    if (staticMockPredictions && staticMockPredictions.length > 0) {
      setPredictions(staticMockPredictions);
    } else {
      setPredictions([]);
       toast({
        variant: "default",
        title: "No Mock Predictions Available",
        description: "The static mock prediction data seems to be empty.",
      });
    }
  }, []);


  const handleBetPlacement = async (bet: Omit<BetPlacement, 'challengeMatchId' | 'referrerName'>) => {
    toast({
      title: 'Placing your bet...',
      description: `You chose ${bet.choice} for prediction ID ${bet.predictionId}.`,
    });

    try {
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: mockCurrentUser.id,
          predictionId: bet.predictionId,
          choice: bet.choice,
          amount: bet.amount,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to place bet.');
      }

      toast({
        title: 'Bet Placed Successfully!',
        description: `Your ${bet.choice} bet for $${bet.amount} on prediction ID ${bet.predictionId} is in!`,
      });
      
      const matchIdForUrl = `pred-${bet.predictionId}`;
      const baseUrl = `/match/${matchIdForUrl}?predictionId=${bet.predictionId}&choice=${bet.choice}&amount=${bet.amount}&betPlaced=true`;
      const urlWithEntryParams = appendEntryParams(baseUrl);
      router.push(urlWithEntryParams);

    } catch (error) {
      console.error("Error placing bet from prediction card:", error);
      toast({
        variant: "destructive",
        title: "Bet Failed",
        description: error instanceof Error ? error.message : "Could not place your bet. Please try again.",
      });
    }
  };

  // Simplified loading/error state as we are using static data for now
  if (!predictions || predictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">No Predictions Available</h2>
        <p className="text-muted-foreground mb-4 max-w-md">
          Static prediction data could not be loaded. Please check the mockData.ts file.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-6">Try Again</Button>
      </div>
    );
  }

  const currentPrediction = predictions[currentIndex];

  const goToNextPrediction = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % predictions.length);
  };

  const goToPreviousPrediction = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + predictions.length) % predictions.length);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8 min-h-[calc(100vh-15rem)]">
      <PredictionCardComponent
        key={currentPrediction.id}
        id={currentPrediction.id}
        question={currentPrediction.text} 
        thumbnailUrl={currentPrediction.imageUrl || 'https://placehold.co/600x400.png'}
        aiHint={currentPrediction.aiHint}
        payoutTeaser={currentPrediction.payoutTeaser || `Bet $5 → Win $${(5 * 1.9).toFixed(2)}`} // Keep default teaser
        streakCount={currentPrediction.streakCount}
        facePileCount={currentPrediction.facePileCount}
        category={currentPrediction.category}
        endsAt={currentPrediction.endsAt}
        onBet={handleBetPlacement}
      />
      <div className="flex space-x-4">
        <Button variant="outline" onClick={goToPreviousPrediction} disabled={predictions.length <= 1}>
          Previous
        </Button>
        <Button variant="outline" onClick={goToNextPrediction} disabled={predictions.length <= 1}>
          Next
        </Button>
      </div>
       <Card className="w-full max-w-md mt-8 bg-background/70">
        <CardHeader>
          <CardTitle className="text-lg text-center">How to Play</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Swipe or tap YES/NO on the prediction card.</p>
          <p>2. Your bet is matched instantly!</p>
          <p>3. Share your challenge on X and climb the leaderboard!</p>
        </CardContent>
      </Card>
    </div>
  );
}
