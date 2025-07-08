
// src/components/wallet/ConnectWallet.tsx
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
import { useAppKit } from '@reown/appkit/react';

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  const handleOpenModal = () => {
    if (open) {
      console.log('[ConnectWalletButton] "Connect Wallet" button clicked. Attempting to call open().');
      open();
    } else {
      console.error('[ConnectWalletButton] open function is not available. Reown AppKit might not be initialized.');
      alert("Wallet connect service is not available. Please check configuration or console for errors.");
    }
  };
  
  if (!open) {
     return (
      <Button variant="outline" disabled className="flex items-center space-x-2 border-destructive text-destructive h-12 text-base rounded-lg">
        <AlertTriangle className="w-5 h-5" />
        <span>Wallet Disabled</span>
      </Button>
    );
  }


  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg" className="flex items-center space-x-2 text-base rounded-lg">
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
          {/* Reown AppKit manages account and network views within its modal */}
          {/* You might not need these if appKitModal.open() handles everything */}
          {/* <DropdownMenuItem onClick={() => appKitModal.open?.({ view: 'Account' })}> // Reown might have different view keys
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Account Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => appKitModal.open?.({ view: 'Networks' })}>
            <LogIn className="mr-2 h-4 w-4" />
            <span>Switch Network</span>
          </DropdownMenuItem> 
          <DropdownMenuSeparator />*/}
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
      {/* Trust text removed from here */}
      <Button
        onClick={handleOpenModal}
        size="lg" // Uses the updated lg size: h-12, text-base, rounded-lg
        className="bg-primary hover:bg-primary/90 w-full shadow-md hover:shadow-lg transition-shadow animate-pulse-glow"
      >
        <LogIn className="mr-2 h-5 w-5" />
        Connect Wallet
      </Button>
    </div>
  );
}
