// src/app/wallet/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useAppKit } from '@reown/appkit/react';
import { format } from 'date-fns';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Flame,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  DollarSign,
  Percent,
  Target,
  Zap,
  Gift,
  ChevronRight,
  Sparkles,
  BarChart3,
  Activity,
  ExternalLink,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EarningsStats } from '@/app/api/earnings/route';
import type { BetRecord } from '@/lib/supabase-server';

// Animated counter component for dramatic number reveals
function AnimatedNumber({ 
  value, 
  prefix = '', 
  suffix = '',
  decimals = 2,
  duration = 1.5,
  className = ''
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Easing function for smooth animation
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const current = startValue + (endValue - startValue) * easeOutExpo;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return (
    <span className={className}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}

// Stat card with gradient and icon
function StatCard({
  title,
  value,
  prefix = '$',
  suffix = '',
  icon: Icon,
  trend,
  trendValue,
  gradient,
  delay = 0,
  decimals = 2,
}: {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  gradient: string;
  delay?: number;
  decimals?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className={`relative overflow-hidden border-0 shadow-xl ${gradient}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <CardContent className="p-5 relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{title}</p>
              <p className="text-3xl font-bold text-white mt-1">
                <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
              </p>
              {trend && trendValue && (
                <div className={`flex items-center mt-2 text-sm ${
                  trend === 'up' ? 'text-green-300' : trend === 'down' ? 'text-red-300' : 'text-white/60'
                }`}>
                  {trend === 'up' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : 
                   trend === 'down' ? <ArrowDownRight className="w-4 h-4 mr-1" /> : null}
                  {trendValue}
                </div>
              )}
            </div>
            <div className="p-3 rounded-xl bg-white/20">
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Fetch earnings data
const fetchEarnings = async (userId: string | undefined): Promise<EarningsStats | null> => {
  if (!userId) return null;
  const response = await fetch(`/api/earnings?user_id=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch earnings');
  const data = await response.json();
  return data.success ? data.data : null;
};

export default function WalletPage() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  
  const { data: earnings, isLoading, error, refetch } = useQuery({
    queryKey: ['earnings', address],
    queryFn: () => fetchEarnings(address),
    enabled: !!address,
    refetchInterval: 30000,
  });

  // Not connected state
  if (!isConnected) {
    return (
      <div className="container mx-auto py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto text-center"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-purple-500/30 to-pink-500/30 blur-3xl" />
            <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl p-10 border border-white/10 shadow-2xl">
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              >
                <Wallet className="w-20 h-20 mx-auto text-primary mb-6" />
              </motion.div>
              <h1 className="text-3xl font-bold mb-3">Connect Your Wallet</h1>
              <p className="text-muted-foreground mb-6">
                Connect your wallet to view your earnings, track your bets, and manage your portfolio.
              </p>
              <Button 
                onClick={() => open()} 
                size="lg" 
                className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold py-6 rounded-xl shadow-lg"
              >
                <Wallet className="w-5 h-5 mr-2" />
                Connect Wallet
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Your earnings await. Join thousands of successful bettors.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Mock data if no real data yet
  const stats: EarningsStats = earnings || {
    totalBalance: 0,
    availableBalance: 0,
    pendingBalance: 0,
    totalBets: 0,
    winningBets: 0,
    losingBets: 0,
    pendingBets: 0,
    winRate: 0,
    totalWagered: 0,
    totalWon: 0,
    totalLost: 0,
    netPnL: 0,
    referralEarnings: 0,
    totalReferrals: 0,
    referredVolume: 0,
    recentBets: [],
    recentReferrals: [],
    todayPnL: 0,
    weekPnL: 0,
    monthPnL: 0,
    currentStreak: 0,
    bestStreak: 0,
  };

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div className="container mx-auto py-6 md:py-10">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500">
              My Portfolio
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center">
              <Wallet className="w-4 h-4 mr-2" />
              {shortAddress}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="rounded-xl">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Hero Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white shadow-2xl rounded-3xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <CardContent className="relative p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left: Balance */}
              <div>
                <p className="text-white/60 text-sm font-medium uppercase tracking-wider mb-2">
                  Total Balance
                </p>
                <div className="flex items-baseline">
                  <span className="text-6xl md:text-7xl font-black">
                    <AnimatedNumber value={stats.totalBalance} prefix="$" decimals={2} />
                  </span>
                </div>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${stats.netPnL >= 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className={`text-sm ${stats.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.netPnL >= 0 ? '+' : ''}{stats.netPnL.toFixed(2)} PnL
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
                    <Flame className="w-3 h-3 mr-1 text-orange-400" />
                    {stats.currentStreak} Streak
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-xs uppercase">Available</p>
                    <p className="text-xl font-bold">${stats.availableBalance.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-xs uppercase">Pending</p>
                    <p className="text-xl font-bold">${stats.pendingBalance.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Right: Quick Stats */}
              <div className="space-y-4">
                {/* Win Rate Circle */}
                <div className="flex items-center justify-center">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-white/10"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="url(#gradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(stats.winRate / 100) * 440} 440`}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{stats.winRate.toFixed(0)}%</span>
                      <span className="text-white/50 text-sm">Win Rate</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-green-400 font-bold">{stats.winningBets}</p>
                    <p className="text-white/50 text-xs">Wins</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-red-400 font-bold">{stats.losingBets}</p>
                    <p className="text-white/50 text-xs">Losses</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-yellow-400 font-bold">{stats.pendingBets}</p>
                    <p className="text-white/50 text-xs">Pending</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Wagered"
          value={stats.totalWagered}
          icon={DollarSign}
          gradient="bg-gradient-to-br from-blue-600 to-blue-800"
          delay={0.1}
        />
        <StatCard
          title="Total Won"
          value={stats.totalWon}
          icon={TrendingUp}
          trend="up"
          trendValue={`${stats.winningBets} wins`}
          gradient="bg-gradient-to-br from-green-600 to-emerald-800"
          delay={0.2}
        />
        <StatCard
          title="Referral Earnings"
          value={stats.referralEarnings}
          icon={Users}
          trend={stats.totalReferrals > 0 ? 'up' : 'neutral'}
          trendValue={`${stats.totalReferrals} referrals`}
          gradient="bg-gradient-to-br from-purple-600 to-purple-800"
          delay={0.3}
        />
        <StatCard
          title="Best Streak"
          value={stats.bestStreak}
          prefix=""
          suffix=" wins"
          icon={Trophy}
          gradient="bg-gradient-to-br from-orange-500 to-red-600"
          delay={0.4}
          decimals={0}
        />
      </div>

      {/* PnL Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8"
      >
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-primary" />
              PnL Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Today</p>
                <p className={`text-2xl font-bold ${stats.todayPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stats.todayPnL >= 0 ? '+' : ''}{stats.todayPnL.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">This Week</p>
                <p className={`text-2xl font-bold ${stats.weekPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stats.weekPnL >= 0 ? '+' : ''}{stats.weekPnL.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">This Month</p>
                <p className={`text-2xl font-bold ${stats.monthPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stats.monthPnL >= 0 ? '+' : ''}{stats.monthPnL.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs for Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Tabs defaultValue="bets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 rounded-xl">
            <TabsTrigger value="bets" className="rounded-lg">
              <Target className="w-4 h-4 mr-2" />
              Recent Bets
            </TabsTrigger>
            <TabsTrigger value="referrals" className="rounded-lg">
              <Gift className="w-4 h-4 mr-2" />
              Referral Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bets">
            <Card className="rounded-2xl shadow-lg">
              <CardContent className="p-0">
                {stats.recentBets.length === 0 ? (
                  <div className="p-10 text-center">
                    <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-xl font-semibold mb-2">No Bets Yet</p>
                    <p className="text-muted-foreground mb-4">Start betting to see your activity here!</p>
                    <Button asChild className="rounded-xl">
                      <a href="/">Find Markets</a>
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Market</TableHead>
                        <TableHead className="text-center">Choice</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentBets.map((bet: BetRecord, index: number) => (
                        <TableRow key={bet.id || index}>
                          <TableCell className="font-medium max-w-xs truncate">
                            {bet.market_id?.slice(0, 20)}...
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline" 
                              className={bet.outcome === 'YES' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}
                            >
                              {bet.outcome}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${bet.amount?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant={bet.status === 'executed' ? 'default' : 'secondary'}
                              className={
                                bet.success === true ? 'bg-green-500' : 
                                bet.success === false ? 'bg-red-500' : ''
                              }
                            >
                              {bet.success === true ? 'Won' : 
                               bet.success === false ? 'Lost' : 
                               bet.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {bet.created_at ? format(new Date(bet.created_at), 'MMM d') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card className="rounded-2xl shadow-lg">
              <CardContent className="p-0">
                {stats.recentReferrals.length === 0 ? (
                  <div className="p-10 text-center">
                    <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-xl font-semibold mb-2">No Referrals Yet</p>
                    <p className="text-muted-foreground mb-4">Share your bets to earn referral rewards!</p>
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 max-w-md mx-auto">
                      <p className="text-sm text-muted-foreground">
                        <Sparkles className="w-4 h-4 inline mr-1 text-purple-500" />
                        Earn <span className="font-bold text-primary">8%</span> of every bet placed through your links!
                      </p>
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referred User</TableHead>
                        <TableHead className="text-right">Their Bet</TableHead>
                        <TableHead className="text-right">Your Earnings</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentReferrals.map((ref: BetRecord, index: number) => (
                        <TableRow key={ref.id || index}>
                          <TableCell className="font-medium">
                            {ref.user_id ? `${ref.user_id.slice(0, 6)}...${ref.user_id.slice(-4)}` : 'Anonymous'}
                          </TableCell>
                          <TableCell className="text-right">${ref.amount?.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-green-500 font-semibold">
                            +${((ref.amount || 0) * 0.08).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {ref.created_at ? format(new Date(ref.created_at), 'MMM d') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8"
      >
        <Card className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-0 rounded-2xl">
          <CardContent className="p-8 text-center">
            <Zap className="w-12 h-12 mx-auto text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-2">Grow Your Earnings</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Share your winning bets and earn 8% from every bet your friends place!
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild className="rounded-xl">
                <a href="/">Place a Bet</a>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <a href="/earn">Learn About Earnings</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
