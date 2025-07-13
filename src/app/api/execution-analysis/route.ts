// src/app/api/execution-analysis/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import redis, { safeRedisOperation } from '@/lib/redis';
import type { OrderBook, OrderLevel, ExecutionPreview } from '@/types';

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
 * Calculates execution details based on a target investment cost (dollar amount).
 * It walks the order book to determine how many shares can be bought for the given cost.
 * @param orderbook The market's order book.
 * @param targetCost The amount of money the user wants to spend.
 * @param side 'BUY' or 'SELL'.
 * @returns An ExecutionPreview object with the results of the simulation.
 */
function calculateExecutionFromCost(orderbook: OrderBook, targetCost: number, side: 'BUY' | 'SELL'): Omit<ExecutionPreview, 'timestamp'> {
    // For a BUY, we look at the 'asks' side of the book (people selling to us).
    // For a SELL, we look at the 'bids' side (people buying from us).
    const orders = side === 'BUY' ? orderbook.asks : orderbook.bids;
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

    let remainingCost = targetCost;
    let totalSharesExecuted = 0;
    let actualTotalCost = 0;
    const executionSteps: string[] = [];

    for (const order of orders) {
        if (remainingCost <= 1e-6) break; // Break if remaining cost is negligible

        const price = parseFloat(order.price);
        const availableSize = parseFloat(order.size);
        
        // Cost to buy/sell all shares at this price level
        const costToClearLevel = price * availableSize;

        if (remainingCost >= costToClearLevel) {
            // We can afford the entire level
            totalSharesExecuted += availableSize;
            actualTotalCost += costToClearLevel;
            remainingCost -= costToClearLevel;
            executionSteps.push(`Filled ${availableSize.toFixed(2)} shares @ $${price.toFixed(4)}`);
        } else {
            // We can only afford part of this level
            const sharesToBuy = remainingCost / price;
            totalSharesExecuted += sharesToBuy;
            actualTotalCost += remainingCost; // Use up all remaining cost
            remainingCost = 0;
            executionSteps.push(`Filled ${sharesToBuy.toFixed(2)} shares @ $${price.toFixed(4)}`);
            break; // We're done, budget is spent
        }
    }

    const vwap = totalSharesExecuted > 0 ? actualTotalCost / totalSharesExecuted : 0;
    // Potential payout is the number of shares acquired, as each winning share is worth $1.
    const potentialPayout = totalSharesExecuted; 

    const bestBid = parseFloat(orderbook.bids[0]?.price || '0');
    const bestAsk = parseFloat(orderbook.asks[0]?.price || '0');
    const fairPrice = bestAsk > 0 && bestBid > 0 ? (bestBid + bestAsk) / 2 : (bestAsk || bestBid);
    const priceImpactPct = fairPrice > 0 ? ((vwap - fairPrice) / fairPrice) * 100 : 0;

    if (totalSharesExecuted === 0) {
      return { success: false, error: 'Investment amount is too low to purchase any shares at current prices.' };
    }

    return {
        success: true,
        vwap,
        totalCost: actualTotalCost,
        executedShares: totalSharesExecuted,
        potentialPayout: potentialPayout,
        price_impact_pct: priceImpactPct,
        summary: `Spend ~$${actualTotalCost.toFixed(2)} to get ${totalSharesExecuted.toFixed(2)} shares.`,
        steps: executionSteps,
    };
}

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const conditionId = searchParams.get('condition_id');
    const outcome = searchParams.get('outcome'); // 'YES' or 'NO'
    const amountStr = searchParams.get('amount'); // This is now treated as a DOLLAR amount
    const side = searchParams.get('side')?.toUpperCase() as 'BUY' | 'SELL' | undefined;

    if (!conditionId || !outcome || !amountStr || !side) {
        return NextResponse.json({ success: false, error: 'Missing required parameters: condition_id, outcome, amount, side' }, { status: 400 });
    }

    const targetCost = parseFloat(amountStr);
    if (isNaN(targetCost) || targetCost <= 0) {
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
        
        const result = calculateExecutionFromCost(orderbookData, targetCost, side);

        const response: ExecutionPreview = {
            ...result,
            timestamp: new Date().toISOString()
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
