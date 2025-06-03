
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
  // State to ensure modal is initialized before children (and hooks like useWeb3Modal) are rendered
  const [isModalInitialized, setIsModalInitialized] = useState(false);

  useEffect(() => {
    // This effect runs once after the component mounts on the client.
    // Dynamically import createWeb3Modal and initialize it.
    import('@web3modal/wagmi/react').then(({ createWeb3Modal }) => {
      createWeb3Modal({
        wagmiConfig,
        projectId,
        chains,
        enableAnalytics: true, // Optional: add analytics
        // Add other Web3Modal configurations here if needed
      });
      setIsModalInitialized(true); // Signal that modal is ready
    }).catch(error => {
      console.error('Failed to load or create Web3Modal', error);
      // Optionally, set an error state here to render an error message to the user
    });
    
    // Wagmi and Web3Modal generally handle reconnection attempts.
    // Wagmi's WagmiProvider might also attempt reconnection based on its configuration.
  }, []); // Empty dependency array ensures this runs once on mount

  // Render children only after the modal is initialized.
  // The loading state for the initial load of this provider component is handled by ClientSideWeb3ProviderLoader.
  // If !isModalInitialized, this component renders null, effectively waiting for the modal setup.
  if (!isModalInitialized) {
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
