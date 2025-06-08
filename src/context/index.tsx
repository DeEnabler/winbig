
// src/context/index.tsx
'use client';

import { wagmiAdapter, projectId, networks as configNetworks } from '@/config/index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit, type AppKitModal } from '@reown/appkit/react';
import type { ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';
// AuthProvider is specific to CryptoIndexFund, we will omit it for now for ViralBet to keep it simple

const queryClient = new QueryClient();

if (!projectId || projectId === 'your_reown_project_id_here') {
  console.error('Project ID is not defined or is placeholder for Reown AppKit in context.');
  // Not throwing here to allow app to load and show console error
}

let appUrlForMetadata = 'http://localhost:9002'; // Default for local dev
if (typeof window !== 'undefined') {
    appUrlForMetadata = window.location.origin;
} else if (process.env.NEXT_PUBLIC_APP_URL) {
    appUrlForMetadata = process.env.NEXT_PUBLIC_APP_URL;
}
// Ensure HTTPS for production metadata if possible, or ensure whitelisting
if (process.env.NODE_ENV === 'production' && appUrlForMetadata.startsWith('http://')) {
    // Attempt to use HTTPS if NEXT_PUBLIC_APP_URL starts with http:// in prod
    // Or better, ensure NEXT_PUBLIC_APP_URL is correctly set to HTTPS for prod.
    console.warn("Metadata URL for Reown AppKit is HTTP in production. Ensure NEXT_PUBLIC_APP_URL is set to HTTPS.");
}


const metadata = {
  name: 'ViralBet',
  description: 'ViralBet - Swipe, Bet, Share!',
  url: appUrlForMetadata, 
  icons: [`${appUrlForMetadata}/vb-icon-192.png`], // Ensure this icon exists and is accessible
};

export let appKitModal: AppKitModal;

// Only create AppKit if projectId is valid, to prevent errors during initialization
if (projectId && projectId !== 'your_reown_project_id_here') {
  appKitModal = createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: configNetworks, 
    defaultNetwork: configNetworks[0] || undefined, 
    metadata,
    features: {
      analytics: true, // Optional
    },
  });
} else {
  // Provide a mock/stub if projectId is missing, so the app doesn't crash trying to use appKitModal.open
  console.warn("Reown AppKit is not initialized due to missing or placeholder Project ID. Wallet functionality will be impaired.");
  appKitModal = {
    open: () => {
      alert("Wallet connection is not configured. Please check NEXT_PUBLIC_REOWN_PROJECT_ID.");
      console.error("appKitModal.open() called but AppKit is not initialized.");
    },
    // Add other methods if your app tries to call them, e.g., close, subscribeModalState
    // For simplicity, just handling open for now.
  } as unknown as AppKitModal; // Type assertion needed for the mock
}


export default function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
