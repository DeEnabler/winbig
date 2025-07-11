// src/app/positions/page.tsx
'use client';

import type { OpenPosition, ShareMessageDetails, OgData } from '@/types';
import { mockOpenPositions, mockCurrentUser } from '@/lib/mockData';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Sparkles, DollarSign, ShoppingCart, Gift, Share2, X as LucideXIcon, BookOpenText, Info } from 'lucide-react';
import NextImage from 'next/image';
import { formatDistanceToNow, format } from 'date-fns';
import { motion } from 'framer-motion';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from 'wagmi';
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const ShareDialog = dynamic(() => import('@/components/sharing/ShareDialog'), {
  ssr: false,
  loading: () => <p>Loading...</p>
});

function formatCurrency(amount: number, includeSign = true) {
  return `${includeSign ? '$' : ''}${amount.toFixed(2)}`;
}

export default function PositionsPage() {
  const { toast } = useToast();
  const { isConnected } = useAccount();
  const [allPositions, setAllPositions] = useState<OpenPosition[]>(mockOpenPositions);
  const { appendEntryParams } = useEntryContext();

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [currentShareMessage, setCurrentShareMessage] = useState('');
  const [currentShareOgImageUrl, setCurrentShareOgImageUrl] = useState('');
  const [currentShareUrl, setCurrentShareUrl] = useState('');
  const [isLoadingShareMessage, setIsLoadingShareMessage] = useState(false);

  const activePositions = useMemo(() => 
    allPositions.filter(p => p.status === 'LIVE' || p.status === 'ENDING_SOON'), 
    [allPositions]
  );

  const pastPositions = useMemo(() => 
    allPositions.filter(p => p.status !== 'LIVE' && p.status !== 'ENDING_SOON').sort((a,b) => b.endsAt.getTime() - a.endsAt.getTime()),
    [allPositions]
  );

  const handleSellPosition = (positionId: string, sellValue: number) => {
    if (!isConnected) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet to sell your position." });
      return;
    }
    toast({ title: "Selling Position...", description: `Attempting to sell for ${formatCurrency(sellValue)}` });
    setTimeout(() => {
      setAllPositions(prevPositions =>
        prevPositions.map(p =>
          p.id === positionId ? { ...p, status: 'SOLD', settledAmount: sellValue } : p
        )
      );
      toast({ title: "Position Sold!", description: `Successfully sold for ${formatCurrency(sellValue)}.` });
    }, 1500);
  };

  const handleCollectWinnings = (positionId: string, winnings: number) => {
    if (!isConnected) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet to collect winnings." });
      return;
    }
    toast({ title: "Collecting Winnings...", description: `Attempting to collect ${formatCurrency(winnings)}` });
    setTimeout(() => {
      setAllPositions(prevPositions =>
        prevPositions.map(p =>
          p.id === positionId ? { ...p, status: 'COLLECTED' } : p
        )
      );
      toast({ title: "Winnings Collected!", description: `${formatCurrency(winnings)} added to your balance.` });
    }, 1500);
  };

  const handleSharePosition = async (position: OpenPosition) => {
    setIsLoadingShareMessage(true);
    setIsShareDialogOpen(true);

    const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');
    
    const matchShareParams = new URLSearchParams();
    matchShareParams.set('predictionId', position.predictionId);
    matchShareParams.set('userChoice', position.userChoice);
    matchShareParams.set('outcome', position.status); 
    if (position.bonusApplied) {
      matchShareParams.set('bonusApplied', 'true');
    }
    matchShareParams.set('utm_source', 'winbig_share');
    matchShareParams.set('utm_medium', 'social');
    matchShareParams.set('utm_campaign', 'position_share');
    
    const shareUrlPath = `/match/${position.matchId}?${matchShareParams.toString()}`;
    setCurrentShareUrl(appendEntryParams(shareUrlPath));

    const ogParams = new URLSearchParams();
    ogParams.set('v', Date.now().toString());
    ogParams.set('predictionText', position.predictionText.substring(0,50) + '...');
    ogParams.set('username', mockCurrentUser.username === 'You' ? 'I' : mockCurrentUser.username);
    ogParams.set('userAvatar', mockCurrentUser.avatarUrl || 'https://placehold.co/128x128.png?text=WB');
    ogParams.set('ogType', 'position_outcome');
    
    let outcomeDescriptionForShare = '';
    let finalAmountForShare: number | undefined;
    let ogOutcomeParam: OgData['outcome'] = 'PENDING';

    switch (position.status) {
        case 'LIVE':
        case 'ENDING_SOON':
            outcomeDescriptionForShare = `My bet on "${position.predictionText.substring(0,25)}..." is LIVE! Potential payout: ${formatCurrency(position.potentialPayout, false)}.`;
            finalAmountForShare = position.potentialPayout;
            ogOutcomeParam = 'PENDING';
            ogParams.set('betAmount', position.betAmount.toString());
            break;
        case 'SETTLED_WON':
        case 'COLLECTED': 
             outcomeDescriptionForShare = `I WON ${formatCurrency(position.settledAmount || 0, false)} on my bet: "${position.predictionText.substring(0,25)}..."!`;
            finalAmountForShare = position.settledAmount;
            ogOutcomeParam = 'WON';
            ogParams.set('betAmount', (position.settledAmount || 0).toString());
            break;
        case 'SETTLED_LOST':
            outcomeDescriptionForShare = `Took an L on this one: "${position.predictionText.substring(0,25)}...". Bet ${formatCurrency(position.betAmount, false)}.`;
            finalAmountForShare = position.betAmount; 
            ogOutcomeParam = 'LOST';
            ogParams.set('betAmount', position.betAmount.toString());
            break;
        case 'SOLD':
            outcomeDescriptionForShare = `Cashed out my bet on "${position.predictionText.substring(0,25)}..." for ${formatCurrency(position.settledAmount || 0, false)}.`;
            finalAmountForShare = position.settledAmount;
            ogOutcomeParam = 'SOLD';
            ogParams.set('betAmount', (position.settledAmount || 0).toString());
            break;
        default:
            outcomeDescriptionForShare = `My position on "${position.predictionText.substring(0,20)}..."`;
    }
    ogParams.set('outcome', ogOutcomeParam);
    ogParams.set('userChoice', position.userChoice);

    if (position.bonusApplied) {
      ogParams.set('bonus', 'true');
    }
    setCurrentShareOgImageUrl(`${appUrl}/api/og?${ogParams.toString()}`);
    
    // AI-generated message is now disabled. Using fallback.
      setCurrentShareMessage(`Check out my position on "${position.predictionText}"! ${outcomeDescriptionForShare} #WinBig`);
      setIsLoadingShareMessage(false);
  };

  return (
    <>
      <div className="container mx-auto py-6 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            My Positions
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Track your active bets, sell early, or collect your winnings.
          </p>
        </motion.div>

        {/* Active Positions Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-primary" /> Active Bets
          </h2>
          {activePositions.length === 0 ? (
            <Card className="text-center p-8 bg-muted/50 rounded-lg">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-xl font-semibold mb-2">No Active Bets Right Now</p>
              <p className="text-muted-foreground mb-4">Time to find some predictions and get in the game!</p>
              <Button asChild size="lg" className="rounded-lg">
                <a href={appendEntryParams('/')}>Find Predictions</a>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {activePositions.map((position, index) => {
                const timeDiff = position.endsAt.getTime() - Date.now();
                const isEndingSoon = position.status === 'LIVE' && timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000;
                let statusText = position.status === 'ENDING_SOON' || isEndingSoon ? 'Ending Soon' : 'LIVE';
                
                return (
                  <motion.div
                    key={position.id}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="flex flex-col h-full overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300 rounded-xl">
                      {position.imageUrl && (
                        <div className="relative w-full h-36">
                          <NextImage src={position.imageUrl} alt={position.predictionText} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" style={{ objectFit: 'cover' }} data-ai-hint={position.aiHint || position.category} />
                          {position.bonusApplied && (
                            <Badge className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 hover:bg-yellow-400/90 dark:bg-yellow-600 dark:text-yellow-50 dark:hover:bg-yellow-600/90 shadow-md text-xs px-2 py-0.5">
                              <Sparkles className="w-3 h-3 mr-1" /> Bonus
                            </Badge>
                          )}
                        </div>
                      )}
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-base leading-tight line-clamp-2">{position.predictionText}</CardTitle>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">{position.category}</Badge>
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Ends {formatDistanceToNow(position.endsAt, { addSuffix: true })}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-1.5 py-2 px-4 text-xs">
                        <div>Your Bet: <span className={`font-semibold ${position.userChoice === 'YES' ? 'text-green-600' : 'text-red-600'}`}>{position.userChoice}</span> for {formatCurrency(position.betAmount)}</div>
                        <div>Potential Payout: <span className="font-semibold text-primary">{formatCurrency(position.potentialPayout)}</span></div>
                        <div className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1 text-success" /> Current Sell Value: <span className="font-semibold text-success ml-1">{formatCurrency(position.currentValue)}</span>
                        </div>
                        <div className="text-muted-foreground">Status: <span className={`font-semibold ${statusText === 'LIVE' ? 'text-blue-500' : 'text-orange-500'}`}>{statusText}</span>
                          {position.opponentUsername && <span className="block text-xxs truncate">vs @{position.opponentUsername}</span>}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 pb-3 px-4 flex flex-col gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="w-full bg-warning hover:bg-warning/90 text-warning-foreground h-10 text-sm rounded-lg" size="sm" disabled={position.currentValue <= 0}>
                              <ShoppingCart className="w-4 h-4 mr-1.5" /> Sell for {formatCurrency(position.currentValue)}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Confirm Sell</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure you want to sell this position for {formatCurrency(position.currentValue)}? This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleSellPosition(position.id, position.currentValue)} className="bg-warning hover:bg-warning/90 text-warning-foreground">Yes, Sell</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button onClick={() => handleSharePosition(position)} variant="outline" size="sm" className="w-full h-10 text-sm rounded-lg">
                          <LucideXIcon className="w-4 h-4 mr-1.5" /> Share
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Positions Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <BookOpenText className="w-6 h-6 mr-2 text-muted-foreground" /> Past Positions
          </h2>
          {pastPositions.length === 0 ? (
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
                          <TableCell className="text-right text-xs text-muted-foreground">{format(position.endsAt, 'MMM d, yyyy')}</TableCell>
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
          currentShareMessage={isLoadingShareMessage ? "Generating share message..." : currentShareMessage}
          onShareMessageChange={setCurrentShareMessage}
          shareUrl={currentShareUrl}
          entityContext="position_outcome"
        />
      )}
    </>
  );
}
