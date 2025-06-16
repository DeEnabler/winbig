
// src/lib/polymarket-sdk/wallet-generator.ts
import { ethers, Wallet as EthersWallet, providers as EthersProviders } from 'ethers'; // Ensure Wallet is aliased if needed
import type { WalletInfo, NetworkConfig } from './types'; // Corrected path and import type
import { NETWORKS } from './types'; // Corrected path

export class WalletGenerator {
  private provider: EthersProviders.JsonRpcProvider;
  private network: NetworkConfig;

  constructor(networkName: 'amoy' | 'polygon' = 'amoy') {
    this.network = NETWORKS[networkName];
    if (!this.network) {
      throw new Error(`Unsupported network: ${networkName}`);
    }
    this.provider = new EthersProviders.JsonRpcProvider(this.network.rpcUrl);
  }

  generateRandomWallet(): WalletInfo {
    const walletInstance = EthersWallet.createRandom();
    console.log('\n🎲 Generated Random Wallet:');
    console.log(`Address: ${walletInstance.address}`);
    // console.log(`Private Key: ${walletInstance.privateKey}`); // Avoid logging PK
    if (walletInstance.mnemonic) {
      // console.log(`Mnemonic: ${walletInstance.mnemonic.phrase}`); // Avoid logging mnemonic
    }
    return {
      address: walletInstance.address,
      privateKey: walletInstance.privateKey,
      mnemonic: walletInstance.mnemonic?.phrase
    };
  }

  createFromPrivateKey(privateKey: string): WalletInfo {
    console.log('🔄 Creating wallet from private key...');
    try {
      const walletInstance = new EthersWallet(privateKey, this.provider);
      console.log('✅ Wallet created from private key');
      console.log(`📍 Address: ${walletInstance.address}`);
      return {
        address: walletInstance.address,
        privateKey: walletInstance.privateKey,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating wallet from PK';
      console.error('❌ Error creating wallet from private key:', errorMessage);
      throw new Error(`Invalid private key: ${errorMessage}`);
    }
  }


  async checkBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      const balanceInMatic = ethers.utils.formatEther(balance);
      console.log(`\n💰 Balance for ${address} on ${this.network.name}: ${balanceInMatic} ${this.network.currency}`);
      return balanceInMatic;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error checking balance';
      console.error('Error checking balance:', errorMessage, error);
      return '0';
    }
  }

  getNetworkInfo(): NetworkConfig {
    return this.network;
  }
}
