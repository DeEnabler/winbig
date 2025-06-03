
// src/config/walletConfig.ts
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { cookieStorage, createStorage, noopStorage } from 'wagmi'; // Added noopStorage
import { mainnet, sepolia } from 'wagmi/chains';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set');

const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://viralbet.example.com', // Fallback URL
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

