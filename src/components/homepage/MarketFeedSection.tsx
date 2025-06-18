
// src/components/homepage/MarketFeedSection.tsx
'use client';

import { useEffect, useState } from 'react';
import type { LiveMarket } from '@/types';
import MarketFeedCard from './MarketFeedCard';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner'; // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For error state
import { AlertTriangle } from 'lucide-react';

export default function MarketFeedSection() {
  const [feedMarkets, setFeedMarkets] = useState<LiveMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const feedLimit = 6; // Number of markets to fetch per request
  const [canLoadMore, setCanLoadMore] = useState(true);

  const fetchFeedMarkets = async (currentOffset: number, initialLoad = false) => {
    if (initialLoad) {
        setIsLoading(true);
    } else {
        // For "load more", we can set a specific loading state if needed, or just rely on button disabling
    }
    setError(null);
    console.log(`[MarketFeedSection] Fetching markets. Initial: ${initialLoad}, Offset: ${currentOffset}, Limit: ${feedLimit}`);

    try {
      const response = await fetch(`/api/markets/live-odds?limit=${feedLimit}&offset=${currentOffset}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[MarketFeedSection] API Error - Response not OK (Status: ${response.status}):`, errorText.substring(0, 500));
        throw new Error(`API request failed: ${response.status}. Server returned non-JSON or error page. Snippet: ${errorText.substring(0,100)}...`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || contentType.indexOf("application/json") === -1) {
        const errorText = await response.text();
        console.error(`[MarketFeedSection] API Error - Expected JSON, got ${contentType || 'unknown content type'}:`, errorText.substring(0,500));
        throw new Error(`API response was not JSON (got ${contentType || 'unknown content type'}). Check API implementation. Snippet: ${errorText.substring(0,100)}...`);
      }
      
      const data = await response.json();
      console.log('[MarketFeedSection] API Response Data:', data);

      if (data.success && data.markets) {
        if (data.markets.length === 0) {
          console.log('[MarketFeedSection] API returned 0 new markets.');
          setCanLoadMore(false); // No more markets to load
          if (initialLoad && feedMarkets.length === 0) {
             console.log('[MarketFeedSection] Initial load returned 0 markets. Setting error message.');
             setError("No live markets found at the moment.");
          }
        } else {
          console.log('[MarketFeedSection] Setting markets:', data.markets);
          setFeedMarkets(prev => initialLoad ? data.markets : [...prev, ...data.markets]);
          setOffset(currentOffset + data.markets.length);
          setCanLoadMore(data.markets.length >= feedLimit);
        }
      } else {
        console.error('[MarketFeedSection] API response success was false or markets array missing:', data.message || 'Malformed success response');
        throw new Error(data.message || "Failed to parse feed markets from successful API response.");
      }
    } catch (err) {
      console.error("[MarketFeedSection] Error in fetchFeedMarkets' try-catch block:", err);
      const errorMessage = err instanceof Error ? err.message : "Could not load market feed.";
      setError(errorMessage);
      setCanLoadMore(false); // Stop loading more on error
    } finally {
      if (initialLoad) {
        setIsLoading(false);
      }
      console.log('[MarketFeedSection] Fetching complete. isLoading (for initial):', isLoading, 'canLoadMore:', canLoadMore);
    }
  };

  useEffect(() => {
    fetchFeedMarkets(0, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = () => {
    if (!isLoading && canLoadMore) { // Ensure not already loading when "load more" is clicked
      fetchFeedMarkets(offset, false);
    }
  };

  if (isLoading && feedMarkets.length === 0) { // Show full page spinner only on initial empty load
    return <div className="flex justify-center items-center min-h-[300px]"><LoadingSpinner message="Loading Trending Markets..." /></div>;
  }

  if (error && feedMarkets.length === 0) { // Show full page error only if no markets could be loaded at all
    return (
      <Alert variant="destructive" className="my-8">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Markets</AlertTitle>
        <AlertDescription>
          {error} Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  console.log('[MarketFeedSection] Rendering feedMarkets. Count:', feedMarkets.length);

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-center md:text-left">
        Trending Markets
      </h2>
      
      {feedMarkets.length === 0 && !isLoading && !error && (
         <p className="text-center text-muted-foreground py-8">No markets to display right now. Check back soon!</p>
      )}

      {feedMarkets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {feedMarkets.map((market) => {
            if (!market || !market.id) {
              console.warn('[MarketFeedSection] Rendering: Invalid market object encountered in feedMarkets', market);
              return <div key={Date.now() + Math.random()} className="border p-2 text-xs text-red-500 bg-red-50 min-h-[300px]">Invalid market data object in list</div>;
            }
            return <MarketFeedCard key={market.id} market={market} />;
          })}
        </div>
      )}

      {canLoadMore && !isLoading && feedMarkets.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button onClick={handleLoadMore} variant="outline" size="lg" disabled={isLoading /* Disable if any loading is happening */}>
            {isLoading ? <LoadingSpinner message="Loading..." /> : "Load More Markets"}
          </Button>
        </div>
      )}
      {isLoading && feedMarkets.length > 0 && ( // Show spinner for "load more" specifically
         <div className="flex justify-center py-4"><LoadingSpinner message="Fetching more..." /></div>
      )}
      {!canLoadMore && feedMarkets.length > 0 && (
        <p className="text-center text-muted-foreground mt-8">You've reached the end of the markets!</p>
      )}
       {error && feedMarkets.length > 0 && ( // Show inline error if some markets loaded but "load more" failed
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not load more</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}
