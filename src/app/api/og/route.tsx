
// src/app/api/og/route.tsx
import { ImageResponse } from '@vercel/og';
import { type NextRequest } from 'next/server';
import type { OgData } from '@/types'; // Import OgData type

export const runtime = 'edge'; // Recommended for @vercel/og

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Extract all params relevant to OgData
  const ogData: OgData = {
    predictionText: searchParams.get('predictionText') || 'A Viral Prediction',
    userChoice: searchParams.get('userChoice') as 'YES' | 'NO' | undefined,
    userAvatar: searchParams.get('userAvatar') || 'https://placehold.co/128x128.png?text=VB',
    username: searchParams.get('username') || undefined, // Make username optional for more generic cards
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
    outcomeBgColor = 'bg-yellow-500'; // Gold for WON
  } else if (ogData.outcome === 'LOST') {
    outcomeBgColor = 'bg-slate-700';
  } else if (ogData.outcome === 'SOLD') {
    outcomeBgColor = 'bg-blue-500';
  } else if (ogData.outcome === 'CHALLENGE') {
    outcomeBgColor = 'bg-purple-600';
  }


  let ctaText = "Bet with me on ViralBet!";
  if (ogData.ogType === 'match_challenge') {
    ctaText = "Bet against me?";
    if (ogData.outcome === 'WON') ctaText = "I called it. Can you?";
    else if (ogData.outcome === 'LOST') ctaText = "Think you’re smarter?";
  } else if (ogData.ogType === 'position_outcome') {
    if (ogData.outcome === 'WON') ctaText = `I WON ${ogData.betAmount ? '$' + ogData.betAmount : ''}!`;
    else if (ogData.outcome === 'SOLD') ctaText = `SOLD for ${ogData.betAmount ? '$' + ogData.betAmount : ''}!`;
    else if (ogData.outcome === 'LOST') ctaText = `Took an L on this one.`;
    else ctaText = "Check out my bet!";
  }
  
  const tagline = ogData.ogType === 'match_challenge' ? 'Bet Like a Legend!' : 'ViralBet - Track Your Bets!';

  const mainTitle = ogData.titleOverride || (
    ogData.username && ogData.userChoice ?
    `${ogData.username} bet ${ogData.userChoice} on:` :
    `Prediction:`
  );


  return new ImageResponse(
    (
      <div tw="flex flex-col w-full h-full items-center justify-between bg-purple-800 text-white p-10 pb-6" style={{ fontFamily: 'sans-serif' }}>
        {/* Header: App Logo + User Avatar + Username */}
        <div tw="flex w-full justify-between items-center">
          <div tw="flex items-center">
             <div tw="text-5xl font-bold mr-3" style={{color: '#D8B4FE'}}>ViralBet</div>
             {ogData.bonusApplied && (
                <div tw="flex items-center bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xl font-semibold shadow-md">
                    ✨ +20% Bonus!
                </div>
             )}
          </div>
          {ogData.username && (
            <div tw="flex items-center">
              <span tw="text-2xl mr-4" style={{color: '#E9D5FF'}}>{ogData.username}</span>
              <img src={ogData.userAvatar} tw="w-20 h-20 rounded-full border-4" style={{borderColor: '#A78BFA'}} alt="User Avatar" />
            </div>
          )}
        </div>

        {/* Main Content: Prediction + Stance (if applicable) */}
        <div tw="flex flex-col items-center text-center my-auto">
          <div tw="text-lg uppercase tracking-wider mb-2" style={{color: '#C084FC'}}>
            {ogData.userChoice ? 'predicts' : (ogData.ogType === 'position_outcome' ? 'Bet Result' : 'Featured Prediction')}
          </div>
          {ogData.userChoice && (
            <div tw={`text-8xl font-bold ${choiceColor} mb-5`}>
              {ogData.userChoice}
            </div>
          )}
          <div tw="text-4xl font-semibold leading-tight max-w-4xl px-4" style={{color: '#F3E8FF'}}>
            "{ogData.predictionText}"
          </div>
        </div>

        {/* Dynamic Badges Area - only if relevant (e.g. match challenges) */}
        {ogData.ogType === 'match_challenge' && (
          <div tw="flex flex-wrap justify-center items-center gap-3 mb-3 text-xl">
            {ogData.streak && (
              <div tw="flex items-center bg-orange-500 text-white px-4 py-1.5 rounded-full shadow-md">
                <span tw="mr-1.5">🔥</span> {ogData.streak}-Win Streak
              </div>
            )}
            {ogData.betSize && ( // betSize here often means the bet 'unit' like 5 SOL
              <div tw="flex items-center bg-green-500 text-white px-4 py-1.5 rounded-full shadow-md">
                <span tw="mr-1.5">💰</span> {ogData.betSize} {(ogData.betSize.match(/^\d+$/) ? 'SOL ' : '')}Bet
              </div>
            )}
             {ogData.betAmount && !ogData.betSize && ( // fallback to betAmount if betSize not specified for OG
              <div tw="flex items-center bg-green-500 text-white px-4 py-1.5 rounded-full shadow-md">
                <span tw="mr-1.5">💰</span> ${ogData.betAmount} Bet
              </div>
            )}
            {ogData.rank && (
              <div tw="flex items-center bg-teal-500 text-white px-4 py-1.5 rounded-full shadow-md">
                <span tw="mr-1.5">👑</span> Rank #{ogData.rank} <span tw="ml-1">in {ogData.rankCategory || 'Predictions'}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer: Outcome, CTA */}
        <div tw="flex w-full justify-between items-center text-2xl">
          <div tw="flex items-center">
            <div tw={`px-5 py-2 rounded-lg ${outcomeBgColor} ${outcomeTextColor} font-bold shadow-md`}>
              {ogData.outcome}
            </div>
          </div>
          <div tw="italic" style={{color: '#D8B4FE'}}>{ctaText}</div>
        </div>

        <div tw="w-full text-center text-lg mt-3" style={{color: '#C084FC'}}>{tagline}</div>

      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
