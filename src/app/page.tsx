// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import ChallengeInvite from '@/components/challenges/ChallengeInvite';
import type { ChallengeInviteProps } from '@/types';
import { mockOpponentUser, mockPredictions } from '@/lib/mockData'; // For fallback
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

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
          const errorData = await response.text();
          console.error('API Error Response:', errorData);
          throw new Error(`Failed to fetch market data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data.success && data.markets && data.markets.length > 0) {
          // Map only necessary fields to PageLiveMarket
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-8">
        <div className="w-full max-w-md mx-auto space-y-4 p-4">
          <Skeleton className="h-12 w-3/4 mx-auto" /> {/* Referrer Name Area */}
          <Skeleton className="h-8 w-1/2 mx-auto" /> {/* Referrer Stats Area */}
          <Skeleton className="h-16 w-full mt-2" /> {/* Prediction Question Area */}
          <Skeleton className="h-10 w-full" /> {/* Live Activity / Odds Bar Area */}
          <Skeleton className="h-12 w-full" /> {/* Button 1 */}
          <Skeleton className="h-12 w-full" /> {/* Button 2 */}
          <Skeleton className="h-6 w-3/4 mx-auto mt-2" /> {/* Footer text */}
        </div>
      </div>
    );
  }

  let challengeProps: ChallengeInviteProps;

  if (market) {
    challengeProps = {
      matchId: `live_${market.id}`, // Use the market ID for matchId context
      referrerName: "Community Pick", // Default for a generally displayed market from API
      predictionQuestion: market.question,
      predictionId: market.id, // Use the market ID as the prediction ID
      referrerOriginalChoice: 'YES', // Default choice for a generally displayed market
    };
  } else {
    // Fallback if market is still null after loading and error handling (should be rare)
    challengeProps = {
      matchId: 'fallback_challenge_mock',
      referrerName: mockOpponentUser.username,
      predictionQuestion: mockPredictions[0].text,
      predictionId: mockPredictions[0].id,
      referrerOriginalChoice: 'YES',
    };
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-8">
      {error && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-700/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 rounded-md text-sm text-center max-w-md mx-auto">
          <p>{error}</p>
        </div>
      )}
      <ChallengeInvite {...challengeProps} />
    </div>
  );
}
