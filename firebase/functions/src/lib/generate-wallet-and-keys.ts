import { WalletGenerator } from './wallet-generator';
import { PolymarketAuth } from './polymarket-auth';
import { type AuthResult, NETWORKS } from './types';

/**
 * Complete workflow for testnet (Amoy)
 */
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
    console.log(`Key: ${credentials.key}`);
    // Avoid logging secret and passphrase
    // console.log(`Secret: ${credentials.secret}`);
    // console.log(`Passphrase: ${credentials.passphrase}`);
    
    return { wallet, credentials, success: true };
    
  } catch (error) {
    return {
      wallet: { address: '', privateKey: '' },
      credentials: { key: '', secret: '', passphrase: '' },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Complete workflow for mainnet (Polygon)
 */
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
    console.log(`Key: ${credentials.key}`);
    // Avoid logging secret and passphrase
    
    return { wallet, credentials, success: true };
    
  } catch (error) {
    return {
      wallet: { address: '', privateKey: '' },
      credentials: { key: '', secret: '', passphrase: '' },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate from existing private key
 */
export async function generateFromExistingKey(privateKey: string, network: 'polygon' | 'amoy' = 'amoy'): Promise<AuthResult> {
  try {
    console.log(`🔄 Using existing private key for ${network} network...`);
    
    const walletGen = new WalletGenerator(network);
    const wallet = walletGen.createFromPrivateKey(privateKey);
    
    console.log(`📍 Wallet Address: ${wallet.address}`);
    await walletGen.checkBalance(wallet.address);
    
    const auth = new PolymarketAuth(wallet, NETWORKS[network]);
    const credentials = await auth.generateApiCredentials();
    
    // Testing credentials might be complex to implement fully here
    // await auth.testCredentials(credentials); 
    
    console.log('\n🎉 Setup Complete with Existing Key!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 WALLET INFO:');
    console.log(`Address: ${wallet.address}`);
    console.log('\n🔑 API CREDENTIALS:');
    console.log(`Key: ${credentials.key}`);
    // Avoid logging secret and passphrase
    
    return {
      wallet,
      credentials,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Generation from existing key failed:', error);
    return {
      wallet: { address: '', privateKey: privateKey },
      credentials: { key: '', secret: '', passphrase: '' },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
