
// src/config/walletConfig.ts
'use client';

import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Import chains from @reown/appkit/networks
import { mainnet, arbitrum, polygonAmoy } from '@reown/appkit/networks';
import type { Chain } from 'viem';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

// Stricter Project ID validation
if (!projectId || projectId === PLACEHOLDER_PROJECT_ID || projectId === 'undefined') {
  const errorMessage = `\n\n[walletConfig] CRITICAL ERROR:\n` +
    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing, is the placeholder ('${PLACEHOLDER_PROJECT_ID}'), or is the string "undefined".\n` +
    `Value received: "${projectId}"\n` +
    `Wallet functionality will be SEVERELY IMPAIRED or NON-FUNCTIONAL.\n` +
    `Please set it correctly in your .env file and RESTART the development server.\n\n`;
  console.error(errorMessage);
  // We throw an error here to ensure this is caught early if projectId is bad.
  // WalletKitProvider will also show a UI error, but this stops execution earlier for clarity.
  throw new Error(errorMessage.replace(/\n/g, ' '));
}


const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://viralbet.example.com';
const cleanedAppUrl = appUrl.replace(/\/$/, '');

export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: cleanedAppUrl,
  icons: ['https://placehold.co/128x128.png?text=VB'] // Replaced with ViralBet placeholder
};

// ** STEP 1: Test with ONLY mainnet from @reown/appkit/networks **
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
