
// src/components/homepage/HowItWorksSection.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, MousePointerSquareDashed, TrendingUp, Info } from 'lucide-react'; // Changed MousePointerSquare to MousePointerSquareDashed
import { Button } from '../ui/button';
import Link from 'next/link';

const steps = [
  {
    icon: <Lightbulb className="w-10 h-10 text-primary mb-3" />,
    title: '1. Pick a Market',
    description: 'Browse live predictions on sports, crypto, politics, and more.',
  },
  {
    icon: <MousePointerSquareDashed className="w-10 h-10 text-primary mb-3" />, // Changed MousePointerSquare to MousePointerSquareDashed
    title: '2. Place Your Bet',
    description: 'Choose YES or NO and decide how much you want to stake.',
  },
  {
    icon: <TrendingUp className="w-10 h-10 text-primary mb-3" />,
    title: '3. Watch & Win',
    description: 'Track live odds, share with friends, and win big if you\'re right!',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-8 md:py-12 bg-muted/30 rounded-xl">
      <div className="container mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="text-center p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-center items-center mb-4">
                {step.icon}
              </div>
              <CardTitle className="text-xl md:text-2xl font-semibold mb-2">{step.title}</CardTitle>
              <CardContent className="text-muted-foreground text-sm md:text-base">
                <p>{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-8 md:mt-12">
          <Button size="lg" variant="outline" asChild className="text-base rounded-lg">
            <Link href="/faq"> {/* Assuming /faq will exist or be created */}
              <Info className="w-5 h-5 mr-2" />
              Learn More & FAQ
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
