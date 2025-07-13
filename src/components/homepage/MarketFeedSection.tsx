// src/components/homepage/MarketFeedSection.tsx
'use client';

import type { LiveMarket } from '@/types';
import MarketFeedCard from './MarketFeedCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { LoadingSpinner } from '../LoadingSpinner';

interface MarketFeedSectionProps {
  initialMarkets: LiveMarket[];
  initialError: string | null;
  initialNextCursor?: string;
}

// This component now receives initial data via props, but can fetch more on the client.
export default function MarketFeedSection({ initialMarkets, initialError, initialNextCursor }: MarketFeedSectionProps) {
  const [markets, setMarkets] = useState<LiveMarket[]>(initialMarkets);
  const [error, setError] = useState<string | null>(initialError);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialNextCursor);

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    
    setIsLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(`/api/markets/live-odds?limit=3&cursor=${nextCursor}`);
      if (!response.ok) {
        throw new Error('Failed to fetch more markets.');
      }
      const data = await response.json();
      if (data.success && data.markets) {
        if (data.markets.length === 0) {
          setHasMore(false);
        } else {
          setMarkets(prev => [...prev, ...data.markets]);
          setNextCursor(data.nextCursor);
          setHasMore(!!data.nextCursor);
        }
      } else {
        throw new Error(data.message || 'Could not load more markets.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (error && markets.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Markets</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (markets.length === 0) {
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

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-center md:text-left">
        Trending Markets
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {markets.map((market) => {
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
      <div className="flex justify-center pt-4">
        {isLoadingMore ? (
          <LoadingSpinner message="Loading more..." />
        ) : hasMore ? (
          <Button onClick={handleLoadMore} variant="outline" size="lg">Load More Markets</Button>
        ) : (
          <p className="text-muted-foreground">No more markets to load.</p>
        )}
      </div>
    </section>
  );
}
