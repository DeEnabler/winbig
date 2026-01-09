import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { getMarketDetails, getMarketOdds } from '@/lib/marketService';
import { BetRecord } from '@/lib/supabase-server';
import { OpenPosition, OpenPositionStatus } from '@/types';

async function getPositions(userId: string): Promise<{ activePositions: OpenPosition[], pastPositions: OpenPosition[] }> {
    if (!supabase) {
        throw new Error("Supabase client is not initialized.");
    }
    
    // Normalize wallet address to lowercase for consistent comparison
    const normalizedUserId = userId.toLowerCase();
    console.log('📊 [Positions] Fetching bets for user:', normalizedUserId);
    
    // Use ilike for case-insensitive matching of wallet addresses
    const { data: bets, error } = await supabase
        .from('bets')
        .select('*')
        .ilike('user_id', normalizedUserId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ [Positions] Error fetching user bets:', error);
        throw new Error(error.message);
    }

    if (!bets || bets.length === 0) {
        console.log('📭 [Positions] No bets found for user:', normalizedUserId);
        return { activePositions: [], pastPositions: [] };
    }
    
    console.log(`✅ [Positions] Found ${bets.length} bets for user:`, normalizedUserId);

    // Group bets by market_id + outcome for aggregation
    const betsByMarketOutcome = new Map<string, typeof bets>();
    for (const bet of bets) {
        const key = `${bet.market_id}:${bet.outcome}`;
        if (!betsByMarketOutcome.has(key)) {
            betsByMarketOutcome.set(key, []);
        }
        betsByMarketOutcome.get(key)!.push(bet);
    }
    
    console.log(`📊 [Positions] Aggregated into ${betsByMarketOutcome.size} unique market positions`);

    // Build aggregated positions
    const positions = await Promise.all(
        Array.from(betsByMarketOutcome.entries()).map(async ([key, marketBets]) => {
            const firstBet = marketBets[0]; // Use first bet for market details (most recent due to ordering)
            const marketDetails = await getMarketDetails(firstBet.market_id);
            const marketOdds = await getMarketOdds(firstBet.market_id);
            
            const now = new Date();
            const endsAt = marketDetails?.endsAt ? new Date(marketDetails.endsAt) : new Date();
            const hasEnded = now > endsAt;
            
            // Aggregate values across all bets in this market+outcome
            let totalAmount = 0;
            let totalPotentialPayout = 0;
            let totalShares = 0;
            let totalSettledAmount = 0;
            const betIds: number[] = [];
            let hasAnyExecuted = false;
            let hasAnyPending = false;
            let hasBonusApplied = false;
            
            for (const bet of marketBets) {
                const betAmount = Number(bet.amount);
                totalAmount += betAmount;
                totalPotentialPayout += Number(bet.potential_payout) || 0;
                betIds.push(bet.id);
                
                // Calculate shares for this bet
                // Priority: 1) shares_received (from hedger), 2) estimate from execution_price, 3) estimate from odds_shown
                let betShares = 0;
                if (bet.shares_received && Number(bet.shares_received) > 0) {
                    betShares = Number(bet.shares_received);
                } else if (bet.execution_price && Number(bet.execution_price) > 0) {
                    // Shares = amount / execution_price
                    betShares = betAmount / Number(bet.execution_price);
                } else if (bet.odds_shown_to_user && Number(bet.odds_shown_to_user) > 0) {
                    // Fallback: estimate shares from odds shown at time of bet
                    betShares = betAmount / Number(bet.odds_shown_to_user);
                }
                totalShares += betShares;
                
                if (bet.status === 'executed') {
                    hasAnyExecuted = true;
                    if (hasEnded) {
                        totalSettledAmount += Number(bet.potential_payout) || 0;
                    }
                }
                if (bet.status === 'pending') {
                    hasAnyPending = true;
                }
            }
            
            // Calculate current value using total shares × current sell price
            let currentSellPrice = 0;
            if (marketOdds) {
                currentSellPrice = firstBet.outcome === 'YES' 
                    ? marketOdds.execution.yesSellPrice 
                    : marketOdds.execution.noSellPrice;
            }
            const currentValue = totalShares * currentSellPrice;
            
            // Calculate unrealized P&L
            const unrealizedPnL = currentValue - totalAmount;
            const unrealizedPnLPercent = totalAmount > 0 ? (unrealizedPnL / totalAmount) * 100 : 0;
            
            // Calculate average entry price
            const avgEntryPrice = totalShares > 0 ? totalAmount / totalShares : 0;
            
            // Determine status based on aggregated bet states
            let status: OpenPositionStatus = 'LIVE';
            if (hasAnyExecuted && hasEnded) {
                status = 'PENDING_COLLECTION';
            } else if (hasAnyExecuted || hasAnyPending) {
                status = 'LIVE';
            }

            return {
                id: key, // Use market:outcome as the aggregate ID
                betId: firstBet.id, // Primary bet ID (most recent) for affiliate linking
                betIds: betIds, // All bet IDs in this aggregate
                betCount: marketBets.length, // Number of bets consolidated
                predictionId: firstBet.market_id,
                predictionText: marketDetails?.question || 'Unknown Market',
                category: marketDetails?.category || 'General',
                userChoice: firstBet.outcome as 'YES' | 'NO',
                betAmount: totalAmount,
                potentialPayout: totalPotentialPayout,
                totalShares: totalShares,
                avgEntryPrice: avgEntryPrice,
                currentValue: currentValue,
                unrealizedPnL: unrealizedPnL,
                unrealizedPnLPercent: unrealizedPnLPercent,
                settledAmount: hasEnded ? totalSettledAmount : undefined,
                endsAt: endsAt,
                status: status,
                matchId: firstBet.session_id || '',
                imageUrl: marketDetails?.imageUrl,
                aiHint: marketDetails?.aiHint || marketDetails?.category?.toLowerCase(),
                bonusApplied: hasBonusApplied,
            } as OpenPosition;
        })
    );
    
    const activePositions = positions.filter(p => p.status === 'LIVE' || p.status === 'ENDING_SOON');
    const pastPositions = positions.filter(p => p.status !== 'LIVE' && p.status !== 'ENDING_SOON');

    return { activePositions, pastPositions };
}


export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
        return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    try {
        const { activePositions, pastPositions } = await getPositions(userId);
        return NextResponse.json({ activePositions, pastPositions });
    } catch (error) {
        console.error(`Failed to get positions for user ${userId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch positions.' }, { status: 500 });
    }
}
