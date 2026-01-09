// src/app/gift/[code]/page.tsx
// Gift claim page - "X sent you Y to trade!"

import type { Metadata, ResolvingMetadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getGiftByCode } from '@/lib/bonus-service';
import { getUserProfileByWallet } from '@/lib/supabase-server';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import GiftClaimClient from '@/components/gift/GiftClaimClient';

type GiftPageProps = {
  params: Promise<{ code: string }>;
};

// Generate dynamic OG metadata
export async function generateMetadata(
  { params }: GiftPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const { code } = resolvedParams;

  if (!code || code.length < 6) {
    return {
      title: 'Invalid Gift Link - WinBig',
      description: 'This gift link is invalid.',
    };
  }

  const result = await getGiftByCode(code);

  if (!result.success || !result.data) {
    return {
      title: 'Gift Not Found - WinBig',
      description: 'This gift link could not be found.',
    };
  }

  const gift = result.data;
  
  // Get gifter's profile for display name
  let gifterName = 'Someone';
  if (gift.gifter_username) {
    gifterName = `@${gift.gifter_username}`;
  } else if (gift.gifter_user_id) {
    const profileResult = await getUserProfileByWallet(gift.gifter_user_id);
    if (profileResult.success && profileResult.data?.x_username) {
      gifterName = `@${profileResult.data.x_username}`;
    }
  }

  const amount = gift.amount;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun';

  // OG image with gift info
  const ogImageUrl = new URL(`${appUrl}/api/og`);
  ogImageUrl.searchParams.set('v', Date.now().toString());
  ogImageUrl.searchParams.set('predictionText', `${gifterName} sent you $${amount} to trade!`);
  ogImageUrl.searchParams.set('outcome', 'CHALLENGE');
  ogImageUrl.searchParams.set('ogType', 'match_challenge');
  if (gift.gifter_avatar) {
    ogImageUrl.searchParams.set('userAvatar', gift.gifter_avatar);
  }

  const title = `🎁 ${gifterName} sent you $${amount} to trade on WinBig!`;
  const description = `Claim your bonus and start trading. Win real money! 💰`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl.toString(), width: 1200, height: 630, alt: `WinBig Gift: $${amount}` }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl.toString()],
    },
  };
}

// Main page component
export default async function GiftPage({ params }: GiftPageProps) {
  const resolvedParams = await params;
  const { code } = resolvedParams;

  if (!code || code.length < 6) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Invalid Gift Link</h1>
        <p className="text-muted-foreground">This gift link format is not valid.</p>
      </div>
    );
  }

  const result = await getGiftByCode(code);

  if (!result.success || !result.data) {
    notFound();
  }

  const gift = result.data;

  // Get gifter's profile for display
  let gifterProfile = null;
  if (gift.gifter_user_id) {
    const profileResult = await getUserProfileByWallet(gift.gifter_user_id);
    if (profileResult.success && profileResult.data) {
      gifterProfile = profileResult.data;
    }
  }

  // Determine display name
  const gifterDisplayName = gift.gifter_username
    ? `@${gift.gifter_username}`
    : gifterProfile?.x_username
      ? `@${gifterProfile.x_username}`
      : gifterProfile?.x_name
        ? gifterProfile.x_name
        : gift.gifter_user_id
          ? `User ${gift.gifter_user_id.substring(0, 6)}...`
          : 'A WinBig User';

  const gifterAvatar = gift.gifter_avatar || gifterProfile?.x_avatar || null;

  // Check if claimable
  let canClaim = true;
  let statusMessage: string | undefined;

  if (gift.status === 'claimed') {
    canClaim = false;
    statusMessage = 'This gift has already been claimed';
  } else if (gift.status === 'expired' || new Date(gift.expires_at) < new Date()) {
    canClaim = false;
    statusMessage = 'This gift has expired';
  } else if (gift.status === 'revoked') {
    canClaim = false;
    statusMessage = 'This gift has been revoked';
  }

  return (
    <ErrorBoundary fallback={<p className="text-center text-destructive p-4">An error occurred displaying the gift.</p>}>
      <div className="flex flex-col items-center py-6 md:py-8">
        <Suspense fallback={<div className="w-full h-96 flex items-center justify-center"><LoadingSpinner message="Loading Gift..." /></div>}>
          <div className="w-full max-w-md mx-auto px-4">
            <GiftClaimClient
              giftCode={code}
              amount={gift.amount}
              gifterName={gifterDisplayName}
              gifterAvatar={gifterAvatar}
              isVerified={!!gifterProfile?.x_username || !!gift.gifter_username}
              canClaim={canClaim}
              statusMessage={statusMessage}
              expiresAt={gift.expires_at}
            />
          </div>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
