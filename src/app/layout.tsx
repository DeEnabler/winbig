
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import { EntryContextProvider } from '@/contexts/EntryContext';
import { Suspense } from 'react';
import ContextProvider from '@/context/index';
import { headers } from 'next/headers'; // Import headers

export const dynamic = 'force-dynamic'; // Ensure dynamic rendering

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

// Ensure RootLayout is an async function
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get the cookie string correctly using headers()
  const headersList = headers();
  const rawCookieHeader = headersList.get('cookie') || null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <ContextProvider cookies={rawCookieHeader}>
          <Suspense fallback={<div>Loading context...</div>}>
            <EntryContextProvider>
                <AppLayout>
                  {children}
                </AppLayout>
            </EntryContextProvider>
          </Suspense>
        </ContextProvider>
        <Toaster />
      </body>