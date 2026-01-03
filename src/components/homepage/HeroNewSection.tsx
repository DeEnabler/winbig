// src/components/homepage/HeroNewSection.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';

// X (Twitter) logo SVG component
function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

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
      
      <div className="flex justify-center">
        <Button 
          onClick={signInWithX}
          size="lg" 
          className="text-lg h-14 px-10 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold shadow-lg shadow-accent/25 animate-pulse-glow gap-3"
        >
          <XLogo className="h-5 w-5" />
          Connect with X to Start
        </Button>
      </div>
    </section>
  );
}
