
import { Redis } from '@upstash/redis';

// By attaching the client to the `global` object, we can ensure that it is
// not re-initialized on every hot-reload in development, which can lead to
// errors like "Connection closed" by exhausting connection pools.
// This is a standard Next.js best practice.
declare global {
  // We must use `var` here, not `let` or `const`.
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
  // In production, the module is loaded once, so we can just instantiate the client.
  redisClient = new Redis({ url, token });
} else {
  // In development, we check if the client is already cached on the global object.
  if (!global.redis) {
    console.log('[Redis Client] Initializing new development client and caching globally.');
    global.redis = new Redis({ url, token });
  }
  redisClient = global.redis;
}

// The function to get the client is now just an accessor to the cached instance.
function getRedisClient(): Redis {
  return redisClient;
}

export default getRedisClient;

/**
 * Checks the configuration status of the Redis client.
 * Since @upstash/redis is connectionless (HTTP-based), this primarily checks if credentials are provided.
 */
export function getRedisStatus() {
  const isConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && (process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_READ_ONLY_TOKEN));
  return {
    // "connected" means it's configured and ready to send requests.
    connected: isConfigured,
    status: isConfigured ? 'configured (http/rest)' : 'not configured',
    // Error handling is per-request, so there's no persistent connection error state.
    lastError: null,
  };
}
