import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WinBig - Bet Placed!',
  description: 'Congratulations! Your bet has been placed on WinBig.',
  robots: { index: false, follow: false },
};

export default function ThankYouLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      {children}
    </div>
  );
}
