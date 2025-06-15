// firebase/functions/src/lib/polymarket.ts
/**
 * @fileOverview Functions for interacting directly with the Polymarket API
 * for fetching market listings, quotes, etc., using authenticated credentials.
 */

import type { ApiCredentials } from './types'; // Assuming ApiCredentials might be needed if passed to SDK

// Base URL for Polymarket API (staging for testnet)
const POLYMARKET_API_BASE_URL = 'https://clob-staging.polymarket.com';

export interface Market {
  id: string; // Typically the conditionId from Polymarket
  question: string;
  category?: string;
  volume24h?: number;
  endDate: string; // ISO string
  description?: string;
  conditionId?: string;
  slug?: string;
  resolutionSource?: string;
  imageUrl?: string;
  twitterHandle?: string;
  tags?: string[];
  active?: boolean; // Added active field
  // Fields for prices, might be part of quotes or separate
  yesPrice?: number;
  noPrice?: number;
  liquidity?: number; // Added liquidity
}

export interface MarketQuotes {
  marketId: string;
  question?: string; // Question can also come from market details
  yesPrice?: number;
  noPrice?: number;
  liquidity?: number;
  volume24h?: number; // Volume might be part of market details or quotes
  endDate?: string; // End date might be part of market details
}

interface PolymarketApiMarket {
  id: string; // condition_id
  question: string;
  category: string;
  description: string;
  slug: string;
  image_url: string;
  end_date_iso: string; // assuming an ISO string for end date
  is_active: boolean;
  volume_usd_24_hr: string; // Polymarket API often returns numbers as strings
  liquidity_usd: string;
  // other fields from /sampling-markets
  outcomes: string[]; // typically ["Yes", "No"]
  outcome_prices: string[]; // e.g. ["0.60", "0.40"]
  reference_asset: string;
  underlying_asset: string;
  // ... any other fields you need
}


/**
 * Fetches active markets from Polymarket.
 * Uses API credentials for authentication.
 * @param credentials The API credentials for Polymarket.
 * @returns A promise that resolves to an array of markets.
 */
export async function getActiveMarkets(credentials: ApiCredentials, walletAddress: string): Promise<Market[]> {
  console.log('POLYMARKET.TS (REAL): getActiveMarkets called');
  const endpoint = `${POLYMARKET_API_BASE_URL}/sampling-markets`;
  const timestamp = Date.now().toString();

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'POLY-API-KEY': credentials.key,
        'POLY-ADDRESS': walletAddress, // Wallet address associated with the API key
        'POLY-TIMESTAMP': timestamp,
        // 'POLY-SIGNATURE': 'YOUR_SIGNATURE_IF_NEEDED' // Polymarket might not need this for GET if API key is sufficient
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Polymarket API Error (${response.status}) for ${endpoint}: ${errorBody}`);
      throw new Error(`Failed to fetch active markets: ${response.status} ${response.statusText}`);
    }

    const apiResponse: {data: PolymarketApiMarket[]} = await response.json();
    
    // Transform API response to our Market interface
    const markets: Market[] = apiResponse.data.map(apiMarket => ({
      id: apiMarket.id, // Use condition_id as the market ID
      question: apiMarket.question,
      category: apiMarket.category,
      description: apiMarket.description,
      slug: apiMarket.slug,
      imageUrl: apiMarket.image_url,
      endDate: apiMarket.end_date_iso,
      active: apiMarket.is_active,
      volume24h: parseFloat(apiMarket.volume_usd_24_hr) || 0,
      liquidity: parseFloat(apiMarket.liquidity_usd) || 0,
      yesPrice: apiMarket.outcomes[0] === "Yes" && apiMarket.outcome_prices[0] ? parseFloat(apiMarket.outcome_prices[0]) : undefined,
      noPrice: apiMarket.outcomes[1] === "No" && apiMarket.outcome_prices[1] ? parseFloat(apiMarket.outcome_prices[1]) : 
               (apiMarket.outcomes[0] === "No" && apiMarket.outcome_prices[0] ? parseFloat(apiMarket.outcome_prices[0]) : undefined),
    })).filter(market => market.active); // Filter for active markets if not already done by API

    console.log(`POLYMARKET.TS (REAL): Successfully fetched ${markets.length} active markets.`);
    return markets;

  } catch (error) {
    console.error('POLYMARKET.TS (REAL): Error in getActiveMarkets:', error);
    return []; // Return empty array on error to prevent breaking the caller
  }
}

/**
 * Fetches live quotes for a specific market from Polymarket.
 * Uses API credentials for authentication.
 * @param marketId The ID (conditionId) of the market to get quotes for.
 * @param credentials The API credentials for Polymarket.
 * @returns A promise that resolves to market quotes.
 */
export async function getMarketQuotes(marketId: string, credentials: ApiCredentials, walletAddress: string): Promise<MarketQuotes> {
  console.log(`POLYMARKET.TS (REAL): getMarketQuotes called for marketId: ${marketId}`);
  // Polymarket's /price endpoint might require a 'token_id' which is often the conditionId, and 'side'
  // For simplicity, we'll assume the /sampling-markets might return price data or we need another endpoint.
  // The provided endpoint example was /price?token_id=X&side=buy
  // This might be for fetching a specific price for one side of an order book.
  // For general YES/NO prices, these are often included in the main market data endpoint like /sampling-markets or a dedicated quotes endpoint.

  // For now, this function will re-fetch the specific market from /sampling-markets and extract its prices.
  // A more optimized approach might be a dedicated /markets/:id/quotes endpoint if Polymarket offers one.

  const marketDetailEndpoint = `${POLYMARKET_API_BASE_URL}/markets/${marketId}`; // A common pattern for fetching single market details
  const timestamp = Date.now().toString();

  try {
    // First, try to get detailed market info which might include prices
    const response = await fetch(marketDetailEndpoint, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'POLY-API-KEY': credentials.key,
            'POLY-ADDRESS': walletAddress,
            'POLY-TIMESTAMP': timestamp,
        },
    });

    if (!response.ok) {
      // Fallback to sampling-markets if detailed endpoint fails or doesn't exist
      // This is less efficient but provides a fallback.
      console.warn(`POLYMARKET.TS (REAL): Market detail endpoint ${marketDetailEndpoint} failed (${response.status}). Falling back to sampling-markets for ${marketId}.`);
      const allMarkets = await getActiveMarkets(credentials, walletAddress);
      const market = allMarkets.find(m => m.id === marketId);
      if (market) {
        return {
          marketId: market.id,
          question: market.question,
          yesPrice: market.yesPrice,
          noPrice: market.noPrice,
          liquidity: market.liquidity,
          volume24h: market.volume24h,
          endDate: market.endDate,
        };
      }
      throw new Error(`Market ${marketId} not found in sampling-markets after detail fetch failed.`);
    }
    
    const apiMarket: PolymarketApiMarket = await response.json(); // Assuming the single market endpoint returns a similar structure

    const yesPrice = apiMarket.outcomes?.[0] === "Yes" && apiMarket.outcome_prices?.[0] ? parseFloat(apiMarket.outcome_prices[0]) : 
                     (apiMarket.outcomes?.[1] === "Yes" && apiMarket.outcome_prices?.[1] ? parseFloat(apiMarket.outcome_prices[1]) : undefined);
    const noPrice = apiMarket.outcomes?.[1] === "No" && apiMarket.outcome_prices?.[1] ? parseFloat(apiMarket.outcome_prices[1]) :
                    (apiMarket.outcomes?.[0] === "No" && apiMarket.outcome_prices?.[0] ? parseFloat(apiMarket.outcome_prices[0]) : undefined);


    const quotes: MarketQuotes = {
      marketId: apiMarket.id,
      question: apiMarket.question,
      yesPrice: yesPrice,
      noPrice: noPrice,
      liquidity: parseFloat(apiMarket.liquidity_usd) || 0,
      volume24h: parseFloat(apiMarket.volume_usd_24_hr) || 0,
      endDate: apiMarket.end_date_iso,
    };
    
    console.log(`POLYMARKET.TS (REAL): Successfully fetched quotes for marketId: ${marketId}`);
    return quotes;

  } catch (error) {
    console.error(`POLYMARKET.TS (REAL): Error in getMarketQuotes for ${marketId}:`, error);
    // Return default/empty quotes on error
    return {
      marketId,
      question: 'N/A',
      yesPrice: 0.5, // Default neutral price
      noPrice: 0.5,
      liquidity: 0,
      volume24h: 0,
      endDate: new Date().toISOString(),
    };
  }
}
