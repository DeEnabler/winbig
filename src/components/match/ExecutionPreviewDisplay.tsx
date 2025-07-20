// src/components/match/ExecutionPreviewDisplay.tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';
import type { ExecutionPreview } from '@/types';

interface ExecutionPreviewDisplayProps {
  preview: ExecutionPreview | null;
  isLoading: boolean;
}

export const ExecutionPreviewDisplay = ({ preview, isLoading }: ExecutionPreviewDisplayProps) => {
  if (isLoading) {
    return (
      <div className="text-center p-3 bg-muted/50 rounded-lg space-y-1.5 text-sm min-h-[100px] flex flex-col justify-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-2/3 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  if (!preview.success) {
    return (
      <div className="text-center p-3 bg-muted/50 rounded-lg text-sm min-h-[100px] flex flex-col justify-center">
        <div className="text-destructive text-xs flex items-center justify-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> {preview.error}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center p-3 bg-muted/50 rounded-lg space-y-1.5 text-sm min-h-[100px] flex flex-col justify-center">
      <div className="text-xs text-muted-foreground">{preview.summary}</div>
      <div className="text-lg font-bold">
        Potential Payout: <span className="text-green-600 dark:text-green-400">${preview.potentialPayout?.toFixed(2)}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        (Avg Price: ${preview.vwap?.toFixed(4)}, Impact: {preview.price_impact_pct?.toFixed(2)}%)
      </div>
    </div>
  );
}; 