import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Joining WinBig VIP',
  description: 'Redirecting you to the private WinBig Legend Bets VIP Group.',
  robots: { index: false, follow: false },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      {children}
    </div>
  );
}
