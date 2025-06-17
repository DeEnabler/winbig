// src/components/layout/HeaderChallenge.tsx
'use client';

import { useEffect, useState } from 'react';
import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import type { LiveMarket } from '@/types';
import { mockPredictions, mockOpponentUser } from '@/lib/mockData';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function HeaderChallenge() {
  const [market, setMarket] = useState<LiveMarket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarketData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/markets/live-odds');
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Error Response (HeaderChallenge):', errorData);
          throw new Error(errorData.message || `Failed to fetch market data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data.success && data.markets && data.markets.length > 0) {
          const firstApiMarket = data.markets[0] as LiveMarket;
          setMarket(firstApiMarket);
        } else if (data.success && data.markets && data.markets.length === 0) {
          setError('No live markets available at the moment. Displaying a sample prediction.');
          const fallbackMarket: LiveMarket = {
            id: mockPredictions[0].id,
            question: mockPredictions[0].text,
            category: mockPredictions[0].category,
            yesPrice: 0.5,
            noPrice: 0.5,
          };
          setMarket(fallbackMarket);
        } else {
          console.error('API response error or malformed data (HeaderChallenge):', data.message || data);
          setError(data.message || 'Could not load live markets. Displaying a sample prediction.');
          const fallbackMarket: LiveMarket = {
            id: mockPredictions[0].id,
            question: mockPredictions[0].text,
            category: mockPredictions[0].category,
            yesPrice: 0.5,
            noPrice: 0.5,
          };
          setMarket(fallbackMarket);
        }
      } catch (err) {
        console.error('Error fetching market data (HeaderChallenge):', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred. Displaying a sample prediction.');
        const fallbackMarket: LiveMarket = {
            id: mockPredictions[0].id,
            question: mockPredictions[0].text,
            category: mockPredictions[0].category,
            yesPrice: 0.5,
            noPrice: 0.5,
        };
        setMarket(fallbackMarket);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarketData();
  }, []);

  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-2">Error loading header challenge.</p>}>
      <div className="container mx-auto px-3 md:px-4 py-4 flex flex-col items-center border-b mb-4">
        {isLoading && (
          <LoadingSpinner message="Fetching live market for header..." />
        )}
        {!isLoading && error && (
          <div className="my-2 p-2 bg-yellow-100 dark:bg-yellow-700/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 rounded-md text-xs text-center max-w-md mx-auto">
            <p>{error}</p>
          </div>
        )}
        {!isLoading && market && (
          <ChallengeInvite
            matchId={`live_header_${market.id}`} // Ensure a unique matchId prefix
            referrerName={error ? "Community Pick" : mockOpponentUser.username}
            predictionQuestion={market.question}
            predictionId={market.id}
            referrerOriginalChoice='YES' 
            initialYesPrice={market.yesPrice}
          />
        )}
        {!isLoading && !market && !error && (
           <p className="text-center text-muted-foreground text-sm">No header market to display.</p>
        )}
      </div>
    </ErrorBoundary>
  );
}
