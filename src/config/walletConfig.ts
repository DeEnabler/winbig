
'use client'; // Ensures client-side execution for environment variable access

import { cookieStorage, createStorage, noopStorage, type Chain } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// SIMPLIFIED: Using only mainnet from Reown AppKit for debugging
import { mainnet } from '@reown/appkit/networks';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

if (!projectId || projectId === PLACEHOLDER_PROJECT_ID || projectId === 'undefined') {
  const errorMessage = `[walletConfig] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing, placeholder, or 'undefined'. Value: "${projectId}". Wallet functionality will be disabled. Set it in .env and RESTART server.`;
  console.error(errorMessage);
  throw new Error(errorMessage.replace(/\n/g, ' '));
}

// Derive metadata.url from NEXT_PUBLIC_APP_URL, ensuring it's a clean origin
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
  url: appUrlForMetadata, // Cleaned origin
  icons: [], // Reverted to empty array as per user's feedback and for debugging
};

// SIMPLIFIED: appKitNetworks configured with ONLY mainnet from @reown/appkit/networks
export const appKitNetworks = [mainnet].filter(Boolean) as Chain[];
console.log('[walletConfig] Initializing AppKit with Reown networks (current):', appKitNetworks.map(n => n?.name || 'Unknown Network'));

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: typeof window !== 'undefined' ? cookieStorage : noopStorage }),
  ssr: true,
  projectId: projectId,
  networks: appKitNetworks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

export const chains = appKitNetworks as readonly [Chain, ...Chain[]];
