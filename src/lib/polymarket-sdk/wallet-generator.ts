
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
    // Explicitly create new provider instance
    this.provider = new EthersProviders.JsonRpcProvider(this.network.rpcUrl);
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
      // Log the full error object for more details, especially for network errors
      console.error(`Error checking balance for ${address} on ${this.network.name}: ${errorMessage}`, error);
      // It's important to rethrow or handle this appropriately if balance check is critical
      // For now, returning '0' as a fallback to allow other processes to continue if balance isn't strictly needed for them.
      // However, this error (e.g., "could not detect network") signals a deeper issue.
      return '0';
    }
  }

  getNetworkInfo(): NetworkConfig {
    return this.network;
  }
}
