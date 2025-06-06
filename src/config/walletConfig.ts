
// src/config/walletConfig.ts
'use client';

import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Import desired chains from @reown/appkit/networks
import { mainnet, arbitrum, polygonAmoy } from '@reown/appkit/networks'; // Using the full set from CryptoIndexFund
import type { Chain } from 'viem';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

if (!projectId || projectId === PLACEHOLDER_PROJECT_ID || projectId === 'undefined') {
  const errorMessage = `\n\n[walletConfig] CRITICAL ERROR:\n` +
    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing, is the placeholder ('${PLACEHOLDER_PROJECT_ID}'), or is the string "undefined".\n` +
    `Value received: "${projectId}"\n` +
    `Wallet functionality will be SEVERELY IMPAIRED or NON-FUNCTIONAL.\n` +
    `Please set it correctly in your .env file (or Vercel environment variables) and RESTART the development server / REBUILD & REDEPLOY on Vercel.\n\n`;
  console.error(errorMessage);
  // This error will be caught by the WalletKitProvider's UI error boundary as well.
  // Throwing here ensures it's loud if the server-side part of this config is evaluated.
  // For client-side, WalletKitProvider will show a more user-friendly error.
}

// --- IMPORTANT METADATA URL ---
// This URL MUST be an HTTPS URL.
// It MUST EXACTLY match one of the "App Domains" whitelisted in your WalletConnect Cloud dashboard for the projectId.
// Mismatches or HTTP URLs can cause connection issues with mobile wallets like Trust Wallet.
const dAppConnectUrl = 'https://www.winbig.fun'; // Using your production domain WITHOUT trailing slash

console.warn(
  `[walletConfig] Using dAppConnectUrl: "${dAppConnectUrl}" for WalletConnect metadata. ` +
  `Ensure this exact URL is whitelisted in your WalletConnect Cloud project dashboard for Project ID: ${projectId}. ` +
  `Also ensure NEXT_PUBLIC_APP_URL (used for OG images etc.) is set correctly in your environment (e.g., Vercel & .env).`
);

export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: dAppConnectUrl, // CRITICAL for WalletConnect
  icons: ['https://placehold.co/128x128.png?text=VB'] // Replace with your actual icon URL
};

// Configure with the same set of networks as CryptoIndexFund for consistency in testing
export const appKitNetworks = [mainnet, arbitrum, polygonAmoy].filter(Boolean) as Chain[];
// For initial Trust Wallet debugging, you might simplify this to:
// export const appKitNetworks = [mainnet].filter(Boolean) as Chain[];

console.log('[walletConfig] Initializing AppKit with Reown networks:', appKitNetworks.map(n => n?.name || 'Unknown Network'));

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: typeof window !== 'undefined' ? cookieStorage : noopStorage }),
  ssr: true,
  projectId: projectId, // Pass the validated projectId
  networks: appKitNetworks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// This 'chains' export is not directly used by AppKit initialization but can be for other wagmi features.
// It should reflect the appKitNetworks for consistency if used elsewhere.
export const chains = appKitNetworks as readonly [Chain, ...Chain[]];
