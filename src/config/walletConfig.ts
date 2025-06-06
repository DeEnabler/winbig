
// src/config/walletConfig.ts
'use client';

import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet } from '@reown/appkit/networks'; // Testing with mainnet only
import type { Chain } from 'viem';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

if (!projectId || projectId === PLACEHOLDER_PROJECT_ID || projectId === 'undefined') {
  const errorMessage = `\n\n[walletConfig] CRITICAL ERROR:\n` +
    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing, is the placeholder ('${PLACEHOLDER_PROJECT_ID}'), or is the string "undefined".\n` +
    `Value received: "${projectId}"\n` +
    `Wallet functionality will be SEVERELY IMPAIRED or NON-FUNCTIONAL.\n` +
    `Please set it correctly in your .env file (or Vercel environment variables) and RESTART the development server / REBUILD & REDEPLOY on Vercel.\n\n`;
  console.error(errorMessage);
  // Throwing an error here will stop further initialization if the ID is clearly bad.
  // WalletKitProvider will also show a UI error message.
  throw new Error(errorMessage.replace(/\n/g, ' '));
}

// --- App URL and Metadata Configuration ---
// Derive the app's origin for metadata.url from NEXT_PUBLIC_APP_URL
// This ensures consistency and relies on your Vercel/env configuration.
let appOrigin = 'https://www.winbig.fun'; // Default fallback, ensure this is your canonical production URL.
if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    // Use new URL().origin to get a clean base URL (e.g., https://www.example.com)
    // This strips paths and trailing slashes.
    appOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
  } catch (e) {
    console.warn(`[walletConfig] Invalid NEXT_PUBLIC_APP_URL: "${process.env.NEXT_PUBLIC_APP_URL}". Using fallback metadata URL "${appOrigin}". Error: ${e}`);
  }
} else {
  console.warn(`[walletConfig] NEXT_PUBLIC_APP_URL is not set. Using fallback metadata URL "${appOrigin}". This should be configured in your Vercel environment variables for production.`);
}

console.log(`[walletConfig] Using metadata.url: "${appOrigin}". Ensure this exact origin is whitelisted in WalletConnect Cloud for Project ID: ${projectId}, and that it is accessible via HTTPS.`);

export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: appOrigin, // Use the cleaned, derived origin
  icons: [], // Temporarily REMOVED for testing. Ensure your production icon URLs are valid and fast.
  // Example if you re-add: icons: [`${appOrigin}/icon.png`]
};

// Configure with ONLY mainnet from @reown/appkit/networks for Trust Wallet debugging
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
