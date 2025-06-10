
import type { Prediction, User, LeaderboardEntry, Match } from '@/types';

export const mockPredictions: Prediction[] = [
  {
    id: '1',
    text: 'Will Donald Trump win the 2024 US Presidential election?',
    category: 'Politics',
    endsAt: new Date('2024-11-05T23:59:59Z'),
    imageUrl: 'https://placehold.co/600x400.png',
    aiHint: 'politics election'
  },
  {
    id: '2',
    text: 'Will Bitcoin (BTC) surpass $100,000 in value by the end of 2024?',
    category: 'Crypto',
    endsAt: new Date('2024-12-31T23:59:59Z'),
    imageUrl: 'https://placehold.co/600x400.png',
    aiHint: 'crypto bitcoin'
  },
  {
    id: '3',
    text: 'Will the Los Angeles Lakers win the next NBA Championship?',
    category: 'Sports',
    endsAt: new Date('2025-06-30T23:59:59Z'),
    imageUrl: 'https://placehold.co/600x400.png',
    aiHint: 'basketball sport'
  },
  {
    id: '4',
    text: 'Will AI achieve AGI (Artificial General Intelligence) by 2030?',
    category: 'Technology',
    endsAt: new Date('2030-12-31T23:59:59Z'),
    imageUrl: 'https://placehold.co/600x400.png',
    aiHint: 'technology ai'
  },
];

export const mockCurrentUser: User = {
  id: 'currentUser',
  username: 'You',
  avatarUrl: 'https://placehold.co/40x40.png',
  xp: 1250,
  betStreak: 5,
};

export const mockOpponentUser: User = {
  id: 'opponent1',
  username: 'CryptoKing88',
  avatarUrl: 'https://placehold.co/40x40.png',
  xp: 5000,
  betStreak: 12, // This is 'Win Streak'
  totalWinnings: "124.5 SOL",
  predictionRank: "Top 2%",
};

export const mockLeaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    user: { id: 'user1', username: 'BetGod', avatarUrl: 'https://placehold.co/40x40.png', xp: 10000, betStreak: 25, totalWinnings: "$50,000", predictionRank: "Top 1%" },
    totalWinnings: 50000, // numerical for sorting
    longestStreak: 25,
  },
  {
    rank: 2,
    user: mockOpponentUser,
    totalWinnings: 35000, // numerical for sorting
    longestStreak: 12,
  },
  {
    rank: 3,
    user: { id: 'user3', username: 'LuckyLucy', avatarUrl: 'https://placehold.co/40x40.png', xp: 4500, betStreak: 8, totalWinnings: "$20,000", predictionRank: "Top 10%" },
    totalWinnings: 20000, // numerical for sorting
    longestStreak: 10,
  },
  {
    rank: 4,
    user: { id: 'user4', username: 'PredictionPro', avatarUrl: 'https://placehold.co/40x40.png', xp: 3000, betStreak: 3, totalWinnings: "$15,000", predictionRank: "Top 15%" },
    totalWinnings: 15000, // numerical for sorting
    longestStreak: 7,
  },
  {
    rank: 5,
    user: mockCurrentUser, // Current user might not be on top
    totalWinnings: 5000, // numerical for sorting
    longestStreak: 5,
  },
];

export const getMockMatch = (predictionId: string): Match => {
  const prediction = mockPredictions.find(p => p.id === predictionId) || mockPredictions[0];
  return {
    id: `match-${predictionId}-${Date.now()}`,
    predictionText: prediction.text,
    predictionId: prediction.id,
    user1Username: mockCurrentUser.username,
    user1AvatarUrl: mockCurrentUser.avatarUrl,
    user2Username: mockOpponentUser.username,
    user2AvatarUrl: mockOpponentUser.avatarUrl,
    betAmount: 100, // Example bet amount
    potentialWinnings: 190, // Example potential winnings (includes stake back)
    countdownEnds: Date.now() + (prediction.endsAt ? (prediction.endsAt.getTime() - Date.now()) : 3 * 60 * 60 * 1000), // 3 hours from now or prediction end
    shareUrl: typeof window !== 'undefined' ? `${window.location.origin}/match/match-${predictionId}-${Date.now()}` : `/match/match-${predictionId}-${Date.now()}`,
  };
};

