'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PredictionCard from '@/components/predictions/PredictionCard';
import type { Prediction, BetPlacement } from '@/types';
import { mockPredictions } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ReferralHandler() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      toast({
        title: "Welcome to ViralBet!",
        description: (
          <div className="flex items-center">
            <Zap className="w-4 h-4 mr-2 text-yellow-500" />
            You were referred by {ref}. Enjoy a bonus bet!
          </div>
        ),
        duration: 5000,
      });
      // Here you might actually grant a bonus, e.g. update user state
    }
  }, [searchParams, toast]);

  return null; // This component doesn't render anything itself
}


export default function HomePage() {
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const [predictions, setPredictions] = useState<Prediction[]>(mockPredictions);
  const router = useRouter();
  const { toast } = useToast();

  // TODO: Fetch predictions from an API in a real app
  // useEffect(() => {
  //   // fetch('/api/predictions').then(res => res.json()).then(data => setPredictions(data));
  // }, []);

  const handleBet = (bet: BetPlacement) => {
    console.log('Bet placed:', bet);
    // Simulate P2P matching or pool allocation
    // For MVP, navigate to a generic match page with details
    const matchId = `match-${bet.predictionId}-${Date.now()}`;
    
    toast({
      title: "Bet Placed!",
      description: `You bet ${bet.choice} on "${predictions[currentPredictionIndex].text.substring(0,30)}...". Taking you to the match...`,
      duration: 3000,
    });
    
    // Pass match details through query params or use a state management solution
    // For simplicity in MVP, we'll pass some basic info. A real app would use a match ID to fetch details.
    router.push(`/match/${matchId}?predictionId=${bet.predictionId}&choice=${bet.choice}&amount=${bet.amount}`);
  };

  const nextPrediction = () => {
    setCurrentPredictionIndex((prevIndex) => (prevIndex + 1) % predictions.length);
  };

  const prevPrediction = () => {
    setCurrentPredictionIndex((prevIndex) => (prevIndex - 1 + predictions.length) % predictions.length);
  };

  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
        <Zap className="w-16 h-16 text-primary mb-4" />
        <h1 className="text-2xl font-semibold mb-2">No Predictions Available</h1>
        <p className="text-muted-foreground">Check back soon for new betting opportunities!</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Loading referral info...</div>}>
      <ReferralHandler />
      <div className="flex flex-col items-center justify-center space-y-8 py-8 min-h-[calc(100vh-15rem)]">
        <PredictionCard
          prediction={predictions[currentPredictionIndex]}
          onBet={handleBet}
        />
        {predictions.length > 1 && (
          <div className="flex space-x-4">
            <Button variant="outline" onClick={prevPrediction} disabled={predictions.length <= 1}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            <Button variant="outline" onClick={nextPrediction} disabled={predictions.length <= 1}>
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
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
    </Suspense>
  );
}
