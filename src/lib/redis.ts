
import { Redis } from '@upstash/redis';

// This is a standard Next.js pattern to prevent re-initializing the Redis client
// on every hot-reload in development, which can exhaust connection pools and
// cause a "Connection closed" error.

declare global {
  // We must use `var` here, not `let` or `const`, to declare a global variable.
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

let redisClient: Redis;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_READ_ONLY_TOKEN;

if (!url || !token) {
  throw new Error('CRITICAL: Redis credentials are not set in environment variables (UPSTASH_REDIS_REST_URL and a TOKEN are required).');
}

if (process.env.NODE_ENV === 'production') {
  // In production, always create a new client.
  redisClient = new Redis({ url, token });
} else {
  // In development, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global.redis) {
    console.log('[Redis Client] Initializing new development client and caching globally.');
    global.redis = new Redis({ url, token });
  }
  redisClient = global.redis;
}

function getRedisClient(): Redis {
  return redisClient;
}

export default getRedisClient;

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
