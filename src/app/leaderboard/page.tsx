// src/app/leaderboard/page.tsx
import { notFound } from 'next/navigation';

export default function LeaderboardPage() {
  notFound();
  // notFound() will throw an error to signal Next.js to render the not-found page.
  // The return value here is technically unreachable but good practice for linters.
  return null;
}
