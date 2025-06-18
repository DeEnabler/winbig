// src/components/homepage/MarketFeedCard.tsx
'use client';

import type { LiveMarket } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MarketFeedCardProps {
  market: LiveMarket;
}

export default function MarketFeedCard({ market }: MarketFeedCardProps) {
  if (!market || !market.id) {
    return (
      <Card className="w-full min-h-[100px] p-4 border-destructive">
        <CardTitle className="text-sm text-destructive">Error: Invalid Market Data</CardTitle>
        <CardContent>
          <p className="text-xs">Market data is missing or incomplete.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full min-h-[100px] p-4 border border-dashed">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-sm font-medium">Market ID: {market.id}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-xs">Question: {market.question || "N/A"}</p>
        <p className="text-xs">Yes Price: {market.yesPrice !== undefined ? market.yesPrice.toFixed(2) : "N/A"}</p>
        <p className="text-xs">No Price: {market.noPrice !== undefined ? market.noPrice.toFixed(2) : "N/A"}</p>
        <p className="text-xs">Category: {market.category || "N/A"}</p>
        <p className="text-xs">Image URL: {market.imageUrl || "N/A"}</p>
        <p className="text-xs">AI Hint: {market.aiHint || "N/A"}</p>
      </CardContent>
    </Card>
  );
}
