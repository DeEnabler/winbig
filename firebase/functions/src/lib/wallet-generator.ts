import { ethers } from 'ethers';
import { WalletInfo, NetworkConfig, NETWORKS } from './types';

export class WalletGenerator {
  private provider: ethers.JsonRpcProvider;
  private network: NetworkConfig;

  constructor(networkName: string = 'amoy') {
    this.network = NETWORKS[networkName];
    if (!this.network) {
      throw new Error(`Unsupported network: ${networkName}`);
    }
    
    this.provider = new ethers.JsonRpcProvider(this.network.rpcUrl);
  }

  /**
   * Generate a completely random wallet
   */
  generateRandomWallet(): WalletInfo {
    const wallet = ethers.Wallet.createRandom();
    
    console.log('\n🎲 Generated Random Wallet:');
    console.log(`Address: ${wallet.address}`);
    console.log(`Private Key: ${wallet.privateKey}`);
    if (wallet.mnemonic) {
      console.log(`Mnemonic: ${wallet.mnemonic.phrase}`);
    }

    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase
    };
  }

  /**
   * Generate wallet from mnemonic
   */
  generateFromMnemonic(mnemonic?: string): WalletInfo {
    const actualMnemonic = mnemonic || ethers.Wallet.createRandom().mnemonic?.phrase || '';
    const wallet = ethers.Wallet.fromPhrase(actualMnemonic);
    
    console.log('\n🌱 Generated Wallet from Mnemonic:');
    console.log(`Address: ${wallet.address}`);
    console.log(`Private Key: ${wallet.privateKey}`);
    console.log(`Mnemonic: ${actualMnemonic}`);

    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: actualMnemonic
    };
  }

  /**
   * Check wallet balance
   */
  async checkBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      const balanceInMatic = ethers.formatEther(balance);
      
      console.log(`\n💰 Balance for ${address}:`);
      console.log(`${balanceInMatic} ${this.network.currency}`);
      
      return balanceInMatic;
    } catch (error) {
      console.error('Error checking balance:', error);
      return '0';
    }
  }

  /**
   * Get funding instructions for the wallet
   */
  getFundingInstructions(address: string): void {
    console.log(`\n💡 To fund your wallet on ${this.network.name}:`);
    
    if (this.network.chainId === 80002) { // Amoy testnet
      console.log('1. Visit: https://faucet.polygon.technology/');
      console.log('2. Select "Polygon Amoy" network');
      console.log(`3. Enter your address: ${address}`);
      console.log('4. Complete the captcha and request test MATIC');
      console.log('5. Wait a few minutes for the transaction to confirm');
    } else { // Mainnet
      console.log('1. Buy MATIC on an exchange (Coinbase, Binance, etc.)');
      console.log('2. Withdraw MATIC to Polygon network');
      console.log(`3. Send to your address: ${address}`);
      console.log('4. Or use a bridge from Ethereum mainnet');
    }
    
    console.log(`\n🔍 Track your transaction: ${this.network.blockExplorer}/address/${address}`);
  }

  /**
   * Validate if wallet has sufficient balance (for mainnet)
   */
  async validateBalance(address: string, minBalance: string = '0.1'): Promise<boolean> {
    try {
      const balance = await this.checkBalance(address);
      const hasBalance = parseFloat(balance) >= parseFloat(minBalance);
      
      if (!hasBalance) {
        console.log(`\n⚠️  Insufficient balance. Need at least ${minBalance} ${this.network.currency}`);
        this.getFundingInstructions(address);
      }
      
      return hasBalance;
    } catch (error) {
      console.error('Error validating balance:', error);
      return false;
    }
  }

  /**
   * Get network information
   */
  getNetworkInfo(): NetworkConfig {
    return this.network;
  }
} 