
// src/components/providers/WalletKitProvider.tsx
'use client';

import type { ReactNode } from 'react';
import { WagmiProvider, cookieToInitialState, type Config } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { wagmiConfig, chains, projectId as ImportedProjectId, metadata as ImportedMetadata } from '@/config/walletConfig';

const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here';

const isProjectIdMissing = !ImportedProjectId;
const isProjectIdPlaceholder = ImportedProjectId === PLACEHOLDER_PROJECT_ID;
const isWagmiConfigInvalid = !wagmiConfig;

if (!isProjectIdMissing && !isProjectIdPlaceholder && !isWagmiConfigInvalid) {
  try {
    console.log('[Web3ModalProvider] About to call createWeb3Modal with:', {
      wagmiConfigType: typeof wagmiConfig,
      projectId: ImportedProjectId,
      chains: chains.map(n => ({id: n.id, name: n.name})),
      metadata: ImportedMetadata,
      enableEmail: true, // Example: Enable email login if desired
    });

    createWeb3Modal({
      wagmiConfig: wagmiConfig as Config, // Ensure wagmiConfig is correctly typed
      projectId: ImportedProjectId!,
      chains: chains,
      themeMode: 'light', // Or 'dark', 'auto'
      metadata: ImportedMetadata,
      enableEmail: true, // Optional: For Web3Modal's email login feature
      // Add other Web3Modal configurations here as needed
      // e.g., featuredWalletIds, defaultChain, etc.
    });
    console.log('[Web3ModalProvider] Web3Modal created successfully.');
  } catch (e) {
    console.error("[Web3ModalProvider] CRITICAL: Error during createWeb3Modal initialization.", e);
  }
} else {
  if (isProjectIdMissing) {
    console.error("[Web3ModalProvider] CRITICAL: projectId is undefined (NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing or invalid in .env). Wallet functionality will be disabled. RESTART server after adding/fixing in .env.");
  } else if (isProjectIdPlaceholder) {
    console.error(`[Web3ModalProvider] CRITICAL: projectId is the placeholder '${PLACEHOLDER_PROJECT_ID}'. Wallet functionality will be disabled. Update .env and RESTART server.`);
  }
  if (isWagmiConfigInvalid) {
    console.error("[Web3ModalProvider] CRITICAL: wagmiConfig is not available. Cannot create Web3Modal.");
  }
}

const queryClient = new QueryClient();

interface WalletKitProviderProps {
  children: ReactNode;
  cookies: string | null;
}

export function WalletKitProvider({ children, cookies }: WalletKitProviderProps) {
  if (isProjectIdMissing || isProjectIdPlaceholder) {
    let errorMessageLine1 = "The application encountered a critical issue initializing wallet connection services due to a misconfigured WalletConnect Project ID, which prevents the app from loading core Web3 features.";
    let errorMessageLine2 = "Please ensure the <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> variable is correctly set in your <code>.env</code> file at the root of your project (it should NOT be '<code>your_wallet_connect_project_id_here</code>' and must not be empty), and then <strong>thoroughly restart your development server</strong>.";

    if (isProjectIdMissing) {
        errorMessageLine2 = "The <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> environment variable is missing entirely from your <code>.env</code> file or is invalid (e.g. 'undefined' string). Please add/fix it and restart your development server.";
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
          <strong>Technical Details:</strong> Project ID Missing or Invalid: <strong>{String(isProjectIdMissing)}</strong>, Project ID is Placeholder: <strong>{String(isProjectIdPlaceholder)}</strong>.
        </p>
        <p style={{ fontSize: '1em', marginTop: '25px', fontWeight: 'bold' }}>The rest of the application, especially Web3 features, cannot load until this configuration issue is resolved.</p>
      </div>
    );
  }

  if (isWagmiConfigInvalid) {
     console.error("[Web3ModalProvider] CRITICAL: wagmiConfig is not available even though Project ID seems okay. Web3Modal might have failed to initialize properly.");
     return (
      <div style={{ padding: '20px', margin: '20px auto', maxWidth: '800px', border: '3px solid #FF1744', borderRadius: '10px', backgroundColor: '#FFEBEE', color: '#B71C1C', fontFamily: 'monospace', textAlign: 'left', lineHeight: '1.6' }}>
        <h1 style={{ fontSize: '1.8em', marginBottom: '20px', color: '#D32F2F', borderBottom: '2px solid #FFCDD2', paddingBottom: '15px' }}>🚧 Application Error: Wallet Provider Initialization Failed 🚧</h1>
        <p style={{ marginBottom: '15px', fontSize: '1em' }}>
            The Wagmi wallet provider configuration could not be loaded. This might be due to an internal error within the Web3Modal setup.
        </p>
        <p style={{ marginBottom: '20px', fontSize: '1em' }}>
            Please check the browser console for more specific errors originating from <code>createWeb3Modal</code> or the <code>wagmiConfig</code> in <code>walletConfig.ts</code>.
        </p>
        <p style={{ fontSize: '1em', marginTop: '25px', fontWeight: 'bold' }}>Web3 features will be unavailable.</p>
      </div>
     );
  }

  const initialState = cookieToInitialState(
    wagmiConfig as Config,
    cookies
  );

  console.log('[Web3ModalProvider] Rendering with WagmiProvider.');
  return (
    <WagmiProvider config={wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
