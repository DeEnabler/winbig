
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { Toaster } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import AppLayout from '@/components/layout/AppLayout';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { EntryContextProvider } from '@/contexts/EntryContext';
import { UserProvider } from '@/contexts/UserContext';
import { WalletKitProvider } from '@/components/providers/WalletKitProvider';
import { cn } from '@/lib/utils';
import './globals.css';
import { cookieToInitialState } from 'wagmi';
import { headers } from 'next/headers';
import { wagmiConfig } from '@/components/providers/wagmi-config';
import { InitialPopups } from '@/components/popups/InitialPopups';
import { Analytics } from '@vercel/analytics/next';

export const dynamic = 'force-dynamic';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun';

export const metadata = {
  title: 'WinBig - Bet Like a Legend',
  description: 'Place bets on real-world predictions. Challenge friends. Win big. 🔥',
  keywords: ['prediction market', 'betting', 'crypto', 'web3', 'polymarket'],
  authors: [{ name: 'WinBig' }],
  creator: 'WinBig',
  publisher: 'WinBig',
  metadataBase: new URL(appUrl),
  
  // Icons for various platforms
  icons: {
    icon: [
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/vb-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/logo.png',
  },
  
  // Default OG for pages without custom OG
  openGraph: {
    title: 'WinBig - Bet Like a Legend',
    description: 'Place bets on real-world predictions. Challenge friends. Win big. 🔥',
    url: appUrl,
    siteName: 'WinBig',
    images: [
      {
        url: `${appUrl}/logo.png`,
        width: 512,
        height: 512,
        alt: 'WinBig Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  
  // Twitter card
  twitter: {
    card: 'summary',
    title: 'WinBig - Bet Like a Legend',
    description: 'Place bets on real-world predictions. Challenge friends. Win big. 🔥',
    images: [`${appUrl}/logo.png`],
    creator: '@winbigfun',
  },
  
  // For messaging apps
  other: {
    'msapplication-TileImage': `${appUrl}/logo.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(wagmiConfig, headers().get('cookie'));
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          'antialiased flex flex-col min-h-screen',
          GeistSans.variable,
          GeistMono.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <EntryContextProvider>
            <WalletKitProvider initialState={initialState}>
              <UserProvider>
                <AppLayout>
                  <PageTransitionWrapper>{children}</PageTransitionWrapper>
                </AppLayout>
                <Toaster />
                <InitialPopups />
              </UserProvider>
            </WalletKitProvider>
          </EntryContextProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
