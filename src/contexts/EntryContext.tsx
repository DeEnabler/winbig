// src/contexts/EntryContext.tsx
'use client';

import type { EntryContextType } from '@/types';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';

const EntryContext = createContext<EntryContextType | undefined>(undefined);

export function EntryContextProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();

  const contextValue = useMemo(() => {
    const source = searchParams.get('source') || undefined;
    const challenge = searchParams.get('challenge') === 'true';
    const referrer = searchParams.get('referrer') || undefined;
    const marketId = searchParams.get('market') || undefined;

    const appendEntryParams = (baseUrl: string): string => {
      const url = new URL(baseUrl, window.location.origin); // Ensure baseUrl can be relative
      if (source) url.searchParams.set('source', source);
      if (challenge) url.searchParams.set('challenge', 'true'); // Keep challenge if it was true
      if (referrer) url.searchParams.set('referrer', referrer);
      if (marketId) url.searchParams.set('market', marketId); // Carry over market if present
      // Only append search if there are params to append
      return url.searchParams.size > 0 ? `${url.pathname}${url.search}` : url.pathname;
    };
    
    return { source, challenge, referrer, marketId, appendEntryParams };
  }, [searchParams]);

  return (
    <EntryContext.Provider value={contextValue}>
      {children}
    </EntryContext.Provider>
  );
}

export function useEntryContext() {
  const context = useContext(EntryContext);
  if (context === undefined) {
    throw new Error('useEntryContext must be used within an EntryContextProvider');
  }
  return context;
}
