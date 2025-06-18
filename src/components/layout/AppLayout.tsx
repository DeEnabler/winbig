
import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Link from 'next/link'; // Added this import

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
            {/* Placeholder for social media icons & newsletter signup */}
        </div>
      </footer>
    </>
  );
}
