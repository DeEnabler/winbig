
// src/components/wallet/ConnectWalletButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useAccount, useDisconnect } from 'wagmi';
import { LogIn, LogOut, UserCircle, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appKitModal } from '@/context/index'; // Adjusted import path

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();

  const handleOpenModal = () => {
    if (appKitModal && typeof appKitModal.open === 'function') {
      console.log('[ConnectWalletButton] "Connect Wallet" button clicked. Attempting to call appKitModal.open().');
      appKitModal.open();
    } else {
      console.error('[ConnectWalletButton] appKitModal or appKitModal.open is not available. Reown AppKit might not be initialized.');
      alert("Wallet connect service is not available. Please check configuration or console for errors.");
    }
  };
  
  if (!appKitModal) {
     return (
      <Button variant="outline" disabled size="lg" className="flex items-center space-x-2 border-destructive text-destructive rounded-lg">
        <AlertTriangle className="h-5 w-5" />
        <span>Wallet Disabled</span>
      </Button>
    );
  }


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
        onClick={handleOpenModal}
        size="lg" // Use Shadcn large size - h-12, text-base, rounded-lg
        className="bg-primary hover:bg-primary/90 w-full shadow-md hover:shadow-lg transition-shadow animate-pulse-glow"
      >
        <LogIn className="mr-2 h-5 w-5" />
        Connect Wallet
      </Button>
    </div>
  );
}
