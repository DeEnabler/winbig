
import type { Prediction, User, Match, OpenPosition, OpenPositionStatus } from '@/types';

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

// mockLeaderboardData removed

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

export const mockOpenPositions: OpenPosition[] = [
  {
    id: 'pos_1',
    predictionId: mockPredictions[0].id,
    predictionText: mockPredictions[0].text,
    category: mockPredictions[0].category,
    userChoice: 'YES',
    betAmount: 10,
    potentialPayout: 19.0,
    currentValue: 15.0,
    endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), 
    status: 'LIVE',
    matchId: `match_trump_election_currentUser_${Date.now()}`,
    imageUrl: mockPredictions[0].imageUrl,
    aiHint: mockPredictions[0].aiHint,
    opponentUsername: mockOpponentUser.username,
    bonusApplied: false,
  },
  {
    id: 'pos_5_live_bonus',
    predictionId: mockPredictions[1].id, // Different prediction
    predictionText: "Will Ethereum break $5k by next month?",
    category: 'Crypto',
    userChoice: 'NO',
    betAmount: 50,
    potentialPayout: 114.0, // (50 * 1.9) * 1.2
    currentValue: 65.0,
    endsAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Ends in 1 day
    status: 'ENDING_SOON',
    matchId: `match_eth_5k_currentUser_${Date.now()}`,
    imageUrl: 'https://placehold.co/600x400.png',
    aiHint: 'ethereum crypto',
    bonusApplied: true,
  },
  {
    id: 'pos_2_won_collect',
    predictionId: mockPredictions[1].id,
    predictionText: mockPredictions[1].text,
    category: mockPredictions[1].category,
    userChoice: 'YES',
    betAmount: 25,
    potentialPayout: 57.0, 
    currentValue: 0, 
    settledAmount: 57.0,
    endsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: 'SETTLED_WON', // Ready to collect
    matchId: `match_btc_100k_currentUser_${Date.now()}`,
    imageUrl: mockPredictions[1].imageUrl,
    aiHint: mockPredictions[1].aiHint,
    opponentUsername: 'System Pool',
    bonusApplied: true,
  },
  {
    id: 'pos_6_collected',
    predictionId: mockPredictions[0].id, 
    predictionText: "Will the next SpaceX launch be successful?",
    category: 'Technology',
    userChoice: 'YES',
    betAmount: 20,
    potentialPayout: 38.0,
    currentValue: 0,
    settledAmount: 38.0,
    endsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Ended 3 days ago
    status: 'COLLECTED', // Already collected
    matchId: `match_spacex_currentUser_${Date.now()}`,
    imageUrl: 'https://placehold.co/600x400.png',
    aiHint: 'spacex launch',
    bonusApplied: false,
  },
  {
    id: 'pos_3_lost',
    predictionId: mockPredictions[2].id,
    predictionText: mockPredictions[2].text,
    category: mockPredictions[2].category,
    userChoice: 'NO',
    betAmount: 50,
    potentialPayout: 95.0,
    currentValue: 0,
    settledAmount: 0, 
    endsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'SETTLED_LOST',
    matchId: `match_lakers_currentUser_${Date.now()}`,
    imageUrl: mockPredictions[2].imageUrl,
    aiHint: mockPredictions[2].aiHint,
    bonusApplied: false,
  },
  {
    id: 'pos_4_sold',
    predictionId: mockPredictions[3].id,
    predictionText: mockPredictions[3].text,
    category: mockPredictions[3].category,
    userChoice: 'YES',
    betAmount: 5,
    potentialPayout: 9.5,
    currentValue: 0, 
    settledAmount: 7.0, // Sold for 7.0
    endsAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // Ended 4 days ago (after being sold)
    status: 'SOLD',
    matchId: `match_agi_currentUser_${Date.now()}`,
    imageUrl: mockPredictions[3].imageUrl,
    aiHint: mockPredictions[3].aiHint,
    opponentUsername: 'System Pool',
    bonusApplied: true,
  },
];
