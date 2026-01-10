// src/components/homepage/HeroNewSection.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { XLogo, PoweredByBadge } from '@/components/common/BrandLogos';

export default function HeroNewSection() {
  const { isXConnected, isXLoading, signInWithX } = useUser();

  // Don't show this section if user is already logged in with X
  if (isXConnected) {
    return null;
  }

  // Show loading state while checking auth
  if (isXLoading) {
    return null;
  }

  return (
    <section className="text-center py-10 md:py-16 bg-gradient-to-br from-primary/15 via-background to-accent/5 shadow-lg rounded-xl border border-border/50">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight">
        Share Your Trades. <span className="block md:inline text-accent">Earn Rewards.</span>
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
        The social layer for Polymarket — earn by sharing your winning predictions.
      </p>
      
      <div className="flex flex-col items-center gap-6">
        <Button 
          onClick={signInWithX}
          size="lg" 
          className="text-lg h-14 px-10 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold shadow-lg shadow-accent/25 animate-pulse-glow gap-3"
        >
          <XLogo className="h-5 w-5" />
          Start Now
        </Button>
        
        {/* Trust badges showing integration partners */}
        <PoweredByBadge className="opacity-80 hover:opacity-100 transition-opacity" />
      </div>
    </section>
  );
}
