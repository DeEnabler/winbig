
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
      // This case should ideally be handled before instantiation,
      // but as a safeguard:
      console.error(`[WalletGenerator] CRITICAL: Unsupported network requested: ${networkName}. Defaulting to Amoy.`);
      this.network = NETWORKS.amoy; 
    }
    
    this.provider = new EthersProviders.JsonRpcProvider({
        url: this.network.rpcUrl,
        timeout: 30000, 
        headers: {
          "User-Agent": "ViralBetApp/1.0" 
        }
      });
    console.log(`[WalletGenerator] Initialized for network: ${this.network.name} with RPC: ${this.network.rpcUrl}`);
  }

  generateRandomWallet(): WalletInfo {
    const walletInstance = EthersWallet.createRandom();
    console.log('[WalletGenerator] Generated Random Wallet:');
    console.log(` Address: ${walletInstance.address}`);
    // console.log(` Private Key: ${walletInstance.privateKey}`); // Avoid logging PK
    // if (walletInstance.mnemonic) {
    //   console.log(` Mnemonic: ${walletInstance.mnemonic.phrase}`); // Avoid logging mnemonic
    // }
    return {
      address: walletInstance.address,
      privateKey: walletInstance.privateKey,
      mnemonic: walletInstance.mnemonic?.phrase
    };
  }

  createFromPrivateKey(privateKey: string): WalletInfo {
    console.log('[WalletGenerator] Attempting to create wallet from private key...');
    if (!privateKey || typeof privateKey !== 'string' || !privateKey.startsWith('0x') || privateKey.length !== 66) {
        const errorMsg = '[WalletGenerator] Invalid private key format provided.';
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    try {
      // Ensure provider is associated with the wallet instance
      const walletInstance = new EthersWallet(privateKey, this.provider);
      console.log('[WalletGenerator] Wallet created successfully from private key.');
      console.log(` Address derived: ${walletInstance.address}`);
      return {
        address: walletInstance.address,
        privateKey: walletInstance.privateKey,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error creating wallet from PK';
      console.error('[WalletGenerator] Error creating wallet from private key:', errorMessage);
      throw new Error(`Invalid private key: ${errorMessage}`);
    }
  }


  async checkBalance(address: string): Promise<string> {
    console.log(`[WalletGenerator] Attempting to check balance for ${address} on ${this.network.name} using RPC: ${this.provider.connection.url}`);
    try {
      const network = await this.provider.getNetwork();
      console.log(`[WalletGenerator] Successfully connected to network: ${network.name} (chainId: ${network.chainId}) for balance check.`);
      
      const balance = await this.provider.getBalance(address);
      const balanceInMatic = ethers.utils.formatEther(balance);
      console.log(`[WalletGenerator] Balance for ${address} on ${this.network.name}: ${balanceInMatic} ${this.network.currency}`);
      return balanceInMatic;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error checking balance';
      console.error(`[WalletGenerator] Error checking balance for ${address} on ${this.network.name}: ${errorMessage}`, error);
      return '0'; 
    }
  }

  getNetworkInfo(): NetworkConfig {
