
// src/app/positions/page.tsx
'use client';

import type { OpenPosition, ShareMessageDetails } from '@/types';
import { mockOpenPositions, mockCurrentUser } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Clock, Sparkles, DollarSign, ShoppingCart, Gift, Share2, X as LucideXIcon } from 'lucide-react';
import NextImage from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { useEntryContext } from '@/contexts/EntryContext';
import { useToast } from '@/hooks/use-toast';
import { useAccount } from 'wagmi';
import { appKitModal } from '@/context/index';
import ShareDialog from '@/components/sharing/ShareDialog';
import { useState } from 'react';
import { generateXShareMessage } from '@/ai/flows/generate-x-share-message';

function formatCurrency(amount: number, includeSign = true) {
  return `${includeSign ? '$' : ''}${amount.toFixed(2)}`;
}

export default function PositionsPage() {
  const { toast } = useToast();
  const { isConnected } = useAccount();
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>(mockOpenPositions);
  const { appendEntryParams } = useEntryContext();

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [currentShareMessage, setCurrentShareMessage] = useState('');
  const [currentShareOgImageUrl, setCurrentShareOgImageUrl] = useState('');
  const [currentShareUrl, setCurrentShareUrl] = useState('');
  const [isLoadingShareMessage, setIsLoadingShareMessage] = useState(false);

  const handleSellPosition = (positionId: string, sellValue: number) => {
    // In a real app, this would involve a wallet transaction and API call
    if (!isConnected) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet to sell your position." });
      if (appKitModal && typeof appKitModal.open === 'function') appKitModal.open();
      return;
    }
    toast({ title: "Selling Position...", description: `Attempting to sell for ${formatCurrency(sellValue)}` });
    // Simulate API call
    setTimeout(() => {
      setOpenPositions(prevPositions =>
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
      if (appKitModal && typeof appKitModal.open === 'function') appKitModal.open();
      return;
    }
    toast({ title: "Collecting Winnings...", description: `Attempting to collect ${formatCurrency(winnings)}` });
    // Simulate API call
    setTimeout(() => {
      setOpenPositions(prevPositions =>
        prevPositions.map(p =>
          p.id === positionId ? { ...p, status: 'PENDING_COLLECTION' } : p // Or directly to a "Collected" status if desired
        )
      );
      toast({ title: "Winnings Collected!", description: `${formatCurrency(winnings)} added to your balance.` });
    }, 1500);
  };

  const handleSharePosition = async (position: OpenPosition) => {
    setIsLoadingShareMessage(true);
    setIsShareDialogOpen(true);

    const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');
    const shareUrl = appendEntryParams(`${appUrl}/positions?sharedPositionId=${position.id}`); // Example share URL
    setCurrentShareUrl(shareUrl);

    // Simplified OG image generation for positions
    const ogParams = new URLSearchParams();
    ogParams.set('v', Date.now().toString());
    ogParams.set('predictionText', position.predictionText.substring(0,50) + '...');
    ogParams.set('username', mockCurrentUser.username === 'You' ? 'I' : mockCurrentUser.username);
    ogParams.set('userAvatar', mockCurrentUser.avatarUrl || 'https://placehold.co/128x128.png?text=VB');
    
    let outcomeDescriptionForShare = '';
    let finalAmountForShare: number | undefined;

    switch (position.status) {
        case 'LIVE':
        case 'ENDING_SOON':
            outcomeDescriptionForShare = `I'm betting ${position.userChoice} on this! Potential: ${formatCurrency(position.potentialPayout, false)}`;
            finalAmountForShare = position.potentialPayout;
            ogParams.set('outcome', 'PENDING');
            ogParams.set('betAmount', position.betAmount.toString());
            break;
        case 'SETTLED_WON':
            outcomeDescriptionForShare = `I WON ${formatCurrency(position.settledAmount || 0, false)}!`;
            finalAmountForShare = position.settledAmount;
            ogParams.set('outcome', 'WON');
            ogParams.set('betAmount', (position.settledAmount || 0).toString());
            break;
        case 'SETTLED_LOST':
            outcomeDescriptionForShare = `I lost this one.`;
            finalAmountForShare = 0;
            ogParams.set('outcome', 'LOST');
            break;
        case 'SOLD':
            outcomeDescriptionForShare = `I sold my bet for ${formatCurrency(position.settledAmount || 0, false)}.`;
            finalAmountForShare = position.settledAmount;
            ogParams.set('outcome', 'SOLD');
            ogParams.set('betAmount', (position.settledAmount || 0).toString());
            break;
        default:
            outcomeDescriptionForShare = `My position on "${position.predictionText.substring(0,20)}..."`;
    }
    if (position.bonusApplied) {
      ogParams.set('bonus', 'true');
    }
    setCurrentShareOgImageUrl(`${appUrl}/api/og?${ogParams.toString()}`);
    
    try {
      const shareDetails: ShareMessageDetails = {
        predictionText: position.predictionText,
        betAmount: position.betAmount,
        outcomeDescription: outcomeDescriptionForShare,
        finalAmount: finalAmountForShare,
        currency: '$', // Assuming USD for now
        callToAction: "What do you think? #ViralBet"
      };
      const result = await generateXShareMessage(shareDetails);
      let finalMessage = result.shareMessage;
      if (position.bonusApplied && (position.status === 'SETTLED_WON' || position.status === 'LIVE' || position.status === 'ENDING_SOON')) {
        finalMessage += " (+20% Bonus!)";
      }
      setCurrentShareMessage(finalMessage);
    } catch (error) {
      console.error("Failed to generate share message for position:", error);
      setCurrentShareMessage(`Check out my position on "${position.predictionText}"! ${outcomeDescriptionForShare} #ViralBet`);
      toast({ variant: "destructive", title: "Error", description: "Could not generate AI share message. Using default." });
    } finally {
      setIsLoadingShareMessage(false);
    }
  };


  if (openPositions.length === 0) {
    return (
      <div className="container mx-auto py-8 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold mb-4">No Open Positions</h1>
        <p className="text-muted-foreground mb-6">You haven't placed any bets yet, or all your bets are settled and collected.</p>
        <Button asChild size="lg">
          <a href={appendEntryParams('/')}>Find Predictions to Bet On</a>
        </Button>
      </div>
    );
  }

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
            My Active Positions
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Track your bets, sell early, or collect your winnings.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {openPositions.map((position, index) => {
            const timeDiff = position.endsAt.getTime() - Date.now();
            const isEndingSoon = position.status === 'LIVE' && timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000;
            const isLive = position.status === 'LIVE' || position.status === 'ENDING_SOON';
            const isSettledWon = position.status === 'SETTLED_WON';
            const isSold = position.status === 'SOLD';
            const isSettledLost = position.status === 'SETTLED_LOST';

            let statusText = position.status.replace('_', ' ');
            let statusColor = 'text-gray-500';
            if (isLive) statusColor = 'text-blue-500';
            if (isEndingSoon) statusText = 'Ending Soon';
            if (isSettledWon) { statusText = 'WON'; statusColor = 'text-green-500'; }
            if (isSold) { statusText = 'SOLD'; statusColor = 'text-yellow-600'; }
            if (isSettledLost) { statusText = 'LOST'; statusColor = 'text-red-500'; }
            if (position.status === 'PENDING_COLLECTION') { statusText = 'COLLECTED'; statusColor = 'text-purple-500'; }


            return (
              <motion.div
                key={position.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  {position.imageUrl && (
                    <div className="relative w-full h-36">
                      <NextImage
                        src={position.imageUrl}
                        alt={position.predictionText}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        style={{ objectFit: 'cover' }}
                        data-ai-hint={position.aiHint || position.category}
                      />
                      {position.bonusApplied && (
                          <Badge className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 hover:bg-yellow-400/90 shadow-md text-xs px-2 py-0.5">
                              <Sparkles className="w-3 h-3 mr-1" /> Bonus
                          </Badge>
                      )}
                    </div>
                  )}
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-base leading-tight line-clamp-2">{position.predictionText}</CardTitle>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">{position.category}</Badge>
                       { (isLive || isEndingSoon || (!isSold && !isSettledLost && !isSettledWon && position.status !== 'PENDING_COLLECTION')) && (
                        <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Ends {formatDistanceToNow(position.endsAt, { addSuffix: true })}
                        </div>
                       )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-1.5 py-2 px-4 text-xs">
                    <div>
                      Your Bet: <span className={`font-semibold ${position.userChoice === 'YES' ? 'text-green-600' : 'text-red-600'}`}>{position.userChoice}</span> for {formatCurrency(position.betAmount)}
                    </div>
                    
                    {isLive || isEndingSoon ? (
                        <>
                         <div>
                            Potential Payout: <span className="font-semibold text-primary">{formatCurrency(position.potentialPayout)}</span>
                         </div>
                         <div className="flex items-center">
                            <DollarSign className="w-3 h-3 mr-1 text-green-500" /> Current Sell Value: <span className="font-semibold text-green-600 ml-1">{formatCurrency(position.currentValue)}</span>
                         </div>
                        </>
                    ): null}

                    { (isSettledWon || isSold || position.status === 'PENDING_COLLECTION') && position.settledAmount !== undefined && (
                        <div>
                            Outcome: <span className={`font-bold ${isSettledWon || position.status === 'PENDING_COLLECTION' ? 'text-green-600' : 'text-yellow-700'}`}>
                                {position.status === 'SETTLED_WON' || position.status === 'PENDING_COLLECTION' ? `Won ${formatCurrency(position.settledAmount)}` : `Sold for ${formatCurrency(position.settledAmount)}`}
                            </span>
                        </div>
                    )}
                     {isSettledLost && (
                        <div>
                            Outcome: <span className="font-bold text-red-600">Lost {formatCurrency(position.betAmount)}</span>
                        </div>
                    )}

                    <div className="text-muted-foreground">
                      Status: <span className={`font-semibold ${statusColor}`}>{statusText}</span>
                      {position.opponentUsername && <span className="block text-xxs truncate">vs @{position.opponentUsername}</span>}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 pb-3 px-4 flex flex-col gap-2">
                    {(isLive || isEndingSoon) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-900" size="sm">
                            <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Sell for {formatCurrency(position.currentValue)}
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
                            <AlertDialogAction onClick={() => handleSellPosition(position.id, position.currentValue)} className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900">
                              Yes, Sell
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {isSettledWon && (
                      <Button onClick={() => handleCollectWinnings(position.id, position.settledAmount || 0)} className="w-full bg-green-500 hover:bg-green-600 text-white" size="sm">
                        <Gift className="w-3.5 h-3.5 mr-1.5" /> Collect {formatCurrency(position.settledAmount || 0)}
                      </Button>
                    )}
                    {(isSettledLost || isSold || position.status === 'PENDING_COLLECTION' ) && (
                       <Button className="w-full" variant="outline" size="sm" disabled>
                         Position Closed
                       </Button>
                    )}
                    <Button onClick={() => handleSharePosition(position)} variant="outline" size="sm" className="w-full">
                      <LucideXIcon className="w-3.5 h-3.5 mr-1.5" /> Share
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
      <ShareDialog
        isOpen={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        ogImageUrl={currentShareOgImageUrl}
        currentShareMessage={isLoadingShareMessage ? "Generating viral message..." : currentShareMessage}
        onShareMessageChange={setCurrentShareMessage}
        shareUrl={currentShareUrl}
        entityContext="position_outcome"
      />
    </>
  );
}
