// src/components/profile/ProfileTabs.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase,
  History,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Flame,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { ProfileData } from '@/app/api/profile/[identifier]/route';
import type { OpenPosition } from '@/types';
import type { BetRecord } from '@/lib/supabase-server';

interface ProfileTabsProps {
  data: ProfileData;
  positions: { activePositions: OpenPosition[]; pastPositions: OpenPosition[] } | null;
  isLoadingPositions: boolean;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function PositionsTab({
  positions,
  isLoading,
}: {
  positions: { activePositions: OpenPosition[]; pastPositions: OpenPosition[] } | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const activePositions = positions?.activePositions || [];
  const pastPositions = positions?.pastPositions || [];
  const allPositions = [...activePositions, ...pastPositions];

  if (allPositions.length === 0) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">No positions yet</p>
          <p className="text-sm text-muted-foreground/70">Betting activity will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Positions */}
      {activePositions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Active Positions
          </h3>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead className="text-center">Side</TableHead>
                  <TableHead className="text-right">Invested</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePositions.map((position) => {
                  const pnlColor = position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500';
                  return (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate" title={position.predictionText}>
                          {position.predictionText}
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {position.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={position.userChoice === 'YES' ? 'default' : 'destructive'}
                          className={position.userChoice === 'YES' ? 'bg-green-500' : ''}
                        >
                          {position.userChoice}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(position.betAmount)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(position.currentValue)}</TableCell>
                      <TableCell className={`text-right font-semibold ${pnlColor}`}>
                        <div className="flex items-center justify-end gap-1">
                          {position.unrealizedPnL >= 0 ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          {formatCurrency(Math.abs(position.unrealizedPnL))}
                        </div>
                        <div className="text-xs opacity-75">
                          ({position.unrealizedPnLPercent.toFixed(1)}%)
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Past Positions */}
      {pastPositions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Past Positions
          </h3>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead className="text-center">Side</TableHead>
                  <TableHead className="text-right">Bet</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastPositions.slice(0, 10).map((position) => {
                  const isWin = position.status === 'SETTLED_WON' || position.status === 'COLLECTED';
                  return (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={position.predictionText}>
                        {position.predictionText}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={position.userChoice === 'YES' ? 'default' : 'destructive'}
                          className={position.userChoice === 'YES' ? 'bg-green-500/80' : 'opacity-80'}
                        >
                          {position.userChoice}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(position.betAmount)}</TableCell>
                      <TableCell className={`text-right font-medium ${isWin ? 'text-green-500' : 'text-red-500'}`}>
                        {isWin ? `+${formatCurrency(position.settledAmount || 0)}` : `-${formatCurrency(position.betAmount)}`}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(position.endsAt), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}

function ActivityTab({ bets }: { bets: BetRecord[] }) {
  if (bets.length === 0) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-12 text-center">
          <History className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">No activity yet</p>
          <p className="text-sm text-muted-foreground/70">Recent bets will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Side</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bets.map((bet) => (
            <TableRow key={bet.id}>
              <TableCell className="text-sm text-muted-foreground">
                {bet.created_at ? formatDistanceToNow(new Date(bet.created_at), { addSuffix: true }) : 'N/A'}
              </TableCell>
              <TableCell>
                <span className="font-medium">Bet Placed</span>
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={bet.outcome === 'YES' ? 'default' : 'destructive'}
                  className={bet.outcome === 'YES' ? 'bg-green-500' : ''}
                >
                  {bet.outcome}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(bet.amount)}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={
                    bet.status === 'executed'
                      ? bet.success
                        ? 'default'
                        : 'destructive'
                      : 'secondary'
                  }
                  className={bet.status === 'executed' && bet.success ? 'bg-green-500' : ''}
                >
                  {bet.status === 'executed'
                    ? bet.success
                      ? 'Won'
                      : 'Lost'
                    : bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function StatsTab({ data }: { data: ProfileData }) {
  const statGroups = [
    {
      title: 'Performance',
      icon: <Target className="w-5 h-5" />,
      stats: [
        { label: 'Total Bets', value: data.totalBets.toString() },
        { label: 'Winning Bets', value: data.winningBets.toString(), className: 'text-green-500' },
        { label: 'Losing Bets', value: data.losingBets.toString(), className: 'text-red-500' },
        { label: 'Pending Bets', value: data.pendingBets.toString(), className: 'text-amber-500' },
        { label: 'Win Rate', value: `${data.winRate.toFixed(1)}%` },
      ],
    },
    {
      title: 'Volume',
      icon: <BarChart3 className="w-5 h-5" />,
      stats: [
        { label: 'Total Wagered', value: formatCurrency(data.totalWagered) },
        { label: 'Total Won', value: formatCurrency(data.totalWon), className: 'text-green-500' },
        { label: 'Total Lost', value: formatCurrency(data.totalLost), className: 'text-red-500' },
        { label: 'Net P&L', value: formatCurrency(data.netPnL), className: data.netPnL >= 0 ? 'text-green-500' : 'text-red-500' },
      ],
    },
    {
      title: 'Recent P&L',
      icon: <Calendar className="w-5 h-5" />,
      stats: [
        { label: 'Today', value: formatCurrency(data.todayPnL), className: data.todayPnL >= 0 ? 'text-green-500' : 'text-red-500' },
        { label: 'This Week', value: formatCurrency(data.weekPnL), className: data.weekPnL >= 0 ? 'text-green-500' : 'text-red-500' },
        { label: 'This Month', value: formatCurrency(data.monthPnL), className: data.monthPnL >= 0 ? 'text-green-500' : 'text-red-500' },
      ],
    },
    {
      title: 'Streaks',
      icon: <Flame className="w-5 h-5" />,
      stats: [
        { label: 'Current Streak', value: `${data.currentStreak} wins` },
        { label: 'Best Streak', value: `${data.bestStreak} wins` },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {statGroups.map((group, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-primary">{group.icon}</span>
              {group.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.stats.map((stat, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <span className={`font-semibold ${stat.className || ''}`}>{stat.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ProfileTabs({ data, positions, isLoadingPositions }: ProfileTabsProps) {
  return (
    <Tabs defaultValue="positions" className="w-full">
      <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl mb-4">
        <TabsTrigger value="positions" className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg">
          <Briefcase className="w-4 h-4" />
          <span>Positions</span>
          {(positions?.activePositions?.length || 0) > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {positions?.activePositions?.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="activity" className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg">
          <History className="w-4 h-4" />
          <span>Activity</span>
        </TabsTrigger>
        <TabsTrigger value="stats" className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg">
          <BarChart3 className="w-4 h-4" />
          <span>Stats</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="positions">
        <PositionsTab positions={positions} isLoading={isLoadingPositions} />
      </TabsContent>

      <TabsContent value="activity">
        <ActivityTab bets={data.recentBets} />
      </TabsContent>

      <TabsContent value="stats">
        <StatsTab data={data} />
      </TabsContent>
    </Tabs>
  );
}
