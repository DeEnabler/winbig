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
    const referrer = searchParams.get('referrer') || undefined; // Corrected typo here
    const marketId = searchParams.get('market') || undefined;

    const appendEntryParams = (baseUrl: string): string => {
      // Determine the base URL safely
      const origin = typeof window !== 'undefined' 
        ? window.location.origin 
        : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');

      const url = new URL(baseUrl, origin); // Ensure baseUrl can be relative

      if (source) url.searchParams.set('source', source);
      // Only set challenge=true if it's actually true, to avoid adding challenge=false
      if (challenge) url.searchParams.set('challenge', 'true'); 
      if (referrer) url.searchParams.set('referrer', referrer);
      if (marketId) url.searchParams.set('market', marketId);
      
      // Construct the path with search params only if they exist
      const searchString = url.searchParams.toString();
      return `${url.pathname}${searchString ? `?${searchString}` : ''}`;
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
