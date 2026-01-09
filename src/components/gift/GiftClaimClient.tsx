// src/components/gift/GiftClaimClient.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import {
  Gift,
  Wallet,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Loader2,
  BadgeCheck,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface GiftClaimClientProps {
  giftCode: string;
  amount: number;
  gifterName: string;
  gifterAvatar: string | null;
  isVerified: boolean;
  canClaim: boolean;
  statusMessage?: string;
  expiresAt: string;
}

export default function GiftClaimClient({
  giftCode,
  amount,
  gifterName,
  gifterAvatar,
  isVerified,
  canClaim,
  statusMessage,
  expiresAt,
}: GiftClaimClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expiryDate = new Date(expiresAt);
  const isExpired = expiryDate < new Date();
  const timeUntilExpiry = formatDistanceToNow(expiryDate, { addSuffix: true });

  const handleClaim = async () => {
    if (!isConnected || !address) {
      open();
      return;
    }

    setIsClaiming(true);
    setError(null);

    try {
      const response = await fetch('/api/bonus/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gift_code: giftCode,
          user_id: address,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to claim gift');
        toast({
          variant: 'destructive',
          title: 'Claim Failed',
          description: result.error || 'Failed to claim gift',
        });
        return;
      }

      setClaimed(true);
      toast({
        title: '🎉 Gift Claimed!',
        description: `You received $${amount} bonus! Start trading to unlock profits.`,
      });

      // Redirect to home after a delay
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      console.error('Error claiming gift:', err);
      setError('An error occurred. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred. Please try again.',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  // Successfully claimed state
  if (claimed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full"
      >
        <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          
          <CardContent className="relative p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <CheckCircle className="w-20 h-20 mx-auto mb-6 text-white" />
            </motion.div>
            
            <h1 className="text-3xl font-bold mb-2">Gift Claimed!</h1>
            <p className="text-white/80 text-lg mb-6">
              ${amount} bonus has been added to your account
            </p>
            
            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <p className="text-sm text-white/70 mb-1">Volume Requirement</p>
              <p className="text-lg font-semibold">
                Trade ${amount * 30} to unlock profits
              </p>
            </div>
            
            <Button
              onClick={() => router.push('/')}
              size="lg"
              className="w-full bg-white text-green-600 hover:bg-white/90 font-bold"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Start Trading
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Gift not claimable state
  if (!canClaim) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <Card className="relative overflow-hidden border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Gift Unavailable</h1>
            <p className="text-muted-foreground mb-6">
              {statusMessage || 'This gift is no longer available'}
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go to WinBig
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Main claim UI
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="relative overflow-hidden border-0 shadow-2xl">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <CardHeader className="relative p-6 pb-0 text-center">
          {/* Gift icon animation */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              rotate: [0, -5, 5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            className="mx-auto mb-4"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <Gift className="w-16 h-16 text-primary relative z-10" />
            </div>
          </motion.div>

          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Bonus Gift
          </Badge>
        </CardHeader>

        <CardContent className="relative p-6 text-center">
          {/* Gifter info */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarImage src={gifterAvatar || undefined} alt={gifterName} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {gifterName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="flex items-center gap-1">
                <span className="font-semibold">{gifterName}</span>
                {isVerified && (
                  <BadgeCheck className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">sent you a gift</p>
            </div>
          </div>

          {/* Amount display */}
          <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl p-6 mb-6">
            <p className="text-sm text-muted-foreground mb-1">Bonus Amount</p>
            <p className="text-5xl font-black text-primary">${amount}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Trade to unlock profits
            </p>
          </div>

          {/* Volume requirement info */}
          <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              How it works
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use this bonus to place bets</li>
              <li>• Trade ${(amount * 30).toLocaleString()} total volume</li>
              <li>• Keep all your profits!</li>
            </ul>
          </div>

          {/* Expiry notice */}
          {!isExpired && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="w-4 h-4" />
              <span>Expires {timeUntilExpiry}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="relative p-6 pt-0 flex flex-col gap-3">
          {isConnected ? (
            <Button
              onClick={handleClaim}
              size="lg"
              className="w-full font-bold text-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              disabled={isClaiming}
            >
              {isClaiming ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5 mr-2" />
                  Claim ${amount} Bonus
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => open()}
              size="lg"
              className="w-full font-bold text-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Connect Wallet to Claim
            </Button>
          )}

          <p className="text-xs text-center text-muted-foreground">
            By claiming, you agree to the{' '}
            <a href="/terms" className="underline hover:text-primary">
              bonus terms
            </a>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
