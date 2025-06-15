
'use server';
/**
 * @fileOverview Manages on-demand generation and temporary caching of Polymarket API credentials.
 */
import { generateTestnetWalletAndKeys, generateMainnetWalletAndKeys } from './generate-wallet-and-keys';
import type { ApiCredentials, WalletInfo } from './types';

interface StoredCredentials {
  credentials: ApiCredentials;
  wallet: WalletInfo;
  timestamp: number;
  network: 'testnet' | 'mainnet';
}

export class EphemeralCredentialManager {
  private static instance: EphemeralCredentialManager;
  private storedCredentials: StoredCredentials | null = null;
  private readonly CREDENTIAL_TTL = 30 * 60 * 1000; // 30 minutes
  private isGenerating = false;

  private constructor() {}

  static getInstance(): EphemeralCredentialManager {
    if (!EphemeralCredentialManager.instance) {
      EphemeralCredentialManager.instance = new EphemeralCredentialManager();
    }
    return EphemeralCredentialManager.instance;
  }

  /**
   * Get valid credentials, generating new ones if needed
   */
  async getCredentials(network: 'testnet' | 'mainnet' = 'testnet'): Promise<StoredCredentials> {
    if (this.hasValidCredentials(network)) {
      console.log('✅ Using cached credentials for', network);
      return this.storedCredentials!;
    }

    return await this.generateAndCacheCredentials(network);
  }

  /**
   * Check if current credentials are valid and not expired for the requested network
   */
  private hasValidCredentials(network: 'testnet' | 'mainnet'): boolean {
    if (!this.storedCredentials) {
      console.log('🔄 No cached credentials found');
      return false;
    }

    const now = Date.now();
    const isExpired = (now - this.storedCredentials.timestamp) > this.CREDENTIAL_TTL;
    const isWrongNetwork = this.storedCredentials.network !== network;

    if (isExpired) {
      console.log(`⏰ Cached credentials expired for ${this.storedCredentials.network}. Requested: ${network}`);
      return false;
    }

    if (isWrongNetwork) {
      console.log(`🔄 Network mismatch: cached=${this.storedCredentials.network}, requested=${network}. Will regenerate.`);
      return false;
    }

    return true;
  }

  /**
   * Generate new credentials and cache them temporarily
   */
  private async generateAndCacheCredentials(network: 'testnet' | 'mainnet'): Promise<StoredCredentials> {
    if (this.isGenerating) {
      console.log('⏳ Already generating credentials, waiting...');
      await this.waitForGeneration();
      // After waiting, check if the now available credentials match the requested network
      if (this.hasValidCredentials(network)) {
        return this.storedCredentials!;
      }
      // If not, and we are the ones who waited, we might still need to generate if the completed generation was for a different network.
      // However, the primary generator should handle its requested network type.
      // This recursive call is a safeguard but should ideally not be hit often if the first generator completes for the right network.
      // To avoid potential infinite loops under strange conditions, we add a direct check before recursing.
      if (this.isGenerating) { // Check again in case another thread started one while we waited.
          console.warn('Still generating after wait, potential contention. Returning current cache.');
          return this.storedCredentials!; // Return whatever is there, might be null or wrong network.
      }
      // Fall through to generate if current credentials are still not valid for the network.
    }

    this.isGenerating = true;

    try {
      console.log(`🚀 Generating fresh ${network} credentials...`);

      const result = network === 'mainnet' 
        ? await generateMainnetWalletAndKeys() // Assuming this is for 'polygon'
        : await generateTestnetWalletAndKeys(); // Assuming this is for 'amoy'

      if (!result.success || !result.credentials || !result.wallet) {
        throw new Error(`Credential generation failed: ${result.error || 'Unknown error during key generation'}`);
      }

      this.storedCredentials = {
        credentials: result.credentials,
        wallet: result.wallet,
        timestamp: Date.now(),
        network: network // Store the network for which these creds were generated
      };

      console.log(`✅ Fresh ${network} credentials generated and cached`);
      console.log(`📍 Wallet: ${result.wallet.address}`);
      console.log(`🔑 API Key: ${result.credentials.key.substring(0, 8)}...`);
      console.log(`⏰ TTL: ${this.CREDENTIAL_TTL / 1000 / 60} minutes`);

      return this.storedCredentials;

    } catch (error) {
      console.error(`❌ Failed to generate ${network} credentials:`, error);
      // Clear potentially partially set credentials on failure
      this.storedCredentials = null;
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Wait for ongoing credential generation to complete
   */
  private async waitForGeneration(): Promise<void> {
    while (this.isGenerating) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Force regeneration of credentials (useful for testing or errors)
   */
  async forceRegenerate(network: 'testnet' | 'mainnet' = 'testnet'): Promise<StoredCredentials> {
    console.log(`🔄 Forcing ${network} credential regeneration...`);
    this.storedCredentials = null; // Invalidate cache
    return await this.generateAndCacheCredentials(network);
  }

  /**
   * Get current credential status
   */
  getStatus(): { hasCredentials: boolean; timeRemaining?: number; network?: string } {
    if (!this.storedCredentials) {
      return { hasCredentials: false };
    }

    const now = Date.now();
    const timeRemaining = this.CREDENTIAL_TTL - (now - this.storedCredentials.timestamp);

    return {
      hasCredentials: true,
      timeRemaining: Math.max(0, timeRemaining),
      network: this.storedCredentials.network
    };
  }

  /**
   * Clear cached credentials (useful for testing)
   */
  clearCache(): void {
    console.log('🗑️ Clearing credential cache');
    this.storedCredentials = null;
  }
}
