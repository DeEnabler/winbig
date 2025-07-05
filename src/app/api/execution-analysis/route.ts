// src/app/api/execution-analysis/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import type { OrderBook, OrderLevel, ExecutionPreview } from '@/types';

export const dynamic = 'force-dynamic';

function calculateVwap(amount: number, book: OrderLevel[]): { vwap: number, summary: string, steps: string[], fillRatio: number } {
    let cost = 0;
    let sharesFilled = 0;
    const steps: string[] = [];
    
    for (const level of book) {
        const price = parseFloat(level.price);
        const size = parseFloat(level.size);
        
        const remainingToFill = amount - sharesFilled;
        const sharesToTake = Math.min(remainingToFill, size);
        
        cost += sharesToTake * price;
        sharesFilled += sharesToTake;
        steps.push(`Filled ${sharesToTake.toFixed(2)} shares @ $${price.toFixed(4)} = $${(sharesToTake * price).toFixed(2)}`);
        
        if (sharesFilled >= amount) {
            break;
        }
    }
    
    const vwap = sharesFilled > 0 ? cost / sharesFilled : 0;
    const fillRatio = amount > 0 ? sharesFilled / amount : 0;
    const summary = `Total: ${sharesFilled.toFixed(2)} shares for $${cost.toFixed(2)} (VWAP: $${vwap.toFixed(4)})`;

    return { vwap, summary, steps, fillRatio };
}

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const assetId = searchParams.get('asset_id');
    const conditionId = searchParams.get('condition_id');
    const outcome = searchParams.get('outcome'); // 'YES' or 'NO'
    const amountStr = searchParams.get('amount');
    const side = searchParams.get('side'); // 'BUY' or 'SELL'

    if (!assetId || !conditionId || !outcome || !amountStr || !side) {
        return NextResponse.json({ success: false, error: 'Missing required parameters: asset_id, condition_id, outcome, amount, side' }, { status: 400 });
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid amount parameter' }, { status: 400 });
    }

    try {
        const capitalizedOutcome = outcome === 'YES' ? 'Yes' : 'No';
        const possibleKeys = [
          `orderbook:${assetId}`,
          `orderbook:token:${assetId}`,
          `orderbook:${conditionId}:${capitalizedOutcome}`
        ];

        let orderbookData: OrderBook | null = null;
        
        // OPTIMIZED: Use a pipeline to fetch all potential keys in one request
        const pipeline = redis.pipeline();
        possibleKeys.forEach(key => pipeline.hgetall(key));
        const results = await pipeline.exec();

        // Find the first valid orderbook from the pipeline results
        for (let i = 0; i < results.length; i++) {
          const data = results[i] as any as OrderBook | null;
          if (data && data.bids && data.asks) {
            orderbookData = data;
            console.log(`[API /execution-analysis] Found order book at key: ${possibleKeys[i]}`);
            break;
          }
        }


        if (!orderbookData || !orderbookData.bids || !orderbookData.asks) {
            console.warn(`[API /execution-analysis] Order book data not found for any possible keys based on assetId: ${assetId} and conditionId: ${conditionId}.`);
            return NextResponse.json({ 
                success: false, 
                error: `Deep liquidity analysis is currently unavailable for this market.` 
            }, { status: 200 });
        }

        const bids: OrderLevel[] = JSON.parse(orderbookData.bids as any);
        const asks: OrderLevel[] = JSON.parse(orderbookData.asks as any);
        
        const bookToUse = side.toUpperCase() === 'BUY' ? asks : bids;
        
        if (bookToUse.length === 0) {
            return NextResponse.json({ 
                success: false, 
                error: `No liquidity available on the ${side.toLowerCase()} side.` 
            }, { status: 200 });
        }

        const { vwap, summary, steps, fillRatio } = calculateVwap(amount, bookToUse);

        const result: ExecutionPreview = {
            success: true,
            vwap: parseFloat(vwap.toFixed(4)),
            summary,
            steps,
            fillRatio,
            quality_score: fillRatio, // Simplified quality score
            price_impact_pct: 0, // Placeholder
            timestamp: new Date().toISOString()
        };

        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        console.error('[API /execution-analysis] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to calculate execution preview.',
            message: error instanceof Error ? error.message : 'Unknown server error'
        }, { status: 500 });
    }
}
