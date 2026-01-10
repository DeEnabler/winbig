// src/components/common/BrandLogos.tsx
// Shared brand logo SVG components for trust indicators

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

// Polymarket Logo - Blue "P" mark
export function PolymarketLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      fill="none"
      aria-label="Polymarket"
    >
      <circle cx="12" cy="12" r="11" fill="#0052FF" />
      <path
        d="M8 7h4.5c2.485 0 4.5 1.79 4.5 4s-2.015 4-4.5 4H10v3H8V7zm2 6h2.5c1.38 0 2.5-.895 2.5-2s-1.12-2-2.5-2H10v4z"
        fill="white"
      />
    </svg>
  );
}

// BNB Chain Logo - Yellow BNB diamond
export function BnbChainLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      fill="none"
      aria-label="BNB Chain"
    >
      <circle cx="12" cy="12" r="11" fill="#F3BA2F" />
      <path
        d="M12 4.5L8.5 8l1.5 1.5L12 7.5l2 2L15.5 8 12 4.5z"
        fill="white"
      />
      <path
        d="M6 12l1.5-1.5L9 12l-1.5 1.5L6 12z"
        fill="white"
      />
      <path
        d="M12 10.5L8.5 14l1.5 1.5L12 13.5l2 2 1.5-1.5L12 10.5z"
        fill="white"
      />
      <path
        d="M18 12l-1.5-1.5L15 12l1.5 1.5L18 12z"
        fill="white"
      />
      <path
        d="M12 16.5L10 14.5 8.5 16 12 19.5 15.5 16 14 14.5 12 16.5z"
        fill="white"
      />
    </svg>
  );
}

// USDT (Tether) Logo - Green circle with "₮" symbol
export function UsdtLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      fill="none"
      aria-label="USDT"
    >
      <circle cx="12" cy="12" r="11" fill="#26A17B" />
      <path
        d="M13.5 10.5v-2h3v-2h-9v2h3v2c-2.76.14-4.5.84-4.5 1.68 0 .98 2.46 1.77 5.5 1.77s5.5-.79 5.5-1.77c0-.84-1.74-1.54-4.5-1.68zm-1 2.7c-2.34-.06-4.08-.52-4.08-1.08s1.74-1.02 4.08-1.08v1.72c.33.02.66.03 1 .03s.67-.01 1-.03v-1.72c2.34.06 4.08.52 4.08 1.08s-1.74 1.02-4.08 1.08v2.05h-2v-2.05z"
        fill="white"
      />
    </svg>
  );
}

// Grok / xAI Logo - Stylized "X" with AI elements
export function GrokLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      fill="none"
      aria-label="Grok AI"
    >
      <rect x="1" y="1" width="22" height="22" rx="4" fill="#1a1a1a" />
      <path
        d="M7 7l4 5-4 5h2.5l2.5-3.5L14.5 17H17l-4-5 4-5h-2.5L12 10.5 9.5 7H7z"
        fill="white"
      />
      <circle cx="18" cy="6" r="2" fill="#00D4AA" />
    </svg>
  );
}

// X (Twitter) Logo - for consistency, export from here too
export function XLogo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Combined "Powered By" badge component
interface PoweredByBadgeProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export function PoweredByBadge({ className, variant = 'full' }: PoweredByBadgeProps) {
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <PolymarketLogo className="h-3.5 w-3.5" />
        <span className="opacity-50">·</span>
        <UsdtLogo className="h-3.5 w-3.5" />
        <span className="opacity-50">·</span>
        <BnbChainLogo className="h-3.5 w-3.5" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground", className)}>
      <div className="flex items-center gap-1.5">
        <span className="opacity-70">Powered by</span>
        <PolymarketLogo className="h-4 w-4" />
        <span className="font-medium">Polymarket</span>
      </div>
      <span className="opacity-30 hidden sm:inline">·</span>
      <div className="flex items-center gap-1.5">
        <span className="opacity-70">Payments via</span>
        <UsdtLogo className="h-4 w-4" />
        <span className="font-medium">USDT</span>
        <span className="opacity-70">on</span>
        <BnbChainLogo className="h-4 w-4" />
        <span className="font-medium">BNB Chain</span>
      </div>
    </div>
  );
}

// Trust badge for crypto payments
export function CryptoPaymentBadge({ className }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground", className)}>
      <UsdtLogo className="h-3.5 w-3.5" />
      <span>USDT</span>
      <span className="opacity-50">on</span>
      <BnbChainLogo className="h-3.5 w-3.5" />
    </div>
  );
}
