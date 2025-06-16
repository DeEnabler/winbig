
import { Wallet, JsonRpcProvider } from 'ethers'; // Standard ethers import, will be v5
import { ClobClient } from '@polymarket/clob-client';
import { PolymarketCredentials, WalletInfo, NetworkConfig } from './types'; // Make sure this path is correct if types.ts is in the same dir

export class PolymarketAuth {
  private clobClient: ClobClient;
  private wallet: Wallet;
  private network: NetworkConfig;

  constructor(walletInfo: WalletInfo, network: NetworkConfig) {
    // Create provider for the network using ethers v5
    const provider = new JsonRpcProvider(network.rpcUrl);
    
    // Create wallet instance using ethers v5
    this.wallet = new Wallet(walletInfo.privateKey, provider); // Provider passed in constructor
    this.network = network;
    
    // Initialize CLOB client
    this.clobClient = new ClobClient(
      network.clobUrl, // Use clobUrl from NetworkConfig
      network.chainId,
      this.wallet // This wallet instance is created from ethers.Wallet (v5)
    );
  }

  /**
   * Perform L1 Authentication (Polygon signature)
   */
  async performL1Auth(): Promise<string> {
    try {
      console.log('\n🔐 Performing L1 Authentication (Polygon signature)...');
      
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `This message attests that I control the given wallet\n${this.wallet.address}\n${timestamp}`;
      
      console.log('Message to sign:', message);
      const signature = await this.wallet.signMessage(message);
      
      console.log('✅ L1 Authentication successful');
      console.log('Signature:', signature);
      return signature;
    } catch (error: any) {
      console.error('❌ L1 Authentication failed:', error.message);
      if (error.response?.data) {
        console.error('└──> Polymarket API Response (L1 Auth):', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Perform L2 Authentication and generate API credentials
   */
  async generateApiCredentials(): Promise<PolymarketCredentials> {
    try {
      console.log('\n🔑 Generating API credentials (L2 Authentication)...');
      
      await this.performL1Auth(); // Ensure L1 auth is done first
      
      const apiCreds = await this.clobClient.createOrDeriveApiKey();
      
      console.log('✅ API credentials generated successfully!');
      console.log('Key:', apiCreds.key);
      // console.log('Secret:', apiCreds.secret); // Avoid logging secret
      // console.log('Passphrase:', apiCreds.passphrase); // Avoid logging passphrase
      
      return {
        key: apiCreds.key,
        secret: apiCreds.secret,
        passphrase: apiCreds.passphrase
      };
    } catch (error: any) {
      console.error('❌ API credential generation failed:', error.message);
      if (error.response?.data) {
        console.error('└──> Polymarket API Response (Credential Gen):', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Test the generated credentials
   */
  async testCredentials(credentials: PolymarketCredentials): Promise<boolean> {
    try {
      console.log('\n🧪 Testing generated credentials...');
      
       const testClient = new ClobClient(
         this.network.clobUrl, // Use clobUrl from NetworkConfig
         this.network.chainId,
         this.wallet,
         {
           key: credentials.key,
           secret: credentials.secret,
           passphrase: credentials.passphrase
         }
       );

      const userInfo = await testClient.getApiKeys();
      console.log('✅ Credentials test successful!');
      console.log('User API Keys:', userInfo);
      return true;
    } catch (error: any) {
      console.error('❌ Credentials test failed:', error.message);
       if (error.response?.data) {
        console.error('└──> Polymarket API Response (Test Creds):', error.response.data);
      }
      return false;
    }
  }

  getWalletAddress(): string {
    return this.wallet.address;
  }

  getNetworkInfo(): NetworkConfig {
    return this.network;
  }
}
