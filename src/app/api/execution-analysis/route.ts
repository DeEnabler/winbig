// src/app/api/execution-analysis/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import redis, { safeRedisOperation } from '@/lib/redis';
import type { OrderBook, OrderLevel, ExecutionPreview } from '@/types';
import { 
  PLATFORM_MARKUP_PERCENT, 
  PLATFORM_FEE_RATE,
  calculateFeeBreakdown,
  calculateAffiliateEarnings,
} from '@/lib/marketService';

export const dynamic = 'force-dynamic';

/**
 * Safely parses orderbook data that might be a JSON string or a pre-parsed object.
 */
function parseOrderbook(data: any): OrderBook | null {
  if (!data) return null;
  if (typeof data === 'object' && data.bids && data.asks) {
    return data as OrderBook;
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as OrderBook;
    } catch (error) {
      console.error('Failed to parse orderbook JSON string:', error);
      return null;
    }
  }
  console.warn('Received orderbook data in an unexpected format:', typeof data);
  return null;
}

/**
 * Extended execution result with economic breakdown
 */
interface ExtendedExecutionResult {
  success: boolean;
  error?: string;
  // Core execution data
  vwap?: number;
  totalCost?: number;
  executedShares?: number;
  potentialPayout?: number;
  price_impact_pct?: number;
  summary?: string;
  steps?: string[];
  // 💰 Economic breakdown (NEW)
  economics?: {
    // What user pays
    grossAmount: number;
    // What goes to Polymarket after our fee
    netToMarket: number;
    // WinBig's captured fee
    platformFee: number;
    // Platform markup percentage
    platformMarkupPercent: number;
    // Polymarket's natural spread (bid-ask)
    polymarketSpread: number;
    // Combined total spread user experiences
    totalEffectiveSpread: number;
    // Expected shares based on net amount sent to market
    expectedShares: number;
    // Affiliate earnings breakdown
    affiliateEarnings: {
      tier1: number;
      tier2: number;
      total: number;
      platformRetained: number;
    };
  };
}

/**
 * Calculates execution details based on a target investment cost (dollar amount).
 * Now includes full economic breakdown with platform fees and spread analysis.
 * 
 * @param orderbook The market's order book.
 * @param grossAmount The amount of money the user wants to spend (before fees).
 * @param side 'BUY' or 'SELL'.
 * @returns Extended execution preview with economic breakdown.
 */
function calculateExecutionFromCost(
  orderbook: OrderBook, 
  grossAmount: number, 
  side: 'BUY' | 'SELL'
): ExtendedExecutionResult {
    // For a BUY, we look at the 'asks' side of the book (people selling to us).
    // For a SELL, we look at the 'bids' side (people buying from us).
    const orders = side === 'BUY' ? [...orderbook.asks] : [...orderbook.bids];
    if (!orders || orders.length === 0) {
        return { success: false, error: 'No orders available on the selected side.' };
    }

    // Sort orders to get the best price first.
    // For BUY: sort asks from lowest to highest price.
    // For SELL: sort bids from highest to lowest price.
    orders.sort((a, b) => {
        const priceA = parseFloat(a.price);
        const priceB = parseFloat(b.price);
        return side === 'BUY' ? priceA - priceB : priceB - priceA;
    });

    // 💰 Calculate fee breakdown - this is the net amount that actually goes to Polymarket
    const feeBreakdown = calculateFeeBreakdown(grossAmount, PLATFORM_MARKUP_PERCENT);
    const netToMarket = feeBreakdown.netToMarket;
    
    // Calculate Polymarket's natural spread from orderbook
    const bestBid = parseFloat(orderbook.bids[0]?.price || '0');
    const bestAsk = parseFloat(orderbook.asks[0]?.price || '0');
    const midpoint = bestAsk > 0 && bestBid > 0 ? (bestBid + bestAsk) / 2 : (bestAsk || bestBid);
    const polymarketSpread = midpoint > 0 ? (bestAsk - bestBid) / midpoint : 0;

    // Execute against orderbook with NET amount (after our fee)
    let remainingCost = netToMarket;
    let totalSharesExecuted = 0;
    let actualTotalCost = 0;
    const executionSteps: string[] = [];

    for (const order of orders) {
        if (remainingCost <= 1e-6) break;

        const price = parseFloat(order.price);
        const availableSize = parseFloat(order.size);
        const costToClearLevel = price * availableSize;

        if (remainingCost >= costToClearLevel) {
            totalSharesExecuted += availableSize;
            actualTotalCost += costToClearLevel;
            remainingCost -= costToClearLevel;
            executionSteps.push(`Filled ${availableSize.toFixed(2)} shares @ $${price.toFixed(4)}`);
        } else {
            const sharesToBuy = remainingCost / price;
            totalSharesExecuted += sharesToBuy;
            actualTotalCost += remainingCost;
            remainingCost = 0;
            executionSteps.push(`Filled ${sharesToBuy.toFixed(2)} shares @ $${price.toFixed(4)}`);
            break;
        }
    }

    if (totalSharesExecuted === 0) {
      return { success: false, error: 'Investment amount is too low to purchase any shares at current prices.' };
    }

    const vwap = totalSharesExecuted > 0 ? actualTotalCost / totalSharesExecuted : 0;
    const potentialPayout = totalSharesExecuted; // Each share = $1 if wins
    const priceImpactPct = midpoint > 0 ? ((vwap - midpoint) / midpoint) * 100 : 0;
    
    // Calculate total effective spread (Polymarket spread + our markup)
    const totalEffectiveSpread = polymarketSpread + (PLATFORM_MARKUP_PERCENT * 2);
    
    // Calculate affiliate earnings
    const affiliateEarnings = calculateAffiliateEarnings(grossAmount);

    return {
        success: true,
        // Core execution data (based on gross amount for display)
        vwap,
        totalCost: grossAmount, // Show user what they're paying
        executedShares: totalSharesExecuted,
        potentialPayout,
        price_impact_pct: priceImpactPct,
        summary: `Spend $${grossAmount.toFixed(2)} to get ~${totalSharesExecuted.toFixed(2)} shares.`,
        steps: executionSteps,
        // 💰 Full economic breakdown
        economics: {
          grossAmount,
          netToMarket,
          platformFee: feeBreakdown.platformFee,
          platformMarkupPercent: PLATFORM_MARKUP_PERCENT,
          polymarketSpread,
          totalEffectiveSpread,
          expectedShares: totalSharesExecuted,
          affiliateEarnings: {
            tier1: affiliateEarnings.tier1Earnings,
            tier2: affiliateEarnings.tier2Earnings,
            total: affiliateEarnings.totalAffiliateEarnings,
            platformRetained: affiliateEarnings.platformRetained,
          },
        },
    };
}

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const conditionId = searchParams.get('condition_id');
    const outcome = searchParams.get('outcome'); // 'YES' or 'NO'
    const amountStr = searchParams.get('amount'); // This is now treated as a DOLLAR amount (gross, before fees)
    const side = searchParams.get('side')?.toUpperCase() as 'BUY' | 'SELL' | undefined;

    if (!conditionId || !outcome || !amountStr || !side) {
        return NextResponse.json({ success: false, error: 'Missing required parameters: condition_id, outcome, amount, side' }, { status: 400 });
    }

    const grossAmount = parseFloat(amountStr);
    if (isNaN(grossAmount) || grossAmount <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid amount parameter' }, { status: 400 });
    }

    try {
        const marketKey = `market:${conditionId}`;
        const rawOrderbookData = await safeRedisOperation(
            () => redis.hget(marketKey, `orderbook_${outcome.toLowerCase()}`),
            null
        );

        if (!rawOrderbookData) {
            return NextResponse.json({ 
                success: false, 
                error: `Order book data for outcome '${outcome}' not found for this market.` 
            }, { status: 404 });
        }
        
        const orderbookData = parseOrderbook(rawOrderbookData);
        if (!orderbookData) {
             return NextResponse.json({ 
                success: false, 
                error: `Could not parse order book data for outcome '${outcome}'.` 
            }, { status: 500 });
        }
        
        // Calculate execution with full economic breakdown
        const result = calculateExecutionFromCost(orderbookData, grossAmount, side);

        // Return enhanced response with economics data
        const response = {
            ...result,
            timestamp: new Date().toISOString(),
        };

        return NextResponse.json(response, { status: 200 });

    } catch (error) {
        console.error('[API /execution-analysis] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to calculate execution preview.',
            message: error instanceof Error ? error.message : 'Unknown server error'
        }, { status: 500 });
    }
}
