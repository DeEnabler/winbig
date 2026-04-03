// src/components/match/BetSuccessScreen.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Share2, 
  Copy, 
  X, 
  Loader2, 
  Sparkles, 
  Trophy, 
  Users,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { UsdtLogo, BnbChainLogo } from '@/components/common/BrandLogos';

interface BetSuccessScreenProps {
  betAmount: number;
  selectedChoice: 'YES' | 'NO';
  potentialPayout: number;
  predictionText: string;
  shareUrl: string | null;
  onClose: () => void;
  onGenerateShareLink: () => Promise<string | null>;
  isGeneratingLink: boolean;
}

export default function BetSuccessScreen({
  betAmount,
  selectedChoice,
  potentialPayout,
  predictionText,
  shareUrl: initialShareUrl,
  onClose,
  onGenerateShareLink,
  isGeneratingLink,
}: BetSuccessScreenProps) {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState<string | null>(initialShareUrl);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  // Trigger confetti on mount
  useEffect(() => {
    if (showConfetti) {
      // Multiple bursts for a better effect
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
      setShowConfetti(false);
    }
  }, [showConfetti]);

  // Generate share link on mount if not provided
  useEffect(() => {
    if (!shareUrl && !isGeneratingLink) {
      onGenerateShareLink().then(url => {
        if (url) setShareUrl(url);
      });
    }
  }, [shareUrl, isGeneratingLink, onGenerateShareLink]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast({ title: "Copied!", description: "Share link copied to clipboard" });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not copy link' });
    }
  }, [shareUrl, toast]);

  const handleShare = useCallback(async (platform: 'twitter' | 'whatsapp' | 'telegram') => {
    if (!shareUrl) return;
    
    const message = `🎯 I just bet $${betAmount} on ${selectedChoice}!\n\n"${predictionText.substring(0, 80)}..."\n\nThink I'm wrong? Challenge me!\n\n${shareUrl}`;
    
    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`;
        break;
    }
    
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [shareUrl, betAmount, selectedChoice, predictionText]);

  const multiplier = (potentialPayout / betAmount).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <Card className="w-full max-w-md overflow-hidden shadow-2xl border-0">
        {/* Success Header */}
        <CardHeader className="relative bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 text-white p-6">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="flex justify-center mb-4"
          >
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Check className="w-10 h-10 text-white" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-1">Bet Placed! 🎉</h2>
            <p className="text-white/80">You're in the game!</p>
          </motion.div>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {/* Bet Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-muted/50 rounded-xl p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Your Bet</span>
              <Badge className={`inline-flex items-center gap-1 ${selectedChoice === 'YES' ? 'bg-green-500' : 'bg-red-500'}`}>
                ${betAmount} <UsdtLogo className="h-3 w-3 opacity-80" /> on {selectedChoice}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Potential Payout</span>
              <span className="text-xl font-bold text-green-500 inline-flex items-center gap-1">
                ${potentialPayout.toFixed(2)}
                <UsdtLogo className="h-4 w-4 opacity-70" />
                <span className="text-xs ml-1 text-muted-foreground">({multiplier}x)</span>
              </span>
            </div>
            <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border/50 text-[11px] text-muted-foreground/60">
              <BnbChainLogo className="h-3 w-3" />
              <span>Settled on BNB Chain</span>
            </div>
          </motion.div>

          {/* Share CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center space-y-3"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span>Share to earn when friends bet!</span>
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </div>
            
            {/* Share Link Box */}
            {isGeneratingLink ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Creating your share link...</span>
              </div>
            ) : shareUrl ? (
              <div className="relative">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm truncate outline-none"
                  />
                  <Button
                    size="sm"
                    variant={copied ? "default" : "outline"}
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" /> Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Could not generate share link</p>
            )}
          </motion.div>

          {/* Social Share Buttons */}
          {shareUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-3"
            >
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/10"
                onClick={() => handleShare('twitter')}
              >
                <svg className="w-5 h-5 text-[#1DA1F2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-xs">X</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 border-[#25D366]/30 hover:bg-[#25D366]/10"
                onClick={() => handleShare('whatsapp')}
              >
                <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="text-xs">WhatsApp</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 border-[#0088cc]/30 hover:bg-[#0088cc]/10"
                onClick={() => handleShare('telegram')}
              >
                <svg className="w-5 h-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                <span className="text-xs">Telegram</span>
              </Button>
            </motion.div>
          )}

          {/* Referral info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg p-3"
          >
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span>Earn <strong className="text-primary">8%</strong> of every bet placed through your link!</span>
          </motion.div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <Button onClick={onClose} variant="ghost" className="w-full">
            <span>Continue Browsing</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
