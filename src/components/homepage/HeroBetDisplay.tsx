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
      const response = await fetch('/api/markets/live-odds?limit=1'); // Fetch only 1 for hero
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
        setError('No live markets available for hero section. Displaying a sample.');
        const fallbackMarket: LiveMarket = { // More engaging fallback
          id: 'fallback_hero_1',
          question: 'Will AI write a #1 hit song this year?',
          category: 'Technology',
          yesPrice: 0.35,
          noPrice: 0.65,
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };
        setMarket(fallbackMarket);
      } else {
        console.error('API response error or malformed data (HeroBetDisplay):', data.message || data);
        setError(data.message || 'Could not load live market. Displaying a sample.');
        const fallbackMarket: LiveMarket = {
          id: mockPredictions[0].id, // Default fallback
          question: mockPredictions[0].text,
          category: mockPredictions[0].category,
          yesPrice: 0.5,
          noPrice: 0.5,
          endsAt: mockPredictions[0].endsAt,
        };
        setMarket(fallbackMarket);
      }
    } catch (err) {
      console.error('Error fetching market data (HeroBetDisplay):', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Displaying a sample.');
      const fallbackMarket: LiveMarket = {
        id: mockPredictions[1].id, // Different fallback
        question: mockPredictions[1].text,
        category: mockPredictions[1].category,
        yesPrice: 0.60,
        noPrice: 0.40,
        endsAt: mockPredictions[1].endsAt,
      };
      setMarket(fallbackMarket);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, [retryCount]); // Refetch on retry

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Dynamic text for the hero card
  const payoutTeaser = market?.yesPrice ? `Bet YES to win ${(1 / market.yesPrice).toFixed(1)}x` : 'High Stakes, High Rewards!';
  const activeBettorsCount = market ? (Math.floor(Math.random() * 5000) + 1000) : 4129; // Simulated

  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-2">Error loading hero market.</p>}>
      <div className="w-full py-4">
        {isLoading && (
          <div className="min-h-[300px] flex items-center justify-center">
            <LoadingSpinner message="Fetching Top Market..." />
          </div>
        )}
        {!isLoading && error && !market && ( // Show error and retry only if no market is set (even fallback)
          <div className="my-2 p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-sm text-center max-w-md mx-auto">
            <p>Failed to load the main market: {error}</p>
            <Button onClick={handleRetry} variant="outline" className="mt-2">Try Again</Button>
          </div>
        )}
        {/* Always render ChallengeInvite if market is available (even fallback) or if there's an error but a fallback market is set */}
        {market && (
          <>
            {error && ( // Show non-blocking error message if a fallback market is displayed
               <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-700/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 rounded-md text-xs text-center max-w-md mx-auto">
                <p>Showing a sample market due to: {error}</p>
              </div>
            )}
            {/* Pass dynamic props to ChallengeInvite or a new HeroDisplayCard if it diverges significantly */}
            <ChallengeInvite
              matchId={`hero_market_${market.id}`}
              referrerName={error ? "ViralBet Bot" : mockOpponentUser.username} // Use a bot name if it's a fallback due to error
              predictionQuestion={market.question}
              predictionId={market.id}
              referrerOriginalChoice='YES' // Default referrer choice for display
              initialYesPrice={market.yesPrice}
              // Potentially new props for ChallengeInvite if we customize it further for hero:
              // payoutTeaser={payoutTeaser}
              // activeBettorsCount={activeBettorsCount}
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
