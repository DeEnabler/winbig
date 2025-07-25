
// src/components/wallet/ConnectWallet.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useAccount, useDisconnect } from 'wagmi';
import { LogIn, LogOut, UserCircle, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Import the appKitModal instance from the new provider
import { appKitModal } from '@/components/providers/WalletKitProvider';

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
      console.error('[ConnectWalletButton] appKitModal.open is not available or not a function. appKitModal:', appKitModal);
      alert("Wallet connect service is not available. Please check configuration (Project ID) and restart the server if you recently updated .env.");
    }
  };

  if (!appKitModal) {
    return (
      <Button variant="outline" disabled className="flex items-center space-x-2 border-destructive text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <span>Wallet Disabled</span>
      </Button>
    );
  }

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
          <DropdownMenuItem onClick={() => appKitModal?.open?.({ view: 'Account' })}>
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Account Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => appKitModal?.open?.({ view: 'Networks' })}>
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
      onClick={handleOpenModal}
      variant="default"
      className="bg-primary hover:bg-primary/90"
    >
      <LogIn className="mr-2 h-5 w-5" />
      Connect Wallet
    </Button>
  );
}
