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
  Copy,
  Check,
  Share2,
  Lock,
  Unlock,
  Loader2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import type { EarningsStats } from '@/app/api/earnings/route';
import type { BetRecord } from '@/lib/supabase-server';
import type { BonusBalanceSummary, GiftHistoryItem } from '@/lib/bonus-service';

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

// Fetch bonus data
interface BonusApiData {
  summary: BonusBalanceSummary;
  bonuses: any[];
  gift_history: GiftHistoryItem[];
}

const fetchBonus = async (userId: string | undefined): Promise<BonusApiData | null> => {
  if (!userId) return null;
  const response = await fetch(`/api/bonus?user_id=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch bonus');
  const data = await response.json();
  return data.success ? data.data : null;
};

export default function WalletPage() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { toast } = useToast();
  const { xProfile } = useUser();
  
  // Gift creation state
  const [isGiftDialogOpen, setIsGiftDialogOpen] = useState(false);
  const [giftAmount, setGiftAmount] = useState(50);
  const [isCreatingGift, setIsCreatingGift] = useState(false);
  const [createdGiftUrl, setCreatedGiftUrl] = useState<string | null>(null);
  const [copiedGiftUrl, setCopiedGiftUrl] = useState(false);
  
  const { data: earnings, isLoading, error, refetch } = useQuery({
    queryKey: ['earnings', address],
    queryFn: () => fetchEarnings(address),
    enabled: !!address,
    refetchInterval: 30000,
  });
  
  const { data: bonusData, isLoading: isBonusLoading, refetch: refetchBonus } = useQuery({
    queryKey: ['bonus', address],
    queryFn: () => fetchBonus(address),
    enabled: !!address,
    refetchInterval: 30000,
  });
  
  // Handle gift creation
  const handleCreateGift = async () => {
    if (!address || !bonusData?.summary.sharable_balance) return;
    
    if (giftAmount > bonusData.summary.sharable_balance) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Balance',
        description: `You only have $${bonusData.summary.sharable_balance.toFixed(2)} sharable bonus`,
      });
      return;
    }
    
    setIsCreatingGift(true);
    try {
      const response = await fetch('/api/bonus/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: address,
          amount: giftAmount,
          username: xProfile?.x_username,
          avatar: xProfile?.x_avatar,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCreatedGiftUrl(result.data.gift_url);
        refetchBonus();
        toast({
          title: '🎁 Gift Link Created!',
          description: `Share the link to give $${giftAmount} bonus`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to Create Gift',
          description: result.error || 'Please try again',
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create gift link',
      });
    } finally {
      setIsCreatingGift(false);
    }
  };
  
  const copyGiftUrl = async () => {
    if (!createdGiftUrl) return;
    await navigator.clipboard.writeText(createdGiftUrl);
    setCopiedGiftUrl(true);
    setTimeout(() => setCopiedGiftUrl(false), 2000);
  };
  
  const resetGiftDialog = () => {
    setCreatedGiftUrl(null);
    setGiftAmount(50);
    setCopiedGiftUrl(false);
  };

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
    tier1Earnings: 0,
    tier2Earnings: 0,
    pendingReferralEarnings: 0,
    availableReferralEarnings: 0,
    withdrawnReferralEarnings: 0,
    totalReferrals: 0,
    tier1Referrals: 0,
    tier2Referrals: 0,
    referredVolume: 0,
    recentBets: [],
    recentReferrals: [],
    recentAffiliateEarnings: [],
    todayPnL: 0,
    weekPnL: 0,
    monthPnL: 0,
    currentStreak: 0,
    bestStreak: 0,
    affiliateCode: undefined,
    affiliateUrl: undefined,
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

      {/* Bonus Balance Card */}
      {bonusData && (bonusData.summary.total_balance > 0 || bonusData.summary.sharable_balance > 0 || bonusData.summary.pending_profits > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white rounded-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
            
            <CardContent className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gift className="w-6 h-6" />
                  <h3 className="text-lg font-bold">Bonus Balance</h3>
                </div>
                {bonusData.summary.sharable_balance > 0 && (
                  <Button
                    onClick={() => setIsGiftDialogOpen(true)}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share Bonus
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-white/70 text-xs uppercase mb-1">Personal</p>
                  <p className="text-2xl font-bold">${bonusData.summary.personal_balance.toFixed(2)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-white/70 text-xs uppercase mb-1">Sharable</p>
                  <p className="text-2xl font-bold">${bonusData.summary.sharable_balance.toFixed(2)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-1 mb-1">
                    <Lock className="w-3 h-3 text-white/70" />
                    <p className="text-white/70 text-xs uppercase">Pending Profits</p>
                  </div>
                  <p className="text-2xl font-bold">${bonusData.summary.pending_profits.toFixed(2)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-1 mb-1">
                    <Unlock className="w-3 h-3 text-white/70" />
                    <p className="text-white/70 text-xs uppercase">Unlocked</p>
                  </div>
                  <p className="text-2xl font-bold">${bonusData.summary.unlocked_profits.toFixed(2)}</p>
                </div>
              </div>
              
              {/* Volume Progress */}
              {bonusData.summary.volume_required > 0 && (
                <div className="mt-4 bg-white/10 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-white/80">Volume Progress</p>
                    <p className="text-sm font-semibold">
                      {bonusData.summary.volume_progress_percent.toFixed(1)}%
                    </p>
                  </div>
                  <Progress 
                    value={bonusData.summary.volume_progress_percent} 
                    className="h-2 bg-white/20"
                  />
                  <p className="text-xs text-white/60 mt-2">
                    ${bonusData.summary.volume_completed.toFixed(0)} / ${bonusData.summary.volume_required.toFixed(0)} wagered
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

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
          title="Bonus Balance"
          value={bonusData?.summary.total_balance || 0}
          icon={Gift}
          trend={bonusData?.summary.total_balance ? 'up' : 'neutral'}
          trendValue={bonusData?.summary.pending_profits ? `$${bonusData.summary.pending_profits.toFixed(0)} locked` : undefined}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          delay={0.4}
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
          <TabsList className="grid w-full grid-cols-3 mb-4 rounded-xl">
            <TabsTrigger value="bets" className="rounded-lg">
              <Target className="w-4 h-4 mr-2" />
              Recent Bets
            </TabsTrigger>
            <TabsTrigger value="referrals" className="rounded-lg">
              <Users className="w-4 h-4 mr-2" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="gifts" className="rounded-lg">
              <Gift className="w-4 h-4 mr-2" />
              Gifts
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

          <TabsContent value="gifts">
            <Card className="rounded-2xl shadow-lg">
              <CardContent className="p-0">
                {!bonusData?.gift_history || bonusData.gift_history.length === 0 ? (
                  <div className="p-10 text-center">
                    <Gift className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-xl font-semibold mb-2">No Gift History</p>
                    <p className="text-muted-foreground mb-4">
                      {bonusData?.summary.sharable_balance ? 
                        'Share your bonus with friends!' : 
                        'Gift history will appear here when you send or receive bonus gifts.'}
                    </p>
                    {bonusData?.summary.sharable_balance && bonusData.summary.sharable_balance > 0 && (
                      <Button onClick={() => setIsGiftDialogOpen(true)} className="rounded-xl">
                        <Share2 className="w-4 h-4 mr-2" />
                        Create Gift Link
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>With</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bonusData.gift_history.map((gift: GiftHistoryItem) => (
                        <TableRow key={gift.id}>
                          <TableCell>
                            <Badge variant={gift.direction === 'sent' ? 'outline' : 'default'}>
                              {gift.direction === 'sent' ? 'Sent' : 'Received'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            <span className={gift.direction === 'sent' ? 'text-red-500' : 'text-green-500'}>
                              {gift.direction === 'sent' ? '-' : '+'}${gift.amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {gift.other_username || 
                              (gift.other_user_id ? `${gift.other_user_id.slice(0, 6)}...` : 'Pending')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant={gift.status === 'claimed' ? 'default' : 'secondary'}
                              className={
                                gift.status === 'claimed' ? 'bg-green-500' : 
                                gift.status === 'pending' ? 'bg-yellow-500' : ''
                              }
                            >
                              {gift.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {format(new Date(gift.created_at), 'MMM d')}
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

      {/* Gift Creation Dialog */}
      <Dialog open={isGiftDialogOpen} onOpenChange={(open) => {
        setIsGiftDialogOpen(open);
        if (!open) resetGiftDialog();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Share Bonus
            </DialogTitle>
            <DialogDescription>
              Create a shareable link to gift bonus funds to friends.
            </DialogDescription>
          </DialogHeader>
          
          {!createdGiftUrl ? (
            <>
              <div className="space-y-4 py-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Available to share</span>
                    <span className="font-bold text-lg">
                      ${bonusData?.summary.sharable_balance.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Gift Amount</label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={giftAmount}
                      onChange={(e) => setGiftAmount(Number(e.target.value))}
                      min={10}
                      max={bonusData?.summary.sharable_balance || 500}
                      className="text-2xl font-bold h-14"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Min: $10 • Max: $500
                  </p>
                </div>
                
                <div className="bg-amber-500/10 rounded-lg p-3 text-sm">
                  <p className="text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    Recipients must trade ${giftAmount * 30} to unlock profits.
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  onClick={handleCreateGift}
                  disabled={isCreatingGift || giftAmount < 10 || giftAmount > (bonusData?.summary.sharable_balance || 0)}
                  className="w-full"
                >
                  {isCreatingGift ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Create Gift Link
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-500/10 rounded-full flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-lg font-semibold mb-1">Gift Link Created!</p>
                  <p className="text-muted-foreground text-sm">
                    Share this link to give ${giftAmount} bonus
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    value={createdGiftUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyGiftUrl}
                  >
                    {copiedGiftUrl ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const text = `I'm sending you $${giftAmount} bonus to trade on WinBig! 🎁\n\nClaim here: ${createdGiftUrl}`;
                      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                      window.open(twitterUrl, '_blank');
                    }}
                  >
                    Share on X
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      resetGiftDialog();
                      setIsGiftDialogOpen(false);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
