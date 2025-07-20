
// src/components/sharing/ShareDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Twitter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  shareMessage: string;
  isLoading: boolean;
  ogImageUrl: string;
  shareUrl: string;
  entityContext: string;
}

export default function ShareDialog({
  isOpen,
  onOpenChange,
  shareMessage,
  isLoading,
  ogImageUrl,
  shareUrl,
}: ShareDialogProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Copied!", description: "Link copied to clipboard." });
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`${shareMessage} ${shareUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Your Bet</DialogTitle>
          <DialogDescription>
            Share this link with your friends to challenge them!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">Loading preview...</div>
            ) : (
              <img src={ogImageUrl} alt="Share Preview" className="w-full h-full object-cover" />
            )}
          </div>
          <p className="text-sm p-3 bg-muted rounded-md">{shareMessage}</p>
          <div className="flex space-x-2">
            <Input value={shareUrl} readOnly />
            <Button onClick={handleCopy} size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleTwitterShare} className="w-full">
            <Twitter className="mr-2 h-4 w-4" /> Share on Twitter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
