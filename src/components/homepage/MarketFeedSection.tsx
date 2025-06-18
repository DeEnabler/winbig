// src/components/homepage/MarketFeedSection.tsx
'use client';

import { useEffect, useState } from 'react';
import type { LiveMarket } from '@/types';
import MarketFeedCard from './MarketFeedCard';
// import { LoadingSpinner } from '@/components/LoadingSpinner'; // Temporarily removed
// import { Button } from '@/components/ui/button'; // Temporarily removed
// import { mockPredictions } from '@/lib/mockData'; // Temporarily removed for clean test

export default function MarketFeedSection() {
  const [feedMarkets, setFeedMarkets] = useState<LiveMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [offset, setOffset] = useState(0); // Simplified: only initial load
  const feedLimit = 3; // Fetch fewer for initial simple test
  // const [canLoadMore, setCanLoadMore] = useState(true); // Temporarily removed

  const fetchFeedMarkets = async () => {
    setIsLoading(true);
    setError(null);
    console.log('[MarketFeedSection] Fetching initial markets...');
    try {
      const response = await fetch(`/api/markets/live-odds?limit=${feedLimit}&offset=0`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[MarketFeedSection] API Error:', errorData);
        throw new Error(errorData.message || `Failed to fetch feed markets: ${response.status}`);
      }
      const data = await response.json();
      console.log('[MarketFeedSection] API Response Data:', data);

      if (data.success && data.markets) {
        if (data.markets.length === 0) {
          // setCanLoadMore(false); // Temporarily removed
          setError("No live markets found for the feed (API returned empty).");
          setFeedMarkets([]); // Ensure it's empty
        } else {
          console.log('[MarketFeedSection] Setting markets:', data.markets);
          setFeedMarkets(data.markets);
          // setOffset(data.markets.length); // Temporarily removed
          // setCanLoadMore(data.markets.length >= feedLimit); // Temporarily removed
        }
      } else {
        console.error('[MarketFeedSection] Failed to parse markets or unsuccessful response:', data.message);
        throw new Error(data.message || "Failed to parse feed markets.");
      }
    } catch (err) {
      console.error("[MarketFeedSection] Error fetching feed markets:", err);
      const errorMessage = err instanceof Error ? err.message : "Could not load market feed.";
      setError(errorMessage);
      setFeedMarkets([]); // Clear markets on error
    } finally {
      setIsLoading(false);
      console.log('[MarketFeedSection] Fetching complete. isLoading:', false);
    }
  };

  useEffect(() => {
    fetchFeedMarkets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Temporarily removed Load More logic
  // const handleLoadMore = () => {
  //   if (!isLoading && canLoadMore) {
  //     fetchFeedMarkets(offset);
  //   }
  // };

  if (isLoading) {
    return <div className="text-center p-8">Loading markets (simplified)...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-destructive">Error loading markets: {error} (Simplified View)</div>;
  }

  if (feedMarkets.length === 0 && !isLoading && !error) {
     return <p className="text-center text-muted-foreground py-8">(Simplified) No markets to display. API might have returned none, or an error occurred before setting markets.</p>;
  }
  
  console.log('[MarketFeedSection] Rendering feedMarkets. Count:', feedMarkets.length, feedMarkets);

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-center md:text-left">
        Trending Markets (Simplified Feed)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {feedMarkets.map((market) => {
          if (!market || !market.id) {
            console.warn('[MarketFeedSection] Rendering: Invalid market object encountered in feedMarkets', market);
            return <div key={Date.now() + Math.random()} className="border p-2 text-xs text-red-500">Invalid market data in list</div>;
          }
          console.log('[MarketFeedSection] Rendering MarketFeedCard for market ID:', market.id);
          return <MarketFeedCard key={market.id} market={market} />;
        })}
      </div>

      {/* Temporarily removed "Load More" button */}
      {/* {!isLoading && canLoadMore && feedMarkets.length > 0 && (
        <div className="text-center mt-8">
          <Button onClick={handleLoadMore} variant="outline" size="lg">
            Load More Markets
          </Button>
        </div>
      )}
      {!isLoading && !canLoadMore && feedMarkets.length >= feedLimit && ( // Show if loaded at least one page
         <p className="text-center text-muted-foreground py-4 text-sm">No more markets to load.</p>
      )} */}
    </section>
  );
}
