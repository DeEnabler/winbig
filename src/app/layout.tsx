
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
  title: 'WinBig - Swipe, Bet, Share!',
  description: 'Instantly challenge others on high-emotion predictions. Swipe, bet, and share virally on X!',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const allCookiesArray = cookieStore.getAll();
  
  let rawCookieHeader = "";
  if (allCookiesArray && allCookiesArray.length > 0) {
    // Reconstruct the cookie string in the format "name1=value1; name2=value2"
    rawCookieHeader = allCookiesArray
      .map(cookie => `${cookie.name}=${encodeURIComponent(cookie.value)}`) // Ensure cookie values are properly encoded
      .join('; ');
  }
  const cookieStringForProvider = rawCookieHeader || null; // Pass null if no cookies, as expected by cookieToInitialState

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <ContextProvider cookies={cookieStringForProvider}> {/* Use the reconstructed cookie string */}
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
