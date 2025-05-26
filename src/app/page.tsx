// src/app/page.tsx
'use client';

import { redirect, useRouter } from 'next/navigation'; // useRouter for client-side nav
import PredictionCard from '@/components/predictions/PredictionCard';
import type { Prediction, BetPlacement } from '@/types';
import { mockPredictions, mockCurrentUser } from '@/lib/mockData'; // For mock userId
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react'; // For handling client-side effects

// This page now acts as a client component to handle bet placement from PredictionCards
export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { appendEntryParams } = useEntryContext();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Simulate fetching predictions
  useEffect(() => {
    // In a real app, fetch predictions from an API
    setPredictions(mockPredictions);
  }, []);

  const handleBetPlacement = async (bet: BetPlacement) => {
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
          userId: mockCurrentUser.id, // In a real app, get this from auth session
          predictionId: bet.predictionId,
          choice: bet.choice,
          amount: bet.amount,
          // 'challengeMatchId' and 'referrerName' are not applicable here, or could be null/default
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
      
      // Construct the match URL. For now, using predictionId as part of matchId
      // and passing relevant details as query params for the match page.
      const matchIdForUrl = `pred-${bet.predictionId}`; // Example match ID structure
      const baseUrl = `/match/${matchIdForUrl}?predictionId=${bet.predictionId}&choice=${bet.choice}&amount=${bet.amount}`;
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
  
  // --- TEMPORARY REDIRECT FOR TESTING CHALLENGE FLOW ---
  // Comment this out to see the normal prediction feed
  useEffect(() => {
    const shouldRedirectToChallenge = true; // Set to false to disable redirect
    if (shouldRedirectToChallenge) {
      const challengeUrl = `/match/challengeAsTest1?challenge=true&referrer=ViralBot&predictionId=1`;
      // Using setTimeout to ensure router is ready, useful for client-side components
      const timer = setTimeout(() => router.push(challengeUrl), 0);
      return () => clearTimeout(timer); // Cleanup timer on unmount
    }
  }, [router]);

  if (true) { // Replace `true` with `!shouldRedirectToChallenge` when ready to disable redirect
     // This is a temporary state while redirecting
     return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
          <p className="text-lg text-muted-foreground">Loading ViralBet...</p>
          {/* You could add a spinner here */}
        </div>
      );
  }
  // --- END TEMPORARY REDIRECT ---


  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
        <p className="text-lg text-muted-foreground">Loading predictions...</p>
        {/* You could add a spinner here */}
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
      <PredictionCard
        key={currentPrediction.id}
        id={currentPrediction.id}
        question={currentPrediction.text}
        thumbnailUrl={currentPrediction.imageUrl || 'https://placehold.co/600x400.png'}
        payoutTeaser={currentPrediction.payoutTeaser || `Bet $5 → Win $${(5 * 1.9).toFixed(2)}`}
        streakCount={currentPrediction.streakCount}
        facePileCount={currentPrediction.facePileCount}
        category={currentPrediction.category}
        endsAt={currentPrediction.endsAt} // Pass the Date object
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
