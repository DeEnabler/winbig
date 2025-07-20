'use client';

import React from 'react';
import { WagmiProvider, State } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './wagmi-config';

const queryClient = new QueryClient();

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
