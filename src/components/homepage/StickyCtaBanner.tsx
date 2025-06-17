// src/components/homepage/StickyCtaBanner.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Gift, Zap } from 'lucide-react';
import { useEntryContext } from '@/contexts/EntryContext';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { appKitModal } from '@/context/index';
import { useToast } from '@/hooks/use-toast';

export default function StickyCtaBanner() {
  const router = useRouter();
  const { appendEntryParams, source: entrySource } = useEntryContext(); // Renamed source to entrySource
  const { isConnected } = useAccount();
  const { toast } = useToast();

  const showBonusCTA = entrySource === 'x_promo'; 

  const handleCTAClick = () => {
    if (!isConnected) {
        if (appKitModal && typeof appKitModal.open === 'function') {
            toast({ title: "Connect Wallet", description: "Connect your wallet to claim your bonus and start betting!" });
            appKitModal.open();
        } else {
            toast({ variant: "destructive", title: "Error", description: "Wallet connection service not available." });
        }
    } else {
      router.push(appendEntryParams('/challenge')); // Navigate to challenge page for a quick bet
      toast({ title: "Let's Go!", description: "Check out the featured challenge or find more markets!" });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-3 border-t border-border shadow-lg md:hidden z-40">
      <Button
        onClick={handleCTAClick}
        size="lg"
        className="w-full h-12 text-base font-semibold animate-pulse-glow bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-primary/90 hover:to-accent/90"
      >
        {showBonusCTA ? (
          <>
            <Gift className="w-5 h-5 mr-2" /> Get 10 SOL Bonus!
          </>
        ) : (
          <>
            <Zap className="w-5 h-5 mr-2" /> Place Your First Bet
          </>
        )}
      </Button>
    </div>
  );
}
