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
import { useState } from 'react';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // For tweet templates

interface InternalShareDialogProps extends ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareDialog({
  isOpen,
  onOpenChange,
  matchId,
  ogImageUrl,
  tweetTemplates, // TODO: Implement dropdown/list for templates
  rewardIncentive,
  currentShareMessage,
  onShareMessageChange,
  shareUrl,
}: InternalShareDialogProps) {
  const { toast } = useToast();
  const [isPreviewOgImageLoading, setIsPreviewOgImageLoading] = useState(true);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: "Share message copied to clipboard." });
    }).catch(err => {
      console.error("Failed to copy:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to copy message." });
    });
  };

  const finalShareUrl = new URL(shareUrl, typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002');
  // Example of adding a cache buster or specific share tracking param for the URL that goes into the tweet
  // finalShareUrl.searchParams.set('utm_source', 'x_share_dialog');
  // finalShareUrl.searchParams.set('cb_tweet', Date.now().toString().slice(-5)); // Cache buster for tweet URL itself if needed


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if(!open) setIsPreviewOgImageLoading(true); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Challenge!</DialogTitle>
          <DialogDescription>
            Let the world know! Edit the message below if you like.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            {isPreviewOgImageLoading && <Skeleton className="w-full aspect-[1200/630]" />}
            <NextImage
              src={ogImageUrl} // This URL should already have its own cache buster
              alt="Share Preview for X"
              width={1200}
              height={630}
              className={`w-full h-auto ${isPreviewOgImageLoading ? 'hidden' : 'block'}`}
              onLoad={() => setIsPreviewOgImageLoading(false)}
              onError={() => {
                setIsPreviewOgImageLoading(false);
                toast({variant: "destructive", title:"Preview Error", description: "Could not load share image preview."})
              }}
              unoptimized // Good for dynamic images based on params
            />
          </div>

          {/* TODO: Implement tweet template selection if tweetTemplates is provided */}
          {/* For now, direct textarea */}
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
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(currentShareMessage)}&url=${encodeURIComponent(finalShareUrl.toString())}`} 
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
