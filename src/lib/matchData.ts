
// src/lib/matchData.ts
import type { Match, User, OgData } from '@/types';
import { mockPredictions, mockCurrentUser, mockOpponentUser } from './mockData';

const STANDARD_PAYOUT_MULTIPLIER = 1.9;
const BONUS_PAYOUT_MULTIPLIER_INCREASE = 0.2; // 20% bonus

export async function getMatchDetailsForOg(
  matchId: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<OgData> {
  const predictionIdFromSearch = searchParams.predictionId as string;
  if (!predictionIdFromSearch) {
    console.error("OG Image: predictionId missing from searchParams for matchId:", matchId);
    return {
      predictionText: "A Viral Prediction",
      userChoice: 'YES',
      username: 'ViralBettor',
      outcome: 'PENDING',
      betAmount: 0,
      bonusApplied: false,
    };
  }
  const prediction = mockPredictions.find(p => p.id === predictionIdFromSearch) || mockPredictions[0];

  const userChoice = (searchParams.choice as 'YES' | 'NO') || 'YES';
  const betAmountStr = searchParams.amount as string;
  const betSize = searchParams.betSize as string | undefined;
  const streak = searchParams.streak as string | undefined;
  const rank = searchParams.rank as string | undefined;
  const rankCategory = searchParams.rankCategory as string | undefined;
  const bonusApplied = searchParams.bonusApplied === 'true';

  const betAmountNum = betAmountStr ? parseFloat(betAmountStr) : 5;

  const sharingUser: User = mockCurrentUser;
  let displayName = sharingUser.username === 'You' ? 'I' : sharingUser.username;

  // For OG, betSize might just reflect the base bet amount or could be adjusted if bonus is always shown
  let effectiveBetSize = betSize ?? `${betAmountNum}`;
  // If bonus applied, maybe we adjust a teaser or rely on OG image rendering the bonus
  // For now, OG data will just carry the bonusApplied flag.

  return {
    predictionText: prediction.text,
    userChoice: userChoice,
    userAvatar: sharingUser.avatarUrl || 'https://placehold.co/80x80.png?text=VB',
    username: displayName,
    outcome: (searchParams.outcome as 'PENDING' | 'WON' | 'LOST') || 'PENDING',
    betAmount: betAmountNum,
    betSize: effectiveBetSize,
    streak: streak,
    rank: rank,
    rankCategory: rankCategory || prediction.category,
    bonusApplied: bonusApplied,
  };
}

export async function getMatchDisplayData(
  matchId: string,
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
  const bonusAppliedQuery = searchParams.bonusApplied === 'true';

  const betAmountStr = searchParams.amount as string;
  const betAmountNum = betAmountStr ? parseFloat(betAmountStr) : (isConfirmingChallenge ? 5 : 50);

  let currentPayoutMultiplier = STANDARD_PAYOUT_MULTIPLIER;
  if (bonusAppliedQuery) {
    currentPayoutMultiplier = STANDARD_PAYOUT_MULTIPLIER * (1 + BONUS_PAYOUT_MULTIPLIER_INCREASE);
  }
  const potentialWinnings = parseFloat((betAmountNum * currentPayoutMultiplier).toFixed(2));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

  const shareParams = new URLSearchParams();
  shareParams.set('predictionId', predictionId);
  if (userChoiceFromQuery) shareParams.set('choice', userChoiceFromQuery);
  if (searchParams.betSize) shareParams.set('betSize', searchParams.betSize as string);
  else shareParams.set('betSize', `${betAmountNum}`);
  if (searchParams.streak) shareParams.set('streak', searchParams.streak as string);
  if (searchParams.rank) shareParams.set('rank', searchParams.rank as string);
  if (searchParams.rankCategory) shareParams.set('rankCategory', searchParams.rankCategory as string);
  else shareParams.set('rankCategory', prediction.category);
  if (searchParams.outcome) shareParams.set('outcome', searchParams.outcome as string);
  if (bonusAppliedQuery) shareParams.set('bonusApplied', 'true');


  let userBetData;
  if (searchParams.betPlaced === 'true' && userChoiceFromQuery && betAmountStr) {
    userBetData = {
      side: userChoiceFromQuery,
      amount: parseFloat(betAmountStr),
      status: (searchParams.outcome as 'PENDING' | 'WON' | 'LOST') || 'PENDING',
      bonusApplied: bonusAppliedQuery,
    };
  }

  const match: Match = {
    id: matchId,
    predictionId: prediction.id,
    predictionText: prediction.text,
    user1Username: mockCurrentUser.username,
    user1AvatarUrl: mockCurrentUser.avatarUrl,
    user2Username: mockOpponentUser.username,
    user2AvatarUrl: mockOpponentUser.avatarUrl,
    betAmount: betAmountNum,
    potentialWinnings: potentialWinnings, // Now reflects bonus if applicable
    countdownEnds: prediction.endsAt ? prediction.endsAt.getTime() : Date.now() + 3 * 60 * 60 * 1000,
    shareUrl: `${appUrl}/match/${matchId}?${shareParams.toString()}`,

    userChoice: userChoiceFromQuery,
    outcome: (searchParams.outcome as 'PENDING' | 'WON' | 'LOST') || 'PENDING',
    streak: searchParams.streak as string | undefined,
    betSize: searchParams.betSize as string | undefined ?? `${betAmountNum}`,
    rank: searchParams.rank as string | undefined,
    rankCategory: searchParams.rankCategory as string | undefined ?? prediction.category,
    bonusApplied: bonusAppliedQuery, // Store bonus status

    opponent: mockOpponentUser,
    confidence: { yesPercentage: prediction.category === 'Crypto' ? 70 : 55 },

    isConfirmingChallenge: isConfirmingChallenge,
    userBet: userBetData,
    originalReferrer: isConfirmingChallenge ? originalReferrerFromQuery : undefined,
  };
  return match;
}
