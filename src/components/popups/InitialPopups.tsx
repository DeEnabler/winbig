"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export function InitialPopups() {
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [showAffiliatePopup, setShowAffiliatePopup] = useState(false);
  const [isWarningChecked, setIsWarningChecked] = useState(false);

  useEffect(() => {
    const agreedToWarning = localStorage.getItem("agreedToWarning");
    const seenAffiliatePopup = sessionStorage.getItem("seenAffiliatePopup");

    if (agreedToWarning !== "true") {
      setShowWarningPopup(true);
    } else if (seenAffiliatePopup !== "true") {
      setShowAffiliatePopup(true);
    }
  }, []);

  const handleWarningContinue = () => {
    if (isWarningChecked) {
      localStorage.setItem("agreedToWarning", "true");
      setShowWarningPopup(false);
      setShowAffiliatePopup(true);
    }
  };

  const handleAffiliateClose = () => {
    sessionStorage.setItem("seenAffiliatePopup", "true");
    setShowAffiliatePopup(false);
  };

  const handleStartEarning = () => {
    console.log("Redirecting to create market page");
    // Or use Next.js router
    window.location.href = "#create-market";
    handleAffiliateClose();
  };

  return (
    <>
      <Dialog open={showWarningPopup}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Early Access Warning</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              LiquidLaunch is currently in Early Access. This application is
              actively being developed and may contain bugs or undergo
              significant changes.
            </p>
            <p className="mb-2">
              By proceeding to use this application, you acknowledge and accept
              that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>There may be visual bugs and interface issues</li>
              <li>
                Data may not always be live and may require page refreshes
              </li>
              <li>Features and functionality may not work as intended</li>
              <li>
                The application is under active development and will continue to
                improve
              </li>
            </ul>
            <p className="mt-4">Please report any bugs in our Telegram!</p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <Checkbox
                id="terms"
                checked={isWarningChecked}
                onCheckedChange={(checked) => setIsWarningChecked(!!checked)}
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand the risks and agree to continue
              </label>
            </div>
            <Button onClick={handleWarningContinue} disabled={!isWarningChecked}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAffiliatePopup}
        onOpenChange={(open) => !open && handleAffiliateClose()}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              🎉 New: Earn Trading Fees Forever
            </DialogTitle>
            <button
              onClick={handleAffiliateClose}
              className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-muted-foreground">
              Launch a market that generates passive income for life. Earn 50%
              of all trading fees from your active markets!
            </p>
            <div className="space-y-2 mb-4">
              <p>
                <strong>50% Fee Share</strong>: Earn half of all 0.3% trading
                fees
              </p>
              <p>
                <strong>Auto Collection</strong>: Fees accumulate in USDT
                automatically
              </p>
              <p>
                <strong>Scales with Success</strong>: More volume = more revenue
              </p>
            </div>
            <p className="mb-2 text-sm text-muted-foreground">
              Turn your best predictions into recurring revenue.
            </p>
            <p className="text-sm text-muted-foreground">
              Focus on building great communities that drive trading volume.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleAffiliateClose}>
              Maybe Later
            </Button>
            <Button onClick={handleStartEarning}>Start Earning Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
