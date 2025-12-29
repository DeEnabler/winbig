
import Link from 'next/link';
import Image from 'next/image';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-2">
      <Image 
        src="/logo.png" 
        alt="WinBig Logo" 
        width={32} 
        height={32}
        className="object-contain"
      />
      <span className="font-extrabold text-2xl text-primary">
        WinBig
      </span>
    </Link>
  );
}
