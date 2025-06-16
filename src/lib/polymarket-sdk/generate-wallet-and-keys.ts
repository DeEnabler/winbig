
// src/lib/polymarket-sdk/generate-wallet-and-keys.ts
import { WalletGenerator } from './wallet-generator';
import { PolymarketAuth } from './polymarket-auth';
import type { AuthResult, NetworkConfig } from './types';
import { NETWORKS } from './types';

export async function generateTestnetWalletAndKeys(): Promise<AuthResult> {
  try {
    console.log('🚀 Starting Testnet Wallet and API Key Generation...');
    const walletGen = new WalletGenerator('amoy');
    const wallet = walletGen.generateRandomWallet();
    await walletGen.checkBalance(wallet.address);
    const auth = new PolymarketAuth(wallet, NETWORKS.amoy);
    const credentials = await auth.generateApiCredentials();
    console.log('\n🎉 Testnet Setup Complete!');
    console.log(`Address: ${wallet.address}`);
    // Avoid logging sensitive info like key, secret, passphrase
    return { wallet, credentials, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in generateTestnetWalletAndKeys';
    console.error('❌ Testnet generation failed:', errorMessage, error);
    return {
      success: false,
      error: errorMessage,
      wallet: undefined,
      credentials: undefined,
    };
  }
}

export async function generateMainnetWalletAndKeys(): Promise<AuthResult> {
  try {
    console.log('🚀 Starting Mainnet Wallet and API Key Generation...');
    const walletGen = new WalletGenerator('polygon');
    const wallet = walletGen.generateRandomWallet();
    await walletGen.checkBalance(wallet.address);
    const auth = new PolymarketAuth(wallet, NETWORKS.polygon);
    const credentials = await auth.generateApiCredentials();
    console.log('\n🎉 Mainnet Setup Complete!');
    console.log(`Address: ${wallet.address}`);
    return { wallet, credentials, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in generateMainnetWalletAndKeys';
    console.error('❌ Mainnet generation failed:', errorMessage, error);
    return {
      success: false,
      error: errorMessage,
      wallet: undefined,
      credentials: undefined,
    };
  }
}
