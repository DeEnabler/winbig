// src/app/api/execution-analysis/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import type { OrderBook, OrderLevel, ExecutionPreview } from '@/types';

export const dynamic = 'force-dynamic';

function calculateExecutionPrice(orderbook: OrderBook, targetAmount: number, side: 'BUY' | 'SELL'): Omit<ExecutionPreview, 'timestamp'> {
    try {
        const orders = side === 'BUY' ? orderbook.asks : orderbook.bids;
        if (!orders || orders.length === 0) {
            return { success: false, error: 'No orders available on the selected side.' };
        }

        const bestBid = parseFloat(orderbook.bids[0]?.price || '0');
        const bestAsk = parseFloat(orderbook.asks[0]?.price || '0');
        const fairPrice = bestAsk > 0 && bestBid > 0 ? (bestBid + bestAsk) / 2 : (bestAsk || bestBid);

        if (fairPrice === 0) {
            return { success: false, error: 'Could not determine a fair price for impact calculation.' };
        }

        orders.sort((a, b) => {
            const priceA = parseFloat(a.price);
            const priceB = parseFloat(b.price);
            return side === 'BUY' ? priceA - priceB : priceB - priceA;
        });

        let remainingAmount = targetAmount;
        let totalCost = 0;
        let totalExecuted = 0;
        const executionSteps: string[] = [];

        for (const order of orders) {
            if (remainingAmount <= 0) break;

            const price = parseFloat(order.price);
            const availableSize = parseFloat(order.size);
            const executeSize = Math.min(remainingAmount, availableSize);
            const levelCost = executeSize * price;

            executionSteps.push(`Filled ${executeSize.toFixed(2)} shares @ $${price.toFixed(4)}`);
            
            totalExecuted += executeSize;
            totalCost += levelCost;
            remainingAmount -= executeSize;
        }

        const vwap = totalExecuted > 0 ? totalCost / totalExecuted : 0;
        const fillRatio = targetAmount > 0 ? totalExecuted / targetAmount : 0;
        const priceImpactPct = ((vwap - fairPrice) / fairPrice) * 100;
        
        return {
            success: true,
            vwap,
            fillRatio,
            price_impact_pct: priceImpactPct,
            summary: `Filled ${totalExecuted.toFixed(2)} of ${targetAmount} shares. Avg Price: $${vwap.toFixed(4)}`,
            steps: executionSteps,
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown calculation error',
        };
    }
}


export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const conditionId = searchParams.get('condition_id');
    const outcome = searchParams.get('outcome'); // 'YES' or 'NO'
    const amountStr = searchParams.get('amount');
    const side = searchParams.get('side')?.toUpperCase() as 'BUY' | 'SELL' | undefined;

    if (!conditionId || !outcome || !amountStr || !side) {
        return NextResponse.json({ success: false, error: 'Missing required parameters: condition_id, outcome, amount, side' }, { status: 400 });
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid amount parameter' }, { status: 400 });
    }

    try {
        const marketKey = `market:${conditionId}`;
        const orderbookField = outcome.toLowerCase() === 'yes' ? 'orderbook_yes' : 'orderbook_no';
        
        const orderbookString = await redis.hget(marketKey, orderbookField) as string | null;

        if (!orderbookString) {
            return NextResponse.json({ 
                success: false, 
                error: `Order book data for outcome '${outcome}' not found for this market.` 
            }, { status: 404 });
        }

        const orderbookData: OrderBook = JSON.parse(orderbookString);
        
        const result = calculateExecutionPrice(orderbookData, amount, side);

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
