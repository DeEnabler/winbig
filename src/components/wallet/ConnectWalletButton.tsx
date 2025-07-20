
// src/components/wallet/ConnectWalletButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useAccount, useDisconnect } from 'wagmi';
import { LogIn, LogOut, UserCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appKit } from '@/components/providers/wagmi-config';

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg" className="flex items-center space-x-2 rounded-lg">
            <UserCircle className="h-5 w-5" />
            <span>{truncateAddress(address)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
          <DropdownMenuItem disabled className="text-xs">
            {chain?.name || 'Unknown Network'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => appKit.open({ view: 'Account' })}>
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Account Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => appKit.open({ view: 'Networks' })}>
            <LogIn className="mr-2 h-4 w-4" />
            <span>Switch Network</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => disconnect()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <Button
        onClick={() => appKit.open()}
        size="lg"
        className="bg-primary hover:bg-primary/90 w-full shadow-md"
      >
        <LogIn className="mr-2 h-5 w-5" />
        Connect Wallet
      </Button>
    </div>
  );
}
