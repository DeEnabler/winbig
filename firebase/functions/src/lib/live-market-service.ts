
'use server';
/**
 * @fileOverview Service for fetching and processing live market data from Polymarket,
 * using on-demand ephemeral credentials.
 */

import { EphemeralCredentialManager } from './credential-manager';
// getActiveMarkets and getMarketQuotes will be imported from './polymarket.ts'
// These functions would ideally interact with a Polymarket SDK or make direct API calls.
import { getActiveMarkets, getMarketQuotes } from './polymarket'; 
import type { ApiCredentials, WalletInfo } from './types'; // WalletInfo is needed for manager

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
  imageUrl?: string;
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

      const { credentials, wallet } = await this.credentialManager.getCredentials('testnet'); 
      console.log('Using API key (first 8 chars):', credentials.key.substring(0,8));
      console.log('Using Wallet Address:', wallet.address);


      // Fetch active markets using function from polymarket.ts (now expecting credentials)
      const marketsFromApi = await getActiveMarkets(credentials, wallet.address);
      
      const liveMarketsPromises = marketsFromApi
        .slice(0, filters.limit || 20) // Apply limit early
        .map(async (marketApi) => {
          try {
            // Get live quotes for each market (now expecting credentials)
            // If marketsFromApi already contains prices, this step might be redundant or for more granular quotes.
            // For now, we assume getMarketQuotes is still useful for detailed/fresher prices.
            const quotes = await getMarketQuotes(marketApi.id, credentials, wallet.address);
            
            return {
              id: marketApi.id,
              question: marketApi.question,
              category: marketApi.category || 'General',
              yesPrice: quotes.yesPrice ?? marketApi.yesPrice ?? null, // Prioritize quotes, fallback to market list prices
              noPrice: quotes.noPrice ?? marketApi.noPrice ?? null,
              volume24h: quotes.volume24h ?? marketApi.volume24h ?? null,
              deadline: quotes.endDate ?? marketApi.endDate ?? null,
              liquidity: quotes.liquidity ?? marketApi.liquidity ?? null,
              description: marketApi.description,
              imageUrl: marketApi.imageUrl,
            };
          } catch (error) {
            console.warn(`⚠️ Failed to get quotes for market ${marketApi.id}:`, error);
            // Return market with data from getActiveMarkets if quotes fail
            return {
              id: marketApi.id,
              question: marketApi.question,
              category: marketApi.category || 'General',
              yesPrice: marketApi.yesPrice ?? 0.5, // Default neutral price if all else fails
              noPrice: marketApi.noPrice ?? 0.5,
              volume24h: marketApi.volume24h || null,
              deadline: marketApi.endDate,
              liquidity: marketApi.liquidity || null,
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
      return []; // Return empty array for resilience
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
    // The minVolume filter is now applied within getLiveMarkets.
    // We can also sort by volume if getActiveMarkets returns enough data.
    const markets = await this.getLiveMarkets({ limit: limit * 2 }); // Fetch more to sort
    return markets
      .sort((a,b) => (b.volume24h || 0) - (a.volume24h || 0))
      .slice(0, limit);
  }

  /**
   * Get detailed market information
   */
  async getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    try {
      console.log(`🔍 Fetching details for market: ${marketId}`);
      const { credentials, wallet } = await this.credentialManager.getCredentials('testnet');

      const quotes = await getMarketQuotes(marketId, credentials, wallet.address);
      
      if (!quotes.question || quotes.question === 'N/A') { 
          console.warn(`Market details/quotes not found for marketId: ${marketId}`);
          // Attempt to get basic info from the active markets list as a fallback
          const activeMarkets = await getActiveMarkets(credentials, wallet.address);
          const marketInfo = activeMarkets.find(m => m.id === marketId);
          if (marketInfo) {
            return {
              id: marketId,
              question: marketInfo.question,
              category: marketInfo.category || 'General',
              yesPrice: quotes.yesPrice ?? marketInfo.yesPrice ?? null,
              noPrice: quotes.noPrice ?? marketInfo.noPrice ?? null,
              volume24h: quotes.volume24h ?? marketInfo.volume24h ?? null,
              deadline: quotes.endDate ?? marketInfo.endDate ?? null,
              liquidity: quotes.liquidity ?? marketInfo.liquidity ?? null,
              description: marketInfo.description,
              imageUrl: marketInfo.imageUrl,
            };
          }
          return null;
      }

      // Try to find the market in the active list to supplement details like imageUrl
      const activeMarkets = await getActiveMarkets(credentials, wallet.address);
      const marketFromList = activeMarkets.find(m => m.id === marketId);

      return {
        id: marketId,
        question: quotes.question,
        category: marketFromList?.category || 'General', 
        yesPrice: quotes.yesPrice ?? null,
        noPrice: quotes.noPrice ?? null,
        volume24h: quotes.volume24h ?? marketFromList?.volume24h ?? null,
        deadline: quotes.endDate ?? marketFromList?.endDate ?? null,
        liquidity: quotes.liquidity ?? marketFromList?.liquidity ?? null,
        description: marketFromList?.description,
        imageUrl: marketFromList?.imageUrl,
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
