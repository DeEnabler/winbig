// src/components/providers/WalletKitProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import {
  wagmiConfig,
  projectId as ImportedProjectId,
  chains as ImportedChains,
  metadata as ImportedMetadata
} from '@/config/walletConfig';

const queryClient = new QueryClient();

const projectId = ImportedProjectId; // Use the imported projectId

if (!projectId || projectId === 'your_wallet_connect_project_id_here') {
  console.error(
    '[Web3ModalProvider] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined or is still the placeholder. Web3Modal will likely not work.'
  );
}

const chains = ImportedChains;
const metadata = ImportedMetadata;

const isProjectIdValid = projectId && projectId !== 'your_wallet_connect_project_id_here';

if (isProjectIdValid) {
  // Log all parameters being passed to createWeb3Modal
  console.log('[Web3ModalProvider] About to call createWeb3Modal with:', {
    wagmiConfig,
    projectId,
    chains,
    metadata,
    enableAnalytics: true, // Explicitly set analytics
  });
  try {
    createWeb3Modal({
      wagmiConfig: wagmiConfig,
      projectId: projectId,
      chains: chains,
      metadata: metadata,
      enableAnalytics: true, // Explicitly enabling analytics to see if it affects the 403 or sv parameter
      // You can add other Web3Modal options here, like:
      // themeMode: 'dark',
      // themeVariables: {
      //   '--w3m-font-family': 'Roboto, sans-serif',
      //   '--w3m-accent': '#A020F0', // Your primary purple
      // }
    });
    console.log('[Web3ModalProvider] createWeb3Modal called successfully.');
  } catch (error) {
    console.error('[Web3ModalProvider] Error calling createWeb3Modal:', error);
  }
} else {
  console.warn('[Web3ModalProvider] createWeb3Modal not called due to invalid or missing projectId.');
}


export function WalletKitProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    console.log('[Web3ModalProvider] Component mounted.');
  }, []);

  if (!isMounted) {
    console.log('[Web3ModalProvider] Not mounted yet, rendering null.');
    return null;
  }

  console.log('[Web3ModalProvider] Rendering with WagmiProvider and QueryClientProvider.');
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default WalletKitProvider;
