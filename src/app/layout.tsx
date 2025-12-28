
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

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'WinBig',
  description: 'WinBig is a decentralized prediction market platform.',
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
      </body>
    </html>
  );
}
