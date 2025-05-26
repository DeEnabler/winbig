// src/app/api/og/route.tsx
import { ImageResponse } from '@vercel/og';
import { type NextRequest } from 'next/server';

export const runtime = 'edge'; // Recommended for @vercel/og

// TODO: Consider loading custom fonts if needed, e.g., Geist Sans
// async function getGeistFont() {
//   const fontData = await fetch(
//     new URL('../../../../assets/GeistVariableVF.ttf', import.meta.url)
//   ).then((res) => res.arrayBuffer());
//   return fontData;
// }

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const predictionText = searchParams.get('predictionText') || 'A Viral Prediction';
  const userChoice = searchParams.get('userChoice') as 'YES' | 'NO' || 'YES';
  const userAvatar = searchParams.get('userAvatar') || 'https://placehold.co/128x128.png?text=VB'; // VB for ViralBet
  const username = searchParams.get('username') || 'A Bettor';
  const outcome = searchParams.get('outcome')?.toUpperCase() || 'PENDING'; // WON, LOST, PENDING
  const betAmount = searchParams.get('betAmount') || '0';
  
  // const appLogoUrl = searchParams.get('appLogoUrl') || `https://placehold.co/200x60.png?text=ViralBet`; // Or use text
  const tagline = 'Bet Like a Legend!'; // Hardcoded or passed via params

  // Bonus fields (examples, pass them if available)
  // const streak = searchParams.get('streak');
  // const rank = searchParams.get('rank');

  let choiceColor = 'text-gray-300'; // Default for pending or unknown
  if (userChoice === 'YES') choiceColor = 'text-green-400';
  if (userChoice === 'NO') choiceColor = 'text-red-400';

  let outcomeBgColor = 'bg-gray-500'; // Default for PENDING
  if (outcome === 'WON') outcomeBgColor = 'bg-yellow-500'; // Gold for WON
  if (outcome === 'LOST') outcomeBgColor = 'bg-slate-700';


  // const geistFontData = await getGeistFont();

  return new ImageResponse(
    (
      <div tw="flex flex-col w-full h-full items-center justify-between bg-purple-800 text-white p-10" style={{ fontFamily: 'sans-serif' /* fallback */ }}>
        {/* Header: App Logo + User Avatar + Username */}
        <div tw="flex w-full justify-between items-center">
          <div tw="text-5xl font-bold" style={{color: '#D8B4FE'}}>ViralBet</div>
          <div tw="flex items-center">
            <span tw="text-2xl mr-4" style={{color: '#E9D5FF'}}>{username}</span>
            <img src={userAvatar} tw="w-20 h-20 rounded-full border-4" style={{borderColor: '#A78BFA'}} alt="User Avatar" />
          </div>
        </div>

        {/* Main Content: Prediction + Stance */}
        <div tw="flex flex-col items-center text-center my-auto">
          <div tw="text-lg uppercase tracking-wider mb-2" style={{color: '#C084FC'}}>predicts</div>
          <div tw={`text-8xl font-bold ${choiceColor} mb-5`}>
            {userChoice}
          </div>
          <div tw="text-4xl font-semibold leading-tight max-w-4xl px-4" style={{color: '#F3E8FF'}}>
            "{predictionText}"
          </div>
        </div>

        {/* Footer: Outcome, Bet Amount, Tagline/CTA */}
        <div tw="flex w-full justify-between items-center text-2xl">
          <div tw="flex items-center space-x-6">
            <div tw={`px-5 py-2 rounded-lg ${outcomeBgColor} text-white font-bold shadow-md`}>
              {outcome}
            </div>
            <div tw="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold shadow-md">
              Bet: ${betAmount}
            </div>
          </div>
          <div tw="italic" style={{color: '#D8B4FE'}}>{tagline}</div>
        </div>
        
        {/* Optional Bonus: Streak / Rank 
        {(streak || rank) && (
          <div tw="flex mt-4 space-x-3 text-lg absolute bottom-24 right-10">
            {streak && <div tw="bg-orange-500 text-white px-3 py-1 rounded-full">🔥 Streak: {streak}</div>}
            {rank && <div tw="bg-teal-500 text-white px-3 py-1 rounded-full">👑 Rank: {rank}</div>}
          </div>
        )}
        */}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // fonts: [{ name: 'Geist', data: geistFontData, style: 'normal' }],
      // To use emojis, you might need to configure a font that supports them, or ensure system fallback.
      // emoji: 'fluent', // Example if using Twemoji Fluent
    }
  );
}
