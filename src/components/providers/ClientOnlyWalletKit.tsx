// src/components/providers/ClientOnlyWalletKit.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, config as wagmiConfig, projectId as ImportedProjectId, networks } from '@/config';


const queryClient = new QueryClient();

const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

const effectiveProjectId = ImportedProjectId === 'undefined' ? undefined : ImportedProjectId;

const isProjectIdValid = effectiveProjectId && effectiveProjectId !== PLACEHOLDER_PROJECT_ID && effectiveProjectId !== 'your_reown_project_id_here';

let appKitInitialized = false;

// The component is renamed to reflect its new file location
export function ClientOnlyWalletKit({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (appKitInitialized) {
      return;
    }

    if (isProjectIdValid) {
      try {
        console.log('[AppKitProvider] Initializing AppKit inside useEffect...');
        createAppKit({
          adapters: [wagmiAdapter],
          projectId: effectiveProjectId,
          networks,
        });
        appKitInitialized = true;
        console.log('[AppKitProvider] AppKit created successfully inside useEffect.');
      } catch (error) {
        console.error('[AppKitProvider] Error calling createAppKit inside useEffect:', error);
      }
    } else {
        if (!effectiveProjectId) {
            console.error('[AppKitProvider] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined. AppKit will not be initialized.');
        } else if (effectiveProjectId === PLACEHOLDER_PROJECT_ID || effectiveProjectId === 'your_reown_project_id_here') {
            console.error(`[AppKitProvider] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is still the placeholder value "${effectiveProjectId}". AppKit will not be initialized.`);
        }
    }
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
} 