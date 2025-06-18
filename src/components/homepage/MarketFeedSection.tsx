// src/components/homepage/MarketFeedSection.tsx
'use client';

import type { LiveMarket } from '@/types';
import MarketFeedCard from './MarketFeedCard'; // Simplified version for now
import useDataFetch from '@/hooks/useDataFetch'; // Import the new hook
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';
// LoadingSpinner and Button are not used in this specific simplified step with useDataFetch + Suspense
// Suspense boundary in page.tsx will handle loading UI.

interface ApiMarketResponse {
  success: boolean;
  markets?: LiveMarket[];
  marketCount?: number;
  message?: string;
  error?: string;
}

export default function MarketFeedSection() {
  // Using the new Suspense-compatible hook
  // Limit remains 3 for this testing phase.
  const { data: apiResponse, error: fetchError } = useDataFetch<ApiMarketResponse>('/api/markets/live-odds?limit=3&offset=0');

  if (fetchError) {
    // If useDataFetch resolved with an error, throw it so ErrorBoundary can catch it.
    console.error("[MarketFeedSection] Error from useDataFetch:", fetchError);
    throw fetchError; // This will be caught by the nearest ErrorBoundary
  }

  // If apiResponse is null, Suspense is still waiting (useDataFetch threw a promise).
  // The Suspense fallback in page.tsx will be shown.
  if (!apiResponse) {
    // This state should ideally not be reached if Suspense is working correctly,
    // as useDataFetch would throw a promise. But as a fallback:
    console.log("[MarketFeedSection] apiResponse is null, Suspense should be active.");
    return <div className="text-center p-4">Preparing market feed...</div>;
  }

  // Handle cases where the API response itself indicates failure (e.g., { success: false, message: "..." })
  if (apiResponse.success === false) {
    console.error("[MarketFeedSection] API reported failure:", apiResponse.message || apiResponse.error);
    throw new Error(apiResponse.message || apiResponse.error || "API request failed but did not return a specific error message.");
  }

  const feedMarkets = apiResponse.markets;

  if (!feedMarkets || feedMarkets.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center md:text-left">
          Trending Markets
        </h2>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Markets Available</AlertTitle>
          <AlertDescription>
            There are no trending markets to display at the moment. Please check back later.
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  // "Load More" functionality is still removed for this focused test.
  // The Suspense fallback will be shown by page.tsx while data is loading.

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-center md:text-left">
        Trending Markets
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {feedMarkets.map((market) => {
          // Basic validation for key properties to prevent simple render errors
          if (!market || !market.id || typeof market.question !== 'string') {
            console.warn("[MarketFeedSection] Invalid market data object in feed:", market);
            return (
              <div key={market?.id || Math.random()} className="p-4 border border-destructive bg-destructive/10 rounded-lg">
                <h3 className="font-bold text-sm text-destructive">Error: Invalid Market Data</h3>
                <p className="text-xs">Market data is incomplete or malformed.</p>
              </div>
            );
          }
          return <MarketFeedCard key={market.id} market={market} />;
        })}
      </div>
      {/* 
        "Load More" button and related logic are still disabled for this test.
        If the initial load works correctly with Suspense, we can re-add pagination.
      */}
    </section>
  );
}
