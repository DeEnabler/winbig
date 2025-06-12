
// src/components/challenges/BonusDisplay.tsx
'use client';

import { Zap, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useRef } from 'react';

interface BonusDisplayProps {
  isActive: boolean; // Should always be true when this component is rendered by parent
  isClaimed: boolean; // Should always be false when this component is rendered by parent
  timeLeftSeconds: number;
  durationSeconds: number;
  lowTimeThreshold: number;
  percentage: number;
  formatTime: (seconds: number) => string;
}

export default function BonusDisplay({
  isActive, // Kept for prop consistency, but parent logic makes it true
  isClaimed, // Kept for prop consistency, but parent logic makes it false
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
      const originalDisplay = element.style.display;
      element.style.display = 'none';
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const h = element.offsetHeight; // Force reflow
      element.style.display = originalDisplay || '';
      console.log('BonusDisplay: Repaint forced.');
    }
  }, []);

  // Outermost container - this is our "yellow box"
  return (
    <div
      ref={displayRef}
      style={{
        position: 'fixed', // Already set by parent in ChallengeInvite, but good to be explicit
        bottom: '20px', // Already set by parent
        right: '20px', // Already set by parent
        padding: '10px',
        backgroundColor: 'cornsilk', // "Yellow box" background
        border: '3px solid darkorange', // "Yellow box" border
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000, // Ensure it's on top
        minWidth: '280px', // Ensure it has some width
      }}
    >
      {/* This content should always render as isActive will be true and isClaimed false
          when BonusDisplay is mounted by ChallengeInvite based on the new logic */}
      <div
        className={`flex items-center justify-start gap-2 p-2 rounded-md border-2 ${timeLeftSeconds < lowTimeThreshold ? 'border-yellow-500 bg-yellow-100 animate-pulse' : 'border-primary bg-primary/10'}`}
        style={{ minHeight: '50px' }} // Ensure inner div has height
      >
        <Zap
          size={22}
          className={`mr-1 ${timeLeftSeconds < lowTimeThreshold ? 'text-yellow-600' : 'text-primary'}`}
        />
        <span className="font-bold text-sm text-foreground">
          +{percentage}% Bonus!
        </span>
        <Progress
          value={(timeLeftSeconds / durationSeconds) * 100}
          className="w-16 h-2 mx-2 bg-muted [&>span]:bg-primary"
        />
        <Clock
          size={16}
          className={`mr-1 ${timeLeftSeconds < lowTimeThreshold ? 'text-yellow-600' : 'text-muted-foreground'}`}
        />
        <span className="font-semibold text-xs text-foreground">
          {formatTime(timeLeftSeconds)}
        </span>
      </div>

      {/* Fallback for !isActive && !isClaimed - should not be reached if parent logic is correct */}
      {/* Kept for robustness during debugging if parent state is unexpected */}
      {!isActive && !isClaimed && (
         <div className="flex items-center justify-center gap-2 p-3 rounded-md bg-muted/80 border border-border" style={{minHeight: '50px'}}>
            <AlertTriangle size={20} className="text-muted-foreground mr-1.5" />
            <span className="font-semibold text-sm text-foreground">Bonus expired (Debug Fallback)</span>
        </div>
      )}

      {/* Fallback for isClaimed - should not be reached if parent logic is correct */}
      {isClaimed && (
         <div className="flex items-center justify-center gap-2 p-3 rounded-md bg-green-100 border border-green-600" style={{minHeight: '50px'}}>
            <ShieldCheck size={20} className="text-green-700 mr-1.5" />
            <span className="font-semibold text-sm text-green-800">Bonus Locked (Debug Fallback)</span>
        </div>
      )}
    </div>
  );
}
