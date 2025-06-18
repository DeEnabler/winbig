// src/components/homepage/MarketFeedSection.tsx
'use client';

import { useEffect, useState } from 'react';
import type { LiveMarket } from '@/types';
import MarketFeedCard from './MarketFeedCard';
// import { Button } from '@/components/ui/button'; // Temporarily removed for simplification

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
    console.log('[MarketFeedSection] Fetching initial markets (simplified)...');
    try {
      const response = await fetch(`/api/markets/live-odds?limit=${feedLimit}&offset=0`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[MarketFeedSection] API Error - Response not OK (Status: ${response.status}):`, errorText.substring(0, 500));
        throw new Error(`API request failed: ${response.status}. Server returned non-JSON. Snippet: ${errorText.substring(0,100)}...`);
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
          // setCanLoadMore(false); // Temporarily removed
          console.log('[MarketFeedSection] API returned 0 markets.');
          setError("No live markets found for the feed (API returned empty).");
          setFeedMarkets([]);
        } else {
          console.log('[MarketFeedSection] Setting markets:', data.markets);
          setFeedMarkets(data.markets);
          // setOffset(data.markets.length); // Temporarily removed
          // setCanLoadMore(data.markets.length >= feedLimit); // Temporarily removed
        }
      } else {
        console.error('[MarketFeedSection] API response success was false or markets array missing:', data.message);
        throw new Error(data.message || "Failed to parse feed markets from successful API response.");
      }
    } catch (err) {
      console.error("[MarketFeedSection] Error in fetchFeedMarkets' try-catch block:", err);
      const errorMessage = err instanceof Error ? err.message : "Could not load market feed.";
      setError(errorMessage);
      setFeedMarkets([]);
    } finally {
      setIsLoading(false);
      console.log('[MarketFeedSection] Fetching complete. isLoading:', false);
    }
  };

  useEffect(() => {
    fetchFeedMarkets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  if (isLoading) {
    return <div className="text-center p-8 text-muted-foreground">Loading markets (simplified)...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-destructive bg-destructive/10 border border-destructive/30 rounded-md">Error loading markets: {error} (Simplified View)</div>;
  }

  if (feedMarkets.length === 0 && !isLoading && !error) {
     return <p className="text-center text-muted-foreground py-8">(Simplified) No markets to display. API might have returned none, or an error occurred before setting markets.</p>;
  }
  
  console.log('[MarketFeedSection] Rendering feedMarkets. Count:', feedMarkets.length);
  if (feedMarkets.length > 0) {
    console.log('[MarketFeedSection] First market data:', feedMarkets[0]);
  }


  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-center md:text-left">
        Trending Markets (Simplified Feed)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {feedMarkets.map((market) => {
          if (!market || !market.id) {
            console.warn('[MarketFeedSection] Rendering: Invalid market object encountered in feedMarkets', market);
            return <div key={Date.now() + Math.random()} className="border p-2 text-xs text-red-500">Invalid market data object in list</div>;
          }
          console.log('[MarketFeedSection] Rendering MarketFeedCard for market ID:', market.id, market);
          return <MarketFeedCard key={market.id} market={market} />;
        })}
      </div>
    </section>
  );
}
