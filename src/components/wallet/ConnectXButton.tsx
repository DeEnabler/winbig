// src/components/wallet/ConnectXButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { LogOut } from 'lucide-react';
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
      <Button variant="outline" size="sm" disabled className="flex items-center space-x-2">
        <XLogo className="h-4 w-4" />
        <span>Loading...</span>
      </Button>
    );
  }

  if (xUser && xProfile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center space-x-2 rounded-lg">
            <Avatar className="h-6 w-6">
              <AvatarImage src={xProfile.x_avatar || undefined} alt={xProfile.x_username} />
              <AvatarFallback>
                <XLogo className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate">@{xProfile.x_username}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center space-x-2">
            <XLogo className="h-4 w-4" />
            <span>X Account</span>
          </DropdownMenuLabel>
          <DropdownMenuItem disabled className="text-xs">
            @{xProfile.x_username}
          </DropdownMenuItem>
          {xProfile.x_name && (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {xProfile.x_name}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={signOutX}
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect X</span>
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
      className="flex items-center space-x-2 hover:bg-zinc-800 hover:text-white border-zinc-700"
    >
      <XLogo className="h-4 w-4" />
      <span>Connect X</span>
    </Button>
  );
}
