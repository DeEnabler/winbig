
// src/components/providers/WalletKitProvider.tsx
'use client';

import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit, type AppKitModal } from '@reown/appkit/react';
import { wagmiAdapter, projectId as ImportedProjectId, appKitNetworks, metadata } from '@/config/walletConfig';

let appKitModalInstance: AppKitModal | null = null;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

if (ImportedProjectId && ImportedProjectId !== PLACEHOLDER_PROJECT_ID) {
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
  if (!ImportedProjectId) {
    console.error("[WalletKitProvider] CRITICAL: projectId is undefined (NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing from .env). Wallet functionality will be disabled. RESTART server after adding to .env.");
  } else if (ImportedProjectId === PLACEHOLDER_PROJECT_ID) {
    console.error(`[WalletKitProvider] CRITICAL: projectId is the placeholder '${PLACEHOLDER_PROJECT_ID}'. Wallet functionality will be disabled. Update .env and RESTART server.`);
  }
}

export const appKitModal = appKitModalInstance;

const queryClient = new QueryClient();

export function WalletKitProvider({ children }: { children: ReactNode }) {
  const isProjectIdMissing = !ImportedProjectId;
  const isProjectIdPlaceholder = ImportedProjectId === PLACEHOLDER_PROJECT_ID;

  if (isProjectIdMissing || isProjectIdPlaceholder || !wagmiAdapter || !wagmiAdapter.wagmiConfig) {
    let errorMessage = "The application encountered an issue initializing wallet connection services.";
    let actionMessage = "Please ensure this variable is correctly set in your <code>.env</code> file at the root of your project, and then <strong>restart your development server</strong>.";

    if (isProjectIdMissing) {
      errorMessage = "Wallet Provider Configuration Error: <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> is missing.";
    } else if (isProjectIdPlaceholder) {
      errorMessage = `Wallet Provider Configuration Error: <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> is using a placeholder value (<code>${PLACEHOLDER_PROJECT_ID}</code>).`;
      actionMessage = "Please replace it with your actual WalletConnect Project ID in the <code>.env</code> file, and then <strong>restart your development server</strong>.";
    } else if (!wagmiAdapter || !wagmiAdapter.wagmiConfig) {
       errorMessage = "Wallet Provider Internal Error: Wagmi adapter or config failed to initialize.";
       actionMessage = "This might be a code issue or a problem with the @reown/appkit-adapter-wagmi package itself."
    }
    
    console.error('[WalletKitProvider] Cannot render: Crucial wallet configuration is missing or incorrect.');
    return (
      <div style={{ padding: '20px', margin: '20px auto', maxWidth: '800px', textAlign: 'center', color: 'hsl(var(--destructive-foreground))', backgroundColor: 'hsl(var(--destructive))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontFamily: 'sans-serif' }}>
        <h2 style={{ fontSize: '1.5em', marginBottom: '10px' }}>Wallet Services Offline</h2>
        <p dangerouslySetInnerHTML={{ __html: errorMessage }} style={{ marginBottom: '5px' }} />
        <p dangerouslySetInnerHTML={{ __html: actionMessage }} style={{ marginBottom: '15px' }} />
        <p style={{ marginTop: '10px', fontSize: '0.9em' }}>Wallet functionality will be unavailable until this is resolved.</p>
        <p style={{ marginTop: '5px', fontSize: '0.8em', color: 'hsl(var(--muted-foreground))' }}>
          (The rest of the application below might still attempt to load or show its own content/errors)
        </p>
        <div style={{ marginTop: '20px', borderTop: '1px solid hsl(var(--border))', paddingTop: '20px', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
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

