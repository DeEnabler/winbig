
'use client';

import Link from 'next/link';
import { Home, Menu, X, Coins, DollarSign, ListChecks } from 'lucide-react'; // Removed BarChart3
import { Button } from '@/components/ui/button';
import Logo from '@/components/common/Logo';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { mockCurrentUser } from '@/lib/mockData';
import ConnectWalletButton from '@/components/wallet/ConnectWallet';

const navItems = [
  { href: '/', label: 'Bet', icon: Home },
  { href: '/positions', label: 'Positions', icon: ListChecks },
  { href: '/earn', label: 'Earn', icon: DollarSign },
  // { href: '/leaderboard', label: 'Leaderboard', icon: BarChart3 }, // Removed Leaderboard
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
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                asChild
                className={cn(
                  "text-sm font-medium",
                  pathname === item.href ? "text-primary-foreground bg-primary hover:bg-primary/90" : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
          <div className="hidden md:flex items-center space-x-2 border-l pl-4 ml-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-semibold text-foreground">
              {mockCurrentUser.xp.toLocaleString()} XP
            </span>
          </div>
          <div className="hidden md:block ml-2">
            <ConnectWalletButton />
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
                  "w-full justify-start text-base",
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
              <ConnectWalletButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
