
// src/components/providers/Web3ModalProvider.tsx
'use client';

import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { wagmiConfig, projectId, chains } from '@/config/walletConfig';

if (!projectId) throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set in Web3ModalProvider');

// Create modal
createWeb3Modal({
  wagmiConfig,
  projectId,
  chains,
  enableAnalytics: true, // Optional - defaults to your WalletConnect Cloud configuration
  // You can customize the modal theme here if needed
  // themeMode: 'light', 
  // themeVariables: {
  //   '--w3m-font-family': 'Roboto, sans-serif',
  //   '--w3m-accent': '#A020F0' // Example primary color
  // }
});

// Setup queryClient
const queryClient = new QueryClient();

export function Web3ModalProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
