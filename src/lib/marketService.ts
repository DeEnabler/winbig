
// src/lib/marketService.ts
import 'server-only';
import redis, { safeRedisOperation } from '@/lib/redis';
import type { LiveMarket, OrderBook } from '@/types';

// ============================================
// 💰 PLATFORM FEE & MARKUP CONFIGURATION
// ============================================
// These constants control how WinBig captures margin on trades.
// The markup is applied by widening the bid/ask spread shown to users.

/** Platform markup percentage applied to each side of the spread (2% = 4% total round-trip) */
export const PLATFORM_MARKUP_PERCENT = 0.02;

/** Target platform fee rate for affiliate calculations (5% of bet volume) */
export const PLATFORM_FEE_RATE = 0.05;

/** Tier 1 affiliate commission rate (8% of platform fee = 0.4% of bet) */
export const TIER_1_COMMISSION_RATE = 0.08;

/** Tier 2 affiliate commission rate (2% of platform fee = 0.1% of bet) */
export const TIER_2_COMMISSION_RATE = 0.02;

/**
 * Raw execution prices from Polymarket orderbook
 */
export interface RawPrices {
  yesBuyPrice: number;
  yesSellPrice: number;
  noBuyPrice: number;
  noSellPrice: number;
}

/**
 * Prices after applying WinBig's platform markup
 */
export interface MarkedUpPrices extends RawPrices {
  /** The markup percentage applied to each side */
  markupPercent: number;
  /** Effective total spread (markup × 2) */
  effectiveSpread: number;
  /** Whether markup was applied */
  markupApplied: boolean;
}

/**
 * 💰 Applies platform markup to raw Polymarket prices.
 * 
 * This widens the spread shown to users:
 * - Buy prices are increased (worse for buyer)
 * - Sell prices are decreased (worse for seller)
 * 
 * This is how WinBig captures margin without showing explicit fees.
 * 
 * @param rawPrices - Raw execution prices from Polymarket
 * @param markupPercent - Optional custom markup (defaults to PLATFORM_MARKUP_PERCENT)
 * @returns Marked up prices with spread information
 */
export function applyOddsMarkup(
  rawPrices: RawPrices,
  markupPercent: number = PLATFORM_MARKUP_PERCENT
): MarkedUpPrices {
  return {
    // Worse buy prices for users (higher cost per share)
    yesBuyPrice: Math.min(0.99, rawPrices.yesBuyPrice * (1 + markupPercent)),
    noBuyPrice: Math.min(0.99, rawPrices.noBuyPrice * (1 + markupPercent)),
    // Worse sell prices for users (lower value when selling)
    yesSellPrice: Math.max(0.01, rawPrices.yesSellPrice * (1 - markupPercent)),
    noSellPrice: Math.max(0.01, rawPrices.noSellPrice * (1 - markupPercent)),
    // Markup metadata
    markupPercent,
    effectiveSpread: markupPercent * 2, // Total round-trip cost
    markupApplied: true,
  };
}

/**
 * 📊 Calculates the fee breakdown for a given bet amount.
 * 
 * @param grossAmount - What the user pays
 * @param markupPercent - The markup percentage applied
 * @returns Breakdown of fees and net amounts
 */
export function calculateFeeBreakdown(
  grossAmount: number,
  markupPercent: number = PLATFORM_MARKUP_PERCENT
): {
  grossAmount: number;
  platformFee: number;
  netToMarket: number;
  effectiveFeeRate: number;
} {
  // The platform fee is effectively the markup on the purchase
  // For a buy at markup%, we're sending (1 - markup%) to market
  const effectiveFeeRate = markupPercent;
  const platformFee = grossAmount * effectiveFeeRate;
  const netToMarket = grossAmount - platformFee;

  return {
    grossAmount,
    platformFee,
    netToMarket,
    effectiveFeeRate,
  };
}

/**
 * 💵 Calculates affiliate earnings for a bet.
 * 
 * @param betAmount - The gross bet amount from user
 * @returns Breakdown of affiliate earnings by tier
 */
export function calculateAffiliateEarnings(betAmount: number): {
  tier1Earnings: number;
  tier2Earnings: number;
  totalAffiliateEarnings: number;
  platformRetained: number;
} {
  // Affiliate earnings are based on the notional platform fee (5% of bet volume)
  const notionalPlatformFee = betAmount * PLATFORM_FEE_RATE;
  const tier1Earnings = notionalPlatformFee * TIER_1_COMMISSION_RATE; // 8% of 5% = 0.4%
  const tier2Earnings = notionalPlatformFee * TIER_2_COMMISSION_RATE; // 2% of 5% = 0.1%
  const totalAffiliateEarnings = tier1Earnings + tier2Earnings;
  const platformRetained = notionalPlatformFee - totalAffiliateEarnings;

  return {
    tier1Earnings,
    tier2Earnings,
    totalAffiliateEarnings,
    platformRetained,
  };
}

interface GetLiveMarketsParams {
  limit?: number;
  cursor?: string;
}

interface LiveMarketsResponse {
  markets: LiveMarket[];
  total: number;
  nextCursor?: string;
}

/**
 * 🎯 **CORRECTED APPROACH: Use Pre-calculated Normalized Odds**
 * 
 * This function properly extracts market odds from Redis data that has already been
 * normalized using midpoint calculations. It avoids the trap of adding raw execution
 * prices which don't sum to 100% due to spreads and market inefficiencies.
 */
function getMarketOddsFromRedis(marketData: Record<string, any>): {
  yesImpliedProbability: number;
  noImpliedProbability: number;
  marketEfficiency: number;
  calculationMethod: string;
} {
  try {
    // ✅ CORRECT: Use pre-calculated normalized odds from Redis
    const marketOddsYes = parseFloat(String(marketData.market_odds_yes || '0'));
    const marketOddsNo = parseFloat(String(marketData.market_odds_no || '0'));
    
    // Verify the normalized odds are valid and sum to ~100%
    const oddsSum = marketOddsYes + marketOddsNo;
    if (marketOddsYes > 0 && marketOddsNo > 0 && oddsSum >= 0.95 && oddsSum <= 1.05) {
      // Calculate market efficiency from midpoints
      const yesMidpoint = parseFloat(String(marketData.yes_midpoint || '0'));
      const noMidpoint = parseFloat(String(marketData.no_midpoint || '0'));
      const totalMidpoints = yesMidpoint + noMidpoint;
      const marketEfficiency = totalMidpoints > 0 ? 1.0 / totalMidpoints : 0;
      
      return {
        yesImpliedProbability: marketOddsYes,
        noImpliedProbability: marketOddsNo,
        marketEfficiency,
        calculationMethod: 'normalized_midpoint'
      };
    }
    
    // Fallback: Calculate from midpoints if normalized odds aren't available
    const yesMidpoint = parseFloat(String(marketData.yes_midpoint || '0'));
    const noMidpoint = parseFloat(String(marketData.no_midpoint || '0'));
    
    if (yesMidpoint > 0 && noMidpoint > 0) {
      const totalMidpoints = yesMidpoint + noMidpoint;
      const marketEfficiency = 1.0 / totalMidpoints;
      
      return {
        yesImpliedProbability: yesMidpoint / totalMidpoints,
        noImpliedProbability: noMidpoint / totalMidpoints,
        marketEfficiency,
        calculationMethod: 'calculated_midpoint'
      };
    }
    
    // ⚠️ Last resort: Use execution prices with normalization warning
    const yesBuyPrice = parseFloat(String(marketData.yes_buy_price || '0'));
    const noBuyPrice = parseFloat(String(marketData.no_buy_price || '0'));
    
    if (yesBuyPrice > 0 && noBuyPrice > 0) {
      const totalBuyPrice = yesBuyPrice + noBuyPrice;
      console.warn(`[MarketService] Using execution prices for odds calculation (not ideal): ${totalBuyPrice}`);
      
      return {
        yesImpliedProbability: yesBuyPrice / totalBuyPrice,
        noImpliedProbability: noBuyPrice / totalBuyPrice,
        marketEfficiency: 1.0 / totalBuyPrice,
        calculationMethod: 'execution_price_normalized'
      };
    }
    
    // Default fallback
    console.warn('[MarketService] No valid price data found, using 50/50 default');
    return {
      yesImpliedProbability: 0.5,
      noImpliedProbability: 0.5,
      marketEfficiency: 0.5,
      calculationMethod: 'default_fallback'
    };
    
  } catch (error) {
    console.error('[MarketService] Error extracting market odds from Redis:', error);
    return {
      yesImpliedProbability: 0.5,
      noImpliedProbability: 0.5,
      marketEfficiency: 0.5,
      calculationMethod: 'error_fallback'
    };
  }
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
 * 📊 **COMPLETE MARKET DATA EXTRACTION**
 * 
 * Parses and merges raw data from Redis hashes (`market:*` and `market_meta:*`)
 * into a structured LiveMarket object using the correct normalization approach.
 */
function parseAndMergeMarketData(marketData: Record<string, any>, metaData: Record<string, any>): LiveMarket | null {
  const question = metaData?.question;
  const conditionId = marketData?.condition_id;

  if (!question || !conditionId) {
    console.error('[MarketService] Skipping market build: Missing essential question from metaData or condition_id.', { conditionId, hasQuestion: !!question });
    return null;
  }

  try {
    // ✅ CORRECT: Get normalized odds from Redis
    const { yesImpliedProbability, noImpliedProbability, marketEfficiency, calculationMethod } = getMarketOddsFromRedis(marketData);
    
    // 💰 Extract execution prices (what users actually pay)
    const yesBuyPrice = parseFloat(String(marketData.yes_buy_price || '0'));
    const yesSellPrice = parseFloat(String(marketData.yes_sell_price || '0'));
    const noBuyPrice = parseFloat(String(marketData.no_buy_price || '0'));
    const noSellPrice = parseFloat(String(marketData.no_sell_price || '0'));
    
    // 📈 Extract market efficiency metrics
    const yesMidpoint = parseFloat(String(marketData.yes_midpoint || '0'));
    const noMidpoint = parseFloat(String(marketData.no_midpoint || '0'));
    
    // Parse orderbook data (still useful for advanced analytics)
    const orderbookYes: OrderBook | null = parseOrderbook(marketData.orderbook_yes);
    const orderbookNo: OrderBook | null = parseOrderbook(marketData.orderbook_no);

    return {
      id: conditionId,
      question: question,
      category: metaData.category || 'General',
      endsAt: metaData.end_date ? new Date(metaData.end_date) : undefined,
      imageUrl: `https://placehold.co/600x400.png`,
      aiHint: metaData.category?.toLowerCase() || question.split(' ').slice(0, 2).join(' ') || 'general',
      
      // 💰 Execution prices (what users actually pay)
      yesBuyPrice: yesBuyPrice,
      yesSellPrice: yesSellPrice,
      noBuyPrice: noBuyPrice,
      noSellPrice: noSellPrice,
      
      // ✅ CORRECT: Normalized market probabilities (always sum to 100%)
      yesImpliedProbability: yesImpliedProbability,
      noImpliedProbability: noImpliedProbability,
      
      // 📊 Market efficiency and analytics
      marketEfficiency: marketEfficiency,
      calculationMethod: calculationMethod,
      
      // 📈 Midpoint prices for advanced analytics
      yesMidpoint: yesMidpoint,
      noMidpoint: noMidpoint,
      
      // 📚 Orderbook data (optional, for advanced users)
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

/**
 * Counts the number of keys matching a pattern using SCAN iteration.
 */
async function countKeysMatching(pattern: string): Promise<number> {
  let cursor = '0';
  let total = 0;
  do {
    const result = await safeRedisOperation(
      () => redis.scan(cursor, { match: pattern, count: 100 }),
      null
    );
    if (!result) break;
    [cursor, ] = result;
    total += result[1].length;
  } while (cursor !== '0');
  return total;
}

export async function debugRedisAccess(): Promise<boolean> {
  const pingResult = await safeRedisOperation(
    () => redis.ping(),
    null
  );
  
  if (!pingResult) {
    console.error('Redis ping failed');
    return false;
  }
  
  // Test SSCAN on active_market_ids set
  const scanResult = await safeRedisOperation(
    () => redis.sscan('active_market_ids', 0, { count: 5 }),
    null
  );
  
  if (!scanResult) {
    console.error('Redis SSCAN test failed');
    return false;
  }
  
  const [cursor, marketIds] = scanResult;
  console.log(`Redis debug: Found ${marketIds.length} market IDs in scan test`);
  return true;
}

export async function getLiveMarkets({ limit = 10, cursor = '0' }: GetLiveMarketsParams): Promise<LiveMarketsResponse> {
  try {
    // Use SCAN to discover markets from 'market:*' keys
    const scanResult = await safeRedisOperation(
      () => redis.scan(cursor, { match: 'market:*', count: limit }),
      null
    );

    if (!scanResult) {
      console.error('[MarketService] Failed to scan market keys');
      return { markets: [], total: 0 };
    }

    const [nextCursor, marketKeys] = scanResult;
    
    if (marketKeys.length === 0) {
      return { markets: [], total: 0, nextCursor: nextCursor !== '0' ? nextCursor : undefined };
    }

    // Extract IDs from keys (e.g., 'market:0x123...' -> '0x123...')
    const marketIds = marketKeys.map(key => key.split(':')[1]);

    // Get total count using SCAN iteration
    const totalCount = await countKeysMatching('market:*');

    // Pipeline to fetch market data efficiently
    const pipeline = redis.pipeline();
    marketIds.forEach(id => {
      pipeline.hgetall(`market:${id}`);
      pipeline.hgetall(`market_meta:${id}`);
    });
    
    const results = await safeRedisOperation(
      () => pipeline.exec<Record<string, any>[]>(),
      []
    );

    if (!results) {
      console.error('[MarketService] Pipeline execution failed');
      return { markets: [], total: totalCount || 0 };
    }

    // Parse results into LiveMarket objects
    const markets: LiveMarket[] = [];
    for (let i = 0; i < marketIds.length; i++) {
      const marketData = results[i * 2];
      const metaData = results[i * 2 + 1];
      
      if (marketData && metaData) {
        const market = parseAndMergeMarketData(marketData, metaData);
        if (market) {
          markets.push(market);
        }
      }
    }

    return { 
      markets, 
      total: totalCount || 0,
      nextCursor: nextCursor !== '0' ? nextCursor : undefined
    };
  } catch (error) {
    console.error('[MarketService] A critical error occurred in getLiveMarkets:', error);
    return { markets: [], total: 0 };
  }
}

export async function getMarketDetails(marketId: string): Promise<LiveMarket | null> {
  try {
    const pipeline = redis.pipeline();
    pipeline.hgetall(`market:${marketId}`);
    pipeline.hgetall(`market_meta:${marketId}`);
    
    const results = await safeRedisOperation(
      () => pipeline.exec<Record<string, any>[]>(),
      null
    );

    if (!results) {
      console.error(`[MarketService] Failed to fetch market details for ID ${marketId}`);
      return null;
    }

    const [marketData, metaData] = results;

    if (!marketData || !metaData) {
      console.warn(`[MarketService] Incomplete data for market ${marketId}`);
      return null;
    }
    
    return parseAndMergeMarketData(marketData, metaData);
  } catch (error) {
    console.error(`[MarketService] A critical error occurred in getMarketDetails for ID ${marketId}:`, error);
    return null;
  }
}

/**
 * 🎯 **UTILITY FUNCTION: Get Market Odds with Full Context**
 * 
 * Returns comprehensive market odds data including normalized probabilities,
 * execution prices, market efficiency metrics, AND marked-up prices for WinBig platform.
 */
export async function getMarketOdds(conditionId: string): Promise<{
  conditionId: string;
  odds: {
    yes: number;
    no: number;
    calculationMethod: string;
  };
  execution: {
    yesBuyPrice: number;
    noBuyPrice: number;
    yesSellPrice: number;
    noSellPrice: number;
  };
  /** 💰 Marked-up prices that WinBig shows to users (includes platform margin) */
  markedUp: MarkedUpPrices;
  efficiency: {
    yesMidpoint: number;
    noMidpoint: number;
    totalMidpoints: number;
    marketEfficiency: number;
  };
  /** Polymarket's natural bid/ask spread before our markup */
  polymarketSpread: {
    yesSpread: number;
    noSpread: number;
    avgSpread: number;
  };
  raw: {
    yesExecutionPercent: number;
    noExecutionPercent: number;
    totalRaw: number;
    warning: string;
  };
} | null> {
  try {
    const marketKey = `market:${conditionId}`;
    const marketData = await safeRedisOperation(
      () => redis.hgetall(marketKey),
      null
    );
    
    if (!marketData) {
      console.error(`[MarketService] No market data found for ${conditionId}`);
      return null;
    }
    
    const { yesImpliedProbability, noImpliedProbability, marketEfficiency, calculationMethod } = getMarketOddsFromRedis(marketData);
    
    const yesBuyPrice = parseFloat(String(marketData.yes_buy_price || '0'));
    const noBuyPrice = parseFloat(String(marketData.no_buy_price || '0'));
    const yesSellPrice = parseFloat(String(marketData.yes_sell_price || '0'));
    const noSellPrice = parseFloat(String(marketData.no_sell_price || '0'));
    const yesMidpoint = parseFloat(String(marketData.yes_midpoint || '0'));
    const noMidpoint = parseFloat(String(marketData.no_midpoint || '0'));
    
    // Calculate raw Polymarket spread (before our markup)
    const yesSpread = yesBuyPrice > 0 && yesSellPrice > 0 
      ? (yesBuyPrice - yesSellPrice) / yesMidpoint 
      : 0;
    const noSpread = noBuyPrice > 0 && noSellPrice > 0 
      ? (noBuyPrice - noSellPrice) / noMidpoint 
      : 0;
    const avgSpread = (yesSpread + noSpread) / 2;
    
    // Apply WinBig platform markup to prices
    const rawPrices: RawPrices = {
      yesBuyPrice,
      yesSellPrice,
      noBuyPrice,
      noSellPrice,
    };
    const markedUp = applyOddsMarkup(rawPrices);
    
    return {
      conditionId,
      
      // ✅ CORRECT: Use pre-calculated normalized odds
      odds: {
        yes: yesImpliedProbability,
        no: noImpliedProbability,
        calculationMethod
      },
      
      // 💰 Raw execution prices from Polymarket (what we pay)
      execution: {
        yesBuyPrice,
        noBuyPrice,
        yesSellPrice,
        noSellPrice
      },
      
      // 💵 Marked-up prices shown to users (includes our margin)
      markedUp,
      
      // 📈 Market efficiency metrics
      efficiency: {
        yesMidpoint,
        noMidpoint,
        totalMidpoints: yesMidpoint + noMidpoint,
        marketEfficiency
      },
      
      // 📊 Polymarket's natural spread (useful for monitoring)
      polymarketSpread: {
        yesSpread,
        noSpread,
        avgSpread,
      },
      
      // ⚠️ DON'T USE: Raw execution prices (they don't sum to 100%)
      raw: {
        yesExecutionPercent: yesBuyPrice * 100,
        noExecutionPercent: noBuyPrice * 100,
        totalRaw: (yesBuyPrice + noBuyPrice) * 100,
        warning: "These don't sum to 100% - use normalized odds instead"
      }
    };
  } catch (error) {
    console.error('[MarketService] Error fetching market odds:', error);
    return null;
  }
}
