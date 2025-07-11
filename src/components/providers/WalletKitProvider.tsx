'use client';

import React, { useEffect, useRef } from 'react';
import { WagmiProvider, State } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit';
import { config, wagmiAdapter, projectId, networks } from './wagmi-config';

const queryClient = new QueryClient();

export const WalletKitProvider = ({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: State;
}) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      const metadata = {
        name: 'WinBig',
        description: 'WinBig App',
        url: window.location.origin,
        icons: ['https://avatars.githubusercontent.com/u/179229932']
      };
      createAppKit({
        adapters: [wagmiAdapter],
        projectId,
        networks,
        metadata,
        themeMode: 'dark',
      });
      initialized.current = true;
    }
  }, []);

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};
