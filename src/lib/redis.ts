
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_READ_ONLY_TOKEN;

if (!url || !token) {
  throw new Error('CRITICAL: Redis credentials are not set in environment variables (UPSTASH_REDIS_REST_URL and a TOKEN are required).');
}

// This creates a single, cached instance of the Redis client that is shared across the entire application.
// The Node.js module cache handles the singleton pattern automatically, which is more robust than using a global variable.
const redis = new Redis({ url, token });

export default redis;

/**
 * Checks the configuration status of the Redis client.
 * Since @upstash/redis is connectionless (HTTP-based), this primarily checks if credentials are provided.
 */
export function getRedisStatus() {
  const isConfigured = !!(url && token);
  return {
    // "connected" means it's configured and ready to send requests.
    connected: isConfigured,
    status: isConfigured ? 'configured (http/rest)' : 'not configured',
    // Error handling is per-request, so there's no persistent connection error state.
    lastError: null,
  };
}
