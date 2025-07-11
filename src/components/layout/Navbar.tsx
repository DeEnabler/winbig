// src/components/layout/Navbar.tsx
'use client';

import Link from 'next/link';
import { Home, Menu, X, Coins, DollarSign, ListChecks, ShieldQuestion, BarChart3, Info } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import Logo from '@/components/common/Logo';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { mockCurrentUser } from '@/lib/mockData';
import dynamic from 'next/dynamic';

const ConnectWallet = dynamic(() => import('@/components/wallet/ConnectWallet'), { ssr: false });

const navItems = [
  { href: '/', label: 'Home', icon: Home }, // Changed 'Bet' to 'Home' for clarity
  { href: '/challenge', label: 'Featured', icon: ShieldQuestion }, // Changed 'Challenge' to 'Featured'
  { href: '/positions', label: 'My Bets', icon: ListChecks }, // Changed 'Positions' to 'My Bets'
  { href: '/earn', label: 'Earn', icon: DollarSign },
  { href: '/leaderboard', label: 'Leaders', icon: BarChart3 }, // Added Leaderboard
  // { href: '/faq', label: 'FAQ', icon: Info }, // Optional: if FAQ page is desired
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Desktop Navigation & XP */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                asChild
                className={cn(
                  "text-sm font-medium px-3 py-2", // Adjusted padding
                  pathname === item.href ? "text-primary-foreground bg-primary hover:bg-primary/90" : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Link href={item.href}>
                  <item.icon className="mr-1.5 h-4 w-4" /> {/* Slightly smaller icon and margin */}
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
          <div className="hidden md:flex items-center space-x-2 border-l pl-3 ml-1"> {/* Adjusted padding/margin */}
            <Coins className="h-5 w-5 text-yellow-500" /> 
            <span className="text-sm font-semibold text-foreground">
              {mockCurrentUser.xp.toLocaleString()} XP
            </span>
          </div>
          <div className="hidden md:block ml-2">
            <ConnectWallet />
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t">
          <nav className="flex flex-col space-y-1 p-4">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                asChild
                className={cn(
                  "w-full justify-start text-base py-3", // Increased py for better touch target
                  pathname === item.href ? "text-primary-foreground bg-primary hover:bg-primary/90" : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Link href={item.href}>
                  <item.icon className="mr-3 h-5 w-5" /> 
                  {item.label}
                </Link>
              </Button>
            ))}
            <div className="flex items-center space-x-2 p-2 mt-2 border-t pt-3">
                <Coins className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-semibold text-foreground">
                  {mockCurrentUser.xp.toLocaleString()} XP
                </span>
            </div>
            <div className="p-2 border-t pt-3">
              <ConnectWallet />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
