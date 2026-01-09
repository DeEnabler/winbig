import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { createAppKit, type AppKit } from '@reown/appkit/react'
import { bsc } from '@reown/appkit/networks'
import { createStorage, cookieStorage } from '@wagmi/core'

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';

if (!projectId) {
  console.warn('⚠️ Reown Project ID is not set. Wallet functionality will be disabled.');
  console.warn('💡 Add NEXT_PUBLIC_REOWN_PROJECT_ID to your .env.local file.');
}

export const metadata = {
  name: 'WinBig',
  description: 'WinBig Betting App',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://www.winbig.fun',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
};

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  projectId,
  networks: [bsc],
  ssr: true,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// AppKit instance - must be initialized before useAppKit hooks are called
let _appKit: AppKit | null = null;
let _isInitialized = false;

/**
 * Initialize AppKit. Must be called once on client side before any useAppKit hooks.
 * Safe to call multiple times - will only initialize once.
 */
export function initializeAppKit(): AppKit | null {
  if (typeof window === 'undefined') {
    return null; // SSR - don't initialize
  }
  
  if (_isInitialized) {
    return _appKit;
  }
  
  _isInitialized = true;
  
  if (!projectId) {
    console.warn('⚠️ Cannot initialize AppKit: Project ID is not set');
    return null;
  }
  
  _appKit = createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [bsc],
    metadata,
    // Enable features for better mobile support
    features: {
      analytics: true,
      email: false,
      socials: false,
    },
    // Allow all wallets including mobile
    allowUnsupportedChain: false,
    enableCoinbase: true,
  });
  
  return _appKit;
}

/**
 * Get the AppKit instance. Returns null if not initialized.
 */
export function getAppKit(): AppKit | null {
  return _appKit;
}

/**
 * AppKit instance proxy - provides safe access to the initialized AppKit.
 * Automatically initializes on first access if not already initialized.
 */
export const appKit = new Proxy({} as AppKit, {
  get(_target, prop) {
    // Try to initialize if not done yet (client-side only)
    if (!_isInitialized) {
      initializeAppKit();
    }
    
    if (!_appKit) {
      console.warn(`AppKit not initialized. Cannot access "${String(prop)}".`);
      // Return a no-op function to prevent crashes
      if (prop === 'open') {
        return () => {
          console.warn('AppKit.open() called but AppKit is not initialized');
        };
      }
      return undefined;
    }
    
    const value = (_appKit as any)[prop];
    if (typeof value === 'function') {
      return value.bind(_appKit);
    }
    return value;
  }
});

// Legacy exports for backward compatibility
export const config = wagmiConfig;
export const networks = [bsc];