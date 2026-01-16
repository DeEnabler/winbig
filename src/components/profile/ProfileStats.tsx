// src/components/profile/ProfileStats.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, Coins, Users, Flame } from 'lucide-react';
import type { ProfileData } from '@/app/api/profile/[identifier]/route';

interface ProfileStatsProps {
  data: ProfileData;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export default function ProfileStats({ data }: ProfileStatsProps) {
  const pnlColor = data.netPnL >= 0 ? 'text-green-500' : 'text-red-500';
  const pnlBg = data.netPnL >= 0 ? 'from-green-500/10 to-green-500/5' : 'from-red-500/10 to-red-500/5';
  const pnlBorder = data.netPnL >= 0 ? 'border-green-500/20' : 'border-red-500/20';

  const stats = [
    {
      label: 'Portfolio Value',
      value: formatCurrency(data.portfolioValue),
      icon: <Coins className="w-5 h-5" />,
      className: 'text-primary',
      bgClass: 'from-primary/10 to-primary/5',
      borderClass: 'border-primary/20',
    },
    {
      label: 'Total P&L',
      value: formatCurrency(data.netPnL),
      subValue: formatPercent(data.netPnLPercent),
      icon: data.netPnL >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />,
      className: pnlColor,
      bgClass: pnlBg,
      borderClass: pnlBorder,
    },
    {
      label: 'Win Rate',
      value: `${data.winRate.toFixed(1)}%`,
      subValue: `${data.winningBets}W / ${data.losingBets}L`,
      icon: <Target className="w-5 h-5" />,
      className: data.winRate >= 50 ? 'text-green-500' : 'text-amber-500',
      bgClass: data.winRate >= 50 ? 'from-green-500/10 to-green-500/5' : 'from-amber-500/10 to-amber-500/5',
      borderClass: data.winRate >= 50 ? 'border-green-500/20' : 'border-amber-500/20',
    },
    {
      label: 'Total Bets',
      value: data.totalBets.toString(),
      subValue: data.pendingBets > 0 ? `${data.pendingBets} pending` : undefined,
      icon: <Flame className="w-5 h-5" />,
      className: 'text-accent',
      bgClass: 'from-accent/10 to-accent/5',
      borderClass: 'border-accent/20',
    },
  ];

  // Add referrals stat if user has any
  if (data.totalReferrals > 0 || data.referralEarnings > 0) {
    stats.push({
      label: 'Referral Earnings',
      value: formatCurrency(data.referralEarnings),
      subValue: `${data.totalReferrals} referrals`,
      icon: <Users className="w-5 h-5" />,
      className: 'text-purple-500',
      bgClass: 'from-purple-500/10 to-purple-500/5',
      borderClass: 'border-purple-500/20',
    });
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`bg-gradient-to-br ${stat.bgClass} ${stat.borderClass} border overflow-hidden`}
        >
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className={`${stat.className} opacity-80`}>{stat.icon}</span>
            </div>
            <div className={`text-xl md:text-2xl font-bold ${stat.className}`}>
              {stat.value}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {stat.label}
            </div>
            {stat.subValue && (
              <div className="text-xs text-muted-foreground mt-1 opacity-75">
                {stat.subValue}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
