'use client';

import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const CAMPAIGN_STORAGE_KEY = 'winbig_campaign_v1';

export interface CampaignParams {
  sub1?: string;
  sub2?: string;
  sub3?: string;
  sub4?: string;
  sub5?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  variant?: string;
  landed_at?: string;
}

function loadStoredCampaign(): CampaignParams {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCampaign(params: CampaignParams) {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadStoredCampaign();
    if (existing.sub1) return; // first-touch wins
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify({
      ...params,
      landed_at: new Date().toISOString(),
    }));
  } catch { /* ignore storage errors */ }
}

export function getCampaignParams(): CampaignParams {
  return loadStoredCampaign();
}

export function buildCampaignQuery(base: CampaignParams): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v) params.set(k, v);
  }
  return params.toString();
}

export function useCampaignTracking() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const params: CampaignParams = {};
    let hasAny = false;

    for (const key of ['sub1', 'sub2', 'sub3', 'sub4', 'sub5'] as const) {
      const v = searchParams.get(key);
      if (v) { params[key] = v; hasAny = true; }
    }
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
      const v = searchParams.get(key);
      if (v) { params[key] = v; hasAny = true; }
    }
    const variant = searchParams.get('variant');
    if (variant) { params.variant = variant; hasAny = true; }

    if (hasAny) saveCampaign(params);
  }, [searchParams]);

  const trackEvent = useCallback(async (event: string, metadata?: Record<string, unknown>) => {
    const campaign = getCampaignParams();
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, ...campaign, metadata }),
      });
    } catch { /* fire-and-forget */ }
  }, []);

  return { trackEvent, getCampaignParams: loadStoredCampaign };
}
