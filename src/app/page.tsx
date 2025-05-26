// src/app/page.tsx
import { redirect } from 'next/navigation';

// This page now acts as a server component to reliably redirect for testing the challenge flow.
export default function HomePage() {
  // Simulate landing via a challenge link by redirecting immediately.
  const challengeUrl = `/match/challengeAsTest1?challenge=true&referrer=ViralBot&predictionId=1`;
  redirect(challengeUrl);

  // This return is technically unreachable due to the redirect,
  // but Next.js requires a valid component export.
  // You could show a loading indicator here if the redirect was conditional
  // or took time, but for an immediate redirect, it's not strictly necessary.
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
      <p className="text-muted-foreground">Redirecting to your challenge...</p>
    </div>
  );
}
