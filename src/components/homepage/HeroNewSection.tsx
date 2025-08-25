// src/components/homepage/HeroNewSection.tsx
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HeroNewSection() {
  return (
    <section className="text-center py-10 md:py-16 bg-gradient-to-br from-primary/10 via-background to-background shadow-lg rounded-xl">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight">
        Predict the Future. <span className="block md:inline text-primary">Win Big.</span>
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
        Join thousands placing bets on today’s hottest events.
      </p>
      
      <div className="flex justify-center">
        <Button asChild size="lg" className="text-lg h-14 px-10 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground animate-pulse-glow">
          <Link href="/challenge">Start Betting Now</Link>
        </Button>
      </div>
    </section>
  );
}
