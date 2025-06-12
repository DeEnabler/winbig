
// src/components/challenges/BonusDisplay.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useRef } from 'react'; // Added useEffect and useRef

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
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayRef.current) {
      const element = displayRef.current;
      // Store original display style, though for a div it's likely 'block' or not set (inheriting)
      const originalDisplay = element.style.display; 
      
      // Force repaint
      element.style.display = 'none';
      // Reading offsetHeight is a common way to trigger reflow
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const h = element.offsetHeight; 
      element.style.display = originalDisplay || ''; // Restore original or set to default if undefined
      
      console.log('BonusDisplay: Repaint forced.');
    }
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <div
      ref={displayRef}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px',
        backgroundColor: 'cornsilk', // The "yellow box"
        border: '3px solid darkorange',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000, // Keep it on top
        minWidth: '280px', // Give it some width
      }}
    >
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
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: timeLeftSeconds < lowTimeThreshold ? '2px solid #F59E0B' : '2px solid #A020F0', // primary
              backgroundColor: timeLeftSeconds < lowTimeThreshold ? 'rgba(251, 239, 213, 0.9)' : 'rgba(240, 229, 245, 0.9)', // primary-lighter / yellow-lighter
              minHeight: '50px',
              color: 'black', // Default text color
              fontSize: '14px', // Default font size
            }}
            className={timeLeftSeconds < lowTimeThreshold ? 'animate-pulse-glow' : ''}
          >
            <Zap
              size={22}
              style={{ color: timeLeftSeconds < lowTimeThreshold ? '#D97706' : '#8B5CF6', border: '1px dotted red', display: 'inline-block' }}
            />
            <span style={{ fontWeight: 'bold', fontSize: '15px', color: 'magenta', backgroundColor: 'lightyellow', border: '1px solid blue', padding: '2px', display: 'inline-block' }}>
              +{percentage}% Bonus!
            </span>
            <Progress
              value={(timeLeftSeconds / durationSeconds) * 100}
              style={{ width: '60px', height: '8px', backgroundColor: '#E5E7EB', border: '1px solid orange', display: 'inline-block' }}
              className="[&>span]:bg-primary" // Use theme primary for progress indicator
            />
            <Clock size={16} style={{ color: timeLeftSeconds < lowTimeThreshold ? '#D97706' : '#6B7280', border: '1px dotted blue', display: 'inline-block' }} />
            <span style={{ fontWeight: 'semibold', fontSize: '13px', color: 'green', backgroundColor: 'lightcyan', border: '1px solid darkgreen', padding: '2px', display: 'inline-block' }}>
              {formatTime(timeLeftSeconds)}
            </span>
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
              backgroundColor: 'rgba(229, 231, 235, 0.9)', // gray-200
              color: 'black',
              border: '1px solid #D1D5DB', // gray-300
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            <AlertTriangle size={20} style={{ marginRight: '6px', color: '#4B5563', display: 'inline-block', visibility: 'visible', opacity: '1' }} />
            <span style={{ fontWeight: 'semibold', color: 'red', backgroundColor: 'lightyellow', padding: '2px', border: '1px solid blue', display: 'inline-block', visibility: 'visible', opacity: '1' }}>
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
              backgroundColor: 'rgba(220, 252, 231, 0.9)', // green-100
              color: 'black',
              border: '1px solid #10B981', // green-500
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            <ShieldCheck size={20} style={{ marginRight: '6px', color: '#059669', display: 'inline-block', visibility: 'visible', opacity: '1' }} />
            <span style={{ fontWeight: 'semibold', color: 'green', backgroundColor: 'lightyellow', padding: '2px', border: '1px solid blue', display: 'inline-block', visibility: 'visible', opacity: '1' }}>
              ✅ Bonus Locked In! +{percentage}% if you win.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

