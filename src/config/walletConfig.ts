
// src/config/walletConfig.ts
'use client';

import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import { mainnet as wagmiMainnet, sepolia as wagmiSepolia } from 'wagmi/chains';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

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
// Ensure the URL does not end with a slash for WalletConnect metadata consistency
const cleanedAppUrl = appUrl.replace(/\/$/, '');


export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: cleanedAppUrl, 
  icons: ['https://placehold.co/128x128.png?text=VB'] // Generic placeholder icon
};

// Temporarily configure for Mainnet only to diagnose Trust Wallet issue
export const appKitNetworks = [wagmiMainnet].filter(Boolean); 
console.log('[walletConfig] Initializing AppKit with networks:', appKitNetworks.map(n => n.name));

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: typeof window !== 'undefined' ? cookieStorage : noopStorage }),
  ssr: true,
  projectId: projectId || '', // Use empty string if projectId is somehow undefined to prevent crash, though errors above should highlight this.
  networks: appKitNetworks, 
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// This list can remain more comprehensive for general use, 
// but appKitNetworks above dictates WalletConnect's initial request.
export const chains = [wagmiMainnet, wagmiSepolia] as const;
