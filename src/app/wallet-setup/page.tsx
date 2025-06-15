// src/app/wallet-setup/page.tsx
import WalletGenerator from '@/components/wallet/WalletGenerator';
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wallet Setup - WinBig',
  description: 'Generate or import a wallet for Polymarket API credentials on WinBig.',
};

export default function WalletSetupPage() {
  return (
    <PageTransitionWrapper>
      <div className="container mx-auto py-8">
        <WalletGenerator />
      </div>
    </PageTransitionWrapper>
  );
}
