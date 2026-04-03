
import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Link from 'next/link';
import { BnbChainLogo } from '@/components/common/BrandLogos';

// HeroBetDisplay is now part of specific pages like /challenge or the new HeroNewSection

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <Navbar />
      <main className="flex-grow container mx-auto px-3 md:px-4 py-6 md:py-8">
        {children}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t mt-10">
        <div className="container mx-auto">
            <p className="mb-2">© {new Date().getFullYear()} WinBig. All rights reserved.</p>
            <nav className="flex justify-center space-x-4">
                <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
                <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
                <Link href="/about" className="hover:text-primary">About Us</Link>
                <Link href="/contact" className="hover:text-primary">Contact</Link>
            </nav>
            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground/60">
                <span>Powered by</span>
                <BnbChainLogo className="h-3.5 w-3.5" />
                <span className="font-medium">BNB Chain</span>
            </div>
        </div>
      </footer>
    </>
  );
}
