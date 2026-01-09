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

// Lazy initialization of appKit to ensure it's created on client side only
let _appKit: AppKit | null = null;

function getOrCreateAppKit(): AppKit {
  if (_appKit) return _appKit;
  
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

// Export a proxy that lazily initializes appKit
export const appKit = new Proxy({} as AppKit, {
  get(_target, prop) {
    const kit = getOrCreateAppKit();
    const value = (kit as any)[prop];
    if (typeof value === 'function') {
      return value.bind(kit);
    }
    return value;
  }
});

// Legacy exports for backward compatibility
export const config = wagmiConfig;
export const networks = [bsc];