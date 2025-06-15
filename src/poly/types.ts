export interface WalletInfo {
  address: string;
  privateKey: string;
  mnemonic?: string;
}

export interface ApiCredentials {
  key: string;
  secret: string;
  passphrase: string;
}

export interface AuthResult {
  wallet: WalletInfo;
  credentials: ApiCredentials;
  success: boolean;
  error?: string;
}

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const NETWORKS: Record<string, NetworkConfig> = {
  polygon: {
    name: "Polygon Mainnet",
    chainId: 137,
    rpcUrl: "https://polygon-rpc.com/",
    explorer: "https://polygonscan.com",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18
    }
  },
  amoy: {
    name: "Polygon Amoy Testnet",
    chainId: 80002,
    rpcUrl: "https://rpc-amoy.polygon.technology/",
    explorer: "https://www.oklink.com/amoy",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18
    }
  }
}; 