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
  const [offset, setOffset] = useState(1); // Start after hero market
  const feedLimit = 6; // Number of markets to fetch per "page"

  const fetchFeedMarkets = async (currentOffset: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/markets/live-odds?limit=${feedLimit}&offset=${currentOffset}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch feed markets: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.markets) {
        // Simple concatenation for now; proper infinite scroll would handle duplicates better
        setFeedMarkets(prev => [...prev, ...data.markets]); 
        setOffset(currentOffset + data.markets.length);
        if (data.markets.length === 0 && currentOffset > 1) {
            // No more markets from API
        } else if (data.markets.length === 0 && currentOffset === 1) {
            setError("No live markets found for the feed. Showing samples.");
            // Use mock predictions as fallback LiveMarket items
            const fallbackFeed: LiveMarket[] = mockPredictions.slice(0, 3).map(p => ({
                id: `fallback_feed_${p.id}`,
                question: p.text,
                category: p.category,
                yesPrice: Math.random() * 0.6 + 0.2, // Random odds
                noPrice: 1 - (Math.random() * 0.6 + 0.2),
                endsAt: p.endsAt || new Date(Date.now() + (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000),
            }));
            setFeedMarkets(fallbackFeed);
        }
      } else {
        throw new Error(data.message || "Failed to parse feed markets.");
      }
    } catch (err) {
      console.error("Error fetching feed markets:", err);
      setError(err instanceof Error ? err.message : "Could not load market feed.");
       if (feedMarkets.length === 0) { // Only set fallback if feed is completely empty
            const fallbackFeed: LiveMarket[] = mockPredictions.slice(0, 3).map(p => ({
                id: `fallback_err_feed_${p.id}`,
                question: p.text,
                category: p.category,
                yesPrice: Math.random() * 0.6 + 0.2,
                noPrice: 1 - (Math.random() * 0.6 + 0.2),
                endsAt: p.endsAt || new Date(Date.now() + (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000),
            }));
            setFeedMarkets(fallbackFeed);
        }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedMarkets(offset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch initial batch on mount

  // Basic "Load More" for now instead of true infinite scroll
  const handleLoadMore = () => {
    fetchFeedMarkets(offset);
  };

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-center md:text-left">
        Trending Markets
      </h2>
      {error && feedMarkets.length > 0 && ( // Show non-blocking error if fallbacks are shown
        <div className="my-2 p-2 bg-yellow-100 dark:bg-yellow-700/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 rounded-md text-xs text-center">
          <p>Could not load all markets. Displaying available or sample markets. Error: {error}</p>
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
      {isLoading && <div className="py-8"><LoadingSpinner message="Loading more markets..." /></div>}
      {/* Basic Load More Button - In a real app, this would be replaced by an IntersectionObserver for infinite scroll */}
      {!isLoading && feedMarkets.length > 0 && offset > feedLimit && ( // Crude check if more *could* be loaded
        <div className="text-center mt-8">
          <Button onClick={handleLoadMore} variant="outline" size="lg">
            Load More Markets
          </Button>
        </div>
      )}
    </section>
  );
}
