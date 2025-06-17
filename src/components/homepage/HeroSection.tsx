// src/components/homepage/HeroSection.tsx
import HeroBetDisplay from './HeroBetDisplay';

export default function HeroSection() {
  return (
    <section className="w-full -mx-3 md:-mx-4 bg-gradient-to-b from-primary/5 via-background to-background dark:from-primary/10 md:rounded-b-xl md:shadow-lg">
      {/* The HeroBetDisplay component will be contained by its own internal max-width for the card content */}
      <HeroBetDisplay />
    </section>
  );
}
