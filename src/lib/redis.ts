
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_READ_ONLY_TOKEN;

if (!url || !token) {
  throw new Error('CRITICAL: Redis credentials are not set in environment variables (UPSTASH_REDIS_REST_URL and a TOKEN are required).');
}

// Declare a uniquely named global variable to hold the Redis instance.
declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined;
}

// Initialize the client only if it doesn't already exist on the global object.
// This pattern prevents re-initialization during Next.js hot-reloading in development.
if (!globalThis.__redisClient) {
  globalThis.__redisClient = new Redis({
    url: url,
    token: token,
  });
}

const redis = globalThis.__redisClient;

export default redis;
