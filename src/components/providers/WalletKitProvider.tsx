
// src/components/providers/WalletKitProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { wagmiConfig, chains, projectId as ImportedProjectId, metadata as ImportedMetadata } from '@/config';

const queryClient = new QueryClient();

const PLACEHOLDER_PROJECT_ID = 'your_wallet_connect_project_id_here'; // Or a more generic placeholder

// Ensure ImportedProjectId is treated as potentially undefined initially
const effectiveProjectId = ImportedProjectId === 'undefined' ? undefined : ImportedProjectId;

const isProjectIdValid = effectiveProjectId && effectiveProjectId !== PLACEHOLDER_PROJECT_ID && effectiveProjectId !== 'your_reown_project_id_here'; // Added reown placeholder check for safety

if (isProjectIdValid) {
  // Log all parameters being passed to createAppKit for debugging
  console.log('[AppKitProvider] Initializing AppKit. Config being passed:', {
    wagmiConfig,
    projectId: effectiveProjectId, // This should be your WalletConnect Cloud Project ID
    chains,
    metadata,
    enableAnalytics: false, // Explicitly setting to false for diagnostics
    // Other AppKit options can be added here:
    // themeMode: 'light',
    // themeVariables: {
    //   '--w3m-font-family': 'inherit', // Use app's font
    //   '--w3m-accent': 'hsl(var(--primary))', // Use app's primary color
    //   '--w3m-border-radius-master': 'var(--radius)', // Use app's border radius
    //   // ... more theme variables
    // },
  });
  try {
    createAppKit({
      wagmiConfig: wagmiConfig,
      projectId: effectiveProjectId,
      chains: chains,
      metadata: metadata,
      enableAnalytics: false, // Explicitly set to false for diagnostics
      // You can add other AppKit options here, like:
      // themeMode: 'dark',
      // themeVariables: {
      //   '--w3m-font-family': 'Roboto, sans-serif',
      //   '--w3m-accent': '#A020F0', // Your primary purple
      // }
    });
    console.log('[AppKitProvider] AppKit created successfully with analytics disabled.');
  } catch (error) {
    console.error('[AppKitProvider] Error calling createAppKit:', error);
  }
} else {
  if (!effectiveProjectId) {
    console.error('[AppKitProvider] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined. AppKit will not be initialized.');
  } else if (effectiveProjectId === PLACEHOLDER_PROJECT_ID || effectiveProjectId === 'your_reown_project_id_here') {
    console.error(`[AppKitProvider] CRITICAL ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is still the placeholder value "${effectiveProjectId}". AppKit will not be initialized.`);
  } else {
    console.warn('[AppKitProvider] createAppKit not called due to invalid or missing projectId. Current effectiveProjectId:', effectiveProjectId);
  }
}

export function WalletKitProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    console.log('[AppKitProvider] Component mounted.');
  }, []);

  if (!isMounted) {
    console.log('[AppKitProvider] Not mounted yet, rendering null.');
    return null; // Or a loading spinner
  }

  if (!isProjectIdValid) {
    console.warn("[AppKitProvider] WalletKitProvider rendered, but AppKit was not initialized due to invalid Project ID. Wallet functionality will be impaired.");
    // Optionally render a message to the user or a disabled state
  }

  console.log('[AppKitProvider] Rendering with WagmiProvider.');
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default WalletKitProvider;
