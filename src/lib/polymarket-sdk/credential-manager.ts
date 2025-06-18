// src/lib/polymarket-sdk/credential-manager.ts
import { generateTestnetWalletAndKeys, generateMainnetWalletAndKeys } from './generate-wallet-and-keys';
import type { AuthResult, PolymarketCredentials, WalletInfo, EphemeralCredentialManagerInterface, NetworkConfig } from './types';
import { NETWORKS } from './types';
import { WalletGenerator } from './wallet-generator'; // Added for creating WalletInfo from PK

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

export class EphemeralCredentialManager implements EphemeralCredentialManagerInterface {
  constructor() {
    console.log("[EphemeralCredentialManager] Instance created. Module-level cache is active.");
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
    const networkConfig = NETWORKS[network];
    if (!networkConfig) {
        const errorMsg = `[EphemeralCredentialManager] Invalid network specified: ${network}`;
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }

    // 1. Check for pre-configured environment variables
    const envPrefix = network === 'polygon' ? 'NEXT_PUBLIC_POLY_MAINNET' : 'NEXT_PUBLIC_POLY_AMOY';
    const envPk = process.env[`${envPrefix}_WALLET_PK`];
    const envApiKey = process.env[`${envPrefix}_API_KEY`];
    const envApiSecret = process.env[`${envPrefix}_API_SECRET`];
    const envApiPassphrase = process.env[`${envPrefix}_API_PASSPHRASE`];

    if (envPk && envApiKey && envApiSecret && envApiPassphrase) {
      console.log(`[EphemeralCredentialManager] Attempting to use pre-configured credentials from environment variables for ${network}.`);
      try {
        const walletGen = new WalletGenerator(network);
        const walletInfo: WalletInfo = walletGen.createFromPrivateKey(envPk); // This will derive the address
        const credentials: PolymarketCredentials = {
          key: envApiKey,
          secret: envApiSecret,
          passphrase: envApiPassphrase,
        };
        
        const authResult: AuthResult = { wallet: walletInfo, credentials, success: true };
        
        // Populate the module-level cache with these env-var-derived credentials
        const cache = this.selectCache(network);
        const now = Date.now();
        cache.set({
          authResult: authResult,
          expiresAt: now + CREDENTIAL_EXPIRY_MS, // Still use cache expiry for consistency in status checks
          network: network,
        });
        moduleLastError = null;
        console.log(`[EphemeralCredentialManager] Successfully loaded and cached credentials from env for ${network}.`);
        return authResult;

      } catch (e: any) {
        const errorMsg = `[EphemeralCredentialManager] Error using credentials from environment variables for ${network}: ${e.message}. Falling back to generation.`;
        console.error(errorMsg, e);
        // If env vars are provided but invalid, we might not want to fall back,
        // but for robustness in dev, falling back might be desired.
        // For now, we log error and proceed to cache/generation.
        // To prevent fallback, we would return { success: false, error: errorMsg } here.
      }
    }

    // 2. Check module-level cache
    const cache = this.selectCache(network);
    const now = Date.now();
    const currentCached = cache.get();

    if (currentCached && currentCached.expiresAt > now && currentCached.authResult.success) {
      console.log(`[EphemeralCredentialManager] Using module-cached Polymarket credentials for ${network}. Expires at: ${new Date(currentCached.expiresAt).toISOString()}`);
      return currentCached.authResult;
    }

    // 3. Fallback to generation
    console.log(`[EphemeralCredentialManager] Cache miss or expired for ${network} (or env vars not set/invalid). Attempting to generate new Polymarket credentials...`);
    moduleNextRefreshAttemptTime = new Date(now + CREDENTIAL_EXPIRY_MS);
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
        moduleLastError = null;
        console.log(`[EphemeralCredentialManager] Successfully generated and module-cached new Polymarket credentials for ${network}. Expires at: ${new Date(now + CREDENTIAL_EXPIRY_MS).toISOString()}`);
        return newAuthResult;
      } else {
        moduleLastError = newAuthResult.error || 'Unknown error during credential generation.';
        console.error(`[EphemeralCredentialManager] Failed to generate credentials for ${network}: ${moduleLastError}`);
        return { success: false, error: moduleLastError };
      }
    } catch (error) {
      moduleLastError = error instanceof Error ? error.message : 'Unknown exception during credential generation.';
      console.error(`[EphemeralCredentialManager] Exception during credential generation for ${network}: ${moduleLastError}`, error);
      return { success: false, error: moduleLastError };
    }
  }

  async forceRefreshCredentials(network: 'amoy' | 'polygon' = 'amoy'): Promise<void> {
    console.log(`[EphemeralCredentialManager] Forcing refresh of module-cached credentials for ${network}...`);
    const cache = this.selectCache(network);
    cache.set(null); 
    await this.getCredentials(network); 
  }
  
  getCredentialStatus() {
    const amoyCache = moduleCachedAmoyCreds;
    const polygonCache = moduleCachedPolygonCreds;
    
    let isInitialized = false;
    let lastRefreshed: Date | null = null;
    let currentNetworkInUse: string | null = null; // Renamed for clarity

    const activeCache = polygonCache?.authResult.success ? polygonCache : (amoyCache?.authResult.success ? amoyCache : null);

    if (activeCache) {
        isInitialized = true;
        lastRefreshed = new Date(activeCache.expiresAt - CREDENTIAL_EXPIRY_MS);
        currentNetworkInUse = activeCache.network;
    }

    // Check if env vars are set for either network to indicate "initialized" state
    const mainnetEnvSet = process.env.NEXT_PUBLIC_POLY_MAINNET_WALLET_PK && process.env.NEXT_PUBLIC_POLY_MAINNET_API_KEY;
    const amoyEnvSet = process.env.NEXT_PUBLIC_POLY_AMOY_WALLET_PK && process.env.NEXT_PUBLIC_POLY_AMOY_API_KEY;
    const envInitialized = mainnetEnvSet || amoyEnvSet;


    return {
      isInitialized: isInitialized || envInitialized, // Consider initialized if env vars are set
      lastRefreshed,
      nextRefreshAttempt: moduleNextRefreshAttemptTime,
      currentNetworkInUse: currentNetworkInUse || (mainnetEnvSet ? 'polygon (from env)' : (amoyEnvSet ? 'amoy (from env)' : null)),
      error: moduleLastError,
      amoyCacheStatus: amoyCache ? `Module-Cached, expires ${new Date(amoyCache.expiresAt).toLocaleTimeString()}` : 'Not cached',
      polygonCacheStatus: polygonCache ? `Module-Cached, expires ${new Date(polygonCache.expiresAt).toLocaleTimeString()}` : 'Not cached',
      envVarsHint: `Mainnet PK/API_KEY set: ${!!mainnetEnvSet}, Amoy PK/API_KEY set: ${!!amoyEnvSet}`
    };
  }
}