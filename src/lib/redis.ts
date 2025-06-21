
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (redis) {
    return redis;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('CRITICAL: Upstash Redis credentials are not set in environment variables (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN).');
  }

  console.log(`[Redis Client] Initializing new @upstash/redis client. URL: ${url}`);
  
  const newRedisInstance = new Redis({
    url: url,
    token: token,
  });

  redis = newRedisInstance;
  return redis;
}

export default getRedisClient;

export function getRedisStatus() {
  // @upstash/redis is connectionless (HTTP), so we can't check status like with ioredis.
  // We can check if the credentials are provided.
  const isConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  return {
    connected: isConfigured, // "Connected" means it's configured and ready to send requests.
    status: isConfigured ? 'configured (http/rest)' : 'not configured',
    lastError: null, // Error handling is per-request, not connection-based.
  };
}
