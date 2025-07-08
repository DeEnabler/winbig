// src/components/homepage/PersonalStatsLeaderboardPanel.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Crown, BarChart, UserCircle, Activity } from 'lucide-react';
import { mockCurrentUser } from '@/lib/mockData'; // Using mockCurrentUser for personal stats
import { Button } from '../ui/button';
import Link from 'next/link';

// Mock data for leaderboard
const mockLeaderboardData = [
  { id: 'leader1', rank: 1, username: 'CryptoKing88', xp: 125000, streak: 15, avatarUrl: 'https://placehold.co/40x40.png?text=CK' },
  { id: 'leader2', rank: 2, username: 'ProphetQueen', xp: 110000, streak: 9, avatarUrl: 'https://placehold.co/40x40.png?text=PQ' },
  { id: 'leader3', rank: 3, username: 'BetGodSupreme', xp: 98000, streak: 22, avatarUrl: 'https://placehold.co/40x40.png?text=BG' },
  { id: 'leader4', rank: 4, username: 'OddsOracle', xp: 85000, streak: 7, avatarUrl: 'https://placehold.co/40x40.png?text=OO' },
  { id: 'leader5', rank: 5, username: mockCurrentUser.username, xp: mockCurrentUser.xp, streak: mockCurrentUser.betStreak, avatarUrl: mockCurrentUser.avatarUrl || 'https://placehold.co/40x40.png?text=You' },
].sort((a, b) => a.rank - b.rank);

// Mock data for user's recent bets
const mockRecentBets = [
  { id: 'bet1', question: 'Will BTC hit $70k this week?', choice: 'YES', outcome: 'WON', amount: 25, payout: 47.5 },
  { id: 'bet2', question: 'Will LAL win tonight?', choice: 'NO', outcome: 'LOST', amount: 10, payout: 0 },
  { id: 'bet3', question: 'Will AI pass the Turing Test by EOY?', choice: 'YES', outcome: 'PENDING', amount: 50, potentialPayout: 90 },
];

export default function PersonalStatsLeaderboardPanel() {
  const currentUserRank = mockLeaderboardData.find(u => u.id === 'leader5')?.rank || 'N/A';
  const totalWinnings = mockRecentBets.filter(b => b.outcome === 'WON').reduce((sum, bet) => sum + ((bet.payout || 0) - bet.amount), 0);

  return (
    <section className="py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Personal Stats Card */}
        <Card className="lg:col-span-1 bg-card rounded-xl shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-xl md:text-2xl">
              <UserCircle className="w-6 h-6 mr-2 text-primary" /> Your Stats
            </CardTitle>
            <CardDescription>Your recent activity and performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current XP:</span>
              <span className="font-semibold text-primary">{mockCurrentUser.xp.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Win Streak:</span>
              <span className="font-semibold text-orange-500">{mockCurrentUser.betStreak} 🔥</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overall Rank:</span>
              <span className="font-semibold text-purple-500">#{currentUserRank}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Net Winnings:</span>
              <span className="font-semibold text-green-600">${totalWinnings.toFixed(2)}</span>
            </div>
            <h4 className="font-semibold pt-2 text-base">Recent Bets:</h4>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {mockRecentBets.slice(0,3).map(bet => (
                <li key={bet.id} className="text-xs p-1.5 bg-muted/50 rounded-md">
                  <span className={`font-bold ${bet.outcome === 'WON' ? 'text-success' : bet.outcome === 'LOST' ? 'text-destructive' : 'text-primary'}`}>
                    {bet.outcome}
                  </span> ({bet.choice}) on "{bet.question.substring(0,25)}..."
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Leaderboard Card */}
        <Card className="lg:col-span-2 bg-card rounded-xl shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-xl md:text-2xl">
              <Crown className="w-6 h-6 mr-2 text-yellow-500" /> Top Predictors
            </CardTitle>
            <CardDescription>See who's dominating the prediction markets this week.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Streak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLeaderboardData.slice(0, 5).map((user) => (
                  <TableRow key={user.id} className={user.username === mockCurrentUser.username ? 'bg-primary/10' : ''}>
                    <TableCell className="font-bold">{user.rank}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={user.avatarUrl} alt={user.username} data-ai-hint="person avatar" />
                          <AvatarFallback>{user.username.substring(0,1)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate max-w-[100px] sm:max-w-xs">{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{user.xp.toLocaleString()}</TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <Badge variant={user.streak > 10 ? "default" : "secondary"} className={user.streak > 10 ? "bg-orange-500 text-white" : ""}>
                        {user.streak}🔥
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-center mt-4">
                <Button variant="outline" asChild>
                    <Link href="/leaderboard">View Full Leaderboard</Link>
                </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Climb the ranks and show your prediction skills!
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
