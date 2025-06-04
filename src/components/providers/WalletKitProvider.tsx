
// src/components/providers/WalletKitProvider.tsx
'use client';

import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit, type AppKitModal } from '@reown/appkit/react';
import { wagmiAdapter, projectId as ImportedProjectId, appKitNetworks, metadata } from '@/config/walletConfig';

let appKitModalInstance: AppKitModal | null = null;

if (ImportedProjectId) {
  // Ensure wagmiAdapter and its config are valid before creating appKitModal
  if (wagmiAdapter && wagmiAdapter.wagmiConfig) {
    appKitModalInstance = createAppKit({
      adapters: [wagmiAdapter],
      projectId: ImportedProjectId,
      networks: appKitNetworks,
      defaultNetwork: appKitNetworks[0] || undefined,
      metadata,
      features: { analytics: true }
    });
    console.log('[WalletKitProvider] Reown AppKit modal instance (appKitModal) created with projectId:', ImportedProjectId);
  } else {
    console.error("[WalletKitProvider] CRITICAL: wagmiAdapter or wagmiAdapter.wagmiConfig is not available. Cannot create AppKit modal.");
  }
} else {
  console.error("[WalletKitProvider] CRITICAL: projectId is undefined. Wallet functionality will be disabled. Ensure NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set in your .env file and the server is restarted.");
}

export const appKitModal = appKitModalInstance;

const queryClient = new QueryClient();

export function WalletKitProvider({ children }: { children: ReactNode }) {
  // Check if essential configurations are missing
  if (!ImportedProjectId || !wagmiAdapter || !wagmiAdapter.wagmiConfig) {
    console.error('[WalletKitProvider] Cannot render: projectId or wagmiAdapter/wagmiConfig is missing.');
    // Display an error message within the app UI
    return (
      <div style={{ padding: '20px', margin: '20px auto', maxWidth: '600px', textAlign: 'center', color: 'hsl(var(--destructive-foreground))', backgroundColor: 'hsl(var(--destructive))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}>
        <h2>Wallet Provider Configuration Error</h2>
        <p>The application encountered an issue initializing the wallet connection services.</p>
        <p>This is likely due to a missing <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code>.</p>
        <p><strong>Action Required:</strong> Please ensure this variable is correctly set in your <code>.env</code> file at the root of your project, and then <strong>restart your development server</strong>.</p>
        <p style={{ marginTop: '10px', fontSize: '0.9em' }}>Wallet functionality will be unavailable until this is resolved.</p>
        {/* Render children below the error message so other parts of the app might still attempt to load or show their own content/errors. */}
        <div style={{ marginTop: '20px', borderTop: '1px solid hsl(var(--border))', paddingTop: '20px' }}>
          {children}
        </div>
      </div>
    );
  }

  console.log('[WalletKitProvider] Rendering with WagmiProvider.');
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
