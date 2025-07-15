
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_READ_ONLY_TOKEN;

if (!url || !token) {
  throw new Error('CRITICAL: Redis credentials are not set in environment variables (UPSTASH_REDIS_REST_URL and a TOKEN are required).');
}

// Create a single, module-scoped instance of the Redis client.
// Node.js's module cache will ensure this is a singleton, which is a robust
// way to prevent connection issues in different server environments.
const redis = new Redis({
  url: url,
  token: token,
});

export default redis;
