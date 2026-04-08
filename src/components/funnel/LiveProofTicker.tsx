'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WinEntry {
  amount: number;
  outcome: string;
  username: string;
  potential_payout: number | null;
  created_at: string;
}

interface ProofData {
  recentWins: WinEntry[];
  stats: { betsLastHour: number; totalWonToday: number };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function LiveProofTicker() {
  const [proof, setProof] = useState<ProofData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/proof')
      .then((r) => r.json())
      .then(setProof)
      .catch(() => {});
  }, []);

  const wins = proof?.recentWins || [];
  const doubled = [...wins, ...wins]; // seamless loop

  if (wins.length === 0) return null;

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-green-500/10 border-y border-green-500/20">
      <div
        ref={scrollRef}
        className="flex animate-marquee gap-6 py-2.5 px-4 whitespace-nowrap"
        style={{ width: 'max-content' }}
      >
        {doubled.map((w, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm">
            <span className="text-green-400 font-semibold">{w.username}</span>
            <span className="text-zinc-400">won</span>
            <span className="text-white font-bold">
              ${(w.potential_payout || w.amount * 1.5).toFixed(0)}
            </span>
            <span className="text-zinc-500">{timeAgo(w.created_at)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function LiveStatsBar() {
  const [stats, setStats] = useState<{ betsLastHour: number; totalWonToday: number } | null>(null);

  useEffect(() => {
    fetch('/api/proof')
      .then((r) => r.json())
      .then((d: ProofData) => setStats(d.stats))
      .catch(() => {});
  }, []);

  const bets = stats?.betsLastHour || 0;
  const won = stats?.totalWonToday || 0;

  return (
    <AnimatePresence>
      {stats && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-zinc-400"
        >
          <span className="text-green-400 font-semibold">{bets.toLocaleString()}</span> bets placed
          in the last hour{' '}
          <span className="mx-1 text-zinc-600">&bull;</span>
          <span className="text-green-400 font-semibold">
            ${won.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>{' '}
          won today
        </motion.p>
      )}
    </AnimatePresence>
  );
}
