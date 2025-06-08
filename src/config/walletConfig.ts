
// src/config/walletConfig.ts
'use client';

import { defaultWagmiConfig } from '@web3modal/wagmi/react';
import { cookieStorage, createStorage, noopStorage, type Chain } from 'wagmi';
// Import mainnet and sepolia directly from wagmi/chains
import { mainnet, sepolia } from 'wagmi/chains';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

if (!projectId || projectId === PLACEHOLDER_PROJECT_ID || projectId === 'undefined') {
  const errorMessage = `[walletConfig] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing, placeholder, or 'undefined'. Value: "${projectId}". Wallet functionality will be disabled. Set it in .env and RESTART server.`;
  console.error(errorMessage);
  // In a real app, you might throw an error here or handle it more gracefully
  // For now, we'll let the Web3ModalProvider display an error if projectId is missing.
}

let appUrlForMetadata = 'https://www.winbig.fun'; // Default fallback
if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    // Ensure it's a full URL, if not, prepend a default scheme.
    let tempUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!tempUrl.startsWith('http://') && !tempUrl.startsWith('https://')) {
      tempUrl = 'http://' + tempUrl; // Default to http if no scheme, or https if you prefer
    }
    appUrlForMetadata = new URL(tempUrl).origin;
  } catch (e) {
    console.warn(`[walletConfig] Invalid NEXT_PUBLIC_APP_URL: "${process.env.NEXT_PUBLIC_APP_URL}". Using fallback metadata URL "${appUrlForMetadata}". Error: ${e}`);
  }
} else {
  console.warn(`[walletConfig] NEXT_PUBLIC_APP_URL is not set. Using fallback metadata URL "${appUrlForMetadata}". This must be configured in Vercel/env for production & whitelisted in WalletConnect Cloud.`);
}
console.log(`[walletConfig] Using metadata.url: "${appUrlForMetadata}" for Web3Modal.`);

export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: appUrlForMetadata,
  icons: [`${appUrlForMetadata}/vb-icon-192.png`] // Example icon path
};

// Define the chains your dApp will support
export const chains = [mainnet, sepolia] as const;

// Create wagmiConfig
if (!projectId) {
  console.error("[walletConfig] WalletConnect Project ID is missing. Wagmi config creation will likely fail or be incomplete for WalletConnect functionality.");
}

export const wagmiConfig = defaultWagmiConfig({
  chains: chains as readonly [Chain, ...Chain[]], // Type assertion for safety
  projectId: projectId!, // Assert projectId is defined; error handling is above
  metadata,
  ssr: true,
  storage: createStorage({
    storage: typeof window !== 'undefined' ? cookieStorage : noopStorage,
  }),
  // enableEmail: true, // Optional: For Web3Modal's email login feature
});

console.log('[walletConfig] Initialized with Web3Modal defaultWagmiConfig.');
