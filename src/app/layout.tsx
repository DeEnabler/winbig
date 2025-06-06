
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import { EntryContextProvider } from '@/contexts/EntryContext';
import { Suspense } from 'react';
import ClientSideWeb3ProviderLoader from '@/components/providers/ClientSideWeb3ProviderLoader';
import { headers } from 'next/headers'; // Import headers

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

export default async function RootLayout({ // Made this function async
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookie = headers().get('cookie'); // Get cookies

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <ClientSideWeb3ProviderLoader cookies={cookie}> {/* Pass cookies */}
          <Suspense fallback={<div>Loading context...</div>}>
            <EntryContextProvider>
                <AppLayout>
                  {children}
                </AppLayout>
            </EntryContextProvider>
          </Suspense>
        </ClientSideWeb3ProviderLoader>
        <Toaster />
      </body>
    </html>
  );
}
