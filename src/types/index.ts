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
  predictionId?: string; // Optional, can be useful for image lookup
  user1Username: string;
  user1AvatarUrl?: string;
  user2Username: string; // Could be 'System Pool'
  user2AvatarUrl?: string;
  betAmount: number; // The core bet amount
  potentialWinnings: number;
  countdownEnds: number; // Timestamp for when countdown ends
  shareUrl?: string; // URL to share this match

  // Fields for OG image and client display, often derived from searchParams or user context
  userChoice?: 'YES' | 'NO';
  outcome?: 'PENDING' | 'WON' | 'LOST';
  streak?: string; // e.g., "3"
  betSize?: string; // e.g., "5" (for 5 SOL) - can differ from betAmount if different currency/unit displayed
  rank?: string; // e.g., "2"
  rankCategory?: string; // e.g., "Politics"
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
