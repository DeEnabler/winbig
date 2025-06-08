
// src/config/index.ts
'use client';

import { cookieStorage, createStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
// Importing specific networks from @reown/appkit/networks as per the example
import { mainnet, polygonAmoy, arbitrum } from '@reown/appkit/networks';

// IMPORTANT: Replace with your actual Reown Project ID
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (!projectId || projectId === 'undefined' || projectId === 'your_reown_project_id_here') {
  console.error('CRITICAL ERROR: NEXT_PUBLIC_REOWN_PROJECT_ID is not defined, is "undefined", or is still the placeholder. Please set this environment variable.');
  // In a real app, you might throw an error here or have a fallback,
  // but for now, console logging to avoid breaking the build during this step.
  // throw new Error('CRITICAL ERROR: NEXT_PUBLIC_REOWN_PROJECT_ID is not defined or is "undefined". Please set this environment variable.');
}

// Define the networks your app supports - adjust as needed
// Using mainnet and polygonAmoy as per CryptoIndexFund example for consistency
export const networks = [mainnet, polygonAmoy, arbitrum];

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: projectId!, // Add ! to assert projectId is defined after the check
  networks,
});

// This is the wagmiConfig that will be used by WagmiProvider
export const config = wagmiAdapter.wagmiConfig;
