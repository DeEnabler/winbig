import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import MarketFeedSection from '@/components/homepage/MarketFeedSection';
import { getLiveMarkets } from '@/lib/marketService';
import type { LiveMarket } from '@/types';
import HeroNewSection from '@/components/homepage/HeroNewSection';
import StickyCtaBanner from '@/components/homepage/StickyCtaBanner';

export const dynamic = 'force-dynamic'; // Ensure the page is dynamically rendered

// This is now an async Server Component
export default async function HomePage() {
  let markets: LiveMarket[] = [];
  let error: string | null = null;

  try {
    // Fetch data directly on the server
    const marketData = await getLiveMarkets({ limit: 3, offset: 0 });
    markets = marketData.markets;
  } catch (e)
  {
    console.error('[HomePage] Failed to fetch markets on server:', e);
    error = e instanceof Error ? e.message : 'An unknown error occurred.';
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <ErrorBoundary
          fallback={
            <p className="text-center text-destructive p-4">
              An error occurred displaying the homepage.
            </p>
          }
        >
      <div className="flex flex-col space-y-10 md:space-y-16">
        <HeroNewSection />
            <Suspense
              fallback={
                <div className="w-full min-h-[300px] flex items-center justify-center">
                  <p>Loading trending markets...</p>
                </div>
              }
            >
              <MarketFeedSection
                initialMarkets={markets}
                initialError={error}
              />
        </Suspense>
      </div>
    </ErrorBoundary>
      </main>
      <StickyCtaBanner />
    </div>
  );
}
