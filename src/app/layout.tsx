
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { PageTransitionWrapper } from '@/components/layout/PageTransitionWrapper';
import { AppLayout } from '@/components/layout/AppLayout';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { EntryContextProvider } from '@/contexts/EntryContext';
import { ClientSideWeb3ProviderLoader } from '@/components/providers/ClientSideWeb3ProviderLoader';
import { cn } from '@/lib/utils';
import './globals.css';

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
            <ClientSideWeb3ProviderLoader>
              <AppLayout>
                <Navbar />
                <PageTransitionWrapper>{children}</PageTransitionWrapper>
              </AppLayout>
              <Toaster />
            </ClientSideWeb3ProviderLoader>
          </EntryContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
