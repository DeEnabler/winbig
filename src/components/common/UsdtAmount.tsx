// src/components/common/UsdtAmount.tsx
// Wrapper component to display dollar amounts with USDT indicator

'use client';

import { cn } from '@/lib/utils';
import { UsdtLogo, BnbChainLogo } from './BrandLogos';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UsdtAmountProps {
  /** The numeric value to display */
  value: number;
  /** Number of decimal places (default: 2) */
  decimals?: number;
  /** Additional className for the wrapper */
  className?: string;
  /** Additional className for the value text */
  valueClassName?: string;
  /** Show the USDT icon (default: true) */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show tooltip with payment info (default: true) */
  showTooltip?: boolean;
  /** Include sign for positive values */
  showSign?: boolean;
}

export function UsdtAmount({
  value,
  decimals = 2,
  className,
  valueClassName,
  showIcon = true,
  size = 'md',
  showTooltip = true,
  showSign = false,
}: UsdtAmountProps) {
  const formattedValue = value.toFixed(decimals);
  const displayValue = showSign && value > 0 ? `+$${formattedValue}` : `$${formattedValue}`;
  
  const sizeStyles = {
    sm: {
      wrapper: 'gap-0.5',
      icon: 'h-3 w-3',
      text: 'text-sm',
    },
    md: {
      wrapper: 'gap-1',
      icon: 'h-3.5 w-3.5',
      text: 'text-base',
    },
    lg: {
      wrapper: 'gap-1.5',
      icon: 'h-4 w-4',
      text: 'text-xl',
    },
  };

  const styles = sizeStyles[size];

  const content = (
    <span className={cn("inline-flex items-center", styles.wrapper, className)}>
      <span className={cn(styles.text, valueClassName)}>{displayValue}</span>
      {showIcon && (
        <UsdtLogo className={cn(styles.icon, "shrink-0 opacity-80")} />
      )}
    </span>
  );

  if (!showTooltip) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-2">
          <UsdtLogo className="h-4 w-4" />
          <span>USDT on</span>
          <BnbChainLogo className="h-4 w-4" />
          <span>BNB Chain</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Simplified version for inline use without tooltip
export function UsdtBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs text-muted-foreground", className)}>
      <UsdtLogo className="h-3 w-3" />
      <span>USDT</span>
    </span>
  );
}

// Format helper for use in strings (returns just the formatted text)
export function formatUsdt(value: number, decimals = 2): string {
  return `$${value.toFixed(decimals)} USDT`;
}
