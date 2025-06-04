// src/config/walletConfig.ts
'use client';

import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import { mainnet as wagmiMainnet, sepolia as wagmiSepolia } from 'wagmi/chains';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Removed potentially problematic import: import { mainnet as reownMainnet, sepolia as reownSepolia } from '@reown/appkit/networks';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  // This log is important for debugging.
  console.error("[walletConfig] CRITICAL: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set!");
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://viralbet.example.com';
const cleanedAppUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;

export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: cleanedAppUrl,
  icons: ['https://avatars.githubusercontent.com/u/37784886'] // Replace with actual app icon
};

// Define networks for Reown AppKit using standard wagmi chain objects
// Filter out undefined in case one chain is conditionally excluded in the future.
export const appKitNetworks = [wagmiMainnet, wagmiSepolia].filter(Boolean);

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: typeof window !== 'undefined' ? cookieStorage : noopStorage }),
  ssr: true,
  projectId: projectId!, // Non-null assertion, as projectId presence is checked above
  networks: appKitNetworks, // Use the simplified and robust appKitNetworks list
  // WagmiAdapter internally creates the wagmiConfig
});

// Export the WagmiConfig instance from the adapter
export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Original Wagmi chains for reference or direct use if ever needed outside Reown AppKit
export const chains = [wagmiMainnet, wagmiSepolia] as const;
