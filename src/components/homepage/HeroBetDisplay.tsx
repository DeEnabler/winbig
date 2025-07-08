
// src/components/homepage/HeroBetDisplay.tsx
'use client';

import { useEffect, useState } from 'react';
import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import type { LiveMarket } from '@/types';
import { mockPredictions, mockOpponentUser } from '@/lib/mockData';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button'; // For retry button

export default function HeroBetDisplay() {
  const [market, setMarket] = useState<LiveMarket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchMarketData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch only 1 for hero/challenge display
      const response = await fetch('/api/markets/live-odds?limit=1&offset=0'); 
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response (HeroBetDisplay):', errorData);
        throw new Error(errorData.message || `Failed to fetch market data: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      if (data.success && data.markets && data.markets.length > 0) {
        const firstApiMarket = data.markets[0] as LiveMarket;
        setMarket(firstApiMarket);
      } else if (data.success && data.markets && data.markets.length === 0) {
        setError('No live markets available. Displaying a sample prediction.');
        const fallbackMarket: LiveMarket = { 
          id: 'fallback_hero_1',
          question: 'Will AI write a #1 hit song this year?',
          category: 'Technology',
          yesBuyPrice: 0.35,
          yesSellPrice: 0.33,
          noBuyPrice: 0.65,
          noSellPrice: 0.63,
          yesImpliedProbability: 0.35,
          noImpliedProbability: 0.65,
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          imageUrl: 'https://placehold.co/600x400.png',
          aiHint: 'technology music'
        };
        setMarket(fallbackMarket);
      } else {
        console.error('API response error or malformed data (HeroBetDisplay):', data.message || data);
        setError(data.message || 'Could not load live market. Displaying a sample prediction.');
        const fallbackMarket: LiveMarket = {
          id: mockPredictions[0].id, 
          question: mockPredictions[0].text,
          category: mockPredictions[0].category,
          yesBuyPrice: 0.5,
          yesSellPrice: 0.5,
          noBuyPrice: 0.5,
          noSellPrice: 0.5,
          yesImpliedProbability: 0.5,
          noImpliedProbability: 0.5,
          endsAt: mockPredictions[0].endsAt,
          imageUrl: mockPredictions[0].imageUrl || 'https://placehold.co/600x400.png',
          aiHint: mockPredictions[0].aiHint || 'prediction'
        };
        setMarket(fallbackMarket);
      }
    } catch (err) {
      console.error('Error fetching market data (HeroBetDisplay):', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Displaying a sample prediction.');
      const fallbackMarket: LiveMarket = {
        id: mockPredictions[1].id, 
        question: mockPredictions[1].text,
        category: mockPredictions[1].category,
        yesBuyPrice: 0.60,
        yesSellPrice: 0.58,
        noBuyPrice: 0.40,
        noSellPrice: 0.38,
        yesImpliedProbability: 0.60,
        noImpliedProbability: 0.40,
        endsAt: mockPredictions[1].endsAt,
        imageUrl: mockPredictions[1].imageUrl || 'https://placehold.co/600x400.png',
                  aiHint: mockPredictions[1].aiHint || 'prediction'
      };
      setMarket(fallbackMarket);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]); 

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const payoutTeaser = market?.yesBuyPrice ? `Bet YES to win ${(1 / market.yesBuyPrice).toFixed(1)}x` : 'High Stakes, High Rewards!';
  const activeBettorsCount = market ? (Math.floor(Math.random() * 5000) + 1000) : 4129; 

  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-2">Error loading featured market.</p>}>
      <div className="w-full py-4">
        {isLoading && (
          <div className="min-h-[300px] flex items-center justify-center">
            <LoadingSpinner message="Fetching Featured Market..." />
          </div>
        )}
        {!isLoading && error && !market && ( 
          <div className="my-2 p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-sm text-center max-w-md mx-auto">
            <p>Failed to load the market: {error}</p>
            <Button onClick={handleRetry} variant="outline" className="mt-2">Try Again</Button>
          </div>
        )}
        
        {market && (
          <>
            {error && ( 
               <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-700/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 rounded-md text-xs text-center max-w-md mx-auto">
                <p>{error}</p>
              </div>
            )}
            <ChallengeInvite
              matchId={`featured_market_${market.id}`}
              referrerName={error ? "ViralBet Bot" : mockOpponentUser.username} 
              predictionQuestion={market.question}
              predictionId={market.id}
              referrerOriginalChoice='YES' 
              initialYesPrice={market.yesImpliedProbability}
            />
            <div className="text-center mt-2 text-sm text-muted-foreground">
                <p>🔥 {activeBettorsCount.toLocaleString()} already bet! {payoutTeaser}</p>
            </div>
          </>
        )}
        {!isLoading && !market && !error && (
           <p className="text-center text-muted-foreground text-sm py-10">No featured market to display right now.</p>
        )}
      </div>
    </ErrorBoundary>
  );
}
