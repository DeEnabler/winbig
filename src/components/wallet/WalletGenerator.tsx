// src/components/wallet/WalletGenerator.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Copy, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';

interface GeneratedWalletData {
  wallet: {
    address: string;
    privateKey?: string; // Made optional for display safety
  };
  credentials: {
    key: string;
    secret?: string; // Made optional
    passphrase?: string; // Made optional
  };
  network: string;
}

export default function WalletGenerator() {
  const { toast } = useToast();
  const [network, setNetwork] = useState<'amoy' | 'polygon'>('amoy');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedWalletData | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setGeneratedData(null);
    toast({ title: 'Generating Wallet...', description: 'Please wait a moment.' });

    try {
      const response = await fetch('/api/wallet/generate', { // Assuming Firebase function is hosted at this path
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network: network,
          privateKey: privateKeyInput || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate wallet.');
      }
      
      // For display, we might not want to show the full private key, secret, passphrase
      // Or at least make them easily hideable/copyable.
      // Here, we'll store them but be careful with rendering.
      setGeneratedData(data as GeneratedWalletData);
      toast({ title: 'Wallet Generated Successfully!', variant: 'default' });

    } catch (error) {
      console.error('Wallet generation error:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) {
        toast({ variant: 'destructive', title: 'Nothing to Copy', description: `${fieldName} is empty.`});
        return;
    }
    navigator.clipboard.writeText(text)
      .then(() => toast({ title: `${fieldName} Copied!`, description: 'Copied to clipboard.' }))
      .catch(() => toast({ variant: 'destructive', title: 'Copy Failed' }));
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Polymarket API Wallet Setup</CardTitle>
        <CardDescription>Generate or import a wallet to get Polymarket API credentials. For testing or advanced use.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Select Network</Label>
          <RadioGroup value={network} onValueChange={(value) => setNetwork(value as 'amoy' | 'polygon')} className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="amoy" id="amoy" />
              <Label htmlFor="amoy">Amoy (Testnet)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="polygon" id="polygon" />
              <Label htmlFor="polygon">Polygon (Mainnet)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="privateKey">Import Private Key (Optional)</Label>
          <Input
            id="privateKey"
            type="password"
            placeholder="Enter existing private key to use it"
            value={privateKeyInput}
            onChange={(e) => setPrivateKeyInput(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">If left blank, a new wallet will be generated.</p>
        </div>

        <div className="flex items-center space-x-2 p-3 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
          <ShieldCheck className="h-5 w-5" />
          <p className="text-xs">
            This tool helps generate keys for interacting with the Polymarket API. 
            For mainnet, ensure you understand the risks of handling private keys.
            WinBig does not store these keys.
          </p>
        </div>
         <div className="flex items-center space-x-2 p-3 rounded-md bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-xs">
            <strong>Zero Fees:</strong> Generating wallets and API keys via this method is free. Polymarket API usage may have its own terms.
          </p>
        </div>


      </CardContent>
      <CardFooter className="flex flex-col items-stretch">
        <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {privateKeyInput ? 'Import & Generate Credentials' : 'Generate New Wallet & Credentials'}
        </Button>

        {generatedData && (
          <div className="mt-6 space-y-4 p-4 border rounded-md bg-muted/50">
            <h3 className="text-lg font-semibold">Generated Information ({generatedData.network})</h3>
            
            <div className="space-y-1">
              <Label>Wallet Address</Label>
              <div className="flex items-center gap-2">
                <Input type="text" readOnly value={generatedData.wallet.address} className="truncate" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedData.wallet.address, 'Address')}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>

            {generatedData.wallet.privateKey && (
                 <div className="space-y-1">
                    <Label className="text-destructive">Private Key (Handle with extreme care!)</Label>
                    <div className="flex items-center gap-2">
                    <Input type="password" readOnly value={generatedData.wallet.privateKey} className="font-mono" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedData.wallet.privateKey!, 'Private Key')}><Copy className="h-4 w-4" /></Button>
                    </div>
                </div>
            )}

            <h4 className="text-md font-semibold pt-2">API Credentials</h4>
            <div className="space-y-1">
              <Label>API Key</Label>
              <div className="flex items-center gap-2">
                <Input type="text" readOnly value={generatedData.credentials.key} />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedData.credentials.key, 'API Key')}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            {generatedData.credentials.secret && (
                <div className="space-y-1">
                    <Label className="text-destructive">API Secret (Confidential)</Label>
                    <div className="flex items-center gap-2">
                    <Input type="password" readOnly value={generatedData.credentials.secret} />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedData.credentials.secret!, 'API Secret')}><Copy className="h-4 w-4" /></Button>
                    </div>
                </div>
            )}
            {generatedData.credentials.passphrase && (
                 <div className="space-y-1">
                    <Label className="text-destructive">API Passphrase (Confidential)</Label>
                    <div className="flex items-center gap-2">
                    <Input type="password" readOnly value={generatedData.credentials.passphrase} />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedData.credentials.passphrase!, 'API Passphrase')}><Copy className="h-4 w-4" /></Button>
                    </div>
                </div>
            )}
            <p className="text-xs text-destructive mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
              <AlertTriangle className="inline h-4 w-4 mr-1"/> <strong>Security Warning:</strong> Never share your Private Key, API Secret, or Passphrase. Store them securely. WinBig is not responsible for any loss of funds.
            </p>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
