
// src/components/providers/Web3ModalProvider.tsx
'use client';

import type { ReactNode } from 'react';
import { WagmiProvider, reconnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// createWeb3Modal will be dynamically imported
import { wagmiConfig, projectId, chains } from '@/config/walletConfig';
import { useEffect, useState } from 'react';

if (!projectId) throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set in Web3ModalProvider');

// Setup queryClient
const queryClient = new QueryClient();

export function Web3ModalProvider({ children }: { children: ReactNode }) {
  // State to ensure client-side only execution for modal creation
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  useEffect(() => {
    if (isClientMounted) {
      // Dynamically import createWeb3Modal only on the client side after mount
      import('@web3modal/wagmi/react').then(({ createWeb3Modal }) => {
        createWeb3Modal({
          wagmiConfig,
          projectId,
          chains,
          enableAnalytics: true,
        });
      }).catch(error => console.error('Failed to load Web3Modal', error));
      
      // Attempt to reconnect if wallet was previously connected
      reconnect(wagmiConfig);
    }
  }, [isClientMounted]);

  // Prevent rendering children until the client has mounted and Web3Modal can be initialized.
  // This is important because children might try to use wagmi hooks that depend on initialization.
  if (!isClientMounted) {
     // You might want to return a full-page loader or null if the loading state in layout.tsx is preferred
    return null; 
  }

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
