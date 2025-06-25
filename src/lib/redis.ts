
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/**
 * Returns a singleton instance of the Upstash Redis client.
 * This client is configured using environment variables.
 */
function getRedisClient(): Redis {
  if (redis) {
    return redis;
  }

  // --- [DIAGNOSTIC] High-visibility logging for environment variables ---
  console.log("--- [DIAGNOSTIC] REDIS CLIENT INITIALIZATION ---");
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_READ_ONLY_TOKEN;
  
  console.log(`[DIAGNOSTIC] Runtime value for UPSTASH_REDIS_REST_URL: "${url}"`);
  console.log(`[DIAGNOSTIC] Runtime value for UPSTASH_REDIS_REST_TOKEN is: ${token ? '****** (set)' : '!!!!!!!!!! (NOT SET)'}`);
  console.log("-------------------------------------------------");
  // --- End of Diagnostic Logging ---


  if (!url || !token) {
    const errorMessage = 'CRITICAL: Upstash Redis credentials are not set in environment variables (UPSTASH_REDIS_REST_URL and a TOKEN are required).';
    console.error(`[Redis Client] ${errorMessage}`);
    throw new Error(errorMessage);
  }
  
  // This log is useful for confirming the correct configuration is loaded.
  console.log(`[Redis Client] Initializing new @upstash/redis client for URL: ${url.substring(0,25)}...`);
  
  const newRedisInstance = new Redis({
    url: url,
    token: token,
  });

  redis = newRedisInstance;
  return redis;
}

export default getRedisClient;

/**
 * Checks the configuration status of the Redis client.
 * Since @upstash/redis is connectionless (HTTP-based), this primarily checks if credentials are provided.
 */
export function getRedisStatus() {
  const isConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && (process.env.UPSTASH_REDIS_REST_READ_ONLY_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN));
  return {
    // "connected" means it's configured and ready to send requests.
    connected: isConfigured, 
    status: isConfigured ? 'configured (http/rest)' : 'not configured',
    // Error handling is per-request, so there's no persistent connection error state.
    lastError: null, 
  };
}
