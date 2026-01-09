'use client';

import React from 'react';
import { WagmiProvider, State } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig, initializeAppKit } from './wagmi-config';

const queryClient = new QueryClient();

// Initialize AppKit immediately when this module loads on the client
// This ensures createAppKit is called before any useAppKit hooks run
if (typeof window !== 'undefined') {
  initializeAppKit();
}

export const WalletKitProvider = ({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: State;
}) => {
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};
