
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

const LIVE_MARKETS_CACHE_KEY = 'cache:live_markets_data_v3'; // Cache key reflects new logic
const LIVE_MARKETS_CACHE_TTL_SECONDS = 15; // Cache results for 15 seconds

/**
 * Parses and merges raw data from Redis hashes into a structured LiveMarket object.
 * @param marketData - The raw hash data from `market:{id}`.
 * @param metaData - The raw hash data from `market_meta:{id}`.
 * @returns A structured LiveMarket object or null if data is invalid.
 */
function parseAndMergeMarketData(marketData: Record<string, any>, metaData: Record<string, any>): LiveMarket | null {
  // The 'question' from metaData is now the essential field.
  const question = metaData?.question;
  const conditionId = marketData?.condition_id || metaData?.condition_id;

  if (!question || !conditionId) {
    console.warn('[MarketService] Skipping market build: Missing essential question from metaData or condition_id.', { conditionId, question: !!question });
    return null;
  }

  try {
    const orderbookYes: OrderBook | null = marketData.orderbook_yes ? JSON.parse(marketData.orderbook_yes) : null;
    const orderbookNo: OrderBook | null = marketData.orderbook_no ? JSON.parse(marketData.orderbook_no) : null;

    return {
      id: conditionId,
      question: question,
      category: metaData.category || 'General',
      endsAt: metaData.end_date ? new Date(metaData.end_date) : undefined,
      imageUrl: `https://placehold.co/600x400.png`,
      aiHint: metaData.category?.toLowerCase() || question.split(' ').slice(0, 2).join(' ') || 'general',

      // Pricing from marketData
      yesBuyPrice: parseFloat(marketData.yes_buy_price || '0'),
      yesSellPrice: parseFloat(marketData.yes_sell_price || '0'),
      noBuyPrice: parseFloat(marketData.no_buy_price || '0'),
      noSellPrice: parseFloat(marketData.no_sell_price || '0'),

      // Odds from marketData
      yesImpliedProbability: parseFloat(marketData.market_odds_yes || '0.5'),
      noImpliedProbability: parseFloat(marketData.market_odds_no || '0.5'),

      // Full order book data from marketData
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
  // 1. Try cache
  try {
    const cachedData = await redis.get(LIVE_MARKETS_CACHE_KEY);
    if (cachedData) {
      console.log(`[MarketService] CACHE HIT for live markets (v3).`);
      const allMarkets: LiveMarket[] = JSON.parse(cachedData as string);
      return { markets: allMarkets.slice(offset, offset + limit), total: allMarkets.length };
    }
  } catch (e) {
    console.error('[MarketService] Failed to read from cache (v3), fetching from source.', e);
  }

  console.log(`[MarketService] CACHE MISS (v3). Fetching live markets from Redis source.`);
  try {
    // 2. Discover markets with SCAN
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

    const marketIds = marketKeys.map(key => key.replace('market:', ''));

    // 3. Pipeline fetches from BOTH `market:*` and `market_meta:*`
    const pipeline = redis.pipeline();
    marketIds.forEach(id => {
      pipeline.hgetall(`market:${id}`);
      pipeline.hgetall(`market_meta:${id}`); // Fetch legacy metadata
    });
    const results = await pipeline.exec<Record<string, any>[]>();

    // 4. Parse and merge results
    const allMarkets: LiveMarket[] = [];
    for (let i = 0; i < marketIds.length; i++) {
      const marketData = results[i * 2];
      const metaData = results[i * 2 + 1];
      
      if (marketData && metaData) {
        const market = parseAndMergeMarketData(marketData, metaData);
        if (market) {
          allMarkets.push(market);
        }
      } else {
        console.warn(`[MarketService] Incomplete data for market ID ${marketIds[i]}. Skipping.`, { hasMarketData: !!marketData, hasMetaData: !!metaData });
      }
    }

    // 5. Cache the full result
    if (allMarkets.length > 0) {
      await redis.set(LIVE_MARKETS_CACHE_KEY, JSON.stringify(allMarkets), { ex: LIVE_MARKETS_CACHE_TTL_SECONDS });
      console.log(`[MarketService] Successfully cached ${allMarkets.length} markets (v3) for ${LIVE_MARKETS_CACHE_TTL_SECONDS}s.`);
    }

    return { markets: allMarkets.slice(offset, offset + limit), total: allMarkets.length };

  } catch (error) {
    console.error('[MarketService] A critical error occurred in getLiveMarkets (v3):', error);
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
            console.warn(`[MarketService] No data found for single market fetch: market:${marketId}`);
            return null;
        }
        return parseAndMergeMarketData(marketData, metaData);
    } catch (error) {
        console.error(`[MarketService] A critical error occurred in getMarketDetails for ID ${marketId}:`, error);
        return null;
    }
}
