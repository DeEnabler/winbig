// src/components/providers/EntryClientProvider.tsx
'use client';

import { Suspense } from 'react';
import { EntryContextProvider } from '@/contexts/EntryContext';
import AppLayout from '@/components/layout/AppLayout';

export function EntryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading Page...</div>}>
      <EntryContextProvider>
        <AppLayout>{children}</AppLayout>
      </EntryContextProvider>
    </Suspense>
  );
} 