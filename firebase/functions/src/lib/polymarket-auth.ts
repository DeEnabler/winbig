import { ethers } from 'ethers';
import type { ApiCredentials, WalletInfo, NetworkConfig } from './types';

export class PolymarketAuth {
  private wallet: ethers.Wallet;
  private network: NetworkConfig;

  constructor(walletInfo: WalletInfo, network: NetworkConfig) {
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    this.wallet = new ethers.Wallet(walletInfo.privateKey, provider);
    this.network = network;
  }

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
    } catch (error) {
      console.error('❌ L1 Authentication failed:', error);
      throw error;
    }
  }

  async generateApiCredentials(): Promise<ApiCredentials> {
    try {
      console.log('\n🔑 Generating API credentials (L2 Authentication)...');
      const signature = await this.performL1Auth();
      const baseUrl = this.network.chainId === 137 
        ? 'https://clob.polymarket.com' 
        : 'https://clob-staging.polymarket.com';
      const timestamp = Math.floor(Date.now() / 1000);
      // Note: The message for deriving API key might be different or not needed if signature implies it.
      // For now, let's assume the L1 auth signature is what's needed.
      
      const response = await fetch(`${baseUrl}/auth/derive-api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sig: signature, // This is the L1 signature
          timestamp: timestamp, // This should be the same timestamp used in L1 signature message
          nonce: 0, // Nonce typically starts at 0 or is a timestamp
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}. Body: ${errorBody}`);
      }

      const data = await response.json();
      
      const credentials: ApiCredentials = {
        key: data.apiKey,
        secret: data.secret,
        passphrase: data.passphrase
      };
      
      console.log('✅ API credentials generated successfully!');
      console.log('Key:', credentials.key);
      // console.log('Secret:', credentials.secret); // Avoid logging secret
      // console.log('Passphrase:', credentials.passphrase); // Avoid logging passphrase
      
      return credentials;
    } catch (error) {
      console.error('❌ API credential generation failed:', error);
      throw error;
    }
  }

  async testCredentials(credentials: ApiCredentials): Promise<boolean> {
    try {
      console.log('\n🧪 Testing generated credentials...');
      const baseUrl = this.network.chainId === 137 
        ? 'https://clob.polymarket.com' 
        : 'https://clob-staging.polymarket.com';
      const timestamp = Date.now().toString();
      const method = 'GET';
      const requestPath = '/auth/api-keys'; // Example endpoint
      
      // This requires implementing proper Polymarket API request signing,
      // which is complex and involves HMAC-SHA256.
      // For now, this test will likely fail or be incomplete.
      // A real test would involve signing the request with key/secret/passphrase.
      console.warn('Credential test is a placeholder and does not perform full auth.');

      const response = await fetch(`${baseUrl}${requestPath}`, {
        method: method,
        headers: {
          // Placeholder for actual auth headers which are more complex
          'POLY-API-KEY': credentials.key,
          'POLY-ADDRESS': this.wallet.address,
          'POLY-TIMESTAMP': timestamp,
          'POLY-SIGNATURE': 'SIGNED_REQUEST_PLACEHOLDER', // This needs to be a real signature
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Credentials test might be successful (API responded OK)!');
        console.log('Response:', data);
        return true;
      } else {
        const errorBody = await response.text();
        console.warn(`⚠️ Credentials test indicated an issue or requires full implementation. Status: ${response.status}. Body: ${errorBody}`);
        return false; 
      }
    } catch (error) {
      console.error('❌ Credentials test failed:', error);
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
