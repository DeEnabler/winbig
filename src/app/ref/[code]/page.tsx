// src/app/ref/[code]/page.tsx
import { redirect } from 'next/navigation';
import { getUserByAffiliateCode } from '@/lib/supabase-server';

type RefPageProps = {
  params: Promise<{ code: string }>;
};

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
