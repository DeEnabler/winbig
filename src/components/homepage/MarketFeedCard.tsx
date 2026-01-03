// src/components/homepage/MarketFeedCard.tsx
'use client';

import type { LiveMarket } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Users, TrendingUp, Share2, Copy, Check, Loader2, Zap, ArrowRight, Flame } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useUser } from '@/contexts/UserContext';

interface MarketFeedCardProps {
  market: LiveMarket;
}

// Calculate potential payout
function calculatePayout(betAmount: number, odds: number): number {
  if (odds <= 0 || odds >= 1) return betAmount;
  return betAmount / odds;
}

export default function MarketFeedCard({ market }: MarketFeedCardProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { xProfile } = useUser();
  const { open } = useAppKit();
  const { toast } = useToast();
  
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedStance, setSelectedStance] = useState<'YES' | 'NO' | null>(null);

  // Use the new flattened probability properties
  const yesPercent = Math.floor(market.yesImpliedProbability * 100);
  const noPercent = 100 - yesPercent;
  
  // Calculate potential payouts for a $10 bet
  const betAmount = 10;
  const yesPayout = calculatePayout(betAmount, market.yesImpliedProbability);
  const noPayout = calculatePayout(betAmount, 1 - market.yesImpliedProbability);
  
  // Determine which side is "hot" (better odds for payout)
  const yesMultiplier = (yesPayout / betAmount).toFixed(1);
  const noMultiplier = (noPayout / betAmount).toFixed(1);

  const detailUrl = `/match/${market.id}?predictionId=${market.id}`;

  // Handle share link generation
  const handleShareLink = useCallback(async (stance: 'YES' | 'NO') => {
    if (!isConnected || !address) {
      toast({
        title: "Connect Wallet",
        description: "Connect your wallet to create a share link!",
      });
      open();
      return;
    }

    setIsGeneratingLink(true);
    setSelectedStance(stance);

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: address,
          username: xProfile?.x_username || null,
          market_id: market.id,
          predicted_outcome: stance,
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.share_url) {
        await navigator.clipboard.writeText(result.data.share_url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);

        toast({
          title: "🔗 Link Copied!",
          description: "Share it to challenge your friends!",
        });
      } else {
        throw new Error(result.error || 'Failed to create link');
      }
    } catch (error: any) {
      console.error('Error generating share link:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not create share link',
      });
    } finally {
      setIsGeneratingLink(false);
      setSelectedStance(null);
    }
  }, [address, isConnected, market.id, open, toast]);

  // Truncate title
  const displayTitle = market.question.length > 85
    ? market.question.substring(0, 85) + '...'
    : market.question;

  // Random social proof (in production, use real data)
  const bettorCount = Math.floor(Math.random() * 500 + 100);
  const isHot = bettorCount > 400;

  return (
    <Card className="group flex flex-col h-full overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-card via-card to-muted/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Header with question */}
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug line-clamp-3 flex-1">
            {displayTitle}
          </h3>
          {isHot && (
            <Badge variant="secondary" className="shrink-0 bg-orange-500/10 text-orange-500 border-orange-500/20">
              <Flame className="w-3 h-3 mr-1" />
              Hot
            </Badge>
          )}
        </div>
        
        {/* Social proof */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{bettorCount} betting</span>
          </div>
          {market.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {market.category}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Odds visualization */}
      <CardContent className="flex-grow py-3 px-4 space-y-4">
        {/* Probability bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span className="text-green-500">YES {yesPercent}%</span>
            <span className="text-red-500">{noPercent}% NO</span>
          </div>
          <div className="relative w-full h-3 rounded-full overflow-hidden bg-red-500/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yesPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-400 rounded-l-full"
            />
          </div>
        </div>

        {/* Potential earnings - CLICKABLE! */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-3 border border-primary/10">
          <p className="text-xs text-muted-foreground text-center mb-2">
            <TrendingUp className="w-3 h-3 inline mr-1" />
            Click to bet ${betAmount} and win
          </p>
          <div className="grid grid-cols-2 gap-2">
            {/* YES payout - CLICKABLE */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(`${detailUrl}&choice=YES&amount=${betAmount}`)}
              className="text-center p-3 rounded-lg bg-green-500/10 border-2 border-green-500/30 hover:border-green-500 hover:bg-green-500/20 transition-all cursor-pointer group/yes"
            >
              <p className="text-xs text-green-600 font-medium group-hover/yes:text-green-500">BET YES</p>
              <p className="text-xl font-bold text-green-500">${yesPayout.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">{yesMultiplier}x return</p>
            </motion.button>
            {/* NO payout - CLICKABLE */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(`${detailUrl}&choice=NO&amount=${betAmount}`)}
              className="text-center p-3 rounded-lg bg-red-500/10 border-2 border-red-500/30 hover:border-red-500 hover:bg-red-500/20 transition-all cursor-pointer group/no"
            >
              <p className="text-xs text-red-600 font-medium group-hover/no:text-red-500">BET NO</p>
              <p className="text-xl font-bold text-red-500">${noPayout.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">{noMultiplier}x return</p>
            </motion.button>
          </div>
        </div>
      </CardContent>

      {/* Action buttons */}
      <CardFooter className="flex flex-col gap-2 p-4 pt-0">
        {/* Quick bet / View details */}
        <Button asChild className="w-full h-11 rounded-xl font-semibold group/btn" size="lg">
          <Link href={detailUrl} prefetch={false}>
            <Zap className="w-4 h-4 mr-2 group-hover/btn:animate-pulse" />
            Place Bet
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>

        {/* Share buttons */}
        <div className="flex gap-2 w-full">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 rounded-lg text-xs border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50"
                  onClick={() => handleShareLink('YES')}
                  disabled={isGeneratingLink}
                >
                  {isGeneratingLink && selectedStance === 'YES' ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : copiedLink && selectedStance === 'YES' ? (
                    <Check className="w-3 h-3 text-green-500 mr-1" />
                  ) : (
                    <Share2 className="w-3 h-3 mr-1 text-green-500" />
                  )}
                  Share YES
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy affiliate link for YES prediction</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 rounded-lg text-xs border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
                  onClick={() => handleShareLink('NO')}
                  disabled={isGeneratingLink}
                >
                  {isGeneratingLink && selectedStance === 'NO' ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : copiedLink && selectedStance === 'NO' ? (
                    <Check className="w-3 h-3 text-red-500 mr-1" />
                  ) : (
                    <Share2 className="w-3 h-3 mr-1 text-red-500" />
                  )}
                  Share NO
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy affiliate link for NO prediction</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
}
