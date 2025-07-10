
import { Redis } from '@upstash/redis';

// The Vercel-Upstash integration provides environment variables that `fromEnv` is designed to parse automatically.
// This is the most robust way to initialize the client in a Vercel environment.
if (!process.env.UPSTASH_REDIS_REST_URL) {
  // This error will be thrown during the build process or at server startup if the variable is missing.
  throw new Error('CRITICAL: UPSTASH_REDIS_REST_URL environment variable is not set.');
}

// Declare a uniquely named global variable to hold the Redis instance.
declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined;
}

// This pattern prevents re-initializing the client during Next.js hot-reloading.
if (!globalThis.__redisClient) {
  // `fromEnv` will correctly handle the connection details provided by Vercel.
  globalThis.__redisClient = Redis.fromEnv();
}

const redis = globalThis.__redisClient;

export default redis;
