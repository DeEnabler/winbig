// src/app/positions/page.tsx
'use client';

import type { OpenPosition, ShareMessageDetails, OgData } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, ShoppingCart, Gift, X as LucideXIcon, BookOpenText, Info, Layers } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from 'wagmi';
import { useState } from 'react';
import { useAppKit } from '@reown/appkit/react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';


const ShareDialog = dynamic(() => import('@/components/sharing/ShareDialog'), {
  ssr: false,
  loading: () => <p>Loading...</p>
});

function formatCurrency(amount: number, includeSign = true) {
  return `${includeSign ? '$' : ''}${amount.toFixed(2)}`;
}

const fetchPositions = async (userId: string | undefined): Promise<{ activePositions: OpenPosition[], pastPositions: OpenPosition[] }> => {
    if (!userId) {
        return { activePositions: [], pastPositions: [] };
    }
    const response = await fetch(`/api/positions?user_id=${userId}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    
    // Convert date strings back to Date objects
    const toDate = (p: OpenPosition) => ({ ...p, endsAt: new Date(p.endsAt) });
    return {
        activePositions: data.activePositions.map(toDate),
        pastPositions: data.pastPositions.map(toDate),
    };
};


export default function PositionsPage() {
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { appendEntryParams } = useEntryContext();
  
  const { data, isLoading, error } = useQuery({
      queryKey: ['positions', address],
      queryFn: () => fetchPositions(address),
      enabled: !!address, // Only fetch if the user is connected
      refetchInterval: 30000, // Poll every 30 seconds
  });
  
  const activePositions = data?.activePositions ?? [];
  const pastPositions = data?.pastPositions ?? [];

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [currentShareMessage, setCurrentShareMessage] = useState('');
  const [currentShareOgImageUrl, setCurrentShareOgImageUrl] = useState('');
  const [currentShareUrl, setCurrentShareUrl] = useState('');
  const [isLoadingShareMessage, setIsLoadingShareMessage] = useState(false);

  const handleSellPosition = (positionId: string, sellValue: number) => {
    if (!isConnected) {
      toast({ title: "Connect Wallet", description: "Opening wallet connection dialog...", duration: 3000 });
      open();
      return;
    }
    toast({ title: "Selling Position...", description: `This is a mock action. Selling functionality will be implemented soon.` });
  };

  const handleCollectWinnings = (positionId: string, winnings: number) => {
    if (!isConnected) {
      toast({ title: "Connect Wallet", description: "Opening wallet connection dialog...", duration: 3000 });
      open();
      return;
    }
    toast({ title: "Collecting Winnings...", description: `This is a mock action. Collection functionality will be implemented soon.` });
  };

  const handleSharePosition = async (position: OpenPosition) => {
    // Generate affiliate share link for this bet position
    setIsLoadingShareMessage(true);
    setIsShareDialogOpen(true);

    const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun');
    
    try {
      // If the position has a bet_id, try to get/create a share link for it
      if (position.betId) {
        const response = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bet_id: position.betId }),
        });
        
        const result = await response.json();
        
        if (result.success && result.data?.share_url) {
          setCurrentShareUrl(result.data.share_url);
          const pnlText = position.unrealizedPnL >= 0 
            ? `up ${formatCurrency(position.unrealizedPnL)} (${position.unrealizedPnLPercent.toFixed(0)}%)` 
            : `down ${formatCurrency(Math.abs(position.unrealizedPnL))} (${Math.abs(position.unrealizedPnLPercent).toFixed(0)}%)`;
          setCurrentShareMessage(`🎯 I'm ${pnlText} on my $${position.betAmount.toFixed(0)} ${position.userChoice} position: "${position.predictionText.substring(0, 50)}..." Think I'm wrong? Challenge me!`);
          
          // Generate OG image URL
          const ogUrl = new URL(`${appUrl}/api/og`);
          ogUrl.searchParams.set('predictionText', position.predictionText);
          ogUrl.searchParams.set('userChoice', position.userChoice);
          ogUrl.searchParams.set('betAmount', position.betAmount.toString());
          ogUrl.searchParams.set('ogType', 'match_challenge');
          setCurrentShareOgImageUrl(ogUrl.toString());
          
          setIsLoadingShareMessage(false);
          return;
        }
      }
      
      // Fallback: Create a prediction share if no bet_id
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: address,
          market_id: position.predictionId,
          predicted_outcome: position.userChoice,
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data?.share_url) {
        setCurrentShareUrl(result.data.share_url);
      } else {
        // Ultimate fallback to match page
        setCurrentShareUrl(`${appUrl}/match/${position.predictionId}?predictionId=${position.predictionId}`);
      }
      
      setCurrentShareMessage(`🎯 I'm betting ${position.userChoice} on "${position.predictionText.substring(0, 60)}..." Think I'm wrong?`);
      
      // Generate OG image URL
      const ogUrl = new URL(`${appUrl}/api/og`);
      ogUrl.searchParams.set('predictionText', position.predictionText);
      ogUrl.searchParams.set('userChoice', position.userChoice);
      ogUrl.searchParams.set('ogType', 'match_challenge');
      setCurrentShareOgImageUrl(ogUrl.toString());
      
    } catch (error) {
      console.error('Error generating share link:', error);
      // Fallback
      setCurrentShareUrl(`${appUrl}/match/${position.predictionId}?predictionId=${position.predictionId}`);
      setCurrentShareMessage(`Check out my bet on "${position.predictionText}"!`);
    } finally {
      setIsLoadingShareMessage(false);
    }
  };

  return (
    <>
      <div className="container mx-auto py-6 md:py-10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            My Positions
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Track your active bets, sell early, or collect your winnings.
          </p>
        </div>

        {/* Active Positions Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-primary" /> Active Bets
          </h2>
          {isLoading ? (
            <Card className="rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prediction</TableHead>
                    <TableHead className="text-center">Choice</TableHead>
                    <TableHead className="text-right">Invested</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                    <TableHead className="text-right">Ends</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 mx-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : error ? (
            <Card className="text-center p-8 bg-destructive/10 rounded-lg">
              <p className="text-xl font-semibold mb-2 text-destructive">Could not load positions.</p>
            </Card>
          ) : activePositions.length === 0 ? (
            <Card className="text-center p-8 bg-muted/50 rounded-lg">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-xl font-semibold mb-2">No Active Bets Right Now</p>
              <p className="text-muted-foreground mb-4">Time to find some predictions and get in the game!</p>
              <Button asChild size="lg" className="rounded-lg">
                <a href={appendEntryParams('/')}>Find Predictions</a>
              </Button>
            </Card>
          ) : (
            <Card className="rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prediction</TableHead>
                      <TableHead className="text-center">Choice</TableHead>
                      <TableHead className="text-right">Invested</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">P/L</TableHead>
                      <TableHead className="text-right">Ends</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activePositions.map((position) => {
                      const pnlColor = position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600';
                      const pnlSign = position.unrealizedPnL >= 0 ? '+' : '';
                      
                      return (
                        <TableRow key={position.id}>
                          <TableCell className="font-medium max-w-xs">
                            <div className="truncate" title={position.predictionText}>{position.predictionText}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{position.category}</Badge>
                              {position.betCount && position.betCount > 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Layers className="w-3 h-3 mr-1" /> {position.betCount} bets
                                </Badge>
                              )}
                              {position.bonusApplied && (
                                <Badge className="bg-yellow-400 text-yellow-900 text-xs">
                                  <Sparkles className="w-3 h-3 mr-1" /> Bonus
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={`text-center font-bold ${position.userChoice === 'YES' ? 'text-green-600' : 'text-red-600'}`}>
                            {position.userChoice}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(position.betAmount)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(position.currentValue)}</TableCell>
                          <TableCell className={`text-right font-semibold ${pnlColor}`}>
                            <div>{pnlSign}{formatCurrency(position.unrealizedPnL)}</div>
                            <div className="text-xs">({pnlSign}{position.unrealizedPnLPercent.toFixed(1)}%)</div>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {position.endsAt ? formatDistanceToNow(position.endsAt, { addSuffix: true }) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="border-warning text-warning hover:bg-warning hover:text-warning-foreground h-8 text-xs"
                                    disabled={position.currentValue <= 0}
                                  >
                                    <ShoppingCart className="w-3 h-3 mr-1" /> Sell
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Sell</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to sell this position for {formatCurrency(position.currentValue)}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleSellPosition(position.id, position.currentValue)} 
                                      className="bg-warning hover:bg-warning/90 text-warning-foreground"
                                    >
                                      Yes, Sell
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Button 
                                onClick={() => handleSharePosition(position)} 
                                variant="outline" 
                                size="sm"
                                className="h-8 text-xs"
                              >
                                <LucideXIcon className="w-3 h-3 mr-1" /> Share
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Past Positions Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <BookOpenText className="w-6 h-6 mr-2 text-muted-foreground" /> Past Positions
          </h2>
          {isLoading ? (
             <Card className="rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                        <TableHead>Prediction</TableHead>
                        <TableHead className="text-center">Choice</TableHead>
                        <TableHead className="text-right">Bet</TableHead>
                        <TableHead className="text-right">Outcome</TableHead>
                        <TableHead className="text-right">Settled</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-16 mx-auto" /></TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
            </Card>
          ) : error ? (
             <Card className="text-center p-8 bg-destructive/10 rounded-lg">
                <p className="text-xl font-semibold mb-2 text-destructive">Could not load past positions.</p>
            </Card>
          ) : pastPositions.length === 0 ? (
             <Card className="text-center p-8 bg-muted/50 rounded-lg">
              <Info className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-xl font-semibold">No Past Positions Yet</p>
              <p className="text-muted-foreground">Your settled bets will appear here.</p>
            </Card>
          ) : (
            <Card className="rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prediction</TableHead>
                      <TableHead className="text-center">Choice</TableHead>
                      <TableHead className="text-right">Bet</TableHead>
                      <TableHead className="text-right">Outcome</TableHead>
                      <TableHead className="text-right">Settled</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastPositions.map(position => {
                      let outcomeText = '';
                      let outcomeColor = 'text-foreground';
                      let ActionButtonOrBadge;

                      switch(position.status) {
                        case 'SETTLED_WON':
                          outcomeText = `Won ${formatCurrency(position.settledAmount || 0)}`;
                          outcomeColor = 'text-success';
                           ActionButtonOrBadge = (
                            <Button onClick={() => handleCollectWinnings(position.id, position.settledAmount || 0)} size="icon" variant="ghost" className="h-8 w-8 hover:bg-success/10">
                              <Gift className="w-4 h-4 text-success" />
                            </Button>
                          );
                          break;
                        case 'COLLECTED':
                          outcomeText = `Won ${formatCurrency(position.settledAmount || 0)}`;
                          outcomeColor = 'text-success';
                          ActionButtonOrBadge = (<Badge variant="outline" className="text-success border-success">Collected</Badge>);
                          break;
                        case 'SETTLED_LOST':
                          outcomeText = `Lost ${formatCurrency(position.betAmount)}`;
                          outcomeColor = 'text-destructive';
                          ActionButtonOrBadge = (<Badge variant="outline" className="text-destructive border-destructive">Lost</Badge>);
                          break;
                        case 'SOLD':
                          outcomeText = `Sold for ${formatCurrency(position.settledAmount || 0)}`;
                          if (position.settledAmount && position.settledAmount > position.betAmount) {
                            outcomeColor = 'text-success';
                          } else if (position.settledAmount && position.settledAmount < position.betAmount) {
                            outcomeColor = 'text-destructive';
                          } else {
                            outcomeColor = 'text-warning-foreground'; 
                          }
                          ActionButtonOrBadge = (<Badge variant="outline" className="border-muted-foreground">Sold</Badge>);
                          break;
                        case 'PENDING_COLLECTION': 
                           outcomeText = `Collect ${formatCurrency(position.settledAmount || 0)}`;
                           outcomeColor = 'text-blue-500 dark:text-blue-400';
                           ActionButtonOrBadge = (
                            <Button onClick={() => handleCollectWinnings(position.id, position.settledAmount || 0)} size="icon" variant="ghost" className="h-8 w-8 hover:bg-blue-500/10">
                              <Gift className="w-4 h-4 text-blue-500" />
                            </Button>
                          );
                           break;
                        default:
                          ActionButtonOrBadge = (<Badge variant="secondary">N/A</Badge>);
                      }
                      return (
                        <TableRow key={position.id}>
                          <TableCell className="font-medium max-w-xs truncate" title={position.predictionText}>{position.predictionText}</TableCell>
                          <TableCell className={`text-center font-semibold ${position.userChoice === 'YES' ? 'text-green-600' : 'text-red-600'}`}>{position.userChoice}</TableCell>
                          <TableCell className="text-right">{formatCurrency(position.betAmount)}</TableCell>
                          <TableCell className={`text-right font-semibold ${outcomeColor}`}>{outcomeText}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{position.endsAt ? format(position.endsAt, 'MMM d, yyyy') : 'N/A'}</TableCell>
                          <TableCell className="text-center space-x-1">
                            {ActionButtonOrBadge}
                            <Button onClick={() => handleSharePosition(position)} size="icon" variant="ghost" className="h-8 w-8">
                              <LucideXIcon className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {isShareDialogOpen && (
        <ShareDialog
          isOpen={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          ogImageUrl={currentShareOgImageUrl}
          shareMessage={isLoadingShareMessage ? "Generating share message..." : currentShareMessage}
          isLoading={isLoadingShareMessage}
          shareUrl={currentShareUrl}
          entityContext="position_outcome"
        />
      )}
    </>
  );
}
