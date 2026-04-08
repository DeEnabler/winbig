'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight } from 'lucide-react';
import { LiveProofTicker } from '@/components/funnel/LiveProofTicker';
import { AgeDisclaimer } from '@/components/funnel/AgeDisclaimer';
import { useCampaignTracking, buildCampaignQuery, getCampaignParams } from '@/hooks/use-campaign-tracking';
import Link from 'next/link';

interface QuizOption {
  label: string;
  emoji: string;
}

const STEPS: { question: string; options: QuizOption[] }[] = [
  {
    question: 'What do you want to bet on?',
    options: [
      { label: 'Sports', emoji: '⚽' },
      { label: 'Crypto', emoji: '₿' },
      { label: 'Politics', emoji: '🗳️' },
    ],
  },
  {
    question: 'How much do you usually bet?',
    options: [
      { label: '$10 – $50', emoji: '💵' },
      { label: '$50 – $200', emoji: '💰' },
      { label: '$200+', emoji: '🏆' },
    ],
  },
  {
    question: 'Are you ready to win?',
    options: [
      { label: "Let's go!", emoji: '🚀' },
      { label: 'Born ready', emoji: '🔥' },
    ],
  },
];

function QuizInner() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const { trackEvent } = useCampaignTracking();

  useEffect(() => {
    trackEvent('lander_view', { variant: 'quiz' });
  }, []);

  const handleSelect = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setDone(true);
      trackEvent('quiz_complete');
    }
  };

  const campaignQuery = buildCampaignQuery(getCampaignParams());
  const joinHref = `/join${campaignQuery ? `?${campaignQuery}` : ''}`;

  return (
    <main className="min-h-screen bg-black flex flex-col">
      <LiveProofTicker />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key={`step-${step}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <p className="text-xs text-zinc-500 mb-2 text-center">
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 className="text-2xl font-bold text-center mb-8 text-white">
                {STEPS[step].question}
              </h2>
              <div className="grid gap-3">
                {STEPS[step].options.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={handleSelect}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-green-500/50 hover:bg-zinc-900 transition-colors text-left group"
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className="text-lg font-medium text-white group-hover:text-green-400 transition-colors">
                      {opt.label}
                    </span>
                    <ArrowRight className="w-5 h-5 text-zinc-600 ml-auto group-hover:text-green-400 transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
                <Trophy className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                You&rsquo;re a <span className="text-green-400">WinBig Legend</span>
              </h2>
              <p className="text-zinc-400 mb-8">
                Join our VIP Telegram group to get exclusive signals and start winning today.
              </p>
              <Link
                href={joinHref}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-black bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_rgba(34,197,94,0.6)] transition-shadow"
              >
                Join VIP Telegram Now &rarr;
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AgeDisclaimer />
    </main>
  );
}

export default function QuizPage() {
  return (
    <Suspense>
      <QuizInner />
    </Suspense>
  );
}
