// src/components/providers/ClientSideWeb3ProviderLoader.tsx
'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the actual Web3ModalProvider, ensuring it's only loaded on the client
const ActualWeb3ModalProvider = dynamic(
  () => import('@/components/providers/Web3ModalProvider').then((mod) => mod.Web3ModalProvider),
  {
    ssr: false, // This is crucial for client-side only rendering of Web3ModalProvider
    loading: () => (
      // This loading state will be shown while the ActualWeb3ModalProvider is being fetched on the client
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
        <p>Loading Wallet Services...</p>
      </div>
    ),
  }
);

export default function ClientSideWeb3ProviderLoader({ children }: { children: ReactNode }) {
  return <ActualWeb3ModalProvider>{children}</ActualWeb3ModalProvider>;
}
