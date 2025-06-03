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
  // State to ensure client-side only execution for modal creation
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    // This effect runs once after the component mounts on the client.
    setIsClientMounted(true);
  }, []);

  useEffect(() => {
    // This effect runs when isClientMounted becomes true.
    if (isClientMounted) {
      // Dynamically import createWeb3Modal only on the client side after mount
      import('@web3modal/wagmi/react').then(({ createWeb3Modal }) => {
        createWeb3Modal({
          wagmiConfig,
          projectId,
          chains,
          enableAnalytics: true, // Optional: add analytics
          // Add other Web3Modal configurations here if needed
        });
      }).catch(error => console.error('Failed to load Web3Modal', error));
      
      // Wagmi and Web3Modal generally handle reconnection attempts.
      // An explicit reconnect call here can sometimes cause issues if not handled carefully with SSR.
      // If specific reconnection logic is needed, it's often better tied to specific UI events or hooks.
      // Wagmi's WagmiProvider might also attempt reconnection based on its configuration.
    }
  }, [isClientMounted]); // Depends on isClientMounted

  // Conditional rendering based on client mount status
  // This ensures children are only rendered once we're on the client and ready.
  // The outer dynamic import in ClientSideWeb3ProviderLoader handles the initial loading UI.
  if (!isClientMounted) {
    // While isClientMounted is false, this component (and its children) won't render.
    // The loading UI is handled by the `loading` prop of the `dynamic` import in ClientSideWeb3ProviderLoader.
    return null; 
  }

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}> {/* reconnectOnMount={false} is often good for SSR/dynamic setups */}
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
