import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WinBig - Your First Winning Market',
  description: 'Choose your first market and place your winning bet on WinBig.',
  robots: { index: false, follow: false },
};

export default function OfferLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      {children}
    </div>
  );
}
