import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import MarketFeedSection from '@/components/homepage/MarketFeedSection';
import { getLiveMarkets } from '@/lib/marketService';
import type { LiveMarket } from '@/types';
import HeroNewSection from '@/components/homepage/HeroNewSection';
import StickyCtaBanner from '@/components/homepage/StickyCtaBanner';
// import ClientEnvTest from '@/components/ClientEnvTest'; // Removed - using server-side Supabase now

export const dynamic = 'force-dynamic'; // Ensure the page is dynamically rendered

// This is now an async Server Component
export default async function HomePage() {
  let markets: LiveMarket[] = [];
  let error: string | null = null;
  let nextCursor: string | undefined;

  try {
    // Fetch data directly on the server using cursor-based pagination
    const marketData = await getLiveMarkets({ limit: 3, cursor: '0' });
    markets = marketData.markets;
    nextCursor = marketData.nextCursor;
  } catch (e) {
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
            {/* Diagnostic component removed - now using server-side Supabase */}
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
                initialNextCursor={nextCursor}
              />
            </Suspense>
          </div>
        </ErrorBoundary>
      </main>
      <StickyCtaBanner />
    </div>
  );
}
