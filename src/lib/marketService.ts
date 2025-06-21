// src/lib/marketService.ts
import 'server-only'; // Ensures this module is only used on the server
import getRedisClient from '@/lib/redis';
import type { LiveMarket } from '@/types';

interface GetLiveMarketsParams {
  limit?: number;
  offset?: number;
}

interface LiveMarketsResponse {
  markets: LiveMarket[];
  total: number;
}

/**
 * Fetches and processes data for a single market from Redis.
 * This is a robust helper that handles cases where metadata or odds might be missing.
 * @param redisClient - An instance of the Upstash Redis client.
 * @param marketId - The ID of the market to fetch.
 * @returns A LiveMarket object or null if the market data is incomplete or invalid.
 */
async function fetchAndProcessMarket(redisClient: ReturnType<typeof getRedisClient>, marketId: string): Promise<LiveMarket | null> {
  try {
    const metaKey = `meta:market:${marketId}`;
    const oddsKey = `odds:${marketId}`;

    // Fetch both metadata and odds data in parallel for efficiency
    const [metaData, oddsData] = await Promise.all([
      redisClient.hgetall(metaKey) as Promise<Record<string, string> | null>,
      redisClient.hgetall(oddsKey) as Promise<Record<string, string> | null>,
    ]);

    // A market is only considered valid if it has metadata, especially a question.
    if (!metaData || !metaData.question) {
      console.warn(`[MarketService] Skipping market ${marketId} due to missing or incomplete metadata.`);
      return null;
    }
    
    // Odds are optional. If they don't exist, we can default to a 50/50 split.
    // If they do exist, they must be valid numbers.
    const yesPrice = oddsData?.yes_price ? parseFloat(oddsData.yes_price) : 0.5;
    const noPrice = oddsData?.no_price ? parseFloat(oddsData.no_price) : 0.5;

    if (isNaN(yesPrice) || isNaN(noPrice)) {
       console.warn(`[MarketService] Skipping market ${marketId} due to invalid price data. Yes: ${oddsData?.yes_price}, No: ${oddsData?.no_price}`);
       return null;
    }

    // Construct the final market object for the application
    const market: LiveMarket = {
      id: marketId,
      question: metaData.question,
      // Clamp prices between 0.01 and 0.99 to avoid UI issues with extreme values
      yesPrice: Math.max(0.01, Math.min(0.99, yesPrice)),
      noPrice: Math.max(0.01, Math.min(0.99, noPrice)),
      category: metaData.category || 'General',
      endsAt: metaData.endDateIso ? new Date(metaData.endDateIso) : undefined,
      imageUrl: metaData.image_url || `https://placehold.co/600x400.png`,
      aiHint: metaData.ai_hint || 'event',
      // Generate a catchy teaser, ensuring we don't divide by zero
      payoutTeaser: `Bet YES to win ${(1 / Math.max(0.01, yesPrice)).toFixed(1)}x`,
    };
    return market;

  } catch (error) {
    console.error(`[MarketService] A critical error occurred while processing market ${marketId}:`, error);
    return null;
  }
}

/**
 * Fetches a paginated list of all currently live markets.
 * @param params - An object containing limit and offset for pagination.
 * @returns A promise that resolves to an object with the list of markets and the total count.
 */
export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  const redisClient = getRedisClient();
  
  const activeMarketIds = await redisClient.smembers('active_market_ids');

  if (!activeMarketIds || activeMarketIds.length === 0) {
    console.log('[MarketService] No active market IDs found in Redis set "active_market_ids".');
    return { markets: [], total: 0 };
  }
  
  const totalMarkets = activeMarketIds.length;
  const paginatedMarketIds = activeMarketIds.slice(offset, offset + limit);

  if (paginatedMarketIds.length === 0) {
    return { markets: [], total: totalMarkets };
  }

  // Fetch all requested markets in parallel using the robust helper function
  const marketPromises = paginatedMarketIds.map(marketId => fetchAndProcessMarket(redisClient, marketId));
  const results = await Promise.all(marketPromises);

  // Filter out any markets that were null (due to missing data or errors)
  const fetchedMarkets = results.filter((market): market is LiveMarket => market !== null);

  return { markets: fetchedMarkets, total: totalMarkets };
}

/**
 * Fetches the complete details for a single market by its ID.
 * @param marketId - The ID of the market to fetch.
 * @returns A promise that resolves to a LiveMarket object or null if not found.
 */
export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    const redisClient = getRedisClient();
    // Re-use the same robust helper function for consistency
    return fetchAndProcessMarket(redisClient, marketId);
}
