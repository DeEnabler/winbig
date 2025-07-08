// src/app/page.tsx
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import MarketFeedSection from '@/components/homepage/MarketFeedSection';
import { getLiveMarkets } from '@/lib/marketService'; // Import the new server-side service
import type { LiveMarket } from '@/types';
import HeroNewSection from '@/components/homepage/HeroNewSection';

export const dynamic = 'force-dynamic'; // Ensure the page is dynamically rendered

// This is now an async Server Component
export default async function HomePage() {
  console.log("--- VERCEL LOG: HomePage component rendering ---");
  let markets: LiveMarket[] = [];
  let error: string | null = null;

  try {
    console.log("--- VERCEL LOG: HomePage attempting to fetch markets... ---");
    // Fetch data directly on the server
    const marketData = await getLiveMarkets({ limit: 3, offset: 0 });
    markets = marketData.markets;
    console.log(`--- VERCEL LOG: HomePage successfully fetched ${markets.length} markets. ---`);
  } catch (e) {
    console.error("[HomePage] Failed to fetch markets on server:", e);
    error = e instanceof Error ? e.message : "An unknown error occurred.";
    console.log(`--- VERCEL LOG: HomePage caught an error during fetch: ${error} ---`);
  }

  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-4">An error occurred displaying the homepage.</p>}>
      <div className="flex flex-col space-y-10 md:space-y-16">
        <HeroNewSection />
        <Suspense fallback={<div className="w-full min-h-[300px] flex items-center justify-center"><p>Loading trending markets...</p></div>}>
          {/* Pass the server-fetched data directly as props */}
          <MarketFeedSection initialMarkets={markets} initialError={error} />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
