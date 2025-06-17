// src/lib/polymarket-sdk/wallet-generator.ts
import { ethers, Wallet as EthersWallet, providers as EthersProviders } from 'ethers'; // Ensure Wallet is aliased if needed
import type { WalletInfo, NetworkConfig } from './types';
import { NETWORKS } from './types';

export class WalletGenerator {
  private provider: EthersProviders.JsonRpcProvider;
  private network: NetworkConfig;

  constructor(networkName: 'amoy' | 'polygon' = 'amoy') {
    this.network = NETWORKS[networkName];
    if (!this.network) {
      throw new Error(`Unsupported network: ${networkName}`);
    }
    // Explicitly create new provider instance with timeout and headers
    this.provider = new EthersProviders.JsonRpcProvider({
        url: this.network.rpcUrl,
        timeout: 30000, // 30 seconds
        headers: {
          "User-Agent": "ViralBetApp/1.0" // Example User-Agent
        }
      });
    console.log(`WalletGenerator initialized for network: ${this.network.name} with RPC: ${this.network.rpcUrl}`);
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
    console.log(`💰 Attempting to check balance for ${address} on ${this.network.name} using RPC: ${this.provider.connection.url}`);
    try {
      // Attempt to get network to ensure provider is connected before getBalance
      const network = await this.provider.getNetwork();
      console.log(`Successfully connected to network: ${network.name} (chainId: ${network.chainId}) for balance check.`);
      
      const balance = await this.provider.getBalance(address);
      const balanceInMatic = ethers.utils.formatEther(balance);
      console.log(`💰 Balance for ${address} on ${this.network.name}: ${balanceInMatic} ${this.network.currency}`);
      return balanceInMatic;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error checking balance';
      console.error(`Error checking balance for ${address} on ${this.network.name}: ${errorMessage}`, error);
      return '0'; // Fallback to allow other processes to continue
    }
  }

  getNetworkInfo(): NetworkConfig {
    return this.network;
  }
}
