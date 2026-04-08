import Link from 'next/link';

export function AgeDisclaimer() {
  return (
    <div className="text-center text-xs text-zinc-500 space-y-1 pb-28">
      <p>
        18+ only. Prediction markets involve risk. Past performance does not guarantee future
        results.
      </p>
      <p>
        <Link href="/terms" className="underline hover:text-zinc-400">
          Terms of Service
        </Link>
        {' · '}
        <Link href="/privacy" className="underline hover:text-zinc-400">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
