
// src/config/walletConfig.ts
'use client';

import { mainnet, sepolia } from 'wagmi/chains';
import { defaultWagmiConfig } from '@web3modal/wagmi/react';
import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import type { Chain } from 'wagmi';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

if (!projectId || projectId === PLACEHOLDER_PROJECT_ID || projectId === 'undefined') {
  const errorMessage = `[walletConfig] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing, placeholder, or 'undefined'. Value: "${projectId}". Wallet functionality will be disabled. Set it in .env and RESTART server.`;
  console.error(errorMessage);
  // Potentially throw an error or return a dummy config to prevent app crash,
  // though Web3ModalProvider already has error display logic.
}

let appUrlForMetadata = 'https://www.winbig.fun'; // Default fallback
if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    appUrlForMetadata = new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
  } catch (e) {
    console.warn(`[walletConfig] Invalid NEXT_PUBLIC_APP_URL: "${process.env.NEXT_PUBLIC_APP_URL}". Using fallback metadata URL "${appUrlForMetadata}". Error: ${e}`);
  }
} else {
  console.warn(`[walletConfig] NEXT_PUBLIC_APP_URL is not set. Using fallback metadata URL "${appUrlForMetadata}". This must be configured in Vercel/env for production & whitelisted in WalletConnect Cloud.`);
}
console.log(`[walletConfig] Using metadata.url: "${appUrlForMetadata}" for WalletConnect modal.`);


export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: appUrlForMetadata, // Cleaned origin
  icons: [`${appUrlForMetadata}/vb-icon-192.png`] // Use dynamic app URL for icon
};

// Define the chains your dApp will support
export const chains = [mainnet, sepolia] as const; // Use 'as const' for better type inference

// Create wagmiConfig
if (!projectId) {
  console.error("[walletConfig] WalletConnect Project ID is missing. Wagmi config creation will likely fail or be incomplete for WalletConnect functionality.");
}

export const wagmiConfig = defaultWagmiConfig({
  chains: chains as readonly [Chain, ...Chain[]], // Ensure the type matches what defaultWagmiConfig expects
  projectId: projectId!, // Assert projectId is defined; error handling is above
  metadata,
  ssr: true, // Enable SSR for Wagmi if using Next.js App Router and need cookie-based session persistence
  storage: createStorage({ // Use cookie storage for SSR
    storage: typeof window !== 'undefined' ? cookieStorage : noopStorage,
  }),
  // enableEmail: true, // Optional: For Web3Modal's email login feature
});

console.log('[walletConfig] Initialized with Web3Modal defaultWagmiConfig.');
