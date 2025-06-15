import { ethers } from 'ethers';
import { WalletInfo, type NetworkConfig, NETWORKS } from './types';

export class WalletGenerator {
  private network: NetworkConfig;
  private provider: ethers.JsonRpcProvider;

  constructor(networkName: 'polygon' | 'amoy') {
    this.network = NETWORKS[networkName];
    this.provider = new ethers.JsonRpcProvider(this.network.rpcUrl);
  }

  /**
   * Generate a completely random wallet
   */
  generateRandomWallet(): WalletInfo {
    console.log('🎲 Generating random wallet...');
    
    const wallet = ethers.Wallet.createRandom();
    
    const walletInfo: WalletInfo = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase
    };
    
    console.log('✅ Random wallet generated successfully');
    console.log(`📍 Address: ${walletInfo.address}`);
    
    return walletInfo;
  }

  /**
   * Create wallet from existing private key
   */
  createFromPrivateKey(privateKey: string): WalletInfo {
    console.log('🔄 Creating wallet from private key...');
    
    try {
      const wallet = new ethers.Wallet(privateKey);
      
      const walletInfo: WalletInfo = {
        address: wallet.address,
        privateKey: wallet.privateKey
      };
      
      console.log('✅ Wallet created from private key');
      console.log(`📍 Address: ${walletInfo.address}`);
      
      return walletInfo;
    } catch (error) {
      throw new Error(`Invalid private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create wallet from mnemonic
   */
  createFromMnemonic(mnemonic: string, path: string = "m/44'/60'/0'/0/0"): WalletInfo {
    console.log('🔄 Creating wallet from mnemonic...');
    
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic); // Corrected from ethers.Wallet.fromMnemonic
      
      const walletInfo: WalletInfo = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: mnemonic
      };
      
      console.log('✅ Wallet created from mnemonic');
      console.log(`📍 Address: ${walletInfo.address}`);
      
      return walletInfo;
    } catch (error) {
      throw new Error(`Invalid mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check wallet balance
   */
  async checkBalance(address: string): Promise<void> {
    try {
      console.log(`💰 Checking balance for ${address}...`);
      
      const balance = await this.provider.getBalance(address);
      const balanceEth = ethers.formatEther(balance);
      
      console.log(`💰 Balance: ${balanceEth} ${this.network.nativeCurrency.symbol}`);
      
      if (balance === BigInt(0) && this.network.chainId === 137) {
        console.log('⚠️  WARNING: Mainnet wallet has 0 MATIC balance');
        console.log('💡 You need MATIC for gas fees to interact with Polymarket');
        console.log(`🔗 Get MATIC at: ${this.network.explorer}/address/${address}`);
      } else if (balance === BigInt(0)) {
        console.log('ℹ️  Testnet wallet has 0 MATIC (this is normal for testing)');
        console.log(`🔗 Get testnet MATIC at: https://faucet.polygon.technology/`);
      }
      
    } catch (error) {
      console.error('❌ Failed to check balance:', error);
      throw new Error(`Balance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get network information
   */
  getNetworkInfo(): NetworkConfig {
    return this.network;
  }
}
