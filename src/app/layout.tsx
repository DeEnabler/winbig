
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
// import AppLayout from '@/components/layout/AppLayout';
// import { Suspense } from 'react';
// import { WalletKitProvider } from '@/components/providers/WalletKitProvider';
// import { EntryClientProvider } from '@/components/providers/EntryClientProvider';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ViralBet - DEBUG',
  description: 'Instantly challenge others on high-emotion predictions. Swipe, bet, and share virally on X!',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log("--- VERCEL LOG: RootLayout rendering (EXTREMELY SIMPLIFIED) ---");

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased flex flex-col min-h-screen`}>
        {/* All providers and layouts have been removed for debugging. */}
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
