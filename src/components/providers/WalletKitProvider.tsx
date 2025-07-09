
// src/components/providers/WalletKitProvider.tsx
'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// Dynamically import the actual provider logic with SSR turned off
const ClientOnlyWalletKit = dynamic(
  () => import('./ClientOnlyWalletKit').then(mod => mod.ClientOnlyWalletKit),
  {
    ssr: false,
    // Optional: add a loading component while the client-side code is loading
    loading: () => <div style={{ display: 'none' }}>Loading Wallet...</div>
  }
);

export function WalletKitProvider({ children }: { children: ReactNode }) {
  // The dynamically imported component will be rendered here on the client
  return <ClientOnlyWalletKit>{children}</ClientOnlyWalletKit>;
}

export default WalletKitProvider;
