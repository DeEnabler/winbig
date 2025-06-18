// src/app/page.tsx
'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import MarketFeedSection from '@/components/homepage/MarketFeedSection';
// StickyCtaBanner, PersonalStatsLeaderboardPanel, HowItWorksSection are intentionally removed
// LoadingSpinner is not used in this simplified version's Suspense fallback

export default function HomePage() {
  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-4">An error occurred displaying the homepage.</p>}>
      <div className="flex flex-col space-y-10 md:space-y-16">
        <Suspense fallback={<div className="w-full min-h-[300px] flex items-center justify-center"><p>Loading trending markets...</p></div>}>
          <MarketFeedSection />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
