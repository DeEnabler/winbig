// src/app/ref/[code]/page.tsx
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getUserByAffiliateCode } from '@/lib/supabase-server';

type RefPageProps = {
  params: Promise<{ code: string }>;
};

/**
 * Generate OG metadata for affiliate links.
 * This allows WhatsApp/Messenger to show a preview with the logo
 * before the user is redirected.
 */
export async function generateMetadata({ params }: RefPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { code } = resolvedParams;
  
  const result = await getUserByAffiliateCode(code);
  const username = result.data?.x_username || 'Someone';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun';
  
  const title = `Join WinBig via ${username}'s invite`;
  const description = `${username} invited you to WinBig - the prediction market platform where you can bet on real-world outcomes!`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `${appUrl}/logo.png`, width: 800, height: 800, alt: 'WinBig Logo' }],
      type: 'website',
      siteName: 'WinBig',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${appUrl}/logo.png`],
    },
  };
}

/**
 * Affiliate link redirect page.
 * 
 * When a user visits /ref/alice_1234, this page:
 * 1. Looks up the affiliate code to find the referrer
 * 2. Redirects to homepage with referrer params in URL
 * 
 * The EntryContext will capture these params and track the referral.
 */
export default async function RefPage({ params }: RefPageProps) {
  const resolvedParams = await params;
  const { code } = resolvedParams;

  console.log('🔗 Affiliate link visited:', code);

  // Look up the referrer by affiliate code
  const result = await getUserByAffiliateCode(code);

  if (result.success && result.data?.wallet_address) {
    const referrerWallet = result.data.wallet_address;
    const referrerUsername = result.data.x_username;

    console.log('✅ Found referrer:', referrerWallet, referrerUsername);

    // Build redirect URL with referrer params
    const redirectParams = new URLSearchParams();
    redirectParams.set('ref', code);
    redirectParams.set('ref_user_id', referrerWallet);
    if (referrerUsername) {
      redirectParams.set('referrer', referrerUsername);
    }
    redirectParams.set('source', 'affiliate');

    // Redirect to homepage with referral tracking params
    redirect(`/?${redirectParams.toString()}`);
  }

  // If code not found, redirect to homepage without params
  console.log('❌ Affiliate code not found:', code);
  redirect('/');
}
