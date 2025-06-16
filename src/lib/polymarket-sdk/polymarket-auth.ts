
import { Wallet as EthersWallet, providers as EthersProviders } from 'ethers'; // Use ethers v5 components
import { ClobClient } from '@polymarket/clob-client';
import { PolymarketCredentials, WalletInfo, NetworkConfig } from './types';

export class PolymarketAuth {
  private clobClient: ClobClient;
  private wallet: EthersWallet;
  private network: NetworkConfig;

  constructor(walletInfo: WalletInfo, network: NetworkConfig) {
    const provider = new EthersProviders.JsonRpcProvider(network.rpcUrl);
    this.wallet = new EthersWallet(walletInfo.privateKey, provider);
    this.network = network;
    
    this.clobClient = new ClobClient(
      network.clobUrl,
      network.chainId,
      this.wallet
    );
  }

  async performL1Auth(): Promise<string> {
    try {
      console.log('\n🔐 Performing L1 Authentication (Polygon signature)...');
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `This message attests that I control the given wallet\n${this.wallet.address}\n${timestamp}`;
      console.log('Message to sign:', message);
      const signature = await this.wallet.signMessage(message);
      console.log('✅ L1 Authentication successful');
      // console.log('Signature:', signature); // Avoid logging signature
      return signature;
    } catch (error: any) {
      console.error('❌ L1 Authentication failed:', error.message);
      if (error.response?.data) {
        console.error('└──> Polymarket API Response (L1 Auth):', error.response.data);
      }
      throw error;
    }
  }

  async generateApiCredentials(): Promise<PolymarketCredentials> {
    try {
      console.log('\n🔑 Generating API credentials (L2 Authentication)...');
      await this.performL1Auth();
      const apiCreds = await this.clobClient.createOrDeriveApiKey();
      console.log('✅ API credentials generated successfully!');
      // console.log('Key:', apiCreds.key); // Avoid logging key
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

  async testCredentials(credentials: PolymarketCredentials): Promise<boolean> {
    try {
      console.log('\n🧪 Testing generated credentials...');
       const testClient = new ClobClient(
         this.network.clobUrl,
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
      // console.log('User API Keys:', userInfo); // Avoid logging sensitive info
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
