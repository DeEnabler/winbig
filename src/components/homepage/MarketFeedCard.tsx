// src/components/homepage/MarketFeedCard.tsx
// Simplified version - STAYS SIMPLIFIED FOR THIS TEST
'use client';

import type { LiveMarket } from '@/types';
// All complex imports (NextImage, Button, ShadCN Card components, framer-motion, icons) are removed for this simplified version.

interface MarketFeedCardProps {
  market: LiveMarket;
}

export default function MarketFeedCard({ market }: MarketFeedCardProps) {
  if (!market || !market.id || !market.question) {
    return (
      <div className="p-4 border border-red-500 bg-red-100 text-red-700 rounded-lg my-2">
        <h3 className="font-bold text-sm">Error: Invalid Market Data</h3>
        <p className="text-xs">Market data is missing ID or question.</p>
        <pre className="text-xxs whitespace-pre-wrap break-all">{JSON.stringify(market)}</pre>
      </div>
    );
  }

  return (
    <div className="p-3 border border-gray-300 rounded-lg my-2 bg-gray-50 min-h-[100px]">
      <h3 className="text-sm font-semibold mb-1">Market ID: {market.id}</h3>
      <p className="text-xs mb-1">Question: {market.question}</p>
      <p className="text-xs mb-0.5">Yes Price: {market.yesPrice !== undefined ? market.yesPrice.toFixed(2) : "N/A"}</p>
      <p className="text-xs mb-0.5">No Price: {market.noPrice !== undefined ? market.noPrice.toFixed(2) : "N/A"}</p>
      <p className="text-xs mb-0.5">Category: {market.category || "N/A"}</p>
      <p className="text-xs mb-0.5">Image URL: {market.imageUrl || "N/A"}</p>
      <p className="text-xs">AI Hint: {market.aiHint || "N/A"}</p>
      {/* Add other fields as plain text if needed for debugging */}
    </div>
  );
}
