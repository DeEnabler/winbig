
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-2">
      <span className="font-extrabold text-2xl text-primary">
        WinBig
      </span>
    </Link>
  );
}
