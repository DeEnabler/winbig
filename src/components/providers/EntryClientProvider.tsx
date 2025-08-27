// src/components/providers/EntryClientProvider.tsx
'use client';

import { Suspense } from 'react';
import { EntryContextProvider } from '@/contexts/EntryContext';
import AppLayout from '@/components/layout/AppLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function EntryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading Page...</div>}>
      <EntryContextProvider>
        <QueryClientProvider client={queryClient}>
          <AppLayout>{children}</AppLayout>
        </QueryClientProvider>
      </EntryContextProvider>
    </Suspense>
  );
} 