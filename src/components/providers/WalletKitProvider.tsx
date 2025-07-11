'use client';

import React from 'react';
import { WagmiProvider, State } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit';
import { config, wagmiAdapter, projectId, networks } from './wagmi-config';

const metadata = {
  name: 'WinBig',
  description: 'WinBig App',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://winbig.com',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
};

let isAppKitInitialized = false;

if (!isAppKitInitialized) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks,
    metadata,
    themeMode: 'dark',
  });
  isAppKitInitialized = true;
}

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
