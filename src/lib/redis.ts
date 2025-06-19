
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
  const redisPassword = process.env.REDIS_PASSWORD; // Explicitly use REDIS_PASSWORD

  console.log(`[Redis Client connectToRedis] Attempting to initialize. REDIS_URL set: ${!!redisUrl}, REDIS_PASSWORD set: ${!!redisPassword}`);
  if (redisPassword) {
    console.log(`[Redis Client connectToRedis] REDIS_PASSWORD length: ${redisPassword.length}`);
  }


  if (!redisUrl) {
    const errMsg = '[Redis Client] CRITICAL: REDIS_URL environment variable is not set.';
    console.error(errMsg);
    redisConnectionPromise = null;
    return Promise.reject(new Error('Redis connection string (REDIS_URL) is not configured.'));
  }

  if (redisUrl === PLACEHOLDER_REDIS_URL || redisUrl.includes(UPSTASH_EXAMPLE_URL_PART)) {
    const errMsg = `[Redis Client] CRITICAL: REDIS_URL is still set to a placeholder value: "${redisUrl}"`;
    console.error(errMsg);
    redisConnectionPromise = null;
    return Promise.reject(new Error(`Redis is not configured. Please update REDIS_URL in your environment variables.`));
  }
  
  const options: Redis.RedisOptions = {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    enableOfflineQueue: false, 
    lazyConnect: false, 
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000); 
      console.log(`[Redis Client] Retry strategy: Attempt ${times}, retrying in ${delay}ms`);
      return delay;
    },
  };

  if (redisPassword) {
    options.password = redisPassword;
  } else {
    // If password is not found, it might be embedded in the URL for some providers.
    // For Upstash, password is usually separate. Log a warning if not provided.
    console.warn('[Redis Client] REDIS_PASSWORD is not set. Assuming password (if any) is embedded in REDIS_URL or not required.');
  }

  if (redisUrl.startsWith('rediss://')) {
    options.tls = {}; // Enable TLS for rediss://
  }
  
  const loggableUrl = redisUrl.includes('@') ? redisUrl.substring(0, redisUrl.indexOf('//') + 2) + '******' + redisUrl.substring(redisUrl.indexOf('@')) : redisUrl;
  console.log(`[Redis Client] Configuring new ioredis client. URL (sanitized): ${loggableUrl}, Password Set: ${!!redisPassword}, TLS: ${!!options.tls}, enableOfflineQueue: ${options.enableOfflineQueue}, lazyConnect: ${options.lazyConnect}`);

  const newRedisInstance = new Redis(redisUrl, options);

  redisConnectionPromise = new Promise((resolve, reject) => {
    newRedisInstance.on('connect', () => console.log(`[Redis Client] Event: CONNECT command sent to Redis. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`));
    newRedisInstance.on('ready', () => {
      console.log(`[Redis Client] Event: Redis client READY. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
      redis = newRedisInstance;
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
      if (redisConnectionPromise && newRedisInstance.status !== 'ready') {
         redisConnectionPromise = null; 
         newRedisInstance.disconnect();
         reject(new Error(specificError));
      } else if (newRedisInstance.status !== 'ready') {
         console.error("[Redis Client] Error on an instance that wasn't current primary promise, or after promise resolution.");
      }
    });
    newRedisInstance.on('reconnecting', (delay) => console.log(`[Redis Client] Event: Reconnecting to Redis in ${delay}ms... URL (sanitized): ${loggableUrl}`));
    newRedisInstance.on('end', () => {
      console.log(`[Redis Client] Event: Connection to Redis ENDED. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
      if (redis === newRedisInstance) {
        redis = null;
      }
      redisConnectionPromise = null;
    });
    newRedisInstance.on('close', () => {
      console.log(`[Redis Client] Event: Connection to Redis CLOSED. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
       if (redis === newRedisInstance) {
        redis = null;
       }
       redisConnectionPromise = null;
    });
  });
  
  console.log('[Redis Client] New ioredis client instance created. Connection attempt initiated (eagerly as lazyConnect is false).');
  return redisConnectionPromise;
}

async function getRedisClient(): Promise<Redis.Redis> {
  if (!redis || redis.status !== 'ready') {
    console.log(`[Redis Client getRedisClient] Redis client not ready (Status: ${redis?.status || 'null'}). Ensuring connection...`);
    await connectToRedis();
  }
  
  if (!redis || redis.status !== 'ready') {
    console.error('[Redis Client getRedisClient] CRITICAL: Client is not ready or null even after connectToRedis attempt.');
    throw new Error('Redis client is not connected or ready. Check logs for connection errors, especially WRONGPASS.');
  }
  console.log('[Redis Client getRedisClient] Returning established Redis client.');
  return redis;
}

export default getRedisClient;
    