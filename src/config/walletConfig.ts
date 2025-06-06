
// src/config/walletConfig.ts
'use client';

import { cookieStorage, createStorage, noopStorage } from 'wagmi'; // Corrected import for createStorage
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Import desired chains from @reown/appkit/networks
import { mainnet, arbitrum, polygonAmoy } from '@reown/appkit/networks'; // Using the multi-chain config that works for CryptoIndexFund
import type { Chain } from 'viem';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

if (!projectId || projectId === PLACEHOLDER_PROJECT_ID || projectId === 'undefined') {
  const errorMessage = `\n\n[walletConfig] CRITICAL ERROR:\n` +
    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing, is the placeholder ('${PLACEHOLDER_PROJECT_ID}'), or is the string "undefined".\n` +
    `Value received: "${projectId}"\n` +
    `Wallet functionality will be SEVERELY IMPAIRED or NON-FUNCTIONAL.\n` +
    `Please set it correctly in your .env file and RESTART the development server.\n\n`;
  console.error(errorMessage);
  // Throwing an error here ensures this is caught early if projectId is bad.
  // WalletKitProvider will also show a UI error.
  throw new Error(errorMessage.replace(/\n/g, ' '));
}

// --- IMPORTANT ---
// For Trust Wallet and other mobile wallets, metadata.url often needs to be:
// 1. An HTTPS URL.
// 2. A non-localhost URL (e.g., your Vercel preview/production URL).
// 3. EXACTLY matching a domain whitelisted in your WalletConnect Cloud dashboard for the projectId.
//
// Replace the placeholder below with your actual deployed app's HTTPS URL.
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-viralbet-app.vercel.app'; // Updated placeholder
const cleanedAppUrl = appUrl.replace(/\/$/, '');

console.warn(
  `[walletConfig] Using metadata.url: "${cleanedAppUrl}". ` +
  `Ensure this is an HTTPS URL and is whitelisted in your WalletConnect Cloud project dashboard for Project ID: ${projectId}. ` +
  `If using a placeholder, replace it with your actual deployment URL.`
);

export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: cleanedAppUrl, // This is the critical URL
  icons: ['https://placehold.co/128x128.png?text=VB']
};

// Configure with the same set of networks as CryptoIndexFund for consistency
export const appKitNetworks = [mainnet, arbitrum, polygonAmoy].filter(Boolean) as Chain[];

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
