'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, UserMinus, Loader2, Settings2, AlertTriangle, Zap } from 'lucide-react';
import { useCopyTrader } from '@/hooks/use-copy-trader';
import { useToast } from '@/hooks/use-toast';

interface CopyTraderButtonProps {
  leaderIdentifier: string;
  leaderSource?: 'winbig' | 'polymarket';
  leaderUserId?: string | null;
  leaderDisplayName?: string;
  className?: string;
  variant?: 'default' | 'header' | 'compact';
}

export default function CopyTraderButton({
  leaderIdentifier,
  leaderSource = 'winbig',
  leaderUserId = null,
  leaderDisplayName,
  className = '',
  variant = 'default',
}: CopyTraderButtonProps) {
  const { address } = useAccount();
  const { toast } = useToast();

  const {
    isCopying,
    isLoading,
    isStarting,
    isStopping,
    startCopy,
    stopCopy,
    showSettings,
    setShowSettings,
    toggleCopy,
  } = useCopyTrader({
    followerUserId: address?.toLowerCase(),
    leaderIdentifier,
    leaderSource,
    leaderUserId,
  });

  const [fixedAmount, setFixedAmount] = useState('10');
  const [maxPerTrade, setMaxPerTrade] = useState('100');
  const [maxDaily, setMaxDaily] = useState('500');
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  if (!address) return null;

  // Don't show copy button on your own profile
  if (address.toLowerCase() === leaderIdentifier.toLowerCase() ||
      (leaderUserId && address.toLowerCase() === leaderUserId.toLowerCase())) {
    return null;
  }

  const handleStart = () => {
    const amount = parseFloat(fixedAmount);
    const perTrade = parseFloat(maxPerTrade);
    const daily = parseFloat(maxDaily);

    if (isNaN(amount) || amount < 1) {
      toast({ title: 'Invalid amount', description: 'Minimum $1 per trade', variant: 'destructive' });
      return;
    }
    if (isNaN(perTrade) || perTrade < amount) {
      toast({ title: 'Invalid max', description: 'Max per trade must be >= fixed amount', variant: 'destructive' });
      return;
    }

    startCopy(
      { fixed_amount: amount, max_per_trade: perTrade, max_daily_usd: daily },
      {
        onSuccess: () => {
          toast({
            title: 'Copy trading started',
            description: `You are now copying ${leaderDisplayName || leaderIdentifier}`,
          });
        },
        onError: (err: Error) => {
          toast({ title: 'Failed to start', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleStop = () => {
    stopCopy(undefined, {
      onSuccess: () => {
        setShowConfirmStop(false);
        toast({
          title: 'Copy trading stopped',
          description: `You are no longer copying ${leaderDisplayName || leaderIdentifier}`,
        });
      },
      onError: (err: Error) => {
        toast({ title: 'Failed to stop', description: err.message, variant: 'destructive' });
      },
    });
  };

  if (isLoading) {
    return (
      <Button variant="outline" size={variant === 'compact' ? 'sm' : 'default'} disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  return (
    <>
      {/* Main Button */}
      {isCopying ? (
        <div className={`flex items-center gap-2 ${className}`}>
          <Badge className="bg-green-500/15 text-green-500 border-green-500/30 gap-1.5 py-1 px-2.5">
            <Zap className="w-3 h-3" />
            Copying
          </Badge>
          <Button
            variant="outline"
            size={variant === 'compact' ? 'sm' : 'default'}
            onClick={() => setShowConfirmStop(true)}
            disabled={isStopping}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          >
            {isStopping ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <UserMinus className="w-4 h-4 mr-1.5" />
            )}
            Stop
          </Button>
        </div>
      ) : (
        <Button
          variant={variant === 'header' ? 'default' : 'outline'}
          size={variant === 'compact' ? 'sm' : 'default'}
          onClick={() => toggleCopy()}
          disabled={isStarting}
          className={`gap-1.5 ${
            variant === 'header'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-lg shadow-blue-500/25'
              : ''
          } ${className}`}
        >
          {isStarting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          Copy Trader
        </Button>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Copy Trading Settings
            </DialogTitle>
            <DialogDescription>
              Configure how you want to copy trades from{' '}
              <span className="font-semibold text-foreground">{leaderDisplayName || leaderIdentifier}</span>.
              Every time they place a bet, the same trade will be placed for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Fixed amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                Amount per trade (USDT)
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Fixed amount placed for each trade the leader makes.
              </p>
            </div>

            {/* Max per trade */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Max per trade (USDT)</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={maxPerTrade}
                onChange={(e) => setMaxPerTrade(e.target.value)}
                placeholder="100"
              />
            </div>

            {/* Daily limit */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Daily limit (USDT)</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={maxDaily}
                onChange={(e) => setMaxDaily(e.target.value)}
                placeholder="500"
              />
              <p className="text-xs text-muted-foreground">
                Maximum total spend per day from copy trades. Resets at midnight UTC.
              </p>
            </div>

            {/* Warning */}
            <div className="flex gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <p className="font-medium">Copy trading involves risk</p>
                <p>
                  Past performance does not guarantee future results.
                  You can stop copying at any time.
                  Existing positions will remain open until they settle.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStart}
              disabled={isStarting}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
            >
              {isStarting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <UserPlus className="w-4 h-4 mr-1.5" />
              )}
              Start Copying
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Stop Dialog */}
      <Dialog open={showConfirmStop} onOpenChange={setShowConfirmStop}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Stop Copy Trading?</DialogTitle>
            <DialogDescription>
              New trades from {leaderDisplayName || leaderIdentifier} will no longer be copied.
              Any existing positions will remain until they settle.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmStop(false)}>
              Keep Copying
            </Button>
            <Button
              variant="destructive"
              onClick={handleStop}
              disabled={isStopping}
            >
              {isStopping && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Stop Copying
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
