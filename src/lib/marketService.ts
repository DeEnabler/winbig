
import 'server-only';
import redis from '@/lib/redis';
import type { LiveMarket, OrderBook } from '@/types';

interface GetLiveMarketsParams {
  limit?: number;
  offset?: number;
}

interface LiveMarketsResponse {
  markets: LiveMarket[];
  total: number;
}

const LIVE_MARKETS_CACHE_KEY = 'cache:live_markets_data_v2'; // New cache key for new structure
const LIVE_MARKETS_CACHE_TTL_SECONDS = 15; // Cache results for 15 seconds

/**
 * Parses the raw data from a "market:..." Redis hash into a structured LiveMarket object.
 * @param rawData - The raw hash data from redis.hgetall.
 * @returns A structured LiveMarket object or null if data is invalid.
 */
function parseMarketData(rawData: Record<string, any>): LiveMarket | null {
  const conditionId = rawData.condition_id;
  if (!conditionId || !rawData.question) {
    console.warn('[MarketService] Skipping market build: Missing essential condition_id or question.', rawData);
    return null;
  }

  try {
    const orderbookYes: OrderBook | null = rawData.orderbook_yes ? JSON.parse(rawData.orderbook_yes) : null;
    const orderbookNo: OrderBook | null = rawData.orderbook_no ? JSON.parse(rawData.orderbook_no) : null;

    return {
      id: conditionId,
      question: rawData.question,
      category: rawData.category || 'General',
      endsAt: rawData.end_date ? new Date(rawData.end_date) : undefined,
      imageUrl: `https://placehold.co/600x400.png`,
      aiHint: rawData.category?.toLowerCase() || rawData.question.split(' ').slice(0, 2).join(' ') || 'general',
      
      // Pricing
      yesBuyPrice: parseFloat(rawData.yes_buy_price || '0'),
      yesSellPrice: parseFloat(rawData.yes_sell_price || '0'),
      noBuyPrice: parseFloat(rawData.no_buy_price || '0'),
      noSellPrice: parseFloat(rawData.no_sell_price || '0'),

      // Odds
      yesImpliedProbability: parseFloat(rawData.market_odds_yes || '0.5'),
      noImpliedProbability: parseFloat(rawData.market_odds_no || '0.5'),

      // Full order book data (optional)
      orderbook: (orderbookYes || orderbookNo) ? {
        yes: orderbookYes || { bids: [], asks: [] },
        no: orderbookNo || { bids: [], asks: [] },
        timestamp: parseInt(rawData.orderbook_timestamp || '0')
      } : undefined,
    };
  } catch (e) {
    console.error(`[MarketService] Failed to parse market data for ${conditionId}:`, e);
    return null;
  }
}

export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  // 1. Try to get the full list of markets from cache first
  try {
    const cachedData = await redis.get(LIVE_MARKETS_CACHE_KEY);
    if (cachedData) {
      console.log(`[MarketService] CACHE HIT for live markets (v2).`);
      const allMarkets: LiveMarket[] = JSON.parse(cachedData as string);
      const paginatedMarkets = allMarkets.slice(offset, offset + limit);
      return { markets: paginatedMarkets, total: allMarkets.length };
    }
  } catch (e) {
    console.error('[MarketService] Failed to read from cache (v2), fetching from source.', e);
  }

  console.log(`[MarketService] CACHE MISS (v2). Fetching live markets from Redis source.`);
  try {
    // 2. Discover active markets from Redis keys using SCAN
    const marketKeys: string[] = [];
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: 'market:*', count: 100 });
      marketKeys.push(...keys);
      cursor = Number(nextCursor);
    } while (cursor !== 0);

    if (marketKeys.length === 0) {
      console.log("[MarketService] No 'market:*' keys found in Redis using SCAN. No markets to display.");
      return { markets: [], total: 0 };
    }
    
    // 3. We fetch all markets to build the cache, then paginate.
    const pipeline = redis.pipeline();
    marketKeys.forEach(key => pipeline.hgetall(key));
    const results = await pipeline.exec<Record<string, any>[]>();
    
    // 4. Parse all results
    const allMarkets: LiveMarket[] = results
      .map(data => parseMarketData(data))
      .filter((market): market is LiveMarket => market !== null);
    
    // 5. Cache the full, unpaginated result
    if (allMarkets.length > 0) {
      try {
        await redis.set(LIVE_MARKETS_CACHE_KEY, JSON.stringify(allMarkets), { ex: LIVE_MARKETS_CACHE_TTL_SECONDS });
        console.log(`[MarketService] Successfully cached ${allMarkets.length} markets (v2) for ${LIVE_MARKETS_CACHE_TTL_SECONDS}s.`);
      } catch (e) {
        console.error('[MarketService] Failed to write to cache (v2).', e);
      }
    }

    // 6. Paginate the newly fetched data for the current request
    const paginatedMarkets = allMarkets.slice(offset, offset + limit);
    return { markets: paginatedMarkets, total: allMarkets.length };

  } catch (error) {
    console.error('[MarketService] A critical error occurred in getLiveMarkets (v2):', error);
    return { markets: [], total: 0 };
  }
}

export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
    try {
        const rawData = await redis.hgetall(`market:${marketId}`);
        if (!rawData) {
            console.warn(`[MarketService] No data found for single market fetch: market:${marketId}`);
            return null;
        }
        return parseMarketData(rawData);
    } catch (error) {
        console.error(`[MarketService] A critical error occurred in getMarketDetails for ID ${marketId}:`, error);
        return null;
    }
}
