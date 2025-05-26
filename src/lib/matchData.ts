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
  // Optional bonus fields for future enhancement
  streak?: number;
  rank?: string; 
}

export async function getMatchDetailsForOg(
  matchId: string, // Currently unused with mock data but important for real data
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<OgData> {
  const predictionId = searchParams.predictionId as string || mockPredictions[0].id;
  const userChoice = (searchParams.choice as 'YES' | 'NO') || 'YES';
  const betAmountStr = searchParams.amount as string;

  const prediction = mockPredictions.find(p => p.id === predictionId) || mockPredictions[0];
  const betAmount = betAmountStr ? parseFloat(betAmountStr) : 50;

  // Simulate fetching user details (the one sharing)
  // In a real app, this would be the logged-in user or derived from matchData.user1
  const sharingUser: User = mockCurrentUser; // Assuming mockCurrentUser is the one sharing

  let displayName = sharingUser.username;
  if (sharingUser.username === 'You') { // Adjust for first-person phrasing in OG title
    displayName = 'I';
  }


  return {
    predictionText: prediction.text,
    userChoice: userChoice,
    userAvatar: sharingUser.avatarUrl || 'https://placehold.co/80x80.png?text=VA', // VA for ViralBet Anonymous
    username: displayName,
    outcome: 'PENDING', // Default for a new share. This could be enhanced if match is resolved.
    betAmount: betAmount,
    // Example bonus fields (can be populated if data is available)
    // streak: sharingUser.betStreak,
    // rank: "#5 Overall" 
  };
}

// Function to get full match data for the page display
export async function getMatchDisplayData(
  matchId: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<Match> {
  const predictionId = searchParams.predictionId as string || mockPredictions[0].id;
  const userChoiceQuery = searchParams.choice as ('YES' | 'NO') || 'YES';
  const betAmountStr = searchParams.amount as string;

  const prediction = mockPredictions.find(p => p.id === predictionId) || mockPredictions[0];
  const betAmount = betAmountStr ? parseFloat(betAmountStr) : 50;
  const potentialWinnings = betAmount * 1.9;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  
  const shareParams = new URLSearchParams();
  if (predictionId) shareParams.set('predictionId', predictionId);
  if (betAmountStr) shareParams.set('amount', betAmountStr);
  if (userChoiceQuery) shareParams.set('choice', userChoiceQuery);
  // Add other relevant params for reconstructing the view, like opponent if dynamic
  // if (mockCurrentUser.username) shareParams.set('ref', mockCurrentUser.username); // Optional referral

  const match: Match = {
    id: matchId,
    predictionText: prediction.text,
    user1Username: mockCurrentUser.username, // User who made the bet being viewed/shared
    user1AvatarUrl: mockCurrentUser.avatarUrl,
    user2Username: mockOpponentUser.username, // Opponent; could be dynamic or 'System Pool'
    user2AvatarUrl: mockOpponentUser.avatarUrl,
    betAmount: betAmount,
    potentialWinnings: potentialWinnings,
    countdownEnds: prediction.endsAt ? prediction.endsAt.getTime() : Date.now() + 3 * 60 * 60 * 1000, // Use prediction end or default
    shareUrl: `${appUrl}/match/${matchId}?${shareParams.toString()}`, // Canonical URL for this view
  };
  return match;
}
