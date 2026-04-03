// src/components/profile/ProfileHeader.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, ExternalLink, Twitter, Wallet } from 'lucide-react';
import { useState } from 'react';
import type { UserProfile } from '@/lib/supabase-server';
import CopyTraderButton from './CopyTraderButton';

interface ProfileHeaderProps {
  profile: UserProfile | null;
  walletAddress: string | null;
  isVerified: boolean;
  isOwnProfile?: boolean;
}

function formatShortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getInitials(name: string | null | undefined, username: string | null | undefined): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (username) {
    return username.slice(0, 2).toUpperCase();
  }
  return 'U';
}

export default function ProfileHeader({ profile, walletAddress, isVerified, isOwnProfile }: ProfileHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayName = profile?.x_name || profile?.x_username || 'Anonymous';
  const username = profile?.x_username;
  const avatarUrl = profile?.x_avatar;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-border">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,hsl(var(--primary)/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,hsl(var(--accent)/0.1),transparent_50%)]" />
      
      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background shadow-xl">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl md:text-3xl font-bold bg-primary text-primary-foreground">
                {getInitials(profile?.x_name, profile?.x_username)}
              </AvatarFallback>
            </Avatar>
            {isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-[#1DA1F2] rounded-full p-1.5 border-2 border-background">
                <Twitter className="w-4 h-4 text-white fill-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{displayName}</h1>
              {isOwnProfile && (
                <Badge variant="secondary" className="w-fit mx-auto md:mx-0">
                  Your Profile
                </Badge>
              )}
            </div>

            {username && (
              <a
                href={`https://x.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors mb-3"
              >
                <span className="text-lg">@{username}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {walletAddress && (
              <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <code className="text-sm font-mono">{formatShortAddress(walletAddress)}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-primary/10"
                    onClick={handleCopyAddress}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <a
                  href={`https://polygonscan.com/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Badges row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
              {isVerified && (
                <Badge className="bg-[#1DA1F2]/10 text-[#1DA1F2] border-[#1DA1F2]/30">
                  <Twitter className="w-3 h-3 mr-1" />
                  X Verified
                </Badge>
              )}
              {profile?.affiliate_code && (
                <Badge variant="outline" className="border-accent/30 text-accent">
                  Affiliate Partner
                </Badge>
              )}
            </div>

            {/* Copy Trader */}
            {!isOwnProfile && walletAddress && (
              <div className="mt-4 flex justify-center md:justify-start">
                <CopyTraderButton
                  leaderIdentifier={walletAddress.toLowerCase()}
                  leaderSource="winbig"
                  leaderUserId={walletAddress.toLowerCase()}
                  leaderDisplayName={profile?.x_name || profile?.x_username || undefined}
                  variant="header"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
