
// src/config/walletConfig.ts
'use client';

import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Import chains from @reown/appkit/networks, matching CryptoIndexFund
import { mainnet, arbitrum, polygonAmoy } from '@reown/appkit/networks';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

// Stricter Project ID validation, similar to CryptoIndexFund
if (!projectId || projectId === PLACEHOLDER_PROJECT_ID || projectId === 'undefined') {
  const errorMessage = `\n\n[walletConfig] CRITICAL ERROR:\n` +
    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing, is the placeholder ('${PLACEHOLDER_PROJECT_ID}'), or is the string "undefined".\n` +
    `Value received: "${projectId}"\n` +
    `Wallet functionality will be SEVERELY IMPAIRED or NON-FUNCTIONAL.\n` +
    `Please set it correctly in your .env file and RESTART the development server.\n\n`;
  console.error(errorMessage);
  // In a client-side context like this, throwing an error might break the build or initial render.
  // The WalletKitProvider will show a UI error. For now, we'll keep the console error
  // and let WalletKitProvider handle the UI error display.
  // If this were a Node.js context or build script, throwing an error would be appropriate:
  // throw new Error(errorMessage.replace(/\n/g, ' ')); // Keep console clean
}


const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://viralbet.example.com';
const cleanedAppUrl = appUrl.replace(/\/$/, '');

export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: cleanedAppUrl,
  icons: ['https://placehold.co/128x128.png?text=VB']
};

// Configure appKitNetworks to match CryptoIndexFund
export const appKitNetworks = [mainnet, arbitrum, polygonAmoy].filter(Boolean);

console.log('[walletConfig] Initializing AppKit with Reown networks:', appKitNetworks.map(n => n?.name || 'Unknown Network'));

// Ensure projectId passed to WagmiAdapter is valid or let it fail if truly unrecoverable
// The WalletKitProvider also has checks and will display a UI error.
// Passing an empty string or placeholder to WagmiAdapter's projectId is undesirable.
const validProjectIdForAdapter = (projectId && projectId !== PLACEHOLDER_PROJECT_ID && projectId !== 'undefined') ? projectId : undefined;

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: typeof window !== 'undefined' ? cookieStorage : noopStorage }),
  ssr: true,
  projectId: validProjectIdForAdapter!, // Use non-null assertion; if undefined, AppKit init should handle/fail.
                                      // The checks in WalletKitProvider will show a UI error if projectId is bad.
  networks: appKitNetworks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// This 'chains' export is not directly used by AppKit initialization but can be for other wagmi features.
export const chains = [mainnet, arbitrum, polygonAmoy].filter(Boolean) as unknown as readonly [import('viem').Chain, ...import('viem').Chain[]];

