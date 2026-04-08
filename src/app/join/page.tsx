'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { useCampaignTracking, buildCampaignQuery, getCampaignParams } from '@/hooks/use-campaign-tracking';
import Link from 'next/link';

const TG_URL = process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL || 'https://t.me/WinBigLegendBets';

function JoinInner() {
  const [showFallback, setShowFallback] = useState(false);
  const { trackEvent } = useCampaignTracking();

  useEffect(() => {
    trackEvent('tg_join');

    const timer = setTimeout(() => {
      window.location.href = TG_URL;
    }, 3500);

    const fallbackTimer = setTimeout(() => {
      setShowFallback(true);
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const campaignQuery = buildCampaignQuery(getCampaignParams());
  const offerHref = `/offer${campaignQuery ? `?${campaignQuery}` : ''}`;

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#229ED9]/20 mb-8">
          <Send className="w-12 h-12 text-[#229ED9]" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Redirecting you to the private WinBig Legend Bets VIP Group&hellip;
        </h1>

        <div className="flex justify-center gap-1.5 mb-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-[#229ED9]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>

        {showFallback && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <a
              href={TG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-6 rounded-xl font-semibold text-white bg-[#229ED9] hover:bg-[#1a8ac0] transition-colors"
            >
              Click here if not redirected
            </a>
            <Link
              href={offerHref}
              className="block text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Skip to betting &rarr;
            </Link>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinInner />
    </Suspense>
  );
}
