
// src/config/index.ts
'use client'; // Ensure this runs client-side where NEXT_PUBLIC_ vars are available

import { cookieStorage, createStorage } from 'wagmi'; // Corrected import for wagmi v2
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, polygonAmoy, arbitrum } from '@reown/appkit/networks';

// IMPORTANT: Replace with your actual Reown Project ID
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

const PLACEHOLDER_PROJECT_ID = 'your_reown_project_id_here';

if (!projectId || projectId === 'undefined' || projectId === PLACEHOLDER_PROJECT_ID) {
  const message = `CRITICAL ERROR: NEXT_PUBLIC_REOWN_PROJECT_ID is not defined, is "undefined", or is still the placeholder "${PLACEHOLDER_PROJECT_ID}". Please set this environment variable. Current value: "${projectId}"`;
  console.error(message);
  // In a real app, you might throw an error here or have a fallback,
  // but for now, console logging to avoid breaking the build during this step.
  // throw new Error(message);
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
