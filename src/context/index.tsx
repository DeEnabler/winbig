
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
  const warningMessage = `[Reown Context] WARNING: NEXT_PUBLIC_REOWN_PROJECT_ID is not configured. Reown AppKit is not initialized. Wallet functionality will be disabled. Current value: "${projectId}"`;
  console.warn(warningMessage);
  // Create a mock modal that provides feedback in the console instead of a disruptive alert.
  appKitModal = {
    open: () => {
      console.warn("[Reown Context] Wallet connection attempted, but AppKit is not initialized due to missing Project ID.");
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
      auth: {
        email: true, // Retain email login (can be set to false if not desired)
        socials: ["google"], // Limit social logins to Google only
        showWallets: true, // Ensure wallet logins are available
      },
      features: {
        analytics: false,
      },
    });
    console.log("[Reown Context] Reown AppKit initialized successfully with custom auth options.");
  } catch (error) {
    console.error("[Reown Context] Error initializing Reown AppKit:", error);
    appKitModal = {
      open: () => {
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
