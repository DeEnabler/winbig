
// src/config/walletConfig.ts
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set');

// Ensure NEXT_PUBLIC_APP_URL is defined and clean it up (remove trailing slash if present)
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://viralbet.example.com';
const cleanedAppUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;

const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: cleanedAppUrl, // Use the cleaned URL
  icons: ['https://avatars.githubusercontent.com/u/37784886'] // Replace with actual app icon
};

export const chains = [mainnet, sepolia] as const;

export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true, // Important for Next.js
  storage: createStorage({
    storage: typeof window !== 'undefined' ? cookieStorage : noopStorage, // Use noopStorage on server
    // key: 'wagmi', // Optional: you can add a custom key
  }),
  // ...wallets, // Optional: Add custom wallet connectors
});

