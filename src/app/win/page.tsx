'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, Shield, Zap } from 'lucide-react';
import { LiveProofTicker, LiveStatsBar } from '@/components/funnel/LiveProofTicker';
import { StickyFunnelCta } from '@/components/funnel/StickyFunnelCta';
import { AgeDisclaimer } from '@/components/funnel/AgeDisclaimer';
import { useCampaignTracking, buildCampaignQuery, getCampaignParams } from '@/hooks/use-campaign-tracking';

function WinPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { trackEvent } = useCampaignTracking();

  useEffect(() => {
    if (searchParams.get('variant') === 'quiz') {
      router.replace(`/win/quiz?${searchParams.toString()}`);
      return;
    }
    trackEvent('lander_view');
  }, []);

  const campaignQuery = buildCampaignQuery(getCampaignParams());
  const joinHref = `/join${campaignQuery ? `?${campaignQuery}` : ''}`;

  return (
    <main className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-16 pb-10 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-green-500/5 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live Markets Open Now
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
            How Regular Traders Turned{' '}
            <span className="text-green-400">$50 into $1,200+</span> This Week
            Betting on WinBig
          </h1>

          <p className="text-lg text-zinc-400 mb-4">(Real Bets Shown)</p>

          <LiveStatsBar />
        </motion.div>
      </section>

      {/* Live Wins Ticker */}
      <LiveProofTicker />

      {/* Testimonials */}
      <section className="max-w-xl mx-auto px-4 py-12 space-y-4">
        <h2 className="text-center text-lg font-semibold text-zinc-300 mb-6">
          What WinBig Legends Are Saying
        </h2>

        {[
          {
            icon: <TrendingUp className="w-5 h-5 text-green-400" />,
            name: 'CryptoKing_92',
            text: 'Put $100 on BTC above $80k — walked away with $340. WinBig odds are way better than anywhere else.',
            profit: '+$240',
          },
          {
            icon: <Shield className="w-5 h-5 text-blue-400" />,
            name: 'SportsNerd',
            text: 'I use the Telegram alerts. Got in on an NBA game right before tip-off and doubled up. Easiest $200 ever.',
            profit: '+$200',
          },
          {
            icon: <Zap className="w-5 h-5 text-yellow-400" />,
            name: 'PoliticsTrader',
            text: 'Been using WinBig for 2 weeks. Started with $50, sitting at $1,150 now. The community calls are fire.',
            profit: '+$1,100',
          },
        ].map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {t.icon}
                <span className="text-sm font-medium text-white">{t.name}</span>
              </div>
              <span className="text-green-400 font-bold text-sm">{t.profit}</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">{t.text}</p>
          </motion.div>
        ))}
      </section>

      <AgeDisclaimer />

      <StickyFunnelCta href={joinHref} />
    </main>
  );
}

export default function WinPage() {
  return (
    <Suspense>
      <WinPageInner />
    </Suspense>
  );
}
