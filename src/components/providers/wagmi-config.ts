import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, polygon } from '@reown/appkit/networks';
import { cookieStorage, createStorage } from 'wagmi';

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) throw new Error('Project ID is not defined');

export const metadata = {
  name: 'WinBig',
  description: 'WinBig App',
  url: 'https://winbig.com',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
};

export const networks = [mainnet, polygon];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
});

export const config = wagmiAdapter.wagmiConfig; 