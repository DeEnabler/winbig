
// src/components/providers/WalletKitProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, config as wagmiConfig, projectId as ImportedProjectId, networks } from '@/config';


const queryClient = new QueryClient();

const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

const effectiveProjectId = ImportedProjectId === 'undefined' ? undefined : ImportedProjectId;

const isProjectIdValid = effectiveProjectId && effectiveProjectId !== PLACEHOLDER_PROJECT_ID && effectiveProjectId !== 'your_reown_project_id_here';

// This new state will track if AppKit has been initialized
let appKitInitialized = false;

export function WalletKitProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Ensure this block runs only once and only on the client
    if (isProjectIdValid && !appKitInitialized) {
      console.log('[AppKitProvider] Initializing AppKit with adapter inside useEffect...');
      try {
        createAppKit({
          adapters: [wagmiAdapter],
          projectId: effectiveProjectId,
          networks,
        });
        console.log('[AppKitProvider] AppKit created successfully inside useEffect.');
        appKitInitialized = true; // Mark as initialized
      } catch (error) {
        console.error('[AppKitProvider] Error calling createAppKit inside useEffect:', error);
      }
    } else if (!appKitInitialized) {
      if (!effectiveProjectId) {
        console.error('[AppKitProvider] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined. AppKit will not be initialized.');
      } else if (effectiveProjectId === PLACEHOLDER_PROJECT_ID || effectiveProjectId === 'your_reown_project_id_here') {
        console.error(`[AppKitProvider] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is still the placeholder value "${effectiveProjectId}". AppKit will not be initialized.`);
      }
    }
  }, []);

  if (!isMounted) {
    return null;
  }

  if (!isProjectIdValid) {
    console.warn("[AppKitProvider] WalletKitProvider rendered, but AppKit was not initialized due to invalid Project ID. Wallet functionality will be impaired.");
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default WalletKitProvider;
