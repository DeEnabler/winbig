
// src/lib/marketService.ts
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

/**
 * Safely parses orderbook data that might be a JSON string or a pre-parsed object.
 * @param data The raw orderbook data from Redis.
 * @returns A structured OrderBook object or null if parsing fails.
 */
function parseOrderbook(data: any): OrderBook | null {
  if (!data) return null;
  
  // If it's already an object with the expected structure, return it directly.
  if (typeof data === 'object' && data.bids && data.asks) {
    return data as OrderBook;
  }
  
  // If it's a string, try to parse it.
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as OrderBook;
    } catch (error) {
      console.error('Failed to parse orderbook JSON string:', error);
      return null;
    }
  }
  
  // If it's neither a valid object nor a string, return null.
  console.warn('Received orderbook data in an unexpected format:', typeof data);
  return null;
}


/**
 * Parses and merges raw data from Redis hashes (`market:*` and `market_meta:*`)
 * into a structured LiveMarket object.
 * @param marketData - The raw hash data from `market:{id}`.
 * @param metaData - The raw hash data from `market_meta:{id}`.
 * @returns A structured LiveMarket object or null if data is invalid.
 */
function parseAndMergeMarketData(marketData: Record<string, any>, metaData: Record<string, any>): LiveMarket | null {
  const question = metaData?.question;
  const conditionId = marketData?.condition_id;

  if (!question || !conditionId) {
    console.error('[MarketService] Skipping market build: Missing essential question from metaData or condition_id.', { conditionId, hasQuestion: !!question });
    return null;
  }

  try {
    // Use the new safe parsing function
    const orderbookYes: OrderBook | null = parseOrderbook(marketData.orderbook_yes);
    const orderbookNo: OrderBook | null = parseOrderbook(marketData.orderbook_no);

    return {
      id: conditionId,
      question: question,
      category: metaData.category || 'General',
      endsAt: metaData.end_date ? new Date(metaData.end_date) : undefined,
      imageUrl: `https://placehold.co/600x400.png`,
      aiHint: metaData.category?.toLowerCase() || question.split(' ').slice(0, 2).join(' ') || 'general',
      yesBuyPrice: parseFloat(marketData.yes_buy_price || '0'),
      yesSellPrice: parseFloat(marketData.yes_sell_price || '0'),
      noBuyPrice: parseFloat(marketData.no_buy_price || '0'),
      noSellPrice: parseFloat(marketData.no_sell_price || '0'),
      yesImpliedProbability: parseFloat(marketData.market_odds_yes || '0.5'),
      noImpliedProbability: parseFloat(marketData.market_odds_no || '0.5'),
      orderbook: (orderbookYes || orderbookNo) ? {
        yes: orderbookYes || { bids: [], asks: [] },
        no: orderbookNo || { bids: [], asks: [] },
        timestamp: parseInt(marketData.orderbook_timestamp || '0')
      } : undefined,
    };
  } catch (e) {
    console.error(`[MarketService] Failed to parse merged market data for ${conditionId}:`, e);
    return null;
  }
}

export async function getLiveMarkets({ limit = 10, offset = 0 }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  try {
    // Get the total number of markets efficiently, without fetching all IDs.
    const totalCount = await redis.scard('active_market_ids');
    if (totalCount === 0) {
      return { markets: [], total: 0 };
    }

    // Use SSCAN to iterate over the set of market IDs in a memory-efficient way.
    // This prevents server crashes by not loading all keys into memory at once.
    // NOTE: This implementation is for stability and does not support true pagination with offset.
    // It will fetch `limit` number of items from the beginning of an iteration.
    const cursor = 0; // We always start from the beginning for this simplified implementation.
    const [nextCursor, marketIds] = await redis.sscan('active_market_ids', cursor, { count: limit * 2 }); // Fetch more to ensure we can satisfy the limit.

    const paginatedIds = marketIds.slice(0, limit);

    if (paginatedIds.length === 0) {
      return { markets: [], total: totalCount };
    }

    const pipeline = redis.pipeline();
    paginatedIds.forEach(id => {
      pipeline.hgetall(`market:${id}`);
      pipeline.hgetall(`market_meta:${id}`);
    });
    const results = await pipeline.exec<Record<string, any>[]>();
    const allMarkets: LiveMarket[] = [];

    for (let i = 0; i < paginatedIds.length; i++) {
      const marketData = results[i * 2];
      const metaData = results[i * 2 + 1];
      if (marketData && metaData) {
        const market = parseAndMergeMarketData(marketData, metaData);
        if (market) allMarkets.push(market);
      }
    }

    return { markets: allMarkets, total: totalCount };
  } catch (error) {
    console.error('[MarketService] A critical error occurred in getLiveMarkets (v4-sscan):', error);
    return { markets: [], total: 0 };
  }
}

export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
  try {
    const pipeline = redis.pipeline();
    pipeline.hgetall(`market:${marketId}`);
    pipeline.hgetall(`market_meta:${marketId}`);
    const [marketData, metaData] = await pipeline.exec<Record<string, any>[]>();

    if (!marketData || !metaData) {
      return null;
    }
    return parseAndMergeMarketData(marketData, metaData);
  } catch (error) {
    console.error(`[MarketService] A critical error occurred in getMarketDetails for ID ${marketId}:`, error);
    return null;
  }
}
