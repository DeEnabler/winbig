
'use client'; // Ensures client-side execution for environment variable access

import { cookieStorage, createStorage, noopStorage, type Chain } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Import mainnet directly from wagmi/chains
import { mainnet } from 'wagmi/chains';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

if (!projectId || projectId === PLACEHOLDER_PROJECT_ID || projectId === 'undefined') {
  const errorMessage = `[walletConfig] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing, placeholder, or 'undefined'. Value: "${projectId}". Wallet functionality will be disabled. Set it in .env and RESTART server.`;
  console.error(errorMessage);
  // Avoid throwing error in a way that breaks the build if NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is problematic during build time
  // The WalletKitProvider will show an error message to the user.
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
  // Ensure this icon is publicly accessible at this exact URL
  icons: ['https://www.winbig.fun/vb-icon-192.png'] 
};

// SIMPLIFIED: appKitNetworks configured with ONLY mainnet from wagmi/chains
export const appKitNetworks = [mainnet].filter(Boolean) as Chain[];
console.log('[walletConfig] Initializing AppKit with networks from wagmi/chains (current):', appKitNetworks.map(n => ({id: n.id, name: n.name})));

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: typeof window !== 'undefined' ? cookieStorage : noopStorage }),
  ssr: true,
  projectId: projectId!, 
  networks: appKitNetworks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Ensure chains is correctly typed for use elsewhere if needed
export const chains = appKitNetworks as readonly [Chain, ...Chain[]];

