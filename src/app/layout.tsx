
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import { EntryContextProvider } from '@/contexts/EntryContext';
import { Suspense } from 'react';
// Removed ClientSideWeb3ProviderLoader, using ContextProvider from @/context now
import ContextProvider from '@/context/index'; // Adjusted path
import { cookies } from 'next/headers'; // Import cookies

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // const headersList = headers(); // Old way
  // const cookie = headersList.get('cookie'); // Old way that caused the error

  const cookieString = cookies().toString(); // New way using cookies().toString()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <ContextProvider cookies={cookieString || null}> {/* Use the new cookieString */}
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
    </html>
  );
}
