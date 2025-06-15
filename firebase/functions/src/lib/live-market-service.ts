
'use server';
/**
 * @fileOverview Service for fetching and processing live market data from Polymarket,
 * using on-demand ephemeral credentials.
 */

import { EphemeralCredentialManager } from './credential-manager';
// getActiveMarkets and getMarketQuotes will be imported from './polymarket.ts'
// These functions would ideally interact with a Polymarket SDK or make direct API calls.
import { getActiveMarkets, getMarketQuotes } from './polymarket'; 
import type { ApiCredentials } from './types'; // Assuming ApiCredentials might be needed if passed to SDK

interface LiveMarket {
  id: string;
  question: string;
  category: string;
  yesPrice: number | null; // Can be null if data not available
  noPrice: number | null;  // Can be null if data not available
  volume24h: number | null;
  deadline: string | null; // ISO string
  liquidity: number | null;
  description?: string;
  imageUrl?: string; // Added for consistency with previous stubs
}

interface MarketFilters {
  category?: string;
  limit?: number;
  minVolume?: number;
  status?: 'active' | 'closed' | 'all'; // Example filter, not fully implemented in stub
}

export class LiveMarketService {
  private credentialManager: EphemeralCredentialManager;

  constructor() {
    this.credentialManager = EphemeralCredentialManager.getInstance();
  }

  /**
   * Get live markets with current odds
   */
  async getLiveMarkets(filters: MarketFilters = {}): Promise<LiveMarket[]> {
    try {
      console.log('📊 Fetching live markets with filters:', filters);

      // Get fresh credentials (automatically handles caching/regeneration)
      // For Polymarket, 'testnet' usually means Amoy, 'mainnet' means Polygon.
      const credentialData = await this.credentialManager.getCredentials('testnet'); 
      console.log('Using API key (first 5 chars):', credentialData.credentials.key.substring(0,5));


      // Fetch active markets using function from polymarket.ts (currently stubbed)
      const marketsFromApi = await getActiveMarkets();
      
      const liveMarketsPromises = marketsFromApi
        .slice(0, filters.limit || 20) // Apply limit early
        .map(async (marketApi) => {
          try {
            // Get live quotes for each market (currently stubbed)
            const quotes = await getMarketQuotes(marketApi.id);
            
            return {
              id: marketApi.id,
              question: marketApi.question,
              category: marketApi.category || 'General',
              yesPrice: quotes.yesPrice ?? null,
              noPrice: quotes.noPrice ?? null,
              volume24h: marketApi.volume24h ?? quotes.volume24h ?? null,
              deadline: marketApi.endDate ?? quotes.endDate ?? null,
              liquidity: quotes.liquidity ?? null,
              description: marketApi.description,
              imageUrl: marketApi.imageUrl, // Keep imageUrl if provided by getActiveMarkets
            };
          } catch (error) {
            console.warn(`⚠️ Failed to get quotes for market ${marketApi.id}:`, error);
            return {
              id: marketApi.id,
              question: marketApi.question,
              category: marketApi.category || 'General',
              yesPrice: 0.5, 
              noPrice: 0.5,
              volume24h: marketApi.volume24h || null,
              deadline: marketApi.endDate,
              liquidity: null,
              description: marketApi.description,
              imageUrl: marketApi.imageUrl,
            };
          }
        });
        
      const liveMarkets = await Promise.all(liveMarketsPromises);

      let filteredMarkets = liveMarkets;
      if (filters.category) {
        filteredMarkets = filteredMarkets.filter(market => 
          market.category.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }
      if (filters.minVolume) {
        filteredMarkets = filteredMarkets.filter(market => 
          market.volume24h !== null && market.volume24h >= filters.minVolume!
        );
      }

      console.log(`✅ Retrieved ${filteredMarkets.length} live markets after filtering.`);
      return filteredMarkets;

    } catch (error) {
      console.error('❌ Failed to fetch live markets in LiveMarketService:', error);
      // Decide on error handling: throw or return empty/default. For now, throwing.
      // throw new Error(`Live market fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Returning empty array for resilience in the endpoint
      return [];
    }
  }

  /**
   * Get markets by specific category
   */
  async getMarketsByCategory(category: string, limit = 10): Promise<LiveMarket[]> {
    return this.getLiveMarkets({ category, limit });
  }

  /**
   * Get trending/popular markets
   */
  async getTrendingMarkets(limit = 10): Promise<LiveMarket[]> {
    // Example: popular markets might be those with higher volume
    return this.getLiveMarkets({ 
      limit, 
      minVolume: 10000 // Example threshold for "popular"
    });
  }

  /**
   * Get detailed market information
   */
  async getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    try {
      console.log(`🔍 Fetching details for market: ${marketId}`);
      // Ensure credentials exist/are fresh for any potential direct SDK calls
      await this.credentialManager.getCredentials('testnet');

      // Get market quotes (currently stubbed)
      const quotes = await getMarketQuotes(marketId);
      // In a real scenario, you might fetch more comprehensive details here
      // For now, structure is similar to LiveMarket
      
      if (!quotes.question) { // If quotes didn't return basic info, market might not exist
          console.warn(`Market details/quotes not found for marketId: ${marketId}`);
          return null;
      }

      return {
        id: marketId,
        question: quotes.question,
        category: 'General', // Category might come from a different endpoint or initial market list
        yesPrice: quotes.yesPrice ?? null,
        noPrice: quotes.noPrice ?? null,
        volume24h: quotes.volume24h ?? null,
        deadline: quotes.endDate ?? null,
        liquidity: quotes.liquidity ?? null,
        // description and imageUrl would ideally come from a more detailed market info call
      };

    } catch (error) {
      console.error(`❌ Failed to get market details for ${marketId}:`, error);
      return null;
    }
  }
  
  /**
   * Get credential status for monitoring
   */
  getCredentialStatus() {
    return this.credentialManager.getStatus();
  }

  /**
   * Force credential refresh (for testing/debugging)
   */
  async refreshCredentials(network: 'testnet' | 'mainnet' = 'testnet') {
    console.log('🔄 Manually refreshing credentials via LiveMarketService...');
    return await this.credentialManager.forceRegenerate(network);
  }
}
