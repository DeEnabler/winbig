
import type { ReactNode } from 'react';
import Navbar from './Navbar';
// import HeaderChallenge from './HeaderChallenge'; // Removed: Hero display is now part of page.tsx

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <Navbar />
      {/* <HeaderChallenge /> Removed: Hero display is now part of page.tsx and its specific components */}
      <main className="flex-grow container mx-auto px-3 md:px-4 py-6 md:py-8">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} WinBig. All rights reserved.
      </footer>
    </>
  );
}
