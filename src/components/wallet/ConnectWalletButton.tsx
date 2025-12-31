// src/components/wallet/ConnectWalletButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useAccount, useDisconnect } from 'wagmi';
import { LogIn, LogOut, Wallet, Copy, Check, ChevronDown, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appKit } from '@/components/providers/wagmi-config';
import { useState } from 'react';

function truncateAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Generates a gradient based on address
function getAddressGradient(address: string) {
  const hash = address.slice(2, 10);
  const hue1 = parseInt(hash.slice(0, 4), 16) % 360;
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 50%), hsl(${hue2}, 70%, 40%))`;
}

export default function ConnectWalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="group flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-full 
                       bg-primary/10 hover:bg-primary/15 
                       border border-primary/20 hover:border-primary/30
                       transition-all duration-200 ease-out
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div 
              className="h-6 w-6 rounded-full flex items-center justify-center shadow-sm"
              style={{ background: getAddressGradient(address) }}
            >
              <Wallet className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-medium text-foreground">
              {truncateAddress(address)}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 p-1.5 rounded-xl shadow-lg border-border/50"
          sideOffset={8}
        >
          <div className="px-2 py-2.5 mb-1">
            <div className="flex items-center gap-3">
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center shadow-md"
                style={{ background: getAddressGradient(address) }}
              >
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{truncateAddress(address)}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center h-5 px-1.5 rounded-md bg-success/10 text-success text-[10px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-success mr-1 animate-pulse" />
                    {chain?.name || 'Connected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem 
            onClick={copyAddress}
            className="rounded-lg cursor-pointer"
          >
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-success" />
            ) : (
              <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            <span>{copied ? 'Copied!' : 'Copy Address'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => appKit.open({ view: 'Account' })}
            className="rounded-lg cursor-pointer"
          >
            <Wallet className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Account Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => appKit.open({ view: 'Networks' })}
            className="rounded-lg cursor-pointer"
          >
            <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Switch Network</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem 
            onClick={() => disconnect()} 
            className="rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      onClick={() => appKit.open()}
      size="sm"
      className="h-9 px-4 rounded-full gap-2
                 bg-primary hover:bg-primary/90 
                 shadow-sm hover:shadow-md
                 transition-all duration-200"
    >
      <Wallet className="h-4 w-4" />
      <span className="font-medium">Connect</span>
    </Button>
  );
}
