
// src/config/index.ts
'use client'; // Ensure this runs client-side where NEXT_PUBLIC_ vars are available

import { cookieStorage, createStorage } from 'wagmi'; // Corrected import for wagmi v2
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, polygonAmoy, arbitrum } from '@reown/appkit/networks';

// IMPORTANT: Replace with your actual Reown Project ID
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

const PLACEHOLDER_PROJECT_ID = 'your_reown_project_id_here';

if (!projectId || projectId === 'undefined' || projectId === PLACEHOLDER_PROJECT_ID) {
  const message = `[Reown Config] WARNING: NEXT_PUBLIC_REOWN_PROJECT_ID is not set. Wallet functionality will be disabled in the UI. Please set this in your .env file for production. Current value: "${projectId}"`;
  console.warn(message);
  // This is no longer a critical error that throws, allowing the app to run in dev.
} else {
  console.log('[Reown Config] Using Project ID:', projectId);
}

// Define the networks your app supports - adjust as needed
export const networks = [mainnet, polygonAmoy, arbitrum];
console.log('[Reown Config] Supported networks:', networks.map(n => n.name).join(', '));


//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ // Using createStorage from wagmi
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: projectId!, 
  networks,
});

// This is the wagmiConfig that will be used by WagmiProvider
export const config = wagmiAdapter.wagmiConfig;
console.log('[Reown Config] WagmiAdapter and wagmiConfig initialized.');
