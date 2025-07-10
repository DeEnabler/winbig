
import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_URL) {
  throw new Error('CRITICAL: Redis credentials are not set in environment variables (UPSTASH_REDIS_REST_URL is required).');
}

// Declare a uniquely named global variable to hold the Redis instance.
declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined;
}

// Initialize the client only if it doesn't already exist on the global object.
// This pattern prevents re-initialization during Next.js hot-reloading in development.
if (!globalThis.__redisClient) {
  globalThis.__redisClient = Redis.fromEnv();
}

const redis = globalThis.__redisClient;

export default redis;
