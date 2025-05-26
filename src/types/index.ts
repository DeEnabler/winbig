export interface Prediction {
  id: string;
  text: string;
  category: string;
  endsAt?: Date;
  imageUrl?: string;
  aiHint?: string; // For placeholder image search
}

export interface User {
  id:string;
  username: string;
  avatarUrl?: string;
  xp: number;
  betStreak: number;
}

export interface BetPlacement {
  predictionId: string;
  choice: 'YES' | 'NO';
  amount: number;
}

export interface Match {
  id: string;
  predictionText: string;
  user1Username: string;
  user1AvatarUrl?: string;
  user2Username: string; // Could be 'System Pool'
  user2AvatarUrl?: string;
  betAmount: number;
  potentialWinnings: number;
  countdownEnds: number; // Timestamp for when countdown ends
  shareUrl?: string; // URL to share this match
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  totalWinnings: number;
  longestStreak: number;
}

// For AI Share Message
export type ShareMessageDetails = {
  prediction: string;
  betAmount: number;
  potentialWinnings: number;
  opponentUsername: string;
};
