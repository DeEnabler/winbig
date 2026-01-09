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
            // 💰 Use gross_amount (what user paid) for display, actual shares for P&L
            let totalGrossAmount = 0; // What user actually paid
            let totalNetToMarket = 0; // What went to Polymarket
            let totalPlatformFee = 0; // Platform fees collected
            let totalPotentialPayout = 0;
            let totalShares = 0;
            let totalSettledAmount = 0;
            const betIds: number[] = [];
            let hasAnyExecuted = false;
            let hasAnyPending = false;
            let hasBonusApplied = false;
            
            for (const bet of marketBets) {
                // Use gross_amount if available (after migration), otherwise fall back to amount
                const grossAmount = Number(bet.gross_amount) || Number(bet.amount);
                const netToMarket = Number(bet.net_to_market) || grossAmount * 0.98; // Estimate 2% fee if not set
                const platformFee = Number(bet.platform_fee) || grossAmount * 0.02;
                
                totalGrossAmount += grossAmount;
                totalNetToMarket += netToMarket;
                totalPlatformFee += platformFee;
                totalPotentialPayout += Number(bet.potential_payout) || 0;
                betIds.push(bet.id);
                
                // Calculate shares for this bet - use actual on-chain data when available
                // Priority: 1) actual_shares (from economics), 2) shares_received (from hedger), 
                //           3) expected_shares, 4) estimate from execution_price, 5) estimate from net_to_market
                let betShares = 0;
                if (bet.actual_shares && Number(bet.actual_shares) > 0) {
                    // Best: Actual on-chain shares
                    betShares = Number(bet.actual_shares);
                } else if (bet.shares_received && Number(bet.shares_received) > 0) {
                    // From hedger confirmation
                    betShares = Number(bet.shares_received);
                } else if (bet.expected_shares && Number(bet.expected_shares) > 0) {
                    // From execution preview at bet time
                    betShares = Number(bet.expected_shares);
                } else if (bet.execution_price && Number(bet.execution_price) > 0) {
                    // Estimate: net_to_market / execution_price
                    betShares = netToMarket / Number(bet.execution_price);
                } else if (bet.vwap && Number(bet.vwap) > 0) {
                    // Estimate from VWAP
                    betShares = netToMarket / Number(bet.vwap);
                } else if (bet.odds_shown_to_user && Number(bet.odds_shown_to_user) > 0) {
                    // Last resort: estimate from odds shown (less accurate due to markup)
                    betShares = netToMarket / Number(bet.odds_shown_to_user);
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
            // 💰 Use RAW Polymarket prices for accurate valuation (not marked-up prices)
            let currentSellPrice = 0;
            if (marketOdds) {
                // Use raw execution sell price (what we'd get if we sold on Polymarket)
                currentSellPrice = firstBet.outcome === 'YES' 
                    ? marketOdds.execution.yesSellPrice 
                    : marketOdds.execution.noSellPrice;
            }
            const currentValue = totalShares * currentSellPrice;
            
            // 💰 Calculate unrealized P&L based on what user PAID (gross amount)
            // This shows accurate profit/loss from user's perspective
            const unrealizedPnL = currentValue - totalGrossAmount;
            const unrealizedPnLPercent = totalGrossAmount > 0 ? (unrealizedPnL / totalGrossAmount) * 100 : 0;
            
            // Calculate average entry price based on net amount to market / shares
            // This represents the true cost basis per share
            const avgEntryPrice = totalShares > 0 ? totalNetToMarket / totalShares : 0;
            
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
                // 💰 Show gross amount (what user paid) - this is what they see
                betAmount: totalGrossAmount,
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
