
// This defines types relevant to the Polymarket SDK interaction within this Next.js app

export interface WalletInfo {
  address: string;
  privateKey: string;
  mnemonic?: string;
}

export interface PolymarketCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export interface AuthResult {
  wallet?: WalletInfo; // Made optional for cases where only creds are returned
  credentials?: PolymarketCredentials; // Made optional
  success: boolean;
  error?: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  clobUrl: string; // URL for the CLOB API
  currency: string;
  blockExplorer: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    clobUrl: 'https://clob.polymarket.com',
    currency: 'MATIC',
    blockExplorer: 'https://polygonscan.com'
  },
  amoy: {
    chainId: 80002,
    name: 'Polygon Amoy Testnet',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    clobUrl: 'https://clob-staging.polymarket.com',
    currency: 'MATIC',
    blockExplorer: 'https://amoy.polygonscan.com'
  }
};

// Interface for LiveMarketService to use
export interface LiveMarket {
  id: string; // conditionId from Polymarket
  question: string;
  yesPrice: number; // Probability from 0.01 to 0.99
  noPrice: number;  // 1 - yesPrice
  category?: string;
  endsAt?: Date;
  // Add other relevant fields: volume, liquidity, etc. as needed
}

// Interface for credential manager used by LiveMarketService
export interface EphemeralCredentialManagerInterface {
  getCredentials(network: 'amoy' | 'polygon'): Promise<AuthResult>;
  forceRefreshCredentials(network: 'amoy' | 'polygon'): Promise<void>;
  getCredentialStatus(): {
    isInitialized: boolean;
    lastRefreshed: Date | null;
    nextRefreshAttempt: Date | null;
    currentNetwork: string | null;
    error: string | null;
  };
}
