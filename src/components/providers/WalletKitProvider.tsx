
// src/components/providers/WalletKitProvider.tsx
'use client';

import type { ReactNode } from 'react';
import { WagmiProvider, cookieToInitialState, type Config } from 'wagmi'; // Import cookieToInitialState and Config
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit, type AppKitModal } from '@reown/appkit/react';
import { wagmiAdapter, projectId as ImportedProjectId, appKitNetworks, metadata } from '@/config/walletConfig';

let appKitModalInstance: AppKitModal | null = null;
const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

const isProjectIdMissing = !ImportedProjectId;
const isProjectIdPlaceholder = ImportedProjectId === PLACEHOLDER_PROJECT_ID;
const isWagmiAdapterInvalid = !wagmiAdapter || !wagmiAdapter.wagmiConfig;

if (!isProjectIdMissing && !isProjectIdPlaceholder && !isWagmiAdapterInvalid) {
  try {
    appKitModalInstance = createAppKit({
      adapters: [wagmiAdapter!],
      projectId: ImportedProjectId!,
      networks: appKitNetworks,
      defaultNetwork: appKitNetworks[0] || undefined,
      metadata,
      features: { analytics: false } 
    });
    console.log('[WalletKitProvider] Reown AppKit modal instance (appKitModal) created with projectId:', ImportedProjectId);
  } catch (e) {
    console.error("[WalletKitProvider] CRITICAL: Error during createAppKit initialization.", e);
  }
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

interface WalletKitProviderProps {
  children: ReactNode;
  cookies: string | null; // Accept cookies prop
}

export function WalletKitProvider({ children, cookies }: WalletKitProviderProps) {
  if (isProjectIdMissing || isProjectIdPlaceholder) {
    let errorMessageLine1 = "The application encountered a critical issue initializing wallet connection services due to a misconfigured WalletConnect Project ID, which prevents the app from loading core Web3 features.";
    let errorMessageLine2 = "Please ensure the <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> variable is correctly set in your <code>.env</code> file at the root of your project (it should NOT be '<code>your_wallet_connect_project_id_here</code>' and must not be empty), and then <strong>thoroughly restart your development server</strong>.";
    
    if (isProjectIdMissing) {
        errorMessageLine2 = "The <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> environment variable is missing entirely from your <code>.env</code> file. Please add it and restart your development server.";
    } else if (isProjectIdPlaceholder) {
        errorMessageLine2 = "The <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> is still set to the placeholder '<code>your_wallet_connect_project_id_here</code>'. Please replace it with your actual Project ID in your <code>.env</code> file and restart your development server.";
    }

    return (
      <div style={{ padding: '20px', margin: '20px auto', maxWidth: '800px', border: '3px solid #FF1744', borderRadius: '10px', backgroundColor: '#FFEBEE', color: '#B71C1C', fontFamily: 'monospace', textAlign: 'left', lineHeight: '1.6' }}>
        <h1 style={{ fontSize: '1.8em', marginBottom: '20px', color: '#D32F2F', borderBottom: '2px solid #FFCDD2', paddingBottom: '15px' }}>🚧 Application Error: WalletConnect Misconfiguration 🚧</h1>
        <h2 style={{ fontSize: '1.3em', marginBottom: '15px', color: '#D32F2F' }}>Wallet Services Offline</h2>
        <p dangerouslySetInnerHTML={{ __html: errorMessageLine1 }} style={{ marginBottom: '15px', fontSize: '1em' }} />
        <p dangerouslySetInnerHTML={{ __html: errorMessageLine2 }} style={{ marginBottom: '20px', fontSize: '1em' }} />
        <p style={{ fontSize: '0.9em', color: '#7F0000', marginTop:'15px', paddingTop:'15px', borderTop:'1px dashed #FFCDD2' }}>
          <strong>Technical Details:</strong> Project ID Missing: <strong>{String(isProjectIdMissing)}</strong>, Project ID is Placeholder: <strong>{String(isProjectIdPlaceholder)}</strong>.
        </p>
        <p style={{ fontSize: '1em', marginTop: '25px', fontWeight: 'bold' }}>The rest of the application, especially Web3 features, cannot load until this configuration issue is resolved.</p>
      </div>
    );
  }

  if (isWagmiAdapterInvalid || !wagmiAdapter.wagmiConfig) {
     console.error("[WalletKitProvider] CRITICAL: wagmiAdapter.wagmiConfig is not available even though Project ID seems okay. AppKit might have failed to initialize properly.");
     return (
      <div style={{ padding: '20px', margin: '20px auto', maxWidth: '800px', border: '3px solid #FF1744', borderRadius: '10px', backgroundColor: '#FFEBEE', color: '#B71C1C', fontFamily: 'monospace', textAlign: 'left', lineHeight: '1.6' }}>
        <h1 style={{ fontSize: '1.8em', marginBottom: '20px', color: '#D32F2F', borderBottom: '2px solid #FFCDD2', paddingBottom: '15px' }}>🚧 Application Error: Wallet Provider Initialization Failed 🚧</h1>
        <p style={{ marginBottom: '15px', fontSize: '1em' }}>
            The Wagmi wallet provider could not be initialized. This might be due to an internal error within the AppKit setup.
        </p>
        <p style={{ marginBottom: '20px', fontSize: '1em' }}>
            Please check the browser console for more specific errors originating from <code>createAppKit</code> or the <code>WagmiAdapter</code> in <code>walletConfig.ts</code>.
        </p>
        <p style={{ fontSize: '1em', marginTop: '25px', fontWeight: 'bold' }}>Web3 features will be unavailable.</p>
      </div>
     );
  }
  
  // Use cookieToInitialState for SSR and better connection persistence
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config, // Cast to Config as WagmiAdapter might not have perfect type alignment
    cookies 
  );

  console.log('[WalletKitProvider] Rendering with WagmiProvider (using config from wagmiAdapter and initialState from cookies).');
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}> {/* Use initialState, remove reconnectOnMount */}
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
