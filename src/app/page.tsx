
// src/app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import PredictionCardComponent from '@/components/predictions/PredictionCard'; // Renamed to avoid conflict
import type { Prediction, BetPlacement } from '@/types';
import { mockCurrentUser } from '@/lib/mockData';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { generatePredictionsFromTrends, type PredictionCard as ApiPredictionCard } from '@/ai/flows/generate-predictions-from-trends-flow'; // Import AI flow
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { appendEntryParams } = useEntryContext();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      setIsLoadingPredictions(true);
      try {
        // Example trending topics
        const trendingTopics = ['AI breakthroughs', 'Next major sporting event', 'Upcoming movie releases', 'Global economic shifts', 'New tech gadgets'];
        const result = await generatePredictionsFromTrends({ trendingTopics, count: 5 });
        
        if (result.predictions && result.predictions.length > 0) {
          const formattedPredictions: Prediction[] = result.predictions.map((apiPred: ApiPredictionCard) => ({
            id: apiPred.id,
            text: apiPred.text, // This will be mapped to 'question' in PredictionCardComponent
            category: apiPred.category,
            endsAt: apiPred.endsAt ? new Date(apiPred.endsAt) : undefined, // Convert string to Date
            imageUrl: apiPred.imageUrl, // Placeholder URL from AI
            aiHint: apiPred.aiHint,
            payoutTeaser: apiPred.payoutTeaser,
            streakCount: apiPred.streakCount,
            facePileCount: apiPred.facePileCount,
          }));
          setPredictions(formattedPredictions);
        } else {
          setPredictions([]); // Set to empty or handle error (e.g. load mock data as fallback)
           toast({
            variant: "destructive",
            title: "No Predictions",
            description: "Could not fetch new predictions from AI. Showing empty list.",
          });
        }
      } catch (error) {
        console.error("Failed to fetch predictions from AI:", error);
        toast({
          variant: "destructive",
          title: "Prediction Fetch Error",
          description: "Failed to load dynamic predictions. Please try again later.",
        });
        setPredictions([]); // Or load mock data as fallback
      } finally {
        setIsLoadingPredictions(false);
      }
    };

    fetchPredictions();
  }, [toast]); // Added toast to dependency array

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

  if (isLoadingPredictions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Generating fresh predictions with AI...</p>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
        <p className="text-lg text-muted-foreground">No predictions available at the moment. Please check back later!</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Try Again</Button>
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
        question={currentPrediction.text} // Mapped from apiPred.text
        thumbnailUrl={currentPrediction.imageUrl || 'https://placehold.co/600x400.png'}
        aiHint={currentPrediction.aiHint}
        payoutTeaser={currentPrediction.payoutTeaser || `Bet $5 → Win $${(5 * 1.9).toFixed(2)}`}
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
