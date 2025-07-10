
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import { Suspense } from 'react';
import { WalletKitProvider } from '@/components/providers/WalletKitProvider';
import { EntryContextProvider } from '@/contexts/EntryContext';
import { EntryClientProvider } from '@/components/providers/EntryClientProvider';

export const dynamic = 'force-dynamic'; // Ensure dynamic rendering

export const metadata: Metadata = {
  title: 'ViralBet - Swipe, Bet, Share!',
  description: 'Instantly challenge others on high-emotion predictions. Swipe, bet, and share virally on X!',
};

// Ensure RootLayout is an async function
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log("--- VERCEL LOG: RootLayout rendering on server ---");

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased flex flex-col min-h-screen`}>
        <WalletKitProvider>
          {/* Use the new provider that correctly handles Suspense */}
          <EntryClientProvider>{children}</EntryClientProvider>
        </WalletKitProvider>
        <Toaster />
      </body>
    </html>
  );
}
