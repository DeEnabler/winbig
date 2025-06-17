// src/app/page.tsx
'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
// HeroSection and HeroBetDisplay are removed from here
import MarketFeedSection from '@/components/homepage/MarketFeedSection';
import SocialTeaserSection from '@/components/homepage/SocialTeaserSection';
import StickyCtaBanner from '@/components/homepage/StickyCtaBanner';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function HomePage() {
  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-4">An error occurred displaying the homepage.</p>}>
      <div className="flex flex-col space-y-8 md:space-y-12">
        {/* HeroSection removed from here */}
        
        <Suspense fallback={<div className="w-full min-h-[400px] flex items-center justify-center"><LoadingSpinner message="Loading Market Feed..." /></div>}>
          <MarketFeedSection />
        </Suspense>

        <Suspense fallback={<div className="w-full min-h-[200px] flex items-center justify-center"><LoadingSpinner message="Loading Social Teasers..." /></div>}>
          <SocialTeaserSection />
        </Suspense>
      </div>
      <StickyCtaBanner />
    </ErrorBoundary>
  );
}
