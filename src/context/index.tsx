
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

// Determine if we should fully initialize or mock the AppKit
const isProduction = process.env.NODE_ENV === 'production';
const isProjectIdValid = projectId && projectId !== 'undefined' && projectId !== PLACEHOLDER_PROJECT_ID;

// Only initialize fully in a production environment WITH a valid project ID
if (isProduction && isProjectIdValid) {
  console.log("[Reown Context] Initializing Reown AppKit for PRODUCTION with Project ID:", projectId);
  try {
    appKitModal = createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      networks: configNetworks,
      defaultNetwork: configNetworks[0] || undefined,
      metadata,
      auth: {
        email: true,
        socials: ["google"],
        showWallets: true,
      },
      features: {
        analytics: false,
      },
    });
    console.log("[Reown Context] Reown AppKit initialized successfully for PRODUCTION.");
  } catch (error) {
    console.error("[Reown Context] Error initializing Reown AppKit for PRODUCTION:", error);
    appKitModal = {
      open: () => {
        console.error("[Reown Context] appKitModal.open() called but AppKit failed to initialize.", error);
      },
    } as unknown as AppKitModal;
  }
} else {
  // For local development OR if project ID is missing, use a mock.
  if (!isProduction) {
    console.warn('[Reown Context] In development mode. Reown AppKit is mocked to avoid domain verification issues. Wallet functionality will be fully enabled in production.');
  } else if (!isProjectIdValid) {
    console.warn(`[Reown Context] WARNING: NEXT_PUBLIC_REOWN_PROJECT_ID is not configured. Reown AppKit is mocked. Current value: "${projectId}"`);
  }

  // Create a mock modal that provides feedback in the console instead of making network calls.
  appKitModal = {
    open: () => {
      console.warn("[Reown Context (Dev Mode)] Wallet connection attempted. This would open the real wallet modal in production.");
      alert("Wallet connection is disabled in the development environment to prevent domain errors. It will be active in production.");
    },
  } as unknown as AppKitModal;
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
