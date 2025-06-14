// src/app/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-8">
      <Card className="w-full max-w-lg mb-8">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            ViralBet Diagnostic Page (Simplified)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <p className="text-lg text-center">
            If you see this, the server started and this simplified page rendered successfully.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
