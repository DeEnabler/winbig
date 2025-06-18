
// src/lib/polymarket-sdk/credential-manager.ts
// This is a simplified EphemeralCredentialManager suitable for Next.js API routes.
// It focuses on in-memory caching for the lifecycle of the serverless function invocation.

import { generateTestnetWalletAndKeys, generateMainnetWalletAndKeys } from './generate-wallet-and-keys'; // Relative path
import type { AuthResult, PolymarketCredentials, WalletInfo, EphemeralCredentialManagerInterface } from './types'; // Relative path

// --- Module-level cache ---
const CREDENTIAL_EXPIRY_MS = 60 * 60 * 1000; // 1 HOUR cache expiry

interface CachedCredentials {
  authResult: AuthResult;
  expiresAt: number;
  network: 'amoy' | 'polygon';
}

let moduleCachedAmoyCreds: CachedCredentials | null = null;
let moduleCachedPolygonCreds: CachedCredentials | null = null;
let moduleLastError: string | null = null;
let moduleNextRefreshAttemptTime: Date | null = null;
// --- End Module-level cache ---

export class EphemeralCredentialManager implements EphemeralCredentialManagerInterface {
  constructor() {
    // Constructor can be empty or log initialization if needed,
    // as cache variables are now module-level.
    console.log("EphemeralCredentialManager instance created. Cache is module-level.");
  }

  private selectCache(network: 'amoy' | 'polygon'): { get: () => CachedCredentials | null, set: (creds: CachedCredentials | null) => void } {
    if (network === 'polygon') {
      return {
        get: () => moduleCachedPolygonCreds,
        set: (creds) => { moduleCachedPolygonCreds = creds; }
      };
    }
    return {
      get: () => moduleCachedAmoyCreds,
      set: (creds) => { moduleCachedAmoyCreds = creds; }
    };
  }

  async getCredentials(network: 'amoy' | 'polygon' = 'amoy'): Promise<AuthResult> {
    const cache = this.selectCache(network);
    const now = Date.now();
    const currentCached = cache.get();

    if (currentCached && currentCached.expiresAt > now && currentCached.authResult.success) {
      console.log(`✅ Using module-cached Polymarket credentials for ${network}. Expires at: ${new Date(currentCached.expiresAt).toISOString()}`);
      return currentCached.authResult;
    }

    console.log(`🚀 Module cache miss or expired for ${network}. Attempting to generate new Polymarket credentials...`);
    moduleNextRefreshAttemptTime = new Date(now + CREDENTIAL_EXPIRY_MS); // Update module-level variable
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
        moduleLastError = null; // Update module-level variable
        console.log(`✅ Successfully generated and module-cached new Polymarket credentials for ${network}. Expires at: ${new Date(now + CREDENTIAL_EXPIRY_MS).toISOString()}`);
        return newAuthResult;
      } else {
        moduleLastError = newAuthResult.error || 'Unknown error during credential generation.'; // Update module-level variable
        console.error(`❌ Failed to generate credentials for ${network}: ${moduleLastError}`);
        return { success: false, error: moduleLastError, wallet: undefined, credentials: undefined };
      }
    } catch (error) {
      moduleLastError = error instanceof Error ? error.message : 'Unknown exception during credential generation.'; // Update module-level variable
      console.error(`❌ Exception during credential generation for ${network}: ${moduleLastError}`, error);
      return { success: false, error: moduleLastError, wallet: undefined, credentials: undefined };
    }
  }

  async forceRefreshCredentials(network: 'amoy' | 'polygon' = 'amoy'): Promise<void> {
    console.log(`🔄 Forcing refresh of module-cached credentials for ${network}...`);
    const cache = this.selectCache(network);
    cache.set(null); // Invalidate cache
    await this.getCredentials(network); // Regenerate
  }
  
  getCredentialStatus() {
    const amoyCache = moduleCachedAmoyCreds;
    const polygonCache = moduleCachedPolygonCreds;
    
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
      nextRefreshAttempt: moduleNextRefreshAttemptTime,
      currentNetwork,
      error: moduleLastError,
      amoyCacheStatus: amoyCache ? `Module-Cached, expires ${new Date(amoyCache.expiresAt).toLocaleTimeString()}` : 'Not cached',
      polygonCacheStatus: polygonCache ? `Module-Cached, expires ${new Date(polygonCache.expiresAt).toLocaleTimeString()}` : 'Not cached',
    };
  }
}
