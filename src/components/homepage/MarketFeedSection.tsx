
// src/components/homepage/MarketFeedSection.tsx
'use client';

import { useEffect, useState } from 'react';
import type { LiveMarket } from '@/types';
import MarketFeedCard from './MarketFeedCard'; // Simplified version
// import { Button } from '@/components/ui/button';
// import { LoadingSpinner } from '@/components/LoadingSpinner';
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertTriangle } from 'lucide-react';

export default function MarketFeedSection() {
  const [feedMarkets, setFeedMarkets] = useState<LiveMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [offset, setOffset] = useState(0);
  const feedLimit = 3; // Fetch only 3 for simplified initial test
  // const [canLoadMore, setCanLoadMore] = useState(true);

  const fetchFeedMarkets = async (currentOffset: number, initialLoad = false) => {
    if (initialLoad) {
      setIsLoading(true);
    }
    setError(null);
    console.log(`[MarketFeedSection SIMPLIFIED] Fetching markets. Initial: ${initialLoad}, Offset: ${currentOffset}, Limit: ${feedLimit}`);

    try {
      const response = await fetch(`/api/markets/live-odds?limit=${feedLimit}&offset=${currentOffset}`);
      
      console.log('[MarketFeedSection SIMPLIFIED] API Response Status:', response.status);
      const contentType = response.headers.get("content-type");
      console.log('[MarketFeedSection SIMPLIFIED] API Response Content-Type:', contentType);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[MarketFeedSection SIMPLIFIED] API Error - Response not OK (Status: ${response.status}). Response Text Snippet:`, errorText.substring(0, 500));
        throw new Error(`API request failed: ${response.status}. Server sent ${contentType || 'unknown content type'}. Snippet: ${errorText.substring(0,100)}...`);
      }
      
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text();
        console.error(`[MarketFeedSection SIMPLIFIED] API Error - Expected JSON, got ${contentType}. Response Text:`, responseText.substring(0, 500));
        throw new Error(`API response was not JSON (got ${contentType}). Check API implementation. Content: ${responseText.substring(0,100)}...`);
      }
      
      const data = await response.json();
      console.log('[MarketFeedSection SIMPLIFIED] API Response Data:', data);

      if (data.success && data.markets) {
        if (data.markets.length === 0) {
          console.log('[MarketFeedSection SIMPLIFIED] API returned 0 new markets.');
          // setCanLoadMore(false);
          if (initialLoad && feedMarkets.length === 0) {
             console.log('[MarketFeedSection SIMPLIFIED] Initial load returned 0 markets. Setting error message.');
             setError("No live markets found at the moment (from initial load).");
          }
        } else {
          console.log('[MarketFeedSection SIMPLIFIED] Setting markets:', data.markets);
          setFeedMarkets(initialLoad ? data.markets : [...feedMarkets, ...data.markets]); // Simplified update for initial load test
          // setOffset(currentOffset + data.markets.length);
          // setCanLoadMore(data.markets.length >= feedLimit);
        }
      } else {
        console.error('[MarketFeedSection SIMPLIFIED] API response success was false or markets array missing:', data.message || 'Malformed success response');
        throw new Error(data.message || "Failed to parse feed markets from successful API response.");
      }
    } catch (err) {
      console.error("[MarketFeedSection SIMPLIFIED] Error in fetchFeedMarkets' try-catch block:", err);
      const errorMessage = err instanceof Error ? err.message : "Could not load market feed.";
      setError(errorMessage);
      // setCanLoadMore(false);
    } finally {
      if (initialLoad) {
        setIsLoading(false);
      }
      console.log('[MarketFeedSection SIMPLIFIED] Fetching complete. isLoading (for initial):', isLoading);
    }
  };

  useEffect(() => {
    fetchFeedMarkets(0, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // const handleLoadMore = () => {
  //   if (!isLoading && canLoadMore) {
  //     fetchFeedMarkets(offset, false);
  //   }
  // };

  if (isLoading && feedMarkets.length === 0) {
    return <div className="text-center p-4">Loading Trending Markets (Simplified Feed)...</div>;
  }

  if (error && feedMarkets.length === 0) {
    return (
      <div className="my-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <p className="font-bold">Error Loading Markets (Simplified Feed):</p>
        <p>{error}</p>
      </div>
    );
  }
  
  if (feedMarkets.length === 0 && !isLoading && !error) {
     return <p className="text-center text-gray-500 py-4">No markets to display right now (Simplified Feed).</p>;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-center md:text-left">
        Trending Markets (Simplified Feed)
      </h2>
      
      {feedMarkets.map((market) => (
        <MarketFeedCard key={market.id || Math.random()} market={market} />
      ))}

      {/* "Load More" button and related logic removed for this step */}
      {error && feedMarkets.length > 0 && ( // Show inline error if some markets loaded but a subsequent issue occurred (less likely in this simplified view)
        <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          <p>An issue occurred: {error}</p>
        </div>
      )}
    </section>
  );
}
