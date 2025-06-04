
// src/components/providers/Web3ModalProvider.tsx
'use client';

import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// createWeb3Modal will be dynamically imported within useEffect
import { wagmiConfig, projectId, chains } from '@/config/walletConfig';
import { useEffect, useState } from 'react';

if (!projectId) {
  console.error("[Web3ModalProvider] CRITICAL: projectId is undefined globally!");
  // Potentially throw an error or return a fallback UI if projectId is essential at this stage
  // throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set in Web3ModalProvider');
}

// Setup queryClient
const queryClient = new QueryClient();

export function Web3ModalProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [isModalInitialized, setIsModalInitialized] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      console.log('[Web3ModalProvider] Client mounted. Attempting to import createWeb3Modal.');
      import('@web3modal/wagmi/react').then(({ createWeb3Modal }) => {
        if (!projectId) {
          console.error("[Web3ModalProvider] CRITICAL: projectId is undefined just before createWeb3Modal call inside useEffect!");
          // Handle error: perhaps set an error state, show a message, or prevent initialization
          return;
        }
        console.log('[Web3ModalProvider] createWeb3Modal imported. Attempting to initialize with projectId:', projectId);
        createWeb3Modal({
          wagmiConfig,
          projectId,
          chains,
          enableAnalytics: false, // Explicitly disable analytics
        });
        console.log('[Web3ModalProvider] Web3Modal created and configured. Setting isModalInitialized to true.');
        setIsModalInitialized(true);
      }).catch(error => {
        console.error('[Web3ModalProvider] Failed to load or create Web3Modal dynamically:', error);
      });
    }
  }, [isMounted]); // Only re-run if isMounted changes. ProjectId and chains are stable.

  if (!isModalInitialized) {
     // console.log('[Web3ModalProvider] Modal not yet initialized (or component not mounted), rendering null.');
    return null;
  }

  console.log('[Web3ModalProvider] Modal initialized, rendering children with WagmiProvider.');
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={true}> {/* Changed to true */}
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
