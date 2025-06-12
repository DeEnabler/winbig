
// src/components/challenges/BonusDisplay.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BonusDisplayProps {
  isActive: boolean;
  isClaimed: boolean;
  timeLeftSeconds: number;
  durationSeconds: number;
  lowTimeThreshold: number;
  percentage: number;
  formatTime: (seconds: number) => string;
}

export default function BonusDisplay({
  isActive,
  isClaimed,
  timeLeftSeconds,
  durationSeconds,
  lowTimeThreshold,
  percentage,
  formatTime,
}: BonusDisplayProps) {
  return (
    <div style={{
      padding: '10px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: '280px',
      // Ensure it's visually distinct for debugging
      border: '2px solid orange', 
      backgroundColor: 'rgba(255, 255, 220, 0.95)', // Light yellow, slightly transparent
      color: '#333', // Dark text color for contrast
      zIndex: 1000, // Ensure it's on top
    }}>
      <AnimatePresence mode="wait">
        {isActive && !isClaimed && (
          <motion.div
            key="bonus-active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '6px',
              border: timeLeftSeconds < lowTimeThreshold ? '2px solid #F59E0B' : '2px solid #A020F0', // yellow-500 or primary purple
              backgroundColor: timeLeftSeconds < lowTimeThreshold ? 'rgba(251, 239, 213, 0.9)' : 'rgba(240, 229, 245, 0.9)', // yellow-500/10 or primary/5
              minHeight: '50px', // Ensure it has height
              color: 'black', // Force black text for debug
              fontSize: '14px', // Force font size for debug
            }}
            className={timeLeftSeconds < lowTimeThreshold ? 'animate-pulse-glow' : ''}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap
                size={24}
                style={{ color: timeLeftSeconds < lowTimeThreshold ? '#D97706' : '#8B5CF6', display: 'inline-block !important', visibility: 'visible !important', opacity: '1 !important' }} 
              />
              <span style={{ fontWeight: 'bold', fontSize: '16px', color: 'red', backgroundColor: 'lightyellow', border: '1px solid blue', padding: '2px', display: 'inline-block !important', visibility: 'visible !important', opacity: '1 !important' }}>
                +{percentage}% Bonus!
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '45%' }}>
              <Progress
                value={(timeLeftSeconds / durationSeconds) * 100}
                style={{ width: '100%', height: '6px', marginBottom: '4px', backgroundColor: '#E5E7EB', display: 'block !important', visibility: 'visible !important', opacity: '1 !important' }}
                className="[&>span]:bg-primary"
              />
              <div style={{ display: 'flex', alignItems: 'center', fontWeight: 'semibold', fontSize: '14px', color: 'green', backgroundColor: 'lightcyan', border: '1px solid orange', padding: '2px', display: 'inline-block !important', visibility: 'visible !important', opacity: '1 !important' }}>
                <Clock size={16} style={{ marginRight: '4px', color: timeLeftSeconds < lowTimeThreshold ? '#D97706' : '#6B7280', display: 'inline-block !important', visibility: 'visible !important', opacity: '1 !important' }} />
                {formatTime(timeLeftSeconds)}
              </div>
            </div>
          </motion.div>
        )}

        {!isActive && !isClaimed && (
          <motion.div
            key="bonus-expired"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3 }}
            style={{
              textAlign: 'center',
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(229, 231, 235, 0.9)', // muted/70
              color: 'black', // Force black text for debug
              border: '1px solid #D1D5DB', // muted
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            <AlertTriangle size={20} style={{ marginRight: '6px', color: '#4B5563', display: 'inline-block !important', visibility: 'visible !important', opacity: '1 !important' }} />
            <span style={{ fontWeight: 'semibold', color: 'red', backgroundColor: 'lightyellow', padding: '2px', border: '1px solid blue', display: 'inline-block !important', visibility: 'visible !important', opacity: '1 !important' }}>
              ⏱ Bonus expired.
            </span>
          </motion.div>
        )}

        {isClaimed && (
          <motion.div
            key="bonus-claimed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3 }}
            style={{
              textAlign: 'center',
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(220, 252, 231, 0.9)', // green-500/10
              color: 'black', // Force black text for debug
              border: '1px solid #10B981', // green-600
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            <ShieldCheck size={20} style={{ marginRight: '6px', color: '#059669', display: 'inline-block !important', visibility: 'visible !important', opacity: '1 !important' }} />
            <span style={{ fontWeight: 'semibold', color: 'green', backgroundColor: 'lightyellow', padding: '2px', border: '1px solid blue', display: 'inline-block !important', visibility: 'visible !important', opacity: '1 !important' }}>
              ✅ Bonus Locked In! +{percentage}% if you win.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
