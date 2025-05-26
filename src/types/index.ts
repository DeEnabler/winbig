export interface Prediction {
  id: string;
  text: string; // Corresponds to `question` in PredictionCardProps
  category: string;
  endsAt?: Date;
  imageUrl?: string; // Corresponds to `thumbnailUrl` in PredictionCardProps
  aiHint?: string; // For placeholder image search
  // Fields derived for display or from API for PredictionCard
  payoutTeaser?: string;
  streakCount?: number;
  facePileCount?: number;
  timeLeft?: string;
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
  userChoice?: 'YES' | 'NO'; // User 1's choice
  outcome?: 'PENDING' | 'WON' | 'LOST';
  streak?: string; // e.g., "3"
  betSize?: string; // e.g., "5" (for 5 SOL) - can differ from betAmount if different currency/unit displayed
  rank?: string; // e.g., "2"
  rankCategory?: string; // e.g., "Politics"

  // For MatchViewClient specific props
  userBet?: { side: 'YES'|'NO'; amount: number; status: 'PENDING'|'WON'|'LOST' };
  opponent?: { username: string; winRate?: number, avatarUrl?: string } | 'system'; // winRate made optional
  confidence?: { yesPercentage: number }; // For confidence bar
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

// Props for PredictionCard from blueprint
export interface PredictionCardProps {
  id: string;
  question: string;
  thumbnailUrl: string;
  payoutTeaser: string;
  streakCount?: number;
  facePileCount?: number;
  category?: string;
  timeLeft?: string;
  onBet: (bet: BetPlacement) => void; // Re-added onBet as it's used by page.tsx
}

// Props for ChallengeInvite from blueprint
export interface ChallengeInviteProps {
  matchId: string;
  referrerName: string;
  predictionQuestion: string;
  // onAccept: (choice: 'YES' | 'NO') => void; // Replaced with direct navigation/API call logic
  // onDecline: () => void;
}

// Props for MatchViewClient from blueprint (modified based on Match type)
export interface MatchViewProps {
  match: Match; // Consolidating props into a single match object
}

// Props for ShareDialog from blueprint
export interface ShareDialogProps {
  matchId: string;
  ogImageUrl: string;
  tweetTemplates?: string[]; // Made optional
  rewardIncentive?: string; // Made optional
  currentShareMessage: string;
  onShareMessageChange: (message: string) => void;
  shareUrl: string;
}

// EntryContext type
export interface EntryContextType {
  source?: string;
  challenge?: boolean;
  referrer?: string;
  marketId?: string; // from market=12345
  appendEntryParams: (url: string) => string;
}
