// src/contexts/EntryContext.tsx
'use client';

import type { EntryContextType } from '@/types';
import { useSearchParams, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState, useEffect } from 'react';

const EntryContext = createContext<EntryContextType | undefined>(undefined);

// Local storage key for persisting referrer info
const REFERRER_STORAGE_KEY = 'winbig_referrer_v1';

interface EntryContextProviderProps {
  children: ReactNode;
  // Optional props for server-side affiliate data (passed from challenge/[code] page)
  initialReferrerBetId?: number;
  initialReferrerUserId?: string;
  initialShareCode?: string;
}

// Helper to load referrer from localStorage
function loadStoredReferrer(): { referrerUserId?: string; affiliateCode?: string } {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(REFERRER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load stored referrer:', e);
  }
  return {};
}

// Helper to save referrer to localStorage
function saveReferrer(referrerUserId: string, affiliateCode?: string) {
  if (typeof window === 'undefined') return;
  try {
    // Only save if not already set (first referrer wins)
    const existing = loadStoredReferrer();
    if (!existing.referrerUserId) {
      localStorage.setItem(REFERRER_STORAGE_KEY, JSON.stringify({
        referrerUserId,
        affiliateCode,
        savedAt: new Date().toISOString(),
      }));
      console.log('💾 Saved referrer to localStorage:', referrerUserId, affiliateCode);
    }
  } catch (e) {
    console.error('Failed to save referrer:', e);
  }
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
  const [affiliateCode, setAffiliateCode] = useState<string | undefined>(undefined);

  // Load stored referrer on mount
  useEffect(() => {
    const stored = loadStoredReferrer();
    if (stored.referrerUserId && !referrerUserId) {
      setReferrerUserId(stored.referrerUserId);
    }
    if (stored.affiliateCode && !affiliateCode) {
      setAffiliateCode(stored.affiliateCode);
    }
  }, []);

  // Update affiliate data from URL params if present
  useEffect(() => {
    const urlReferrerBetId = searchParams.get('ref_bet_id');
    const urlReferrerUserId = searchParams.get('ref_user_id');
    const urlShareCode = searchParams.get('share_code');
    const urlAffiliateCode = searchParams.get('ref'); // From /ref/[code] redirects
    
    if (urlReferrerBetId) {
      const betId = parseInt(urlReferrerBetId, 10);
      if (!isNaN(betId)) setReferrerBetId(betId);
    }
    if (urlReferrerUserId) {
      setReferrerUserId(urlReferrerUserId);
      // Persist the referrer for future sessions
      saveReferrer(urlReferrerUserId, urlAffiliateCode || undefined);
    }
    if (urlShareCode) setShareCode(urlShareCode);
    if (urlAffiliateCode) setAffiliateCode(urlAffiliateCode);
    
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
      if (affiliateCode) url.searchParams.set('ref', affiliateCode);
      
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
      affiliateCode,
      appendEntryParams,
    };
  }, [searchParams, referrerBetId, referrerUserId, shareCode, affiliateCode]);

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
