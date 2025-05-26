import LeaderboardClient from '@/components/leaderboard/LeaderboardClient';
import { mockLeaderboardData } from '@/lib/mockData';

// In a real app, this data would be fetched from an API.
// export async function getLeaderboardData() {
//   // const res = await fetch('/api/leaderboard');
//   // return res.json();
//   return mockLeaderboardData;
// }

export default async function LeaderboardPage() {
  // const leaderboardEntries = await getLeaderboardData();
  const leaderboardEntries = mockLeaderboardData; // Using mock data for MVP

  return (
    <div className="container mx-auto py-8">
      <LeaderboardClient entries={leaderboardEntries} />
    </div>
  );
}
