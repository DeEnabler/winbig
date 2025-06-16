import { ethers } from 'ethers';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ClobClient } from '@polymarket/clob-client';
import { PolymarketCredentials, WalletInfo, NetworkConfig } from './types';

export class PolymarketAuth {
  private clobClient: ClobClient;
  private wallet: Wallet;
  private network: NetworkConfig;

  constructor(walletInfo: WalletInfo, network: NetworkConfig) {
    // Create provider for the network using ethers v5
    const provider = new JsonRpcProvider(network.rpcUrl);
    
    // Create wallet instance using ethers v5
    this.wallet = new Wallet(walletInfo.privateKey, provider);
    this.network = network;
    
    // Initialize CLOB client
    this.clobClient = new ClobClient(
      network.chainId === 137 ? 'https://clob.polymarket.com' : 'https://clob-staging.polymarket.com',
      network.chainId,
      this.wallet
    );
  }

  /**
   * Perform L1 Authentication (Polygon signature)
   */
  async performL1Auth(): Promise<string> {
    try {
      console.log('\n🔐 Performing L1 Authentication (Polygon signature)...');
      
      // Get the timestamp for the signature
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create the message to sign
      const message = `This message attests that I control the given wallet\n${this.wallet.address}\n${timestamp}`;
      
      console.log('Message to sign:', message);
      
      // Sign the message
      const signature = await this.wallet.signMessage(message);
      
      console.log('✅ L1 Authentication successful');
      console.log('Signature:', signature);
      
      return signature;
    } catch (error) {
      console.error('❌ L1 Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Perform L2 Authentication and generate API credentials
   */
  async generateApiCredentials(): Promise<PolymarketCredentials> {
    try {
      console.log('\n🔑 Generating API credentials (L2 Authentication)...');
      
      // Perform L1 auth first
      await this.performL1Auth();
      
      // Create or derive API credentials
      const apiCreds = await this.clobClient.createOrDeriveApiKey();
      
      console.log('✅ API credentials generated successfully!');
      console.log('Key:', apiCreds.key);
      console.log('Secret:', apiCreds.secret);
      console.log('Passphrase:', apiCreds.passphrase);
      
      return {
        key: apiCreds.key,
        secret: apiCreds.secret,
        passphrase: apiCreds.passphrase
      };
    } catch (error) {
      console.error('❌ API credential generation failed:', error);
      throw error;
    }
  }

  /**
   * Test the generated credentials
   */
  async testCredentials(credentials: PolymarketCredentials): Promise<boolean> {
    try {
      console.log('\n🧪 Testing generated credentials...');
      
             // Create a new client with the credentials
       const testClient = new ClobClient(
         this.network.chainId === 137 ? 'https://clob.polymarket.com' : 'https://clob-staging.polymarket.com',
         this.network.chainId,
         this.wallet,
         {
           key: credentials.key,
           secret: credentials.secret,
           passphrase: credentials.passphrase
         }
       );

      // Try to get user info or balance
      const userInfo = await testClient.getApiKeys();
      console.log('✅ Credentials test successful!');
      console.log('User API Keys:', userInfo);
      
      return true;
    } catch (error) {
      console.error('❌ Credentials test failed:', error);
      return false;
    }
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get network info
   */
  getNetworkInfo(): NetworkConfig {
    return this.network;
  }
} 