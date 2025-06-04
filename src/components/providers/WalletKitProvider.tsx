
// src/components/providers/WalletKitProvider.tsx
'use client';

import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit, type AppKitModal } from '@reown/appkit/react';
import { wagmiAdapter, projectId as ImportedProjectId, appKitNetworks, metadata } from '@/config/walletConfig';

let appKitModalInstance: AppKitModal | null = null;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

const isProjectIdMissing = !ImportedProjectId;
const isProjectIdPlaceholder = ImportedProjectId === PLACEHOLDER_PROJECT_ID;
const isWagmiAdapterInvalid = !wagmiAdapter || !wagmiAdapter.wagmiConfig;

if (!isProjectIdMissing && !isProjectIdPlaceholder && !isWagmiAdapterInvalid) {
  appKitModalInstance = createAppKit({
    adapters: [wagmiAdapter!], // Safe to assert non-null due to checks
    projectId: ImportedProjectId!, // Safe to assert non-null
    networks: appKitNetworks,
    defaultNetwork: appKitNetworks[0] || undefined,
    metadata,
    features: { analytics: true }
  });
  console.log('[WalletKitProvider] Reown AppKit modal instance (appKitModal) created with projectId:', ImportedProjectId);
} else {
  if (isProjectIdMissing) {
    console.error("[WalletKitProvider] CRITICAL: projectId is undefined (NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing from .env). Wallet functionality will be disabled. RESTART server after adding to .env.");
  } else if (isProjectIdPlaceholder) {
    console.error(`[WalletKitProvider] CRITICAL: projectId is the placeholder '${PLACEHOLDER_PROJECT_ID}'. Wallet functionality will be disabled. Update .env and RESTART server.`);
  }
  if (isWagmiAdapterInvalid) {
    console.error("[WalletKitProvider] CRITICAL: wagmiAdapter or wagmiAdapter.wagmiConfig is not available. Cannot create AppKit modal.");
  }
}

export const appKitModal = appKitModalInstance;

const queryClient = new QueryClient();

export function WalletKitProvider({ children }: { children: ReactNode }) {
  if (isProjectIdMissing || isProjectIdPlaceholder || isWagmiAdapterInvalid) {
    let errorMessageTitle = "Wallet Services Offline";
    let errorMessageLine1 = "The application encountered a critical issue initializing wallet connection services, which prevents the app from loading.";
    let errorMessageLine2 = "Please ensure the <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> variable is correctly set in your <code>.env</code> file at the root of your project (it should NOT be '<code>your_wallet_connect_project_id_here</code>'), and then <strong>thoroughly restart your development server</strong>.";

    if (isWagmiAdapterInvalid && !isProjectIdMissing && !isProjectIdPlaceholder) {
        errorMessageLine1 = "Wallet Provider Internal Error: Wagmi adapter or config failed to initialize. This might be an internal application issue.";
        errorMessageLine2 = "Please check the console for more specific errors from wagmiAdapter initialization in walletConfig.ts."
    }
    
    // Render ONLY the error message, not children, to make the problem unmissable
    return (
      <div style={{ padding: '40px', margin: '20px auto', maxWidth: '800px', textAlign: 'center', color: '#FFFFFF', backgroundColor: '#F06543', border: '2px solid #A04020', borderRadius: '8px', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '2em', marginBottom: '20px', color: '#A04020' }}>🚧 Application Error 🚧</h1>
        <h2 style={{ fontSize: '1.5em', marginBottom: '10px' }}>{errorMessageTitle}</h2>
        <p dangerouslySetInnerHTML={{ __html: errorMessageLine1 }} style={{ marginBottom: '15px', fontSize: '1.1em' }} />
        <p dangerouslySetInnerHTML={{ __html: errorMessageLine2 }} style={{ marginBottom: '20px', fontSize: '1.1em' }} />
        <p style={{ fontSize: '0.9em', color: '#FFE0D0' }}>The rest of the application cannot load until this configuration issue is resolved.</p>
      </div>
    );
  }

  console.log('[WalletKitProvider] Rendering with WagmiProvider.');
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig!} reconnectOnMount={true}> {/* Safe to assert due to checks */}
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
