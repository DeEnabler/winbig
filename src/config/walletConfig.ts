
// src/config/walletConfig.ts
'use client';

import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Import chains from @reown/appkit/networks
import { mainnet, sepolia, polygonAmoy } from '@reown/appkit/networks'; // Assuming sepolia & polygonAmoy are available, or adjust as needed

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
  icons: ['https://placehold.co/128x128.png?text=VB']
};

// Configure appKitNetworks: Start with mainnet from @reown/appkit/networks
// If mainnet works, you can try adding sepolia or polygonAmoy from @reown/appkit/networks
export const appKitNetworks = [mainnet].filter(Boolean); 
// export const appKitNetworks = [mainnet, sepolia].filter(Boolean); // Example if using sepolia from reown
// export const appKitNetworks = [mainnet, polygonAmoy].filter(Boolean); // Example if using polygonAmoy from reown

console.log('[walletConfig] Initializing AppKit with Reown networks:', appKitNetworks.map(n => n.name));

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: typeof window !== 'undefined' ? cookieStorage : noopStorage }),
  ssr: true,
  projectId: projectId || '',
  networks: appKitNetworks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// General list of chains for reference, if needed elsewhere, but appKitNetworks drives AppKit.
export const chains = [mainnet, sepolia, polygonAmoy] as const;
