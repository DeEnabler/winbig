
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
  const [isModalInitialized, setIsModalInitialized] = useState(false);

  useEffect(() => {
    console.log('[Web3ModalProvider] Effect started. Attempting to import createWeb3Modal.');
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
        enableAnalytics: true, // Optional: add analytics
        // Add other Web3Modal configurations here if needed
      });
      console.log('[Web3ModalProvider] Web3Modal created. Setting isModalInitialized to true.');
      setIsModalInitialized(true); // Signal that modal is ready
    }).catch(error => {
      console.error('[Web3ModalProvider] Failed to load or create Web3Modal dynamically:', error);
    });
    
  }, []); // Empty dependency array ensures this runs once on mount

  if (!isModalInitialized) {
    console.log('[Web3ModalProvider] Modal not yet initialized, rendering null.');
    return null; 
  }

  console.log('[Web3ModalProvider] Modal initialized, rendering children with WagmiProvider.');
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}> {/* reconnectOnMount={false} is often good for SSR/dynamic setups */}
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

