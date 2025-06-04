
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
    features: { analytics: false } // Changed from true to false
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
    let technicalDetails = `Project ID Missing: ${isProjectIdMissing}, Project ID Placeholder: ${isProjectIdPlaceholder}, Wagmi Adapter Invalid: ${isWagmiAdapterInvalid}`;

    if (isProjectIdMissing) {
      errorMessageLine2 = "The <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> environment variable is missing. Please add it to your <code>.env</code> file and restart your development server.";
    } else if (isProjectIdPlaceholder) {
      errorMessageLine2 = "The <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> is still set to the placeholder '<code>your_wallet_connect_project_id_here</code>'. Please replace it with your actual Project ID in your <code>.env</code> file and restart your development server.";
    } else if (isWagmiAdapterInvalid) {
        errorMessageLine1 = "Wallet Provider Internal Error: Wagmi adapter or config failed to initialize. This might be an internal application issue.";
        errorMessageLine2 = "Please check the console for more specific errors from wagmiAdapter initialization in walletConfig.ts."
    }
    
    return (
      <div style={{ padding: '20px', margin: '20px auto', maxWidth: '700px', border: '2px solid #FF4747', borderRadius: '8px', backgroundColor: '#FFF0F0', color: '#D20000', fontFamily: 'monospace', textAlign: 'left' }}>
        <h1 style={{ fontSize: '1.5em', marginBottom: '15px', color: '#A70000', borderBottom: '1px solid #FFBDBD', paddingBottom: '10px' }}>🚧 Application Error: Wallet Services Misconfigured 🚧</h1>
        <h2 style={{ fontSize: '1.2em', marginBottom: '10px', color: '#A70000' }}>{errorMessageTitle}</h2>
        <p dangerouslySetInnerHTML={{ __html: errorMessageLine1 }} style={{ marginBottom: '10px', fontSize: '0.9em', lineHeight: '1.4' }} />
        <p dangerouslySetInnerHTML={{ __html: errorMessageLine2 }} style={{ marginBottom: '15px', fontSize: '0.9em', lineHeight: '1.4' }} />
        <p style={{ fontSize: '0.8em', color: '#7F0000', marginTop:'10px', paddingTop:'10px', borderTop:'1px dashed #FFBDBD' }}><strong>Technical Details:</strong> {technicalDetails}</p>
        <p style={{ fontSize: '0.9em', marginTop: '20px', fontWeight: 'bold' }}>The rest of the application cannot load until this configuration issue is resolved.</p>
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
