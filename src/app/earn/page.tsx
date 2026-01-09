// src/app/earn/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Share2, Coins, Users, MessageCircleQuestion, Flame, TrendingUp, Clock, 
  ShieldCheck, Copy, Check, ExternalLink, DollarSign, Layers, ArrowUpRight,
  Wallet, Gift, History, ChevronRight
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { EarningsStats } from '@/app/api/earnings/route';

const ConnectWalletButton = dynamic(() => import('@/components/wallet/ConnectWalletButton'), { ssr: false });

// Fetch earnings data from API
const fetchEarnings = async (userId: string): Promise<EarningsStats> => {
  const response = await fetch(`/api/earnings?user_id=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch earnings');
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
};

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatShortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function EarnPage() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // Simulator state (for non-connected users)
  const [simulatedFriends, setSimulatedFriends] = useState(5);
  const dailyBetPerFriend = 100; // $100 USDT
  const platformFeeRate = 0.05; // 5%
  const tier1Rate = 0.08; // 8%
  const tier2Rate = 0.02; // 2%

  const dailyFeePerFriend = dailyBetPerFriend * platformFeeRate;
  const directDailyEarnings = simulatedFriends * dailyFeePerFriend * tier1Rate;
  const simulatedSubFriends = Math.floor(simulatedFriends * 0.5 * 10);
  const subDailyEarnings = simulatedSubFriends * dailyFeePerFriend * tier2Rate;
  const totalDailyEarnings = directDailyEarnings + subDailyEarnings;

  // Fetch real earnings when connected
  const { data: earnings, isLoading, error } = useQuery({
    queryKey: ['earnings', address],
    queryFn: () => fetchEarnings(address!),
    enabled: !!address,
    refetchInterval: 30000,
  });

  const handleCopyLink = async () => {
    if (earnings?.affiliateUrl) {
      await navigator.clipboard.writeText(earnings.affiliateUrl);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Your affiliate link has been copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const howItWorksSteps = [
    {
      icon: <Share2 className="w-10 h-10 text-primary mb-3" />,
      title: 'Share Your Link',
      description: 'Invite friends to bet on predictions. Simple as that.',
    },
    {
      icon: <Coins className="w-10 h-10 text-primary mb-3" />,
      title: 'Earn 8% (Tier 1)',
      description: 'Get 8% of the platform fee whenever your direct referrals bet.',
    },
    {
      icon: <Users className="w-10 h-10 text-primary mb-3" />,
      title: 'Earn 2% (Tier 2)',
      description: 'Plus 2% from your referrals\' referrals. It compounds!',
    },
  ];

  const whyDifferentFeatures = [
    {
      icon: <MessageCircleQuestion className="w-8 h-8 text-accent mb-2" />,
      title: 'No Selling Required',
      description: 'Share fun predictions and the thrill of the bet.',
    },
    {
      icon: <Flame className="w-8 h-8 text-accent mb-2" />,
      title: 'Built For Virality',
      description: 'Spreads across X, Telegram, and DMs effortlessly.',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-accent mb-2" />,
      title: 'Earnings Compound',
      description: 'The more your network bets, the more you earn.',
    },
    {
      icon: <Clock className="w-8 h-8 text-accent mb-2" />,
      title: 'You\'re Still Early',
      description: 'Secure your spot now, reap rewards long-term.',
    },
  ];

  return (
    <div className="container mx-auto py-6 md:py-10 text-foreground">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center py-12 md:py-16 rounded-xl bg-gradient-to-br from-primary/10 via-background to-background shadow-lg mb-8 md:mb-10"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          Earn From Your Network
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
          2-layer affiliate system: Earn from your referrals AND their referrals.
        </p>
        {!isConnected && (
          <>
            <div className="flex justify-center">
              <ConnectWalletButton />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Connect your wallet to see your earnings.</p>
          </>
        )}
      </motion.section>

      {/* Real Earnings Dashboard (Connected Users) */}
      {isConnected && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 md:mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center">
            <Wallet className="w-7 h-7 mr-2 text-primary" /> Your Affiliate Dashboard
          </h2>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : error ? (
            <Card className="p-6 bg-destructive/10">
              <p className="text-destructive">Failed to load earnings. Please try again.</p>
            </Card>
          ) : earnings ? (
            <>
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                {/* Total Earnings */}
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center text-green-600">
                      <DollarSign className="w-4 h-4 mr-1" /> Total Referral Earnings
                    </CardDescription>
                    <CardTitle className="text-3xl text-green-600">
                      {formatCurrency(earnings.referralEarnings)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tier 1:</span>
                      <span className="font-medium">{formatCurrency(earnings.tier1Earnings)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tier 2:</span>
                      <span className="font-medium">{formatCurrency(earnings.tier2Earnings)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Referrals Count */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center">
                      <Users className="w-4 h-4 mr-1" /> Total Referrals
                    </CardDescription>
                    <CardTitle className="text-3xl">{earnings.totalReferrals}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Direct (Tier 1):</span>
                      <span className="font-medium">{earnings.tier1Referrals}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Network (Tier 2):</span>
                      <span className="font-medium">{earnings.tier2Referrals}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Referred Volume */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" /> Referred Volume
                    </CardDescription>
                    <CardTitle className="text-3xl">{formatCurrency(earnings.referredVolume)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Total betting volume from your referrals
                    </p>
                  </CardContent>
                </Card>

                {/* Pending/Available */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center">
                      <Gift className="w-4 h-4 mr-1" /> Earnings Status
                    </CardDescription>
                    <CardTitle className="text-3xl text-amber-500">
                      {formatCurrency(earnings.pendingReferralEarnings)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pending:</span>
                      <span className="font-medium text-amber-500">{formatCurrency(earnings.pendingReferralEarnings)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Withdrawn:</span>
                      <span className="font-medium">{formatCurrency(earnings.withdrawnReferralEarnings)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Affiliate Link Card */}
              {earnings.affiliateUrl && (
                <Card className="mb-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Share2 className="w-5 h-5 mr-2" /> Your Affiliate Link
                    </CardTitle>
                    <CardDescription>Share this link to earn from referrals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-background/80 rounded-lg px-4 py-3 font-mono text-sm truncate border">
                        {earnings.affiliateUrl}
                      </div>
                      <Button onClick={handleCopyLink} variant="default" size="lg" className="shrink-0">
                        {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Layers className="w-3 h-3 mr-1" /> 8% Tier 1 Commission
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" /> 2% Tier 2 Commission
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Earnings Activity */}
              {earnings.recentAffiliateEarnings && earnings.recentAffiliateEarnings.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <History className="w-5 h-5 mr-2" /> Recent Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead className="text-center">Tier</TableHead>
                          <TableHead className="text-right">Bet Amount</TableHead>
                          <TableHead className="text-right">Earned</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {earnings.recentAffiliateEarnings.slice(0, 5).map((earning: any) => (
                          <TableRow key={earning.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(earning.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {formatShortAddress(earning.source_user_id)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={earning.tier === 1 ? 'default' : 'secondary'}>
                                Tier {earning.tier}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(earning.bet_amount)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              +{formatCurrency(earning.earnings_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </motion.section>
      )}

      {/* How It Works (3 Steps) */}
      <section className="mb-8 md:mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8">
          How the <span className="text-primary">2-Layer System</span> Works
        </h2>
        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {howItWorksSteps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="text-center p-5 bg-card rounded-lg shadow-md hover:shadow-xl transition-shadow"
            >
              {step.icon}
              <h3 className="text-xl md:text-2xl font-semibold mb-1.5">{step.title}</h3>
              <p className="text-muted-foreground text-sm md:text-base">{step.description}</p>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-5 max-w-xl mx-auto">
          Direct referrals earn you the biggest cut. Their network earns you a smaller but compounding cut.
        </p>
      </section>

      {/* Why It's Different */}
      <section className="mb-8 md:mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8">
          This Isn't Just Affiliate. <span className="text-accent">This is Leverage.</span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {whyDifferentFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <Card className="h-full bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="items-center text-center">
                  {feature.icon}
                  <CardTitle className="text-lg md:text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground">
                  <p>{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Earnings Simulator (Show for everyone) */}
      <section className="mb-8 md:mb-10 p-5 md:p-6 bg-muted/50 rounded-xl shadow-lg">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
          What Could <span className="text-primary">You</span> Earn?
        </h2>
        <p className="text-center text-muted-foreground mb-5 md:mb-6 max-w-lg mx-auto">
          {isConnected ? 'See your potential based on network growth.' : 'This isn\'t a guarantee, it\'s a glimpse of your potential.'}
        </p>
        <div className="max-w-2xl mx-auto bg-card p-5 rounded-lg shadow-md">
          <div className="mb-5 text-center">
            <p className="text-lg">
              If <span className="font-bold text-primary">{simulatedFriends} friends</span> each bet ${dailyBetPerFriend}/day...
            </p>
            <p className="text-2xl md:text-3xl font-bold text-green-500 mt-1">
              You could earn ~{formatCurrency(directDailyEarnings)}/day
            </p>
            <p className="text-sm text-muted-foreground">(8% of 5% platform fee from direct referrals)</p>
          </div>

          <div className="mb-5">
            <label htmlFor="friendsSlider" className="block text-sm font-medium text-center mb-1.5">Adjust Direct Referrals:</label>
            <Slider
              id="friendsSlider"
              min={1}
              max={50}
              step={1}
              defaultValue={[simulatedFriends]}
              onValueChange={(value) => setSimulatedFriends(value[0])}
              className="[&>span:first-child]:h-3 [&>span:first-child>span]:bg-primary [&>span:last-child]:h-6 [&>span:last-child]:w-6"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 Friend</span>
              <span>50 Friends</span>
            </div>
          </div>

          <div className="text-center mt-3 border-t border-border pt-3">
            <p className="text-lg">
              And if their network grows ({simulatedSubFriends} tier-2 referrals)...
            </p>
            <p className="text-xl md:text-2xl font-bold text-green-400 mt-1">
              + {formatCurrency(subDailyEarnings)}/day
            </p>
            <p className="text-sm text-muted-foreground">(2% of fees from tier-2 referrals)</p>
          </div>
          <p className="text-center text-3xl md:text-4xl font-extrabold text-primary mt-5">
            Total: ~{formatCurrency(totalDailyEarnings)}/day
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-10 md:py-12 bg-gradient-to-tr from-accent/10 to-background rounded-xl shadow-lg">
        <blockquote className="text-2xl md:text-3xl font-semibold italic text-foreground max-w-2xl mx-auto mb-5">
          "We don't pay influencers. <span className="block">We pay <span className="text-accent underline decoration-wavy">believers.</span></span>"
        </blockquote>
        <h2 className="text-3xl md:text-4xl font-bold mb-5">
          {isConnected ? 'Share & Start Earning' : 'Become an Early Partner'}
        </h2>
        <p className="text-muted-foreground mb-5 max-w-xl mx-auto">
          {isConnected 
            ? 'Copy your affiliate link above and share it everywhere!'
            : 'Your link is your key. Connect your wallet to get started.'}
        </p>
        {!isConnected && (
          <div className="flex justify-center">
            <ConnectWalletButton />
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="text-center mt-8 md:mt-10 py-5 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-1">
          <ShieldCheck className="w-3 h-3 inline mr-1" /> Revenue is generated from a 5% platform fee on each bet.
        </p>
        <p className="text-xs text-muted-foreground">
          Tier 1 affiliates earn 8% of fees. Tier 2 affiliates earn 2% of fees.
        </p>
      </footer>
    </div>
  );
}
