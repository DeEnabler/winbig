//
// This file handles fetching public, unauthenticated data from the Polymarket API
//

// Note: The public 'sampling-markets' endpoint appears to be rate-limited or require
// authentication now. The clob-client uses authenticated endpoints. This file
// is a placeholder for any public data fetching you may need.

export interface Market {
  condition_id: string;
  question: string;
  description: string;
  end_date_iso: string;
  // ... other fields from the API
}

export interface MarketQuote {
  // ... structure for market quotes
}

const POLYMARKET_BASE_URL = 'https://clob.polymarket.com';

/**
* Fetches active markets.
* IMPORTANT: This public endpoint may be deprecated or require authentication.
* The primary method should be via the authenticated clob-client.
*/
export async function getActiveMarkets(): Promise<Market[]> {
  try {
    const response = await fetch(`${POLYMARKET_BASE_URL}/sampling-markets`);
    if (!response.ok) {
      console.warn(`Public market fetch failed with status: ${response.status}`);
      // Return empty array or handle error as needed
      return [];
    }
    const markets: Market[] = await response.json();
    return markets;
  } catch (error) {
    console.error('Error fetching active markets:', error);
    return [];
  }
}

/**
* Fetches quotes for a given market.
* IMPORTANT: This also likely requires authentication now.
*/
export async function getMarketQuotes(conditionId: string): Promise<MarketQuote | null> {
  // This function would need to be implemented, likely using authenticated
  // endpoints from the clob-client.
  console.warn(`getMarketQuotes is not fully implemented for public access.`);
  return null;
} 