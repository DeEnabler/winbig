
// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import type { ChallengeInviteProps } from '@/types';
import { mockPredictions } from '@/lib/mockData'; // For fallback
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Define a simple Market type based on expected API response for this page
interface PageLiveMarket {
  id: string;
  question: string;
  // Add other fields if they become necessary for prop mapping to ChallengeInvite
  // e.g., category, deadline. For now, ChallengeInvite primarily uses question and id.
}

export default function HomePage() {
  const [market, setMarket] = useState<PageLiveMarket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarketData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/markets/live-odds'); // Fetches default/popular markets
        if (!response.ok) {
          const errorData = await response.json(); // Try to parse error JSON
          console.error('API Error Response:', errorData);
          throw new Error(errorData.message || `Failed to fetch market data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data.success && data.markets && data.markets.length > 0) {
          const firstApiMarket = data.markets[0];
          setMarket({
            id: firstApiMarket.id,
            question: firstApiMarket.question,
          });
        } else if (data.success && data.markets && data.markets.length === 0) {
          setError('No live markets available at the moment. Displaying a sample prediction.');
          const fallbackMarket: PageLiveMarket = {
            id: mockPredictions[0].id,
            question: mockPredictions[0].text,
          };
          setMarket(fallbackMarket);
        } else {
          console.error('API response error or malformed data:', data.message || data);
          setError(data.message || 'Could not load live markets. Displaying a sample prediction.');
          const fallbackMarket: PageLiveMarket = {
            id: mockPredictions[0].id,
            question: mockPredictions[0].text,
          };
          setMarket(fallbackMarket);
        }
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred. Displaying a sample prediction.');
        const fallbackMarket: PageLiveMarket = {
            id: mockPredictions[0].id,
            question: mockPredictions[0].text,
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
            referrerOriginalChoice='YES'
          />
        )}
        {!isLoading && !market && !error && (
           <p className="text-center text-muted-foreground">No market to display.</p>
        )}
      </div>
    </ErrorBoundary>
  );
}
