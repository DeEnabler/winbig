
// src/lib/polymarket-sdk/credential-manager.ts
// This is a simplified EphemeralCredentialManager suitable for Next.js API routes.
// It focuses on in-memory caching for the lifecycle of the serverless function invocation.

import { generateTestnetWalletAndKeys, generateMainnetWalletAndKeys } from './generate-wallet-and-keys'; // Relative path
import type { AuthResult, PolymarketCredentials, WalletInfo, EphemeralCredentialManagerInterface } from './types'; // Relative path

const CREDENTIAL_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes, credentials are short-lived

interface CachedCredentials {
  authResult: AuthResult;
  expiresAt: number;
  network: 'amoy' | 'polygon';
}

export class EphemeralCredentialManager implements EphemeralCredentialManagerInterface {
  private cachedAmoyCreds: CachedCredentials | null = null;
  private cachedPolygonCreds: CachedCredentials | null = null;
  private lastError: string | null = null;
  private nextRefreshAttemptTime: Date | null = null;

  constructor() {
    console.log("EphemeralCredentialManager initialized for Next.js API Route context.");
  }

  private selectCache(network: 'amoy' | 'polygon'): { get: () => CachedCredentials | null, set: (creds: CachedCredentials) => void } {
    if (network === 'polygon') {
      return {
        get: () => this.cachedPolygonCreds,
        set: (creds) => { this.cachedPolygonCreds = creds; }
      };
    }
    return {
      get: () => this.cachedAmoyCreds,
      set: (creds) => { this.cachedAmoyCreds = creds; }
    };
  }

  async getCredentials(network: 'amoy' | 'polygon' = 'amoy'): Promise<AuthResult> {
    const cache = this.selectCache(network);
    const now = Date.now();
    const currentCached = cache.get();

    if (currentCached && currentCached.expiresAt > now && currentCached.authResult.success) {
      console.log(\`✅ Using cached Polymarket credentials for \${network}. Expires at: \${new Date(currentCached.expiresAt).toISOString()}\`);
      return currentCached.authResult;
    }

    console.log(\`🚀 Cache miss or expired for \${network}. Attempting to generate new Polymarket credentials...\`);
    this.nextRefreshAttemptTime = new Date(now + CREDENTIAL_EXPIRY_MS);
    try {
      const newAuthResult = network === 'polygon'
        ? await generateMainnetWalletAndKeys()
        : await generateTestnetWalletAndKeys();

      if (newAuthResult.success && newAuthResult.wallet && newAuthResult.credentials) {
        cache.set({
          authResult: newAuthResult,
          expiresAt: now + CREDENTIAL_EXPIRY_MS,
          network: network,
        });
        this.lastError = null;
        console.log(\`✅ Successfully generated and cached new Polymarket credentials for \${network}. Expires at: \${new Date(now + CREDENTIAL_EXPIRY_MS).toISOString()}\`);
        return newAuthResult;
      } else {
        this.lastError = newAuthResult.error || 'Unknown error during credential generation.';
        console.error(\`❌ Failed to generate credentials for \${network}: \${this.lastError}\`);
        return { success: false, error: this.lastError };
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown exception during credential generation.';
      console.error(\`❌ Exception during credential generation for \${network}: \${this.lastError}\`, error);
      return { success: false, error: this.lastError };
    }
  }

  async forceRefreshCredentials(network: 'amoy' | 'polygon' = 'amoy'): Promise<void> {
    console.log(\`🔄 Forcing refresh of credentials for \${network}...\`);
    const cache = this.selectCache(network);
    cache.set(null as any); // Invalidate cache
    await this.getCredentials(network); // Regenerate
  }
  
  getCredentialStatus() {
    const amoyCache = this.cachedAmoyCreds;
    const polygonCache = this.cachedPolygonCreds;
    
    let isInitialized = false;
    let lastRefreshed: Date | null = null;
    let currentNetwork: string | null = null;

    // Prioritize showing status for polygon if available, then amoy
    const activeCache = polygonCache?.authResult.success ? polygonCache : (amoyCache?.authResult.success ? amoyCache : null);

    if (activeCache) {
        isInitialized = true;
        lastRefreshed = new Date(activeCache.expiresAt - CREDENTIAL_EXPIRY_MS);
        currentNetwork = activeCache.network;
    }

    return {
      isInitialized,
      lastRefreshed,
      nextRefreshAttempt: this.nextRefreshAttemptTime,
      currentNetwork,
      error: this.lastError,
      // You could add more details like wallet address if needed
      amoyCacheStatus: amoyCache ? \`Cached, expires \${new Date(amoyCache.expiresAt).toLocaleTimeString()}\` : 'Not cached',
      polygonCacheStatus: polygonCache ? \`Cached, expires \${new Date(polygonCache.expiresAt).toLocaleTimeString()}\` : 'Not cached',
    };
  }
}
