import type { AppKitNetwork } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, polygon, bsc } from '@reown/appkit/networks';
import { cookieStorage, createStorage, createConfig, http } from 'wagmi';

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';

if (!projectId) {
  console.warn('⚠️ Reown Project ID is not set. Wallet functionality will be disabled.');
  console.warn('💡 Add NEXT_PUBLIC_REOWN_PROJECT_ID to your .env.local file.');
}

export const metadata = {
  name: 'WinBig',
  description: 'WinBig App',
  url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://winbig.com',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
};

export const networks: AppKitNetwork[] = [mainnet, polygon, bsc];

export const config = createConfig({
  chains: [mainnet, polygon, bsc],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
  },
});

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
}); 