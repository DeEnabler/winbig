
// src/lib/matchData.ts
import type { Match, User, OgData, LiveMarket } from '@/types';
import { mockCurrentUser, mockOpponentUser } from './mockData';
import { getMarketDetails } from './marketService'; // CRITICAL CHANGE: Import live data fetcher

const STANDARD_PAYOUT_MULTIPLIER = 1.9;
const BONUS_PAYOUT_MULTIPLIER_INCREASE = 0.2; // 20% bonus

// Fetches live market data for OG image generation
export async function getMatchDetailsForOg(
  matchId: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<OgData> {
  const predictionIdFromSearch = searchParams.predictionId as string;
  const market = await getMarketDetails(predictionIdFromSearch);

  if (!market) {
    console.error(`OG Image: Market with ID ${predictionIdFromSearch} not found.`);
    // Return a generic OG object so the page doesn't crash
    return {
      predictionText: "A Viral Prediction",
      titleOverride: "Prediction Details",
      descriptionOverride: "View the prediction on ViralBet."
    };
  }

  const userChoice = (searchParams.choice as 'YES' | 'NO');
  const betAmountNum = searchParams.amount ? parseFloat(searchParams.amount as string) : 5;
  
  return {
    predictionText: market.question,
    userChoice: userChoice,
    username: 'You', // Placeholder, can be customized
    outcome: (searchParams.outcome as OgData['outcome']) || 'CHALLENGE',
    betAmount: betAmountNum,
    rankCategory: market.category,
    bonusApplied: searchParams.bonusApplied === 'true',
    ogType: 'match_challenge',
  };
}


// This function now fetches LIVE data instead of using mocks
export async function getMatchDisplayData(
  matchId: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<Match> {
  
  const predictionId = searchParams.predictionId as string || matchId;
  if (!predictionId) {
    throw new Error(`Prediction ID is required to display match.`);
  }

  // CRITICAL CHANGE: Fetch live market data from Redis
  const market = await getMarketDetails(predictionId);
  if (!market) {
    throw new Error(`Market with ID ${predictionId} not found.`);
  }

  const isConfirmingChallenge = searchParams.confirmChallenge === 'true';
  const userChoiceFromQuery = searchParams.choice as ('YES' | 'NO') | undefined;
  const originalReferrerFromQuery = searchParams.referrer as string | undefined;
  const bonusAppliedQuery = searchParams.bonusApplied === 'true';

  // Default bet amount can be set here
  const betAmountNum = 5; 

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  const shareUrl = `${appUrl}/match/${matchId}?predictionId=${predictionId}${bonusAppliedQuery ? '&bonusApplied=true' : ''}`;

  const match: Match = {
    id: matchId,
    predictionId: market.id,
    predictionText: market.question,
    imageUrl: market.imageUrl, // Pass live data
    aiHint: market.aiHint,     // Pass live data
    
    // Default to mock users for display purposes
    user1Username: mockCurrentUser.username,
    user1AvatarUrl: mockCurrentUser.avatarUrl,
    user2Username: mockOpponentUser.username,
    user2AvatarUrl: mockOpponentUser.avatarUrl,
    
    betAmount: betAmountNum,
    // The client will calculate potential winnings based on slider value
    potentialWinnings: 0, 
    // Use a default countdown if not available from market data
    countdownEnds: Date.now() + 3 * 24 * 60 * 60 * 1000, // Default to 3 days
    shareUrl: shareUrl,

    // Pass through relevant query params
    userChoice: userChoiceFromQuery,
    bonusApplied: bonusAppliedQuery,
    isConfirmingChallenge: isConfirmingChallenge,
    originalReferrer: originalReferrerFromQuery,

    // Pass through live pricing and odds data to the client
    liveMarketData: market,
    // Pass asset IDs to client for execution analysis
    yesAssetId: market.pricing.yes.assetId,
    noAssetId: market.pricing.no.assetId,
  };

  return match;
}
