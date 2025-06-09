
// src/app/api/og/route.tsx
import { ImageResponse } from '@vercel/og';
import { type NextRequest } from 'next/server';

export const runtime = 'edge'; // Recommended for @vercel/og

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const predictionText = searchParams.get('predictionText') || 'A Viral Prediction';
  const userChoice = searchParams.get('userChoice') as 'YES' | 'NO' || 'YES';
  const userAvatar = searchParams.get('userAvatar') || 'https://placehold.co/128x128.png?text=VB';
  const username = searchParams.get('username') || 'A Bettor';
  const outcome = searchParams.get('outcome')?.toUpperCase() || 'PENDING'; // WON, LOST, PENDING
  const betAmount = searchParams.get('betAmount') || '0';
  const betSize = searchParams.get('betSize'); // e.g., 5 (for 5 SOL)
  const streak = searchParams.get('streak'); // e.g., 3
  const rank = searchParams.get('rank'); // e.g., 2 (for #2 in Politics)
  const rankCategory = searchParams.get('rankCategory') || 'Predictions'; // e.g. Politics
  const bonusApplied = searchParams.get('bonus') === 'true';

  const tagline = 'Bet Like a Legend!';

  let choiceColor = 'text-gray-300';
  if (userChoice === 'YES') choiceColor = 'text-green-400';
  if (userChoice === 'NO') choiceColor = 'text-red-400';

  let outcomeBgColor = 'bg-gray-500';
  let outcomeTextColor = 'text-white';
  if (outcome === 'WON') {
    outcomeBgColor = 'bg-yellow-500'; // Gold for WON
  } else if (outcome === 'LOST') {
    outcomeBgColor = 'bg-slate-700';
  }


  let ctaText = "Bet against me?";
  if (outcome === 'WON') {
    ctaText = "I called it. Can you?";
  } else if (outcome === 'LOST') {
    ctaText = "Think you’re smarter?";
  }

  return new ImageResponse(
    (
      <div tw="flex flex-col w-full h-full items-center justify-between bg-purple-800 text-white p-10 pb-6" style={{ fontFamily: 'sans-serif' }}>
        {/* Header: App Logo + User Avatar + Username */}
        <div tw="flex w-full justify-between items-center">
          <div tw="flex items-center">
             <div tw="text-5xl font-bold mr-3" style={{color: '#D8B4FE'}}>ViralBet</div>
             {bonusApplied && (
                <div tw="flex items-center bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xl font-semibold shadow-md">
                    ✨ +20% Bonus!
                </div>
             )}
          </div>
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

        {/* Dynamic Badges Area */}
        <div tw="flex flex-wrap justify-center items-center gap-3 mb-3 text-xl">
          {streak && (
            <div tw="flex items-center bg-orange-500 text-white px-4 py-1.5 rounded-full shadow-md">
              <span tw="mr-1.5">🔥</span> {streak}-Win Streak
            </div>
          )}
          {betSize && (
            <div tw="flex items-center bg-green-500 text-white px-4 py-1.5 rounded-full shadow-md">
              <span tw="mr-1.5">💰</span> {betSize} SOL Bet
            </div>
          )}
          {rank && (
            <div tw="flex items-center bg-teal-500 text-white px-4 py-1.5 rounded-full shadow-md">
              <span tw="mr-1.5">👑</span> Rank #{rank} <span tw="ml-1">in {rankCategory}</span>
            </div>
          )}
        </div>

        {/* Footer: Outcome, CTA */}
        <div tw="flex w-full justify-between items-center text-2xl">
          <div tw="flex items-center">
            <div tw={`px-5 py-2 rounded-lg ${outcomeBgColor} ${outcomeTextColor} font-bold shadow-md`}>
              {outcome}
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
