
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
  // For challenge acceptance, these might be relevant
  challengeMatchId?: string;
  referrerName?: string;
  bonusApplied?: boolean; // Added for bonus tracking
}

export interface Match {
  id: string; // This is the original challengeMatchId or a generated matchId
  predictionText: string;
  predictionId: string; // Made mandatory
  user1Username: string;
  user1AvatarUrl?: string;
  user2Username: string; // Could be 'System Pool'
  user2AvatarUrl?: string;
  betAmount: number; // The core bet amount, can be default for challenges
  potentialWinnings: number;
  countdownEnds: number; // Timestamp for when countdown ends
  shareUrl?: string; // URL to share this match

  // Fields for OG image and client display, often derived from searchParams or user context
  userChoice?: 'YES' | 'NO'; // User 1's choice OR the choice made when accepting a challenge pre-confirmation
  outcome?: 'PENDING' | 'WON' | 'LOST';
  streak?: string; // e.g., "3"
  betSize?: string; // e.g., "5" (for 5 SOL) - can differ from betAmount if different currency/unit displayed
  rank?: string; // e.g., "2"
  rankCategory?: string; // e.g., "Politics"
  bonusApplied?: boolean; // Added for bonus tracking

  // For MatchViewClient specific props
  userBet?: { side: 'YES'|'NO'; amount: number; status: 'PENDING'|'WON'|'LOST'; bonusApplied?: boolean };
  opponent?: { username: string; winRate?: number, avatarUrl?: string } | 'system';
  confidence?: { yesPercentage: number };

  // Flags for challenge confirmation flow
  isConfirmingChallenge?: boolean;
  originalReferrer?: string; // To pass along who initiated the challenge
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

// Props for PredictionCard
export interface PredictionCardProps {
  id: string;
  question: string;
  thumbnailUrl: string;
  payoutTeaser: string;
  streakCount?: number;
  facePileCount?: number;
  category?: string;
  timeLeft?: string;
  endsAt?: Date;
  aiHint?: string;
  onBet: (bet: Omit<BetPlacement, 'challengeMatchId' | 'referrerName' | 'bonusApplied'>) => Promise<void>;
}

// Props for ChallengeInvite
export interface ChallengeInviteProps {
  matchId: string;
  referrerName: string;
  predictionQuestion: string;
  predictionId: string;
  referrerOriginalChoice: 'YES' | 'NO';
}

// Props for MatchViewClient
export interface MatchViewProps {
  match: Match;
}

// Props for ShareDialog
export interface ShareDialogProps {
  matchId: string;
  ogImageUrl: string;
  tweetTemplates?: string[];
  rewardIncentive?: string;
  currentShareMessage: string;
  onShareMessageChange: (message: string) => void;
  shareUrl: string;
}

// EntryContext type
export interface EntryContextType {
  source?: string;
  challenge?: boolean;
  referrer?: string;
  marketId?: string;
  predictionId?: string;
  appendEntryParams: (url: string) => string;
}

// For getMatchDetailsForOg
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
  bonusApplied?: boolean; // Added for bonus tracking in OG
}
