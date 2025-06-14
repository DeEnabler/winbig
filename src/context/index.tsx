
// src/context/index.tsx
'use client';

import { wagmiAdapter, projectId, networks as configNetworks } from '@/config/index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit, type AppKitModal } from '@reown/appkit/react';
import type { ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';

const queryClient = new QueryClient();

const PLACEHOLDER_PROJECT_ID = 'your_reown_project_id_here';

let appUrlForMetadata = 'http://localhost:9002'; // Default for local dev
if (typeof window !== 'undefined') {
    appUrlForMetadata = window.location.origin;
} else if (process.env.NEXT_PUBLIC_APP_URL) {
    appUrlForMetadata = process.env.NEXT_PUBLIC_APP_URL;
}

if (process.env.NODE_ENV === 'production' && appUrlForMetadata.startsWith('http://')) {
    console.warn("[Reown Context] Metadata URL for Reown AppKit is HTTP in production. Ensure NEXT_PUBLIC_APP_URL is set to HTTPS. Current URL:", appUrlForMetadata);
} else {
    console.log("[Reown Context] Metadata URL for Reown AppKit:", appUrlForMetadata);
}


const metadata = {
  name: 'WinBig',
  description: 'WinBig - Swipe, Bet, Share!',
  url: appUrlForMetadata, 
  icons: [`${appUrlForMetadata}/vb-icon-192.png`], 
};
console.log("[Reown Context] AppKit Metadata:", metadata);

export let appKitModal: AppKitModal;

if (!projectId || projectId === 'undefined' || projectId === PLACEHOLDER_PROJECT_ID) {
  const errorMessage = `[Reown Context] CRITICAL ERROR: NEXT_PUBLIC_REOWN_PROJECT_ID is not configured or is placeholder. Reown AppKit will not be initialized. Current value: "${projectId}"`;
  console.error(errorMessage);
  appKitModal = {
    open: () => {
      alert("Wallet connection is not configured. Please check NEXT_PUBLIC_REOWN_PROJECT_ID in your environment variables.");
      console.error("[Reown Context] appKitModal.open() called but AppKit is not initialized due to missing Project ID.");
    },
  } as unknown as AppKitModal; 
} else {
  console.log("[Reown Context] Initializing Reown AppKit with Project ID:", projectId);
  try {
    appKitModal = createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      networks: configNetworks, 
      defaultNetwork: configNetworks[0] || undefined, 
      metadata,
      features: {
        analytics: false, // Changed from true to false
      },
    });
    console.log("[Reown Context] Reown AppKit initialized successfully.");
  } catch (error) {
    console.error("[Reown Context] Error initializing Reown AppKit:", error);
    appKitModal = {
      open: () => {
        alert("Error initializing wallet connection services. Please check the console.");
        console.error("[Reown Context] appKitModal.open() called but AppKit failed to initialize.", error);
      },
    } as unknown as AppKitModal;
  }
}


export default function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  console.log("[Reown ContextProvider] Rendering. SSR Cookies:", cookies ? "Present" : "Absent");
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);
  console.log("[Reown ContextProvider] Wagmi initial state from cookies:", initialState);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
