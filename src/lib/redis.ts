
import Redis from 'ioredis';

let redis: Redis.Redis | null = null;

function getRedisClient(): Redis.Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.error('[Redis Client] REDIS_URL environment variable is not set.');
      throw new Error('Redis connection string (REDIS_URL) is not configured.');
    }
    try {
      console.log('[Redis Client] Initializing Redis client...');
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 10000, // 10 seconds
        // Enable TLS if your Redis URL is rediss:// and ioredis doesn't do it automatically
        // tls: redisUrl.startsWith('rediss://') ? {} : undefined, // ioredis usually handles this from URL
        lazyConnect: true, // Connects on first command
      });

      redis.on('connect', () => console.log('[Redis Client] Connected to Redis server.'));
      redis.on('error', (err) => {
        console.error('[Redis Client] Redis connection error:', err);
        // Optional: implement more robust error handling or reset 'redis' to null to allow re-connection attempts
        // For now, ioredis will attempt to reconnect based on its internal settings.
      });
      redis.on('reconnecting', () => console.log('[Redis Client] Reconnecting to Redis...'));
      redis.on('end', () => {
        console.log('[Redis Client] Connection to Redis ended.');
        // Consider if resetting redis to null here is always desired,
        // as ioredis might be attempting to reconnect.
        // If it's a persistent end due to config, then yes.
        // redis = null; 
      });
    } catch (e) {
      console.error('[Redis Client] Failed to initialize Redis client:', e);
      throw e;
    }
  }
  return redis;
}

// Export the function that returns the client instance
export default getRedisClient;
