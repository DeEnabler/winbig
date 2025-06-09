
// src/app/api/bets/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { mockCurrentUser } from '@/lib/mockData'; // For a mock user ID

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId, // In a real app, this would come from authenticated session
      challengeMatchId, // The ID from the URL path of the challenge e.g. "challengeAsTest1"
      predictionId,
      choice, // 'YES' or 'NO'
      amount,
      referrerName, // Optional: who referred this challenge acceptance
      bonusApplied // Added to receive bonus status
    } = body;

    // --- Backend Logic Placeholder ---
    // In a real application, you would:
    // 1. Validate the input (e.g., ensure predictionId exists, user has funds, etc.)
    // 2. Get the authenticated userId securely (not from the request body for sensitive ops)
    // 3. Record the bet in your database (e.g., Firestore)
    //    - Associate with userId, predictionId, choice, amount, timestamp, bonusApplied
    //    - Handle P2P matching or liquidity pool interaction
    //    - Generate a unique bet ID
    // 4. Potentially update user's balance, XP, etc. (factor in bonus for potential display)
    // 5. If it's a P2P challenge, notify the original challenger.

    console.log('Received bet placement request:');
    console.log({ userId, challengeMatchId, predictionId, choice, amount, referrerName, bonusApplied });

    // For now, we just simulate a successful bet placement.
    const mockBetId = `bet_${Date.now()}`;
    const betDetails = {
      betId: mockBetId,
      userId: userId || mockCurrentUser.id, // Use provided or mock
      challengeMatchId,
      predictionId,
      choice,
      amount,
      status: 'PENDING', // Bets start as pending
      timestamp: new Date().toISOString(),
      bonusApplied: !!bonusApplied, // Ensure it's a boolean
    };

    // --- End Backend Logic Placeholder ---

    return NextResponse.json({
      success: true,
      message: 'Bet placed successfully (mock).',
      data: betDetails,
    }, { status: 200 });

  } catch (error) {
    console.error('Error placing bet:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to place bet.',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
