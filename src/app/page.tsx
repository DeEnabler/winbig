// src/app/page.tsx
'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function HomePage() {
  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-4">An error occurred displaying the page.</p>}>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] py-8">
        <h1 className="text-2xl font-semibold">this is the homepage</h1>
      </div>
    </ErrorBoundary>
  );
}
