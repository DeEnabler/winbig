// src/contexts/EntryContext.tsx
'use client';

import type { EntryContextType } from '@/types';
import { useSearchParams, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState, useEffect } from 'react';

const EntryContext = createContext<EntryContextType | undefined>(undefined);

interface EntryContextProviderProps {
  children: ReactNode;
  // Optional props for server-side affiliate data (passed from challenge/[code] page)
  initialReferrerBetId?: number;
  initialReferrerUserId?: string;
  initialShareCode?: string;
}

export function EntryContextProvider({ 
  children,
  initialReferrerBetId,
  initialReferrerUserId,
  initialShareCode,
}: EntryContextProviderProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // State for affiliate tracking (can be set from server or client)
  const [referrerBetId, setReferrerBetId] = useState<number | undefined>(initialReferrerBetId);
  const [referrerUserId, setReferrerUserId] = useState<string | undefined>(initialReferrerUserId);
  const [shareCode, setShareCode] = useState<string | undefined>(initialShareCode);

  // Update affiliate data from URL params if present
  useEffect(() => {
    const urlReferrerBetId = searchParams.get('ref_bet_id');
    const urlReferrerUserId = searchParams.get('ref_user_id');
    const urlShareCode = searchParams.get('share_code');
    
    if (urlReferrerBetId) {
      const betId = parseInt(urlReferrerBetId, 10);
      if (!isNaN(betId)) setReferrerBetId(betId);
    }
    if (urlReferrerUserId) setReferrerUserId(urlReferrerUserId);
    if (urlShareCode) setShareCode(urlShareCode);
    
    // Also extract share code from /challenge/[code] path
    if (pathname.startsWith('/challenge/') && !shareCode) {
      const pathCode = pathname.split('/challenge/')[1];
      if (pathCode && pathCode.length >= 6) {
        setShareCode(pathCode);
      }
    }
  }, [searchParams, pathname, shareCode]);

  const contextValue = useMemo(() => {
    const source = searchParams.get('source') || undefined;
    const challenge = searchParams.get('challenge') === 'true';
    const referrer = searchParams.get('referrer') || undefined;
    const marketId = searchParams.get('market') || undefined;

    const appendEntryParams = (baseUrl: string): string => {
      const origin = typeof window !== 'undefined' 
        ? window.location.origin 
        : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');

      const url = new URL(baseUrl, origin);

      if (source) url.searchParams.set('source', source);
      if (challenge) url.searchParams.set('challenge', 'true'); 
      if (referrer) url.searchParams.set('referrer', referrer);
      if (marketId) url.searchParams.set('market', marketId);
      
      // Include affiliate tracking params if present
      if (referrerBetId) url.searchParams.set('ref_bet_id', referrerBetId.toString());
      if (referrerUserId) url.searchParams.set('ref_user_id', referrerUserId);
      if (shareCode) url.searchParams.set('share_code', shareCode);
      
      const searchString = url.searchParams.toString();
      return `${url.pathname}${searchString ? `?${searchString}` : ''}`;
    };
    
    return { 
      source, 
      challenge, 
      referrer, 
      marketId, 
      referrerBetId,
      referrerUserId,
      shareCode,
      appendEntryParams,
    };
  }, [searchParams, referrerBetId, referrerUserId, shareCode]);

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

// Helper hook to set affiliate tracking data (for use in challenge pages)
export function useSetAffiliateData() {
  const context = useContext(EntryContext);
  // This would need a setter in context, but for now we'll use URL params
  return context;
}
