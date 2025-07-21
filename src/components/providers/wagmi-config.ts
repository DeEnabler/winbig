import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { createAppKit } from '@reown/appkit/react'
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
  url: 'https://www.winbig.fun',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
};

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  projectId,
  networks: [bsc],
  ssr: true,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [bsc],
  metadata,
});

// Legacy exports for backward compatibility
export const config = wagmiConfig;
export const networks = [bsc];