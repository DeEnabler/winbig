
// src/components/wallet/ConnectWallet.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useWeb3Modal, useWeb3ModalState } from '@web3modal/wagmi/react';
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

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const { open } = useWeb3Modal();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { open: modalOpen } = useWeb3ModalState();

  console.log('[ConnectWalletButton] Render. Hook values:');
  console.log('[ConnectWalletButton] - useWeb3Modal open fn:', typeof open);
  console.log('[ConnectWalletButton] - useWeb3ModalState modalOpen:', modalOpen);
  console.log('[ConnectWalletButton] - useAccount isConnected:', isConnected);
  console.log('[ConnectWalletButton] - useAccount address:', address);


  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2">
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
          <DropdownMenuItem onClick={() => open({ view: 'Account' })}>
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Account Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open({ view: 'Networks' })}>
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
    <Button 
      onClick={() => {
        console.log('[ConnectWalletButton] "Connect Wallet" button clicked.');
        if (typeof open === 'function') {
          console.log('[ConnectWalletButton] Calling open() function.');
          open();
        } else {
          console.error('[ConnectWalletButton] open function is not available or not a function. Type:', typeof open);
        }
      }} 
      disabled={modalOpen} 
      variant="default" 
      className="bg-primary hover:bg-primary/90"
    >
      <LogIn className="mr-2 h-5 w-5" />
      Connect Wallet
    </Button>
  );
}

