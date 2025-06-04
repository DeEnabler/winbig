// src/components/providers/WalletKitProvider.tsx
'use client';

import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit, type AppKitModal } from '@reown/appkit/react';
import { wagmiAdapter, projectId, appKitNetworks, metadata } from '@/config/walletConfig';

if (!projectId) {
  console.error("[WalletKitProvider] CRITICAL: projectId is undefined during AppKit creation! Wallet connections will likely fail.");
}

// Create the Reown AppKit modal instance
// This needs to run client-side; the 'use client' directive handles this.
export const appKitModal: AppKitModal = createAppKit({
  adapters: [wagmiAdapter],
  projectId: projectId!, // Non-null assertion, checked above
  networks: appKitNetworks,
  defaultNetwork: appKitNetworks[0] || undefined,
  metadata,
  features: { analytics: true } // Following CryptoIndexFund example
});

console.log('[WalletKitProvider] Reown AppKit modal instance (appKitModal) created.');

const queryClient = new QueryClient();

export function WalletKitProvider({ children }: { children: ReactNode }) {
  console.log('[WalletKitProvider] Rendering with WagmiProvider (using config from wagmiAdapter).');
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
