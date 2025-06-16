export interface PolymarketCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export interface WalletInfo {
  address: string;
  privateKey: string;
  mnemonic?: string;
}

export interface AuthResult {
  wallet: WalletInfo;
  credentials: PolymarketCredentials;
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