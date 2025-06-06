
// src/config/walletConfig.ts
'use client';

import { cookieStorage, createStorage, noopStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Import desired chains from @reown/appkit/networks
// For debugging Trust Wallet, starting with mainnet only, then will try the set from CryptoIndexFund
import { mainnet, arbitrum, polygonAmoy } from '@reown/appkit/networks';
import type { Chain } from 'viem';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

if (!projectId || projectId === PLACEHOLDER_PROJECT_ID || projectId === 'undefined') {
  const errorMessage = `\n\n[walletConfig] CRITICAL ERROR:\n` +
    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing, is the placeholder ('${PLACEHOLDER_PROJECT_ID}'), or is the string "undefined".\n` +
    `Value received: "${projectId}"\n` +
    `Wallet functionality will be SEVERELY IMPAIRED or NON-FUNCTIONAL.\n` +
    `Please set it correctly in your .env file and RESTART the development server.\n\n`;
  console.error(errorMessage);
  throw new Error(errorMessage.replace(/\n/g, ' ')); // Throw error to stop initialization if ID is clearly bad
}

// --- IMPORTANT METADATA URL ---
// This URL MUST be an HTTPS URL.
// It MUST EXACTLY match one of the "App Domains" whitelisted in your WalletConnect Cloud dashboard for the projectId.
// Mismatches or HTTP URLs can cause connection issues with mobile wallets like Trust Wallet.
const dAppConnectUrl = 'https://www.winbig.fun/'; // Using your provided production domain
console.warn(
  `[walletConfig] Using dAppConnectUrl: "${dAppConnectUrl}" for WalletConnect metadata. ` +
  `Ensure this exact URL is whitelisted in your WalletConnect Cloud project dashboard for Project ID: ${projectId}.`
);

export const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: dAppConnectUrl, // CRITICAL for WalletConnect
  icons: ['https://placehold.co/128x128.png?text=VB'] // Replace with your actual icon URL
};

// Configure with the same set of networks as CryptoIndexFund for consistency in testing
export const appKitNetworks = [mainnet, arbitrum, polygonAmoy].filter(Boolean) as Chain[];
// For initial Trust Wallet debugging, you might simplify this to:
// export const appKitNetworks = [mainnet].filter(Boolean) as Chain[];

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
