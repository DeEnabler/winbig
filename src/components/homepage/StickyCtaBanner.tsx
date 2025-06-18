// src/components/homepage/StickyCtaBanner.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Gift, Zap, LogIn } from 'lucide-react'; // Added LogIn
import { useEntryContext } from '@/contexts/EntryContext';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { appKitModal } from '@/context/index';
import { useToast } from '@/hooks/use-toast';

export default function StickyCtaBanner() {
  const router = useRouter();
  const { appendEntryParams, source: entrySource } = useEntryContext();
  const { isConnected } = useAccount();
  const { toast } = useToast();

  const showBonusCTA = entrySource === 'x_promo'; // Example condition for bonus CTA

  const handleCTAClick = () => {
    if (!isConnected) {
        if (appKitModal && typeof appKitModal.open === 'function') {
            toast({ 
              title: showBonusCTA ? "Connect Wallet for Bonus!" : "Connect Wallet", 
              description: showBonusCTA ? "Connect your wallet to claim your 10 SOL bonus and start betting!" : "Connect your wallet to start betting!" 
            });
            appKitModal.open();
        } else {
            toast({ variant: "destructive", title: "Error", description: "Wallet connection service not available." });
        }
    } else {
      // If connected, navigate to a primary betting area, e.g., the main challenge or feed.
      router.push(appendEntryParams('/challenge')); 
      toast({ title: "Let's Go!", description: "Check out the featured challenge or find more markets!" });
    }
  };

  let ctaText = "🎯 Place Your First Bet";
  let CtaIcon = Zap;

  if (!isConnected) {
    ctaText = "Connect Wallet to Bet";
    CtaIcon = LogIn;
    if (showBonusCTA) {
        ctaText = "Connect for 10 SOL Bonus!";
        CtaIcon = Gift;
    }
  } else if (showBonusCTA) {
    ctaText = "Claim 10 SOL Bonus Bet!"; // Assuming bonus is claimed by betting
    CtaIcon = Gift;
  }


  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-3 border-t border-border shadow-lg md:hidden z-40">
      <Button
        onClick={handleCTAClick}
        size="lg"
        className="w-full h-12 text-base font-semibold animate-pulse-glow bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-primary/90 hover:to-accent/90"
      >
        <CtaIcon className="w-5 h-5 mr-2" /> {ctaText}
      </Button>
    </div>
  );
}
