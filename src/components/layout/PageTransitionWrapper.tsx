// src/components/layout/PageTransitionWrapper.tsx
'use client';

import type {ReactNode} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {usePathname} from 'next/navigation';

interface PageTransitionWrapperProps {
  children: ReactNode;
}

export default function PageTransitionWrapper({children}: PageTransitionWrapperProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
