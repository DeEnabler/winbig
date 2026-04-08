'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Share2, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCampaignTracking } from '@/hooks/use-campaign-tracking';

const TG_URL = process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL || 'https://t.me/WinBigLegendBets';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun';

function ThankYouInner() {
  const searchParams = useSearchParams();
  const { trackEvent } = useCampaignTracking();

  const amount = searchParams.get('amount') || '—';
  const outcome = searchParams.get('outcome') || '';
  const question = searchParams.get('question') || 'Your prediction market bet';
  const payout = searchParams.get('payout') || '—';

  useEffect(() => {
    trackEvent('bet_funded', { amount, outcome });

    const end = Date.now() + 2500;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#10b981', '#34d399'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#10b981', '#34d399'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const shareText = encodeURIComponent(
    `Just placed a $${amount} bet on WinBig! 🔥 Prediction markets are the move. ${APP_URL}`
  );

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="max-w-md w-full"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
          <Trophy className="w-10 h-10 text-green-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">
          You&rsquo;re Now a <span className="text-green-400">WinBig Legend!</span>
        </h1>
        <p className="text-zinc-400 mb-8">Bet placed successfully. Good luck!</p>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 mb-8 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Market</span>
            <span className="text-white font-medium text-right max-w-[200px] truncate">
              {question}
            </span>
          </div>
          {outcome && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Your Pick</span>
              <span
                className={`font-bold ${outcome === 'YES' ? 'text-green-400' : 'text-red-400'}`}
              >
                {outcome}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Amount</span>
            <span className="text-white font-medium">${amount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Potential Payout</span>
            <span className="text-green-400 font-bold">${payout}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <Share2 className="w-5 h-5 text-zinc-400" />
            <span className="text-xs text-zinc-500">X</span>
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(APP_URL)}&text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <Send className="w-5 h-5 text-zinc-400" />
            <span className="text-xs text-zinc-500">Telegram</span>
          </a>
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span className="text-xs text-zinc-500">WhatsApp</span>
          </a>
        </div>

        <a
          href={TG_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-[#229ED9] hover:underline"
        >
          View in Telegram Group &rarr;
        </a>
      </motion.div>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouInner />
    </Suspense>
  );
}
