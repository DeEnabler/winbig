
// src/config/walletConfig.ts
'use client';

import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Import desired chains from @reown/appkit/networks
// For initial Trust Wallet debugging, simplify to only mainnet
import { mainnet } from '@reown/appkit/networks'; // Using mainnet, arbitrum, polygonAmoy from CryptoIndexFund example
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
  // Throwing an error here will stop further initialization if the ID is clearly bad.
  // WalletKitProvider will also show a UI error message.
  throw new Error(errorMessage.replace(/\n/g, ' '));
}

// --- IMPORTANT METADATA URL ---
// This URL MUST be an HTTPS URL and EXACTLY match one of the "App Domains" whitelisted in your WalletConnect Cloud.
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
  icons: [`${dAppConnectUrl}/icon.png`] // Ensure an icon exists at this URL, e.g., https://www.winbig.fun/icon.png
};

// Configure with the simplest set for Trust Wallet debugging
export const appKitNetworks = [mainnet].filter(Boolean) as Chain[];

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
