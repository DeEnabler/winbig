
import Redis from 'ioredis';

let redis: Redis.Redis | null = null;
let redisConnectionPromise: Promise<void> | null = null;

const PLACEHOLDER_REDIS_URL = "your_redis_url_here";
const UPSTASH_EXAMPLE_URL_PART = "@<your-upstash-url>";

function connectToRedis(): Promise<void> {
  if (redis && redis.status === 'ready') {
    console.log('[Redis Client connectToRedis] Reusing existing ready Redis client.');
    return Promise.resolve();
  }

  if (redisConnectionPromise) {
    console.log('[Redis Client connectToRedis] Connection attempt already in progress. Returning existing promise.');
    return redisConnectionPromise;
  }

  const redisUrl = process.env.REDIS_URL;
  const redisPassword = process.env.REDIS_PASSWORD;

  console.log('[Redis Client connectToRedis] Attempting to initialize new Redis client instance.');

  if (!redisUrl) {
    const errMsg = '[Redis Client] CRITICAL: REDIS_URL environment variable is not set.';
    console.error(errMsg);
    redisConnectionPromise = null; // Clear promise on immediate failure
    return Promise.reject(new Error('Redis connection string (REDIS_URL) is not configured.'));
  }

  if (redisUrl === PLACEHOLDER_REDIS_URL || redisUrl.includes(UPSTASH_EXAMPLE_URL_PART)) {
    const errMsg = `[Redis Client] CRITICAL: REDIS_URL is still set to a placeholder value: "${redisUrl}"`;
    console.error(errMsg);
    redisConnectionPromise = null; // Clear promise on immediate failure
    return Promise.reject(new Error(`Redis is not configured. Please update REDIS_URL in your environment variables.`));
  }

  const options: Redis.RedisOptions = {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000, // 10 seconds
    enableOfflineQueue: false, // Crucial: Fail fast if connection is down
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000); // Cap at 3 seconds
      console.log(`[Redis Client] Retry strategy: Attempt ${times}, retrying in ${delay}ms`);
      return delay;
    },
    // lazyConnect: false, // Explicitly false or remove, ioredis default is eager
  };

  if (redisPassword) {
    options.password = redisPassword;
  }

  if (redisUrl.startsWith('rediss://')) {
    options.tls = {}; // Enable TLS for rediss://
  }
  
  const loggableUrl = redisUrl.includes('@') ? redisUrl.substring(0, redisUrl.indexOf('//') + 2) + '******' + redisUrl.substring(redisUrl.indexOf('@')) : redisUrl;
  console.log(`[Redis Client] Configuring new Redis client. URL (sanitized): ${loggableUrl}, Password Set: ${!!redisPassword}, TLS: ${!!options.tls}, enableOfflineQueue: ${options.enableOfflineQueue}`);

  // Create new instance
  const newRedisInstance = new Redis(redisUrl, options);

  redisConnectionPromise = new Promise((resolve, reject) => {
    newRedisInstance.on('connect', () => console.log(`[Redis Client] Event: CONNECT command sent to Redis for URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`));
    newRedisInstance.on('ready', () => {
      console.log(`[Redis Client] Event: Redis client READY for URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
      redis = newRedisInstance; // Assign to global only when ready
      redisConnectionPromise = null; 
      resolve();
    });
    newRedisInstance.on('error', (err) => {
      const sanitizedErrorUrl = err.message && err.message.includes(redisUrl) ? err.message.replace(redisUrl, loggableUrl) : err.message;
      let specificError = `[Redis Client] Event: Redis connection error: ${sanitizedErrorUrl}. URL (sanitized): ${loggableUrl}`;
      if (err.message && err.message.toUpperCase().includes('WRONGPASS')) {
          specificError = `[Redis Client] Event: FATAL - Redis authentication failed (WRONGPASS). Please check your REDIS_PASSWORD. URL (sanitized): ${loggableUrl}`;
      }
      console.error(specificError, err);
      // Only reject if this promise is still the active one and client not ready
      if (redisConnectionPromise && newRedisInstance.status !== 'ready') {
         redisConnectionPromise = null; 
         newRedisInstance.disconnect(); // Attempt to clean up
         reject(new Error(specificError));
      } else if (newRedisInstance.status !== 'ready') {
         // If promise was already resolved/nulled but client errored before becoming global 'redis'
         console.error("[Redis Client] Error on an instance that wasn't current primary promise, or after promise resolution.");
      }
    });
    newRedisInstance.on('reconnecting', (delay) => console.log(`[Redis Client] Event: Reconnecting to Redis in ${delay}ms... URL (sanitized): ${loggableUrl}`));
    newRedisInstance.on('end', () => {
      console.log(`[Redis Client] Event: Connection to Redis ENDED for URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
      if (redis === newRedisInstance) { // If this was the active global instance
        redis = null; 
      }
      redisConnectionPromise = null; // Always nullify if this instance ends
    });
    newRedisInstance.on('close', () => {
      console.log(`[Redis Client] Event: Connection to Redis CLOSED for URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
       if (redis === newRedisInstance) {
        redis = null;
       }
       redisConnectionPromise = null;
    });
  });

  // Eagerly attempt to connect.
  // The promise handles success/failure.
  newRedisInstance.connect().catch(err => {
    // This catch is for the direct .connect() call.
    // The 'error' event on newRedisInstance will also fire and handle rejection.
    console.error(`[Redis Client] Explicit connect() call failed for ${loggableUrl}:`, err);
    if (redisConnectionPromise && newRedisInstance.status !== 'ready') { // If connection promise still pending & client not ready
        // The 'error' event handler should cover promise rejection.
    }
  });
  
  console.log('[Redis Client] New Redis client instance created. Connection attempt initiated.');
  return redisConnectionPromise;
}


async function getRedisClient(): Promise<Redis.Redis> {
  if (!redis || redis.status !== 'ready') {
    console.log(`[Redis Client getRedisClient] Redis client not ready (Status: ${redis?.status || 'null'}). Ensuring connection...`);
    await connectToRedis(); 
  }
  
  if (!redis || redis.status !== 'ready') {
    console.error('[Redis Client getRedisClient] CRITICAL: Client is not ready or null even after connectToRedis attempt.');
    throw new Error('Redis client is not connected or ready. Check logs for connection errors.');
  }
  console.log('[Redis Client getRedisClient] Returning established Redis client.');
  return redis;
}

export default getRedisClient;
