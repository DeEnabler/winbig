// src/components/wallet/ConnectXButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { LogOut, ExternalLink, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// X (Twitter) logo SVG component
function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function ConnectXButton() {
  const { xUser, xProfile, isXLoading, signInWithX, signOutX } = useUser();

  if (isXLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 rounded-full bg-secondary/50 animate-pulse">
        <div className="h-5 w-5 rounded-full bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    );
  }

  if (xUser && xProfile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="group flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full 
                       bg-secondary/60 hover:bg-secondary 
                       border border-border/50 hover:border-border
                       transition-all duration-200 ease-out
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Avatar className="h-7 w-7 ring-2 ring-background shadow-sm">
              <AvatarImage 
                src={xProfile.x_avatar || undefined} 
                alt={xProfile.x_username}
                className="object-cover"
              />
              <AvatarFallback className="bg-zinc-800 text-white">
                <XLogo className="h-3.5 w-3.5" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground max-w-[80px] truncate">
              {xProfile.x_username}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-52 p-1.5 rounded-xl shadow-lg border-border/50"
          sideOffset={8}
        >
          <div className="px-2 py-2 mb-1">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9">
                <AvatarImage src={xProfile.x_avatar || undefined} alt={xProfile.x_username} />
                <AvatarFallback className="bg-zinc-800 text-white">
                  <XLogo className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {xProfile.x_name && (
                  <p className="text-sm font-medium text-foreground truncate">{xProfile.x_name}</p>
                )}
                <p className="text-xs text-muted-foreground truncate">@{xProfile.x_username}</p>
              </div>
            </div>
          </div>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem 
            onClick={() => window.open(`https://x.com/${xProfile.x_username}`, '_blank')}
            className="rounded-lg cursor-pointer"
          >
            <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>View on X</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={signOutX}
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
      onClick={signInWithX}
      variant="outline"
      size="sm"
      className="h-9 px-4 rounded-full gap-2
                 bg-zinc-900 hover:bg-zinc-800 
                 text-white border-zinc-700 hover:border-zinc-600
                 transition-all duration-200 shadow-sm hover:shadow-md"
    >
      <XLogo className="h-4 w-4" />
      <span className="font-medium">Connect X</span>
    </Button>
  );
}