'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface StickyFunnelCtaProps {
  href: string;
  label?: string;
}

export function StickyFunnelCta({
  href,
  label = 'Join VIP WinBig Legend Bets Telegram Now',
}: StickyFunnelCtaProps) {
  return (
    <motion.div
      className="fixed bottom-0 inset-x-0 z-50 p-4 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none"
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ delay: 1, type: 'spring', stiffness: 200, damping: 25 }}
    >
      <Link
        href={href}
        className="pointer-events-auto block w-full max-w-lg mx-auto py-4 px-6 rounded-2xl text-center font-bold text-lg text-black bg-gradient-to-r from-green-400 to-emerald-500 shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:shadow-[0_0_40px_rgba(34,197,94,0.6)] transition-shadow"
      >
        {label} &rarr;
      </Link>
    </motion.div>
  );
}
