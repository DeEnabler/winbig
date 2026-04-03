'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CopySubscriptionData {
  id: number;
  active: boolean;
  leader_identifier: string;
  leader_source: string;
  fixed_amount: number;
  max_per_trade: number;
  max_daily_usd: number;
  created_at: string;
}

interface UseCopyTraderOptions {
  followerUserId: string | undefined;
  leaderIdentifier: string;
  leaderSource?: 'winbig' | 'polymarket';
  leaderUserId?: string | null;
}

export function useCopyTrader({
  followerUserId,
  leaderIdentifier,
  leaderSource = 'winbig',
  leaderUserId = null,
}: UseCopyTraderOptions) {
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);

  const queryKey = ['copy-subscription', followerUserId, leaderIdentifier];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        follower_user_id: followerUserId!,
        leader_identifier: leaderIdentifier,
      });
      const res = await fetch(`/api/copy-trader?${params}`);
      if (!res.ok) throw new Error('Failed to fetch copy status');
      return res.json() as Promise<{
        success: boolean;
        data: CopySubscriptionData | null;
        isCopying: boolean;
      }>;
    },
    enabled: !!followerUserId && !!leaderIdentifier,
    staleTime: 30000,
  });

  const isCopying = data?.isCopying ?? false;
  const subscription = data?.data ?? null;

  const startCopy = useMutation({
    mutationFn: async (settings?: { fixed_amount?: number; max_per_trade?: number; max_daily_usd?: number }) => {
      const res = await fetch('/api/copy-trader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_user_id: followerUserId,
          leader_identifier: leaderIdentifier,
          leader_source: leaderSource,
          leader_user_id: leaderUserId,
          ...settings,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start copy trading');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setShowSettings(false);
    },
  });

  const stopCopy = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/copy-trader', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_user_id: followerUserId,
          leader_identifier: leaderIdentifier,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to stop copy trading');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const toggleCopy = useCallback(
    (settings?: { fixed_amount?: number; max_per_trade?: number; max_daily_usd?: number }) => {
      if (isCopying) {
        stopCopy.mutate();
      } else if (settings) {
        startCopy.mutate(settings);
      } else {
        setShowSettings(true);
      }
    },
    [isCopying, stopCopy, startCopy]
  );

  return {
    isCopying,
    isLoading,
    subscription,
    isStarting: startCopy.isPending,
    isStopping: stopCopy.isPending,
    startError: startCopy.error,
    stopError: stopCopy.error,
    toggleCopy,
    startCopy: startCopy.mutate,
    stopCopy: stopCopy.mutate,
    showSettings,
    setShowSettings,
  };
}
