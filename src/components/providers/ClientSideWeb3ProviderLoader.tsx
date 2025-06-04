// src/components/providers/ClientSideWeb3ProviderLoader.tsx
'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the new WalletKitProvider, ensuring it's only loaded on the client
const ActualWalletKitProvider = dynamic(
  () => import('@/components/providers/WalletKitProvider').then((mod) => mod.WalletKitProvider),
  {
    ssr: false, // This is crucial for client-side only rendering
    loading: () => (
      // This loading state will be shown while the ActualWalletKitProvider is being fetched on the client
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
        <p>Loading Wallet Services...</p>
      </div>
    ),
  }
);

export default function ClientSideWeb3ProviderLoader({ children }: { children: ReactNode }) {
  return <ActualWalletKitProvider>{children}</ActualWalletKitProvider>;
}
