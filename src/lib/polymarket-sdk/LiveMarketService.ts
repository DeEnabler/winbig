// src/lib/polymarket-sdk/LiveMarketService.ts
// This service is being refactored. Direct Polymarket fetching is removed.
// The Next.js API route (/api/markets/live-odds) will now fetch data from Redis.

import type { LiveMarket } from '@/types'; // Using the main LiveMarket type

export class LiveMarketService {
  constructor() {
    console.warn(
      '[LiveMarketService] WARNING: This service is deprecated for direct Polymarket fetching.' +
      ' Odds are now intended to be sourced from Redis via /api/markets/live-odds.'
    );
  }

  /**
   * @deprecated Odds are now fetched from Redis via the API route.
   */
  async getLiveMarkets(limit: number = 10): Promise<LiveMarket[]> {
    console.warn('[LiveMarketService] getLiveMarkets is deprecated. Fetch from /api/markets/live-odds which uses Redis.');
    // Fallback behavior: return empty array or throw error.
    // For now, returning empty to prevent crashes if something old still calls it,
    // but ideally, all calls to this would be removed.
    return [];
  }

  /**
   * @deprecated Market details should be part of the data fetched from Redis.
   */
  async getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    console.warn('[LiveMarketService] getMarketDetails is deprecated. Market details should be included in Redis data.');
    return null;
  }
}
