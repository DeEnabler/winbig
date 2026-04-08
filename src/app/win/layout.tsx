import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WinBig - Turn $50 Into $1,200+',
  description:
    'See how regular traders are winning big on WinBig prediction markets. Join the VIP community today.',
  robots: { index: false, follow: false },
};

export default function FunnelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      {children}
    </div>
  );
}
