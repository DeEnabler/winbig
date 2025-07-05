
// src/lib/matchData.ts
import type { Match, OgData } from '@/types';
import { mockCurrentUser, mockOpponentUser } from './mockData';
import { getMarketDetails } from './marketService'; 

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


// This function now fetches LIVE data from the new efficient Redis structure
export async function getMatchDisplayData(
  matchId: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<Match> {
  
  const predictionId = searchParams.predictionId as string || matchId;
  if (!predictionId) {
    throw new Error(`Prediction ID is required to display match.`);
  }

  const market = await getMarketDetails(predictionId);
  if (!market) {
    throw new Error(`Market with ID ${predictionId} not found.`);
  }

  const isConfirmingChallenge = searchParams.confirmChallenge === 'true';
  const userChoiceFromQuery = searchParams.choice as ('YES' | 'NO') | undefined;
  const originalReferrerFromQuery = searchParams.referrer as string | undefined;
  const bonusAppliedQuery = searchParams.bonusApplied === 'true';

  const betAmountNum = 5; 
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  const shareUrl = `${appUrl}/match/${matchId}?predictionId=${predictionId}${bonusAppliedQuery ? '&bonusApplied=true' : ''}`;

  const match: Match = {
    id: matchId,
    predictionId: market.id,
    predictionText: market.question,
    imageUrl: market.imageUrl, 
    aiHint: market.aiHint,     
    
    user1Username: mockCurrentUser.username,
    user1AvatarUrl: mockCurrentUser.avatarUrl,
    user2Username: mockOpponentUser.username,
    user2AvatarUrl: mockOpponentUser.avatarUrl,
    
    betAmount: betAmountNum,
    potentialWinnings: 0, 
    countdownEnds: market.endsAt?.getTime() || Date.now() + 3 * 24 * 60 * 60 * 1000, 
    shareUrl: shareUrl,

    // Pass simplified pricing and odds data
    yesPrice: market.yesBuyPrice,
    noPrice: market.noBuyPrice,
    yesImpliedProbability: market.yesImpliedProbability,
    noImpliedProbability: market.noImpliedProbability,

    userChoice: userChoiceFromQuery,
    bonusApplied: bonusAppliedQuery,
    isConfirmingChallenge: isConfirmingChallenge,
    originalReferrer: originalReferrerFromQuery,
  };

  return match;
}
