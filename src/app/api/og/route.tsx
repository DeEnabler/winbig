
// src/app/api/og/route.tsx
import { ImageResponse } from '@vercel/og';
import { type NextRequest } from 'next/server';
import type { OgData } from '@/types';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun';

  // Extract all params relevant to OgData
  const ogData: OgData = {
    predictionText: searchParams.get('predictionText') || 'A WinBig Prediction',
    userChoice: searchParams.get('userChoice') as 'YES' | 'NO' | undefined,
    userAvatar: searchParams.get('userAvatar') || 'https://placehold.co/128x128.png?text=WB',
    username: searchParams.get('username') || undefined,
    outcome: (searchParams.get('outcome')?.toUpperCase() as OgData['outcome']) || 'PENDING',
    betAmount: searchParams.get('betAmount') ? parseFloat(searchParams.get('betAmount')!) : undefined,
    betSize: searchParams.get('betSize') || undefined,
    streak: searchParams.get('streak') || undefined,
    rank: searchParams.get('rank') || undefined,
    rankCategory: searchParams.get('rankCategory') || undefined,
    bonusApplied: searchParams.get('bonus') === 'true',
    titleOverride: searchParams.get('titleOverride') || undefined,
    descriptionOverride: searchParams.get('descriptionOverride') || undefined,
    ogType: searchParams.get('ogType') as OgData['ogType'] || 'generic_prediction',
  };

  let choiceColor = 'text-gray-300';
  if (ogData.userChoice === 'YES') choiceColor = 'text-green-400';
  if (ogData.userChoice === 'NO') choiceColor = 'text-red-400';

  let outcomeBgColor = 'bg-gray-500';
  let outcomeTextColor = 'text-white';
  if (ogData.outcome === 'WON') {
    outcomeBgColor = 'bg-yellow-500';
  } else if (ogData.outcome === 'LOST') {
    outcomeBgColor = 'bg-slate-700';
  } else if (ogData.outcome === 'SOLD') {
    outcomeBgColor = 'bg-blue-500';
  } else if (ogData.outcome === 'CHALLENGE') {
    outcomeBgColor = 'bg-purple-600';
  }

  // 🔥 Snappy, ego-inducing CTAs
  let ctaText = "Think you can beat me?";
  if (ogData.ogType === 'match_challenge') {
    ctaText = "Prove me wrong 👀";
    if (ogData.outcome === 'WON') ctaText = "I called it. Your turn.";
    else if (ogData.outcome === 'LOST') ctaText = "Think you're smarter?";
  } else if (ogData.ogType === 'position_outcome') {
    if (ogData.outcome === 'WON') ctaText = `💰 +$${ogData.betAmount || ''}`;
    else if (ogData.outcome === 'SOLD') ctaText = `Cashed out $${ogData.betAmount || ''}`;
    else if (ogData.outcome === 'LOST') ctaText = `L taken. Next is mine.`;
    else ctaText = "Join my bet!";
  }

  // Shorter prediction for display
  const shortPrediction = ogData.predictionText.length > 100 
    ? ogData.predictionText.substring(0, 97) + '...'
    : ogData.predictionText;

  return new ImageResponse(
    (
      <div tw="flex flex-col w-full h-full items-center justify-between text-white p-10 pb-6" style={{ fontFamily: 'sans-serif', background: 'linear-gradient(135deg, #0F1629 0%, #1A2238 50%, #0F1629 100%)' }}>
        {/* Header: Logo + Bet Amount */}
        <div tw="flex w-full justify-between items-center">
          <div tw="flex items-center">
            {/* Logo */}
            <img 
              src={`${appUrl}/logo.png`} 
              tw="w-16 h-16 rounded-xl mr-4" 
              alt="WinBig" 
            />
            <div tw="text-4xl font-bold" style={{color: '#FF7A3D'}}>WinBig</div>
          </div>
          {/* Bet amount badge - prominent! */}
          {ogData.betAmount && (
            <div tw="flex items-center bg-green-500 text-white px-6 py-3 rounded-full text-3xl font-bold shadow-lg">
              💰 ${ogData.betAmount}
            </div>
          )}
        </div>

        {/* Main Content: Bold YES/NO + Prediction */}
        <div tw="flex flex-col items-center text-center my-auto">
          {/* Big bold choice */}
          {ogData.userChoice && (
            <div tw={`text-9xl font-black ${choiceColor} mb-4`}>
              {ogData.userChoice}
            </div>
          )}
          {/* Prediction text */}
          <div tw="text-3xl font-semibold leading-tight max-w-4xl px-4" style={{color: '#E2E8F0'}}>
            {shortPrediction}
          </div>
        </div>

        {/* Footer: Username/CTA */}
        <div tw="flex w-full justify-between items-center text-2xl">
          <div tw="flex items-center">
            {ogData.username && (
              <div tw="flex items-center">
                <img src={ogData.userAvatar} tw="w-12 h-12 rounded-full border-2 mr-3" style={{borderColor: '#4B6BFB'}} alt="" />
                <span style={{color: '#E2E8F0'}}>{ogData.username}</span>
              </div>
            )}
          </div>
          <div tw="font-bold" style={{color: '#FF7A3D'}}>{ctaText}</div>
        </div>

        {/* Subtle tagline */}
        <div tw="w-full text-center text-lg mt-2" style={{color: '#64748B'}}>winbig.fun</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
