// src/app/challenge/page.tsx
'use client';

import HeroBetDisplay from '@/components/homepage/HeroBetDisplay';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Suspense } from 'react';

export default function ChallengePage() {
  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-4">An error occurred displaying the challenge.</p>}>
      <div className="flex flex-col items-center space-y-8 md:space-y-12">
        <Suspense fallback={<div className="w-full h-96 flex items-center justify-center"><LoadingSpinner message="Loading Challenge Market..." /></div>}>
          <HeroBetDisplay />
        </Suspense>
        <p className="text-center text-muted-foreground">
          This page is dedicated to displaying a featured challenge market.
        </p>
      </div>
    </ErrorBoundary>
  );
}
