// src/lib/matchData.ts
import type { Match, User } from '@/types';
import { mockPredictions, mockCurrentUser, mockOpponentUser } from './mockData';

export interface OgData {
  predictionText: string;
  userChoice: 'YES' | 'NO';
  userAvatar?: string;
  username: string;
  outcome: 'PENDING' | 'WON' | 'LOST';
  betAmount: number; // This is the original bet amount, used for display if betSize is not present
  betSize?: string; // Specific for "X SOL Bet" badge
  streak?: string;
  rank?: string;
  rankCategory?: string;
}

export async function getMatchDetailsForOg(
  matchId: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<OgData> {
  const predictionId = searchParams.predictionId as string || mockPredictions[0].id;
  const userChoice = (searchParams.choice as 'YES' | 'NO') || 'YES';
  const betAmountStr = searchParams.amount as string; // Original bet amount
  
  // New dynamic badge params
  const betSize = searchParams.betSize as string | undefined;
  const streak = searchParams.streak as string | undefined;
  const rank = searchParams.rank as string | undefined;
  const rankCategory = searchParams.rankCategory as string | undefined;


  const prediction = mockPredictions.find(p => p.id === predictionId) || mockPredictions[0];
  const betAmountNum = betAmountStr ? parseFloat(betAmountStr) : 50;

  const sharingUser: User = mockCurrentUser; 
  let displayName = sharingUser.username;
  if (sharingUser.username === 'You') {
    displayName = 'I';
  }

  return {
    predictionText: prediction.text,
    userChoice: userChoice,
    userAvatar: sharingUser.avatarUrl || 'https://placehold.co/80x80.png?text=VA',
    username: displayName,
    outcome: (searchParams.outcome as 'PENDING' | 'WON' | 'LOST') || 'PENDING',
    betAmount: betAmountNum,
    betSize: betSize ?? (betAmountStr ? `${betAmountNum}` : undefined), // Use betAmount if betSize not explicitly given
    streak: streak,
    rank: rank,
    rankCategory: rankCategory || (prediction.category), // Default to prediction category for rank
  };
}

export async function getMatchDisplayData(
  matchId: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<Match> {
  const predictionId = searchParams.predictionId as string || mockPredictions[0].id;
  const userChoiceQuery = searchParams.choice as ('YES' | 'NO') || 'YES';
  const betAmountStr = searchParams.amount as string;

  const prediction = mockPredictions.find(p => p.id === predictionId) || mockPredictions[0];
  const betAmount = betAmountStr ? parseFloat(betAmountStr) : 50;
  const potentialWinnings = betAmount * 1.9; // Example calculation

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  
  const shareParams = new URLSearchParams();
  if (predictionId) shareParams.set('predictionId', predictionId);
  if (betAmountStr) shareParams.set('amount', betAmountStr); // The core bet amount
  if (userChoiceQuery) shareParams.set('choice', userChoiceQuery);
  
  // Pass through new params for OG image if they exist in original URL
  if (searchParams.betSize) shareParams.set('betSize', searchParams.betSize as string);
  if (searchParams.streak) shareParams.set('streak', searchParams.streak as string);
  if (searchParams.rank) shareParams.set('rank', searchParams.rank as string);
  if (searchParams.rankCategory) shareParams.set('rankCategory', searchParams.rankCategory as string);
  if (searchParams.outcome) shareParams.set('outcome', searchParams.outcome as string);


  const match: Match = {
    id: matchId,
    predictionText: prediction.text,
    user1Username: mockCurrentUser.username,
    user1AvatarUrl: mockCurrentUser.avatarUrl,
    user2Username: mockOpponentUser.username,
    user2AvatarUrl: mockOpponentUser.avatarUrl,
    betAmount: betAmount,
    potentialWinnings: potentialWinnings,
    countdownEnds: prediction.endsAt ? prediction.endsAt.getTime() : Date.now() + 3 * 60 * 60 * 1000,
    shareUrl: `${appUrl}/match/${matchId}?${shareParams.toString()}`,
    // For client-side preview, include these if available
    streak: searchParams.streak as string | undefined,
    betSize: searchParams.betSize as string | undefined ?? `${betAmount}`,
    rank: searchParams.rank as string | undefined,
    rankCategory: searchParams.rankCategory as string | undefined ?? prediction.category,
    outcome: searchParams.outcome as 'PENDING' | 'WON' | 'LOST' | undefined ?? 'PENDING',
    userChoice: userChoiceQuery,
  };
  return match;
}
