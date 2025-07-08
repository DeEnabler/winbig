// src/types/index.ts


// This is the new, flattened structure for a live market, derived from the single Redis hash.
export interface LiveMarket {
  id: string; // The condition_id
  question: string;
  category: string;
  imageUrl: string;
  aiHint?: string;
  endsAt?: Date;

  // Pricing
  yesBuyPrice: number;
  yesSellPrice: number;
  noBuyPrice: number;
  noSellPrice: number;
  
  // Odds
  yesImpliedProbability: number;
  noImpliedProbability: number;

  // Full orderbook data (as parsed objects)
  orderbook?: {
    yes: { bids: OrderLevel[], asks: OrderLevel[] };
    no: { bids: OrderLevel[], asks: OrderLevel[] };
    timestamp?: number;
  }
}

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
  betStreak: number; // Represents win streak
  totalWinnings?: string; // e.g., "124.5 SOL" or "$5,000"
  predictionRank?: string; // e.g., "Top 2%" or "#5 Global"
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
  predictionId: string;
  imageUrl?: string; 
  aiHint?: string; 
  user1Username: string;
  user1AvatarUrl?: string;
  user2Username: string; // Could be 'System Pool'
  user2AvatarUrl?: string;
  betAmount: number; // The core bet amount, can be default for challenges
  potentialWinnings: number;
  countdownEnds: number; // Timestamp for when countdown ends
  shareUrl?: string; // URL to share this match
  
  // Simplified pricing/odds data passed to the client
  yesPrice: number;
  noPrice: number;
  yesImpliedProbability: number;
  noImpliedProbability: number;


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

  // Flags for challenge confirmation flow
  isConfirmingChallenge?: boolean;
  originalReferrer?: string; // To pass along who initiated the challenge
}

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
  initialYesPrice?: number; // Added to pass initial odds
}

// Props for MatchViewClient
export interface MatchViewProps {
  match: Match;
}

// Props for ShareDialog
export interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  matchId?: string; // Optional, as it might not be relevant for all shares (e.g. sharing a position)
  ogImageUrl: string;
  tweetTemplates?: string[];
  rewardIncentive?: string;
  currentShareMessage: string;
  onShareMessageChange: (message: string) => void;
  shareUrl: string; // The URL to be appended to the tweet
  entityContext?: 'match_challenge' | 'position_outcome' | 'generic_prediction';
  entityDetails?: Record<string, any>; // General purpose details for OG or Share Message
}

// EntryContext type
export interface EntryContextType {
  source?: string;
  challenge?: boolean;
  referrer?: string;
  marketId?: string;
  appendEntryParams: (url: string) => string;
}

// For getMatchDetailsForOg
export interface OgData {
  predictionText: string;
  userChoice?: 'YES' | 'NO'; // Made optional for generic OG cards
  userAvatar?: string;
  username?: string; // Made optional
  outcome?: 'PENDING' | 'WON' | 'LOST' | 'SOLD' | 'CHALLENGE'; // Added 'SOLD' and 'CHALLENGE'
  betAmount?: number; // Made optional
  betSize?: string;
  streak?: string;
  rank?: string;
  rankCategory?: string;
  bonusApplied?: boolean;
  titleOverride?: string; // For more control over OG title
  descriptionOverride?: string; // For more control over OG description
  ogType?: 'match_challenge' | 'position_outcome' | 'generic_prediction';
}

export type OpenPositionStatus = 'LIVE' | 'ENDING_SOON' | 'SETTLED_WON' | 'SETTLED_LOST' | 'SOLD' | 'PENDING_COLLECTION' | 'COLLECTED';

export interface OpenPosition {
  id: string; // Unique ID for this specific bet/position
  predictionId: string;
  predictionText: string;
  category: string;
  userChoice: 'YES' | 'NO';
  betAmount: number;
  potentialPayout: number; // Max possible win if user's choice is correct
  currentValue: number; // Current estimated value of the position before settlement
  settledAmount?: number; // Actual amount won or sold for
  endsAt: Date; // For active positions, this is expiry. For past, this is settlement time.
  status: OpenPositionStatus;
  matchId: string; // To link back to the specific match instance (could be challenge ID)
  imageUrl?: string;
  aiHint?: string;
  opponentUsername?: string; // Who the user bet against (if applicable)
  bonusApplied?: boolean; // Was a bonus applied to this bet?
}

export interface ShareMessageDetails {
  predictionText: string;
  outcomeDescription: string;
  betAmount?: number;
  finalAmount?: number;
  potentialWinnings?: number;
  currency: string;
  opponentUsername?: string;
  callToAction?: string;
}


// New types for Order Book and Execution Preview
export interface OrderLevel {
  price: string;
  size: string;
}

export interface OrderBook {
  bids: OrderLevel[];
  asks: OrderLevel[];
}

export interface ExecutionPreview {
  success: boolean;
  timestamp?: string;
  error?: string;
  // Successful execution fields
  vwap?: number;
  totalCost?: number;
  executedShares?: number;
  potentialPayout?: number;
  price_impact_pct?: number;
  summary?: string;
  steps?: string[];
}
