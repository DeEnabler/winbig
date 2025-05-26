// src/app/page.tsx
'use client';

import { Suspense, useEffect } from 'react'; // Added useEffect
import { useRouter } from 'next/navigation';
// import PredictionCard from '@/components/predictions/PredictionCard';
// import type { Prediction, BetPlacement, PredictionCardProps as PredictionCardDisplayProps } from '@/types';
// import { mockPredictions } from '@/lib/mockData';
// import { Button } from '@/components/ui/button';
// import { ArrowLeft, ArrowRight, Zap } from 'lucide-react';
// import { useToast } from '@/hooks/use-toast';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEntryContext } from '@/contexts/EntryContext';
// import { formatDistanceToNowStrict, differenceInHours } from 'date-fns';


// function ReferralHandler() {
//   const { referrer } = useEntryContext();
//   const { toast } = useToast();

//   useEffect(() => {
//     if (referrer) {
//       toast({
//         title: "Welcome to ViralBet!",
//         description: (
//           <div className="flex items-center">
//             <Zap className="w-4 h-4 mr-2 text-yellow-500" />
//             You were referred by {referrer}. Enjoy a bonus bet!
//           </div>
//         ),
//         duration: 5000,
//       });
//       // Here you might actually grant a bonus, e.g. update user state
//     }
//   }, [referrer, toast]);

//   return null;
// }


export default function HomePage() {
  // const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  // const [predictionsData, setPredictionsData] = useState<Prediction[]>(mockPredictions);
  const router = useRouter();
  // const { toast } = useToast();
  const { appendEntryParams } = useEntryContext();

  useEffect(() => {
    // Simulate landing via a challenge link
    // Using predictionId=1 (Trump) and referrer "ViralBot"
    // The matchId in the path can be somewhat arbitrary for this simulation,
    // as long as predictionId fetches the correct question.
    const challengeUrl = `/match/challengeAsTest1?challenge=true&referrer=ViralBot&predictionId=1`;
    // We don't need appendEntryParams here as we are *setting* the entry params with this redirect.
    // appendEntryParams is for *preserving* existing entry params during subsequent navigations.
    router.push(challengeUrl);
  }, [router]);


  // const handleBet = (bet: BetPlacement) => {
  //   console.log('Bet placed:', bet);
  //   const matchId = `match-${bet.predictionId}-${Date.now()}`;
    
  //   toast({
  //     title: "Bet Placed!",
  //     description: `You bet ${bet.choice} on "${predictionsData[currentPredictionIndex].text.substring(0,30)}...". Taking you to the match...`,
  //     duration: 3000,
  //   });
    
  //   const baseUrl = `/match/${matchId}?predictionId=${bet.predictionId}&choice=${bet.choice}&amount=${bet.amount}`;
  //   const urlWithEntryParams = appendEntryParams(baseUrl);
  //   router.push(urlWithEntryParams);
  // };

  // const nextPrediction = () => {
  //   setCurrentPredictionIndex((prevIndex) => (prevIndex + 1) % predictionsData.length);
  // };

  // const prevPrediction = () => {
  //   setCurrentPredictionIndex((prevIndex) => (prevIndex - 1 + predictionsData.length) % predictionsData.length);
  // };

  // if (predictionsData.length === 0) {
  //   return (
  //     <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
  //       <Zap className="w-16 h-16 text-primary mb-4" />
  //       <h1 className="text-2xl font-semibold mb-2">No Predictions Available</h1>
  //       <p className="text-muted-foreground">Check back soon for new betting opportunities!</p>
  //     </div>
  //   );
  // }

  // const currentPrediction = predictionsData[currentPredictionIndex];
  // const predictionCardProps: PredictionCardDisplayProps = {
  //   id: currentPrediction.id,
  //   question: currentPrediction.text,
  //   thumbnailUrl: currentPrediction.imageUrl || 'https://placehold.co/600x300.png?text=ViralBet',
  //   payoutTeaser: currentPrediction.payoutTeaser || 'Bet $5 → Win $9.50 (example)',
  //   streakCount: currentPrediction.streakCount || undefined,
  //   facePileCount: currentPrediction.facePileCount || Math.floor(Math.random() * 50) + 3,
  //   category: currentPrediction.category,
  //   timeLeft: currentPrediction.endsAt 
  //             ? differenceInHours(currentPrediction.endsAt, new Date()) < 72 
  //               ? formatDistanceToNowStrict(currentPrediction.endsAt)
  //               : undefined
  //             : undefined,
  //   onBet: handleBet,
  // };


  return (
    // Suspense for EntryContext is in layout.tsx
    // Render a loading state or minimal UI while redirecting
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
      <p className="text-muted-foreground">Loading your challenge...</p>
    </div>
    // <> 
    //   <ReferralHandler />
    //   <div className="flex flex-col items-center justify-center space-y-8 py-8 min-h-[calc(100vh-15rem)]">
    //     <PredictionCard {...predictionCardProps} />
    //     {predictionsData.length > 1 && (
    //       <div className="flex space-x-4">
    //         <Button variant="outline" onClick={prevPrediction} disabled={predictionsData.length <= 1}>
    //           <ArrowLeft className="w-4 h-4 mr-2" /> Previous
    //         </Button>
    //         <Button variant="outline" onClick={nextPrediction} disabled={predictionsData.length <= 1}>
    //           Next <ArrowRight className="w-4 h-4 ml-2" />
    //         </Button>
    //       </div>
    //     )}
    //     <Card className="w-full max-w-md mt-8 bg-background/70">
    //       <CardHeader>
    //         <CardTitle className="text-lg text-center">How to Play</CardTitle>
    //       </CardHeader>
    //       <CardContent className="text-sm text-muted-foreground space-y-2">
    //         <p>1. Swipe or tap YES/NO on the prediction card.</p>
    //         <p>2. Your bet is matched instantly!</p>
    //         <p>3. Share your challenge on X and climb the leaderboard!</p>
    //       </CardContent>
    //     </Card>
    //   </div>
    // </>
  );
}
