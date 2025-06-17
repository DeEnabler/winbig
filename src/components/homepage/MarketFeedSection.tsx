// src/components/homepage/MarketFeedSection.tsx
'use client';

import { useEffect, useState } from 'react';
import type { LiveMarket } from '@/types';
import MarketFeedCard from './MarketFeedCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { mockPredictions } from '@/lib/mockData'; // For fallback

export default function MarketFeedSection() {
  const [feedMarkets, setFeedMarkets] = useState<LiveMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(1); // Start after hero market, adjust if hero is removed
  const feedLimit = 6; // Number of markets to fetch per "page"
  const [canLoadMore, setCanLoadMore] = useState(true);

  const fetchFeedMarkets = async (currentOffset: number, initialLoad = false) => {
    setIsLoading(true);
    setError(null);
    try {
      // If initialLoad, offset should be 0 to get first batch for feed
      const fetchOffset = initialLoad ? 0 : currentOffset;
      const response = await fetch(`/api/markets/live-odds?limit=${feedLimit}&offset=${fetchOffset}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch feed markets: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.markets) {
        if (data.markets.length === 0) {
          setCanLoadMore(false);
          if (initialLoad) { // No markets at all
             setError("No live markets found for the feed. Showing samples.");
             const fallbackFeed: LiveMarket[] = mockPredictions.slice(0, 3).map(p => ({
                id: `fallback_feed_${p.id}`,
                question: p.text,
                category: p.category,
                yesPrice: Math.random() * 0.6 + 0.2,
                noPrice: 1 - (Math.random() * 0.6 + 0.2),
                endsAt: p.endsAt || new Date(Date.now() + (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000),
                imageUrl: p.imageUrl || `https://placehold.co/600x300.png?text=${encodeURIComponent(p.category || 'Market')}`,
                aiHint: p.aiHint || p.category
            }));
            setFeedMarkets(fallbackFeed);
          }
        } else {
          setFeedMarkets(prev => initialLoad ? data.markets : [...prev, ...data.markets]); 
          setOffset(fetchOffset + data.markets.length);
          if (data.markets.length < feedLimit) {
            setCanLoadMore(false);
          } else {
            setCanLoadMore(true);
          }
        }
      } else {
        throw new Error(data.message || "Failed to parse feed markets.");
      }
    } catch (err) {
      console.error("Error fetching feed markets:", err);
      const errorMessage = err instanceof Error ? err.message : "Could not load market feed.";
      setError(errorMessage);
       if (initialLoad && feedMarkets.length === 0) { 
            const fallbackFeed: LiveMarket[] = mockPredictions.slice(0, 3).map(p => ({
                id: `fallback_err_feed_${p.id}`,
                question: p.text,
                category: p.category,
                yesPrice: Math.random() * 0.6 + 0.2,
                noPrice: 1 - (Math.random() * 0.6 + 0.2),
                endsAt: p.endsAt || new Date(Date.now() + (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000),
                imageUrl: p.imageUrl || `https://placehold.co/600x300.png?text=${encodeURIComponent(p.category || 'Market')}`,
                aiHint: p.aiHint || p.category
            }));
            setFeedMarkets(fallbackFeed);
            setCanLoadMore(false);
        }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedMarkets(0, true); // Fetch initial batch for feed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleLoadMore = () => {
    if (!isLoading && canLoadMore) {
      fetchFeedMarkets(offset);
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-center md:text-left">
        Trending Markets
      </h2>
      {error && feedMarkets.length > 0 && (
        <div className="my-2 p-2 bg-yellow-100 dark:bg-yellow-700/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 rounded-md text-xs text-center">
          <p>{error}</p>
        </div>
      )}
      
      {feedMarkets.length === 0 && !isLoading && !error && (
         <p className="text-center text-muted-foreground py-8">No markets to display in the feed currently.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {feedMarkets.map((market) => (
          <MarketFeedCard key={market.id} market={market} />
        ))}
      </div>
      {isLoading && <div className="py-8"><LoadingSpinner message="Loading markets..." /></div>}
      
      {!isLoading && canLoadMore && feedMarkets.length > 0 && (
        <div className="text-center mt-8">
          <Button onClick={handleLoadMore} variant="outline" size="lg">
            Load More Markets
          </Button>
        </div>
      )}
      {!isLoading && !canLoadMore && feedMarkets.length > feedLimit && (
         <p className="text-center text-muted-foreground py-4 text-sm">No more markets to load.</p>
      )}
    </section>
  );
}
