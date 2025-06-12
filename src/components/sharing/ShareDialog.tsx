
// src/components/sharing/ShareDialog.tsx
'use client';

import type { ShareDialogProps } from '@/types';
import NextImage from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Twitter, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';

interface InternalShareDialogProps extends ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareDialog({
  isOpen,
  onOpenChange,
  matchId,
  ogImageUrl,
  tweetTemplates, 
  rewardIncentive,
  currentShareMessage,
  onShareMessageChange,
  shareUrl, // This is the URL to be shared (e.g., link to match or position)
  entityContext, // Added to potentially customize OG or messages
  entityDetails, // Added for more context
}: InternalShareDialogProps) {
  const { toast } = useToast();
  const [isPreviewOgImageLoading, setIsPreviewOgImageLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsPreviewOgImageLoading(true); // Reset loading state when dialog opens
    }
  }, [isOpen]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: "Share message copied to clipboard." });
    }).catch(err => {
      console.error("Failed to copy:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to copy message." });
    });
  };

  // Ensure shareUrl is a full URL
  const finalShareUrlString = useMemo(() => {
    try {
      // If shareUrl is already absolute, use it. Otherwise, resolve against current origin or fallback.
      return new URL(shareUrl, typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002').toString();
    } catch (e) {
      // Fallback for invalid shareUrl (should not happen if constructed properly)
      return typeof window !== 'undefined' ? window.location.href : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');
    }
  }, [shareUrl]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if(!open) setIsPreviewOgImageLoading(true); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Bet!</DialogTitle>
          <DialogDescription>
            Let the world know! Edit the message below if you like.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            {isPreviewOgImageLoading && <Skeleton className="w-full aspect-[1200/630]" />}
            <NextImage
              src={ogImageUrl} 
              alt="Share Preview for X"
              width={1200}
              height={630}
              className={`w-full h-auto ${isPreviewOgImageLoading ? 'hidden' : 'block'}`}
              onLoad={() => setIsPreviewOgImageLoading(false)}
              onError={() => {
                setIsPreviewOgImageLoading(false);
                // Don't toast error if image fails, just hide skeleton. It might be a generic/placeholder URL.
                console.warn("ShareDialog: OG Image failed to load from:", ogImageUrl);
              }}
              unoptimized // Good for dynamic images based on params that change frequently
              priority={false} // Not critical path image
            />
          </div>
          <Textarea
            value={currentShareMessage}
            onChange={(e) => onShareMessageChange(e.target.value)}
            rows={4}
            className="bg-muted/50"
            placeholder="Your viral tweet..."
          />
          {rewardIncentive && (
            <p className="text-xs text-center text-green-600 dark:text-green-400">{rewardIncentive}</p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => copyToClipboard(currentShareMessage)}>
                <Copy className="w-4 h-4 mr-2" /> Copy Text
            </Button>
            <Button asChild className="bg-blue-500 hover:bg-blue-600 text-white">
              <a 
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(currentShareMessage)}&url=${encodeURIComponent(finalShareUrlString)}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Twitter className="w-4 h-4 mr-2" /> Share to X
              </a>
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
