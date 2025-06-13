'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-8">
      <Card className="w-full max-w-lg mb-8">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            ViralBet Diagnostic Page
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
           <p className="text-lg text-center">If you see this, the server started and the basic page rendered!</p>
        </CardContent>
      </Card>
       <Card className="w-full max-w-md mt-8 bg-background/70">
        <CardHeader>
          <CardTitle className="text-lg text-center">Note for Development</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>This is a temporary, simplified homepage for diagnosing startup issues.</p>
          <p>The usual prediction feed or ChallengeInvite is bypassed.</p>
          <p>If the server is stable now, the issue likely lies in the components previously rendered here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
