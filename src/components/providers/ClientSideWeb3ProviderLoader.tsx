// src/components/providers/ClientSideWeb3ProviderLoader.tsx
'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the WalletKitProvider, ensuring it's only loaded on the client
const ActualWalletKitProvider = dynamic(
  () => import('@/components/providers/WalletKitProvider').then((mod) => mod.WalletKitProvider),
  {
    ssr: false, // This is crucial for client-side only rendering
    loading: () => (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
        <p>Loading Wallet Services...</p>
      </div>
    ),
  }
);

const DevBypassWeb3Notice = () => (
  <div style={{
    position: 'fixed',
    bottom: '10px',
    left: '10px',
    backgroundColor: 'rgba(255, 229, 100, 0.9)', // Light yellow
    color: '#333',
    padding: '10px 15px',
    borderRadius: '8px',
    border: '1px solid #ffc107', // Amber
    zIndex: 10000,
    fontSize: '14px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: 'calc(100% - 20px)'
  }}>
    <p style={{ margin: 0, fontWeight: 'bold' }}>⚠️ Web3 Providers Disabled (Dev Mode)</p>
    <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
      Set <code>NEXT_PUBLIC_DISABLE_WEB3_PROVIDERS_DEV_ONLY=false</code> in <code>.env</code> and restart server to enable.
    </p>
  </div>
);


export default function ClientSideWeb3ProviderLoader({ children }: { children: ReactNode }) {
  const disableWeb3Providers = process.env.NEXT_PUBLIC_DISABLE_WEB3_PROVIDERS_DEV_ONLY === 'true';

  if (disableWeb3Providers) {
    console.warn(
      '[ClientSideWeb3ProviderLoader] DEV_ONLY: Web3 providers are disabled. UI will render, but Web3 functionality will be broken. Set NEXT_PUBLIC_DISABLE_WEB3_PROVIDERS_DEV_ONLY=false in .env to enable.'
    );
    return (
      <>
        {children}
        <DevBypassWeb3Notice />
      </>
    );
  }

  return <ActualWalletKitProvider>{children}</ActualWalletKitProvider>;
}
