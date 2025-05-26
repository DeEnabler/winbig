
// src/lib/matchData.ts
import type { Match, User } from '@/types';
import { mockPredictions, mockCurrentUser, mockOpponentUser } from './mockData';

export interface OgData {
  predictionText: string;
  userChoice: 'YES' | 'NO';
  userAvatar?: string;
  username: string;
  outcome: 'PENDING' | 'WON' | 'LOST';
  betAmount: number;
  betSize?: string;
  streak?: string;
  rank?: string;
  rankCategory?: string;
}

export async function getMatchDetailsForOg(
  matchId: string, // This is the original challengeMatchId or a generated matchId
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<OgData> {
  // predictionId is crucial for identifying the prediction content
  const predictionIdFromSearch = searchParams.predictionId as string;
  if (!predictionIdFromSearch) {
    // Fallback or error if predictionId is missing, critical for OG
    console.error("OG Image: predictionId missing from searchParams for matchId:", matchId);
    // Return default/error OG data
    return {
      predictionText: "A Viral Prediction",
      userChoice: 'YES',
      username: 'ViralBettor',
      outcome: 'PENDING',
      betAmount: 0,
    };
  }
  const prediction = mockPredictions.find(p => p.id === predictionIdFromSearch) || mockPredictions[0];

  const userChoice = (searchParams.choice as 'YES' | 'NO') || 'YES';
  const betAmountStr = searchParams.amount as string; // This might be from a placed bet or a default for challenges
  
  const betSize = searchParams.betSize as string | undefined;
  const streak = searchParams.streak as string | undefined;
  const rank = searchParams.rank as string | undefined;
  const rankCategory = searchParams.rankCategory as string | undefined;

  const betAmountNum = betAmountStr ? parseFloat(betAmountStr) : 5; // Default to 5 if not specified (e.g. for challenge confirmation)

  const sharingUser: User = mockCurrentUser; 
  let displayName = sharingUser.username === 'You' ? 'I' : sharingUser.username;

  return {
    predictionText: prediction.text,
    userChoice: userChoice,
    userAvatar: sharingUser.avatarUrl || 'https://placehold.co/80x80.png?text=VB',
    username: displayName,
    outcome: (searchParams.outcome as 'PENDING' | 'WON' | 'LOST') || 'PENDING',
    betAmount: betAmountNum,
    betSize: betSize ?? `${betAmountNum}`,
    streak: streak,
    rank: rank,
    rankCategory: rankCategory || (prediction.category),
  };
}

export async function getMatchDisplayData(
  matchId: string, // This is the originalChallengeMatchId or a generated matchId
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<Match> {
  const predictionId = searchParams.predictionId as string;
  if (!predictionId) {
    throw new Error(`Prediction ID is required to display match ${matchId}`);
  }
  const prediction = mockPredictions.find(p => p.id === predictionId);
  if (!prediction) {
    throw new Error(`Prediction with ID ${predictionId} not found for match ${matchId}`);
  }

  const isConfirmingChallenge = searchParams.confirmChallenge === 'true';
  const userChoiceFromQuery = searchParams.choice as ('YES' | 'NO') | undefined;
  const originalReferrerFromQuery = searchParams.referrer as string | undefined;

  // Bet amount: from query if explicitly set (e.g. after feed bet), or default for challenge confirmation
  const betAmountStr = searchParams.amount as string;
  const betAmountNum = betAmountStr ? parseFloat(betAmountStr) : (isConfirmingChallenge ? 5 : 50); // Default 5 for challenge, 50 for other views if unspecified

  const potentialWinnings = betAmountNum * 1.9;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  
  const shareParams = new URLSearchParams();
  shareParams.set('predictionId', predictionId);
  if (userChoiceFromQuery) shareParams.set('choice', userChoiceFromQuery);
  // OG related params might be added dynamically based on confirmed bet state
  if (searchParams.betSize) shareParams.set('betSize', searchParams.betSize as string);
  else shareParams.set('betSize', `${betAmountNum}`); // Default betSize for OG from current amount
  if (searchParams.streak) shareParams.set('streak', searchParams.streak as string);
  if (searchParams.rank) shareParams.set('rank', searchParams.rank as string);
  if (searchParams.rankCategory) shareParams.set('rankCategory', searchParams.rankCategory as string);
  else shareParams.set('rankCategory', prediction.category);
  if (searchParams.outcome) shareParams.set('outcome', searchParams.outcome as string);
  

  // Determine userBet status if the bet is already placed (e.g., from feed)
  let userBetData;
  if (searchParams.betPlaced === 'true' && userChoiceFromQuery && betAmountStr) {
    userBetData = {
      side: userChoiceFromQuery,
      amount: parseFloat(betAmountStr),
      status: (searchParams.outcome as 'PENDING' | 'WON' | 'LOST') || 'PENDING',
    };
  }

  const match: Match = {
    id: matchId,
    predictionId: prediction.id,
    predictionText: prediction.text,
    user1Username: mockCurrentUser.username,
    user1AvatarUrl: mockCurrentUser.avatarUrl,
    user2Username: mockOpponentUser.username, // This would be dynamic based on actual opponent
    user2AvatarUrl: mockOpponentUser.avatarUrl,
    betAmount: betAmountNum, // Current bet amount being considered or placed
    potentialWinnings: potentialWinnings,
    countdownEnds: prediction.endsAt ? prediction.endsAt.getTime() : Date.now() + 3 * 60 * 60 * 1000,
    shareUrl: `${appUrl}/match/${matchId}?${shareParams.toString()}`, // Simplified share URL for now
    
    userChoice: userChoiceFromQuery, // Choice made when accepting challenge or from placed bet
    outcome: (searchParams.outcome as 'PENDING' | 'WON' | 'LOST') || 'PENDING',
    streak: searchParams.streak as string | undefined,
    betSize: searchParams.betSize as string | undefined ?? `${betAmountNum}`,
    rank: searchParams.rank as string | undefined,
    rankCategory: searchParams.rankCategory as string | undefined ?? prediction.category,
    
    opponent: mockOpponentUser, // Mock opponent for now
    confidence: { yesPercentage: prediction.category === 'Crypto' ? 70 : 55 }, // Mock confidence

    isConfirmingChallenge: isConfirmingChallenge,
    userBet: userBetData, // Set if bet is already placed (e.g. from feed)
    originalReferrer: isConfirmingChallenge ? originalReferrerFromQuery : undefined,
  };
  return match;
}
