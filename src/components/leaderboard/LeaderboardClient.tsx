'use client';

import type { LeaderboardEntry } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Zap, TrendingUp } from 'lucide-react';

interface LeaderboardClientProps {
  entries: LeaderboardEntry[];
}

export default function LeaderboardClient({ entries }: LeaderboardClientProps) {
  if (!entries || entries.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>No data available yet. Start betting to appear on the leaderboard!</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">The leaderboard is currently empty.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-2">
          <Trophy className="w-10 h-10 text-yellow-500" />
        </div>
        <CardTitle className="text-3xl font-bold">Top Players</CardTitle>
        <CardDescription>See who's dominating the prediction world!</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] text-center">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">XP</TableHead>
              <TableHead className="text-right">Winnings</TableHead>
              <TableHead className="text-right">Streak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.user.id} className="hover:bg-muted/50">
                <TableCell className="font-bold text-lg text-center">
                  {entry.rank === 1 && <Trophy className="w-5 h-5 inline-block text-yellow-400 mr-1" />}
                  {entry.rank === 2 && <Trophy className="w-5 h-5 inline-block text-gray-400 mr-1" />}
                  {entry.rank === 3 && <Trophy className="w-5 h-5 inline-block text-orange-400 mr-1" />}
                  {entry.rank}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={entry.user.avatarUrl} alt={entry.user.username} data-ai-hint="person avatar" />
                      <AvatarFallback>{entry.user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{entry.user.username}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    {entry.user.xp.toLocaleString()} <Zap className="w-4 h-4 ml-1 text-yellow-500" />
                  </div>
                </TableCell>
                <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold">
                  ${entry.totalWinnings.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    {entry.longestStreak} <TrendingUp className="w-4 h-4 ml-1 text-red-500" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
