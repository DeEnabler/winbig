
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import { EntryContextProvider } from '@/contexts/EntryContext';
import { Suspense } from 'react';
// import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper'; // Temporarily removed
import ClientSideWeb3ProviderLoader from '@/components/providers/ClientSideWeb3ProviderLoader';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ViralBet - Swipe, Bet, Share!',
  description: 'Instantly challenge others on high-emotion predictions. Swipe, bet, and share virally on X!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <ClientSideWeb3ProviderLoader>
          <Suspense fallback={<div>Loading context...</div>}>
            <EntryContextProvider>
                <AppLayout>
                  {/* <PageTransitionWrapper> */}
                    {children}
                  {/* </PageTransitionWrapper> */}
                </AppLayout>
            </EntryContextProvider>
          </Suspense>
        </ClientSideWeb3ProviderLoader>
        <Toaster />
      </body>
    </html>
  );
}
