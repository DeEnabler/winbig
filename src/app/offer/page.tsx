'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Loader2 } from 'lucide-react';
import { buildCampaignQuery, getCampaignParams, useCampaignTracking } from '@/hooks/use-campaign-tracking';
import { AgeDisclaimer } from '@/components/funnel/AgeDisclaimer';
import Link from 'next/link';

interface MarketData {
  id: string;
  question: string;
  yesPrice?: number;
  noPrice?: number;
}

function OfferInner() {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const { trackEvent } = useCampaignTracking();

  useEffect(() => {
    trackEvent('lander_view', { page: 'offer' });

    fetch('/api/markets/live-odds?limit=1')
      .then((r) => r.json())
      .then((data) => {
        const m = data.markets?.[0];
        if (m) {
          setMarket({
            id: m.conditionId || m.id,
            question: m.question,
            yesPrice: m.yesPrice,
            noPrice: m.noPrice,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const campaignQuery = buildCampaignQuery(getCampaignParams());
  const appendQuery = campaignQuery ? `&${campaignQuery}` : '';

  const matchHref = market
    ? `/match/${market.id}?predictionId=${market.id}${appendQuery}`
    : `/${campaignQuery ? `?${campaignQuery}` : ''}`;

  return (
    <main className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            You&rsquo;re In
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Choose your first winning market.
          </h1>
          <p className="text-zinc-400 mb-8">
            Pick a market, place your bet, and start winning with the WinBig community.
          </p>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
            </div>
          ) : market ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 mb-6"
            >
              <p className="text-lg font-semibold text-white mb-4 leading-snug">
                {market.question}
              </p>
              {market.yesPrice != null && (
                <div className="flex items-center justify-center gap-4 mb-6 text-sm">
                  <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 font-medium">
                    YES {(market.yesPrice * 100).toFixed(0)}%
                  </span>
                  <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 font-medium">
                    NO {((market.noPrice || 1 - market.yesPrice) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              <Link
                href={matchHref}
                className="block w-full py-4 rounded-xl font-bold text-lg text-black bg-gradient-to-r from-green-400 to-emerald-500 text-center shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-shadow"
              >
                Place Your First Bet &rarr;
              </Link>
            </motion.div>
          ) : (
            <Link
              href={matchHref}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-black bg-gradient-to-r from-green-400 to-emerald-500"
            >
              <TrendingUp className="w-5 h-5" />
              Browse Markets
            </Link>
          )}
        </motion.div>
      </div>

      <AgeDisclaimer />
    </main>
  );
}

export default function OfferPage() {
  return (
    <Suspense>
      <OfferInner />
    </Suspense>
  );
}
