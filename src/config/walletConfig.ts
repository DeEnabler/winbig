
// src/config/walletConfig.ts
'use client'; // Ensures client-side execution for environment variable access

import { cookieStorage, createStorage, noopStorage, type Chain } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Import Reown AppKit chains for initial logging, then we'll use a manual one
import { mainnet as reownMainnet, arbitrum as reownArbitrum, polygonAmoy as reownPolygonAmoy } from '@reown/appkit/networks';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

if (!projectId || projectId === PLACEHOLDER_PROJECT_ID || projectId === 'undefined') {
  const errorMessage = `[walletConfig] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing, placeholder, or 'undefined'. Value: "${projectId}". Wallet functionality will be disabled. Set it in .env and RESTART server.`;
  console.error(errorMessage);
}

let appUrlForMetadata = 'https://www.winbig.fun'; // Default fallback
if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    appUrlForMetadata = new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
  } catch (e) {
    console.warn(`[walletConfig] Invalid NEXT_PUBLIC_APP_URL: "${process.env.NEXT_PUBLIC_APP_URL}". Using fallback metadata URL "${appUrlForMetadata}". Error: ${e}`);
  }
} else {
  console.warn(`[walletConfig] NEXT_PUBLIC_APP_URL is not set. Using fallback metadata URL "${appUrlForMetadata}". This must be configured in Vercel/env for production & whitelisted in WalletConnect Cloud.`);
}
console.log(`[walletConfig] Using metadata.url: "${appUrlForMetadata}" for WalletConnect modal.`);


export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: appUrlForMetadata,
  icons: ['https://www.winbig.fun/vb-icon-192.png'] 
};

// Log the structure of Reown AppKit's chain objects for inspection
if (typeof window !== 'undefined') { // Ensure this runs client-side
  console.log("Reown Mainnet Object from @reown/appkit/networks:", JSON.stringify(reownMainnet, null, 2));
  console.log("Reown Arbitrum Object from @reown/appkit/networks:", JSON.stringify(reownArbitrum, null, 2));
  console.log("Reown Polygon Amoy Object from @reown/appkit/networks:", JSON.stringify(reownPolygonAmoy, null, 2));
}

// Manually define mainnet for testing, as suggested by CryptoIndexFund AI
const manualMainnet: Chain = {
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://cloudflare-eth.com'] },
    public: { http: ['https://cloudflare-eth.com'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://etherscan.io' },
  },
  contracts: { // Often needed for Wagmi/Viem functionality like multicall
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 14353601,
    },
  },
};

// Test with ONLY the manually defined mainnet
export const appKitNetworks = [manualMainnet].filter(Boolean) as Chain[];
console.log('[walletConfig] Initializing AppKit with MANUALLY DEFINED Mainnet:', appKitNetworks.map(n => ({id: n.id, name: n.name})));


export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: typeof window !== 'undefined' ? cookieStorage : noopStorage }),
  ssr: true,
  projectId: projectId!, 
  networks: appKitNetworks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

export const chains = appKitNetworks as readonly [Chain, ...Chain[]];
