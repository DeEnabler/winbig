
// src/components/providers/Web3ModalProvider.tsx
'use client';

import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// createWeb3Modal will be dynamically imported within useEffect
import { wagmiConfig, projectId, chains } from '@/config/walletConfig';
import { useEffect, useState } from 'react';

if (!projectId) throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set in Web3ModalProvider');

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
        console.log('[Web3ModalProvider] createWeb3Modal imported. Attempting to initialize with projectId:', projectId);
        if (!projectId) {
          console.error("[Web3ModalProvider] CRITICAL: projectId is undefined before createWeb3Modal call!");
          return;
        }
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
  }, [isMounted]);

  if (!isModalInitialized) {
    // console.log('[Web3ModalProvider] Modal not yet initialized (or component not mounted), rendering null.');
    // This console log can be very noisy during initial renders, so optionally comment out if startup is clean.
    return null; 
  }

  console.log('[Web3ModalProvider] Modal initialized, rendering children with WagmiProvider.');
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

