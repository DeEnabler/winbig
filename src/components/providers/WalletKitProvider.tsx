'use client';

import React from 'react';
import { WagmiProvider, State } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit';
import { config, wagmiAdapter, projectId, networks, metadata } from './wagmi-config';

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  enableAnalytics: true,
  themeMode: 'dark',
});

const queryClient = new QueryClient();

export const WalletKitProvider = ({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: State;
}) => {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};
