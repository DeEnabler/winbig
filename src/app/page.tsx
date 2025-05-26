// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { useEntryContext } from '@/contexts/EntryContext'; // Not used for this redirect

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Simulate landing via a challenge link
    // Using setTimeout to push the navigation to the next tick,
    // which can help with router readiness or searchParam availability on the target page.
    const timerId = setTimeout(() => {
      const challengeUrl = `/match/challengeAsTest1?challenge=true&referrer=ViralBot&predictionId=1`;
      router.push(challengeUrl);
    }, 0);

    // Cleanup the timer if the component unmounts before the timeout fires
    return () => clearTimeout(timerId);
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to ensure it runs only once on mount

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
      <p className="text-muted-foreground">Loading your challenge...</p>
    </div>
  );
}
