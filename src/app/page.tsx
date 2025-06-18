// src/app/page.tsx
'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import MarketFeedSection from '@/components/homepage/MarketFeedSection';
import StickyCtaBanner from '@/components/homepage/StickyCtaBanner';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import HeroNewSection from '@/components/homepage/HeroNewSection';
import PersonalStatsLeaderboardPanel from '@/components/homepage/PersonalStatsLeaderboardPanel';
import HowItWorksSection from '@/components/homepage/HowItWorksSection';

export default function HomePage() {
  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-4">An error occurred displaying the homepage.</p>}>
      <div className="flex flex-col space-y-10 md:space-y-16">
        
        <Suspense fallback={<div className="w-full min-h-[300px] flex items-center justify-center"><LoadingSpinner message="Loading Featured Market..." /></div>}>
          <HeroNewSection />
        </Suspense>

        <Suspense fallback={<div className="w-full min-h-[400px] flex items-center justify-center"><LoadingSpinner message="Loading Market Feed..." /></div>}>
          <MarketFeedSection />
        </Suspense>

        <Suspense fallback={<div className="w-full min-h-[200px] flex items-center justify-center"><LoadingSpinner message="Loading Stats..." /></div>}>
          <PersonalStatsLeaderboardPanel />
        </Suspense>

        <Suspense fallback={<div className="w-full min-h-[200px] flex items-center justify-center"><LoadingSpinner message="Loading Guide..." /></div>}>
          <HowItWorksSection />
        </Suspense>

      </div>
      <StickyCtaBanner />
    </ErrorBoundary>
  );
}
