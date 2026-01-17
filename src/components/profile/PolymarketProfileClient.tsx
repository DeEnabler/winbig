// src/components/profile/PolymarketProfileClient.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  History,
  BarChart3,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Twitter,
  Wallet,
  Calendar,
  Target,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { MirroredProfile, PolymarketPosition, PolymarketActivity } from '@/lib/polymarket-service';

interface PolymarketProfileClientProps {
  identifier: string;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(2)}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatShortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function fetchPolymarketProfile(identifier: string): Promise<MirroredProfile> {
  const response = await fetch(`/api/polymarket/${encodeURIComponent(identifier)}`);
  if (!response.ok) throw new Error('Failed to fetch profile');
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-start gap-6">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

function ProfileHeader({ profile, onSync, isSyncing }: { 
  profile: MirroredProfile; 
  onSync: () => void;
  isSyncing: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(profile.polymarket_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent" />
      
      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar className="w-24 h-24 md:w-28 md:h-28 border-4 border-background shadow-xl">
              <AvatarImage src={profile.profile_image_url} alt={profile.display_name || 'Profile'} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {(profile.display_name || profile.pseudonym || 'P')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold truncate">
                {profile.display_name || profile.pseudonym || formatShortAddress(profile.polymarket_address)}
              </h1>
              {profile.is_verified && (
                <Badge className="bg-blue-500 text-white">
                  <Check className="w-3 h-3 mr-1" /> Verified
                </Badge>
              )}
            </div>

            {profile.polymarket_username && (
              <a
                href={`https://polymarket.com/@${profile.polymarket_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors mb-2"
              >
                @{profile.polymarket_username}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {profile.bio && (
              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{profile.bio}</p>
            )}

            {/* Meta info row */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Wallet */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                <code className="text-xs">{formatShortAddress(profile.polymarket_address)}</code>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleCopy}>
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>

              {/* X/Twitter */}
              {profile.x_username && (
                <a
                  href={`https://x.com/${profile.x_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Twitter className="w-3.5 h-3.5" />
                  <span className="text-xs">@{profile.x_username}</span>
                </a>
              )}

              {/* Joined date */}
              {profile.joined_at && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs">
                    Joined {format(new Date(profile.joined_at), 'MMM yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-start gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={isSyncing}
              className="gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://polymarket.com/@${profile.polymarket_username || profile.polymarket_address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ profile }: { profile: MirroredProfile }) {
  const pnlColor = profile.total_pnl >= 0 ? 'text-green-500' : 'text-red-500';
  
  const stats = [
    {
      label: 'Portfolio Value',
      value: formatCurrency(profile.portfolio_value),
      icon: <DollarSign className="w-5 h-5" />,
      color: 'text-blue-500',
      bg: 'from-blue-500/10 to-blue-500/5',
    },
    {
      label: 'Total P&L',
      value: formatCurrency(profile.total_pnl),
      subValue: formatPercent(profile.total_pnl_percent),
      icon: profile.total_pnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />,
      color: pnlColor,
      bg: profile.total_pnl >= 0 ? 'from-green-500/10 to-green-500/5' : 'from-red-500/10 to-red-500/5',
    },
    {
      label: 'Positions',
      value: profile.total_positions.toString(),
      subValue: `${profile.positions_won}W / ${profile.positions_lost}L`,
      icon: <Briefcase className="w-5 h-5" />,
      color: 'text-purple-500',
      bg: 'from-purple-500/10 to-purple-500/5',
    },
    {
      label: 'Win Rate',
      value: `${profile.win_rate.toFixed(1)}%`,
      icon: <Target className="w-5 h-5" />,
      color: profile.win_rate >= 50 ? 'text-green-500' : 'text-amber-500',
      bg: profile.win_rate >= 50 ? 'from-green-500/10 to-green-500/5' : 'from-amber-500/10 to-amber-500/5',
    },
    {
      label: 'Total Trades',
      value: profile.total_trades.toString(),
      icon: <Activity className="w-5 h-5" />,
      color: 'text-cyan-500',
      bg: 'from-cyan-500/10 to-cyan-500/5',
    },
    {
      label: 'Volume Traded',
      value: formatCurrency(profile.total_volume_traded),
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'text-orange-500',
      bg: 'from-orange-500/10 to-orange-500/5',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, i) => (
        <Card key={i} className={`bg-gradient-to-br ${stat.bg} border-0 overflow-hidden`}>
          <CardContent className="p-4">
            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            {stat.subValue && (
              <div className="text-xs text-muted-foreground/70 mt-0.5">{stat.subValue}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PositionsTab({ positions }: { positions: PolymarketPosition[] }) {
  if (!positions || positions.length === 0) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">No positions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Market</TableHead>
            <TableHead className="text-center">Outcome</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Avg Price</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">P&L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((pos, i) => {
            const pnl = parseFloat(pos.cashPnl) || 0;
            const pnlPercent = parseFloat(pos.percentPnl) || 0;
            const pnlColor = pnl >= 0 ? 'text-green-500' : 'text-red-500';
            const outcomeLower = (pos.outcome || '').toLowerCase();
            const isYes = outcomeLower === 'yes';
            
            return (
              <TableRow key={i}>
                <TableCell className="max-w-xs">
                  <a
                    href={`https://polymarket.com/event/${pos.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-primary transition-colors line-clamp-2"
                  >
                    {pos.title}
                  </a>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={isYes ? 'default' : 'destructive'}
                    className={isYes ? 'bg-green-500' : ''}>
                    {pos.outcome}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {parseFloat(pos.size).toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {(parseFloat(pos.avgPrice) * 100).toFixed(1)}¢
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(parseFloat(pos.currentValue) || 0)}
                </TableCell>
                <TableCell className={`text-right font-semibold ${pnlColor}`}>
                  <div className="flex items-center justify-end gap-1">
                    {pnl >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {formatCurrency(Math.abs(pnl))}
                  </div>
                  <div className="text-xs opacity-75">{formatPercent(pnlPercent)}</div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function ActivityTab({ activity }: { activity: PolymarketActivity[] }) {
  if (!activity || activity.length === 0) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-12 text-center">
          <History className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">No activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Market</TableHead>
            <TableHead className="text-center">Side</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activity.slice(0, 50).map((act, i) => {
            const sideUpper = (act.side || '').toUpperCase();
            const isBuy = sideUpper === 'BUY';
            return (
            <TableRow key={i}>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{act.type}</Badge>
              </TableCell>
              <TableCell className="max-w-[200px]">
                <span className="line-clamp-1">{act.title}</span>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={isBuy ? 'default' : 'secondary'}
                  className={isBuy ? 'bg-green-500' : 'bg-red-500 text-white'}>
                  {act.side}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {(parseFloat(act.price) * 100).toFixed(1)}¢
              </TableCell>
              <TableCell className="text-right font-mono">
                {parseFloat(act.size).toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency((parseFloat(act.price) || 0) * (parseFloat(act.size) || 0))}
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

export default function PolymarketProfileClient({ identifier }: PolymarketProfileClientProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['polymarket-profile', identifier],
    queryFn: () => fetchPolymarketProfile(identifier),
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch(`/api/polymarket/${encodeURIComponent(identifier)}?sync=true`);
      await refetch();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 md:py-10 max-w-6xl">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-6 md:py-10 max-w-6xl">
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="py-12 text-center">
            <p className="text-xl font-semibold text-destructive mb-2">Profile Not Found</p>
            <p className="text-muted-foreground">
              Could not load Polymarket profile for: {identifier}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 md:py-10 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <ProfileHeader profile={profile} onSync={handleSync} isSyncing={isSyncing} />

        {/* Stats Grid */}
        <StatsGrid profile={profile} />

        {/* Tabbed Content */}
        <Tabs defaultValue="positions" className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl mb-4">
            <TabsTrigger value="positions" className="flex items-center gap-2 rounded-lg">
              <Briefcase className="w-4 h-4" />
              Positions
              {profile.positions && (
                <Badge variant="secondary" className="ml-1">{profile.positions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2 rounded-lg">
              <History className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="positions">
            <PositionsTab positions={profile.positions || []} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab activity={profile.activity || []} />
          </TabsContent>
        </Tabs>

        {/* Source badge */}
        <div className="text-center text-xs text-muted-foreground">
          Data from{' '}
          <a
            href="https://polymarket.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Polymarket
          </a>
        </div>
      </div>
    </div>
  );
}
