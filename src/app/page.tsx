
// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import type { LiveMarket } from '@/types'; // Changed from ChallengeInviteProps to LiveMarket
import { mockPredictions } from '@/lib/mockData'; // For fallback
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// PageLiveMarket is now essentially LiveMarket for consistency
// interface PageLiveMarket {
//   id: string;
//   question: string;
//   yesPrice?: number; // Added to carry over odds
// }

export default function HomePage() {
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
          console.error('API Error Response:', errorData);
          throw new Error(errorData.message || `Failed to fetch market data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data.success && data.markets && data.markets.length > 0) {
          const firstApiMarket = data.markets[0] as LiveMarket; // Cast to LiveMarket
          setMarket(firstApiMarket); // This will now include yesPrice and noPrice
        } else if (data.success && data.markets && data.markets.length === 0) {
          setError('No live markets available at the moment. Displaying a sample prediction.');
          const fallbackMarket: LiveMarket = {
            id: mockPredictions[0].id,
            question: mockPredictions[0].text,
            category: mockPredictions[0].category,
            yesPrice: 0.5, // Default for mock
            noPrice: 0.5,  // Default for mock
          };
          setMarket(fallbackMarket);
        } else {
          console.error('API response error or malformed data:', data.message || data);
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
        console.error('Error fetching market data:', err);
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
    <ErrorBoundary fallback={<p className="text-center text-destructive p-4">An error occurred displaying the page. Please try again later.</p>}>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-8">
        {isLoading && (
          <LoadingSpinner message="Fetching live market..." />
        )}
        {!isLoading && error && (
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-700/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 rounded-md text-sm text-center max-w-md mx-auto">
            <p>{error}</p>
          </div>
        )}
        {!isLoading && market && (
          <ChallengeInvite
            matchId={`live_${market.id}`}
            referrerName="Community Pick"
            predictionQuestion={market.question}
            predictionId={market.id}
            referrerOriginalChoice='YES' // This could be more dynamic if needed
            initialYesPrice={market.yesPrice} // Pass the fetched yesPrice
          />
        )}
        {!isLoading && !market && !error && (
           <p className="text-center text-muted-foreground">No market to display.</p>
        )}
      </div>
    </ErrorBoundary>
  );
}
