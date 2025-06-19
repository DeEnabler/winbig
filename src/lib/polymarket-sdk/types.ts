// src/lib/polymarket-sdk/types.ts
// Simplified as direct Polymarket interaction is removed from Next.js app for odds.

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

// AuthResult might still be used if other parts of the app interact with wallets,
// but its direct relation to EphemeralCredentialManager for Polymarket API keys is gone.
export interface AuthResult {
  wallet?: WalletInfo;
  credentials?: PolymarketCredentials;
  success: boolean;
  error?: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  clobUrl: string;
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

// LiveMarket type is primarily defined in src/types/index.ts
// This file no longer needs its own definition if it was solely for this service.

// EphemeralCredentialManagerInterface is removed as the manager is deleted.
