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

    const positions = await Promise.all(bets.map(async (bet) => {
        const marketDetails = await getMarketDetails(bet.market_id);
        const marketOdds = await getMarketOdds(bet.market_id);

        let status: OpenPositionStatus = 'LIVE'; // Default status
        let currentValue = 0;
        
        const now = new Date();
        const endsAt = marketDetails?.endsAt ? new Date(marketDetails.endsAt) : new Date();
        const hasEnded = now > endsAt;

        if (bet.status === 'executed' && !hasEnded) {
            status = 'LIVE';
            if (marketOdds && bet.shares_received) {
                currentValue = bet.outcome === 'YES' 
                    ? bet.shares_received * marketOdds.execution.yesSellPrice 
                    : bet.shares_received * marketOdds.execution.noSellPrice;
            }
        } else if (bet.status === 'executed' && hasEnded) {
            // This logic is simplified. For now, if the market has ended, we'll mark it as pending collection.
            // A more robust solution would check a dedicated 'resolution' source.
            status = 'PENDING_COLLECTION';
        } else if (bet.status === 'pending') {
            status = 'LIVE'; // Or a 'PENDING' status if you want to distinguish it
        }
        // NOTE: 'SOLD', 'COLLECTED' etc. would need to be set based on other logic, perhaps another column in the DB.
        // This is a simplified mapping.

        return {
            id: String(bet.id),
            betId: bet.id, // Include betId for affiliate linking
            predictionId: bet.market_id,
            predictionText: marketDetails?.question || 'Unknown Market',
            category: marketDetails?.category || 'General',
            userChoice: bet.outcome,
            betAmount: Number(bet.amount),
            potentialPayout: Number(bet.potential_payout) || 0,
            currentValue: currentValue,
            settledAmount: bet.status === 'executed' && hasEnded ? Number(bet.potential_payout) : undefined, // Simplified
            endsAt: endsAt,
            status: status,
            matchId: bet.session_id || '',
            imageUrl: marketDetails?.imageUrl,
        } as OpenPosition;
    }));
    
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
