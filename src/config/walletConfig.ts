
// src/config/walletConfig.ts
'use client';

import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Import chains from @reown/appkit/networks, matching CryptoIndexFund
import { mainnet, arbitrum, polygonAmoy } from '@reown/appkit/networks';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

if (!projectId) {
  console.error(
    `\n\n[walletConfig] CRITICAL ERROR:\n` +
    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is NOT SET in your .env file!\n` +
    `Wallet functionality will be SEVERELY IMPAIRED or NON-FUNCTIONAL.\n` +
    `Please add it to your .env file and RESTART the development server.\n\n`
  );
} else if (projectId === PLACEHOLDER_PROJECT_ID) {
  console.error(
    `\n\n[walletConfig] CRITICAL CONFIGURATION ISSUE:\n` +
    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is still set to the placeholder value: '${PLACEHOLDER_PROJECT_ID}'.\n` +
    `You MUST replace this with your ACTUAL WalletConnect Project ID in the .env file.\n` +
    `After updating, RESTART your development server.\n` +
    `Wallet functionality WILL FAIL until this is corrected.\n\n`
  );
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://viralbet.example.com';
const cleanedAppUrl = appUrl.replace(/\/$/, '');

export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: cleanedAppUrl,
  icons: ['https://placehold.co/128x128.png?text=VB'] // Replace with your actual icon URL
};

// Configure appKitNetworks to match CryptoIndexFund
// Ensure these chains (mainnet, arbitrum, polygonAmoy) are indeed exported by @reown/appkit/networks
export const appKitNetworks = [mainnet, arbitrum, polygonAmoy].filter(Boolean);

console.log('[walletConfig] Initializing AppKit with Reown networks:', appKitNetworks.map(n => n?.name || 'Unknown Network'));

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: typeof window !== 'undefined' ? cookieStorage : noopStorage }),
  ssr: true,
  projectId: projectId || '', // Fallback to empty string if projectId is somehow undefined (should be caught above)
  networks: appKitNetworks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// General list of chains for reference, if needed elsewhere, but appKitNetworks drives AppKit.
// This 'chains' export is not directly used by AppKit initialization but can be for other wagmi features.
export const chains = [mainnet, arbitrum, polygonAmoy].filter(Boolean) as unknown as readonly [import('viem').Chain, ...import('viem').Chain[]];
// The 'as unknown as ...' is a type assertion to satisfy wagmi's expected type if needed elsewhere,
// assuming the Reown network objects are compatible with viem's Chain type.
// For AppKit, the direct `appKitNetworks` array is what matters for `WagmiAdapter` and `createAppKit`.

