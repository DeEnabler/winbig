
import Redis from 'ioredis';

let redis: Redis.Redis | null = null;
let redisConnectionPromise: Promise<void> | null = null;

// Hardcoded credentials REMOVED - will use environment variables

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

  if (!redisUrl) {
    const errorMsg = '[Redis Client] CRITICAL: REDIS_URL environment variable is not set. Cannot connect to Redis.';
    console.error(errorMsg);
    moduleLastError = errorMsg; // Assuming moduleLastError is defined for status checks
    return Promise.reject(new Error(errorMsg));
  }
  
  // ioredis will parse the username (default) and password from the URL
  // if it's in the format: rediss://default:password@host:port
  const options: Redis.RedisOptions = {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    enableOfflineQueue: false, // Crucial for serverless: fail fast if connection is down
    lazyConnect: false, // Connect eagerly
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000); // Max 3 seconds retry delay
      console.log(`[Redis Client] Retry strategy: Attempt ${times}, retrying in ${delay}ms`);
      return delay;
    },
  };

  // TLS is automatically handled by ioredis if URL starts with rediss://
  // No need to explicitly set options.tls = {} if using rediss://

  // Sanitize URL for logging if it contains credentials
  const loggableUrl = redisUrl.includes('@') 
    ? `${redisUrl.substring(0, redisUrl.indexOf('//') + 2)}<credentials_hidden>${redisUrl.substring(redisUrl.indexOf('@'))}`
    : redisUrl;

  console.log(`[Redis Client] Configuring new ioredis client. URL (sanitized): ${loggableUrl}, enableOfflineQueue: ${options.enableOfflineQueue}, lazyConnect: ${options.lazyConnect}`);

  const newRedisInstance = new Redis(redisUrl, options);

  redisConnectionPromise = new Promise((resolve, reject) => {
    newRedisInstance.on('connect', () => console.log(`[Redis Client] Event: CONNECT command sent to Redis. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`));
    newRedisInstance.on('ready', () => {
      console.log(`[Redis Client] Event: Redis client READY. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
      redis = newRedisInstance;
      redisConnectionPromise = null; // Clear promise once connected
      resolve();
    });
    newRedisInstance.on('error', (err) => {
      const sanitizedErrorUrl = err.message && err.message.includes(redisUrl) ? err.message.replace(redisUrl, loggableUrl) : err.message;
      let specificError = `[Redis Client] Event: Redis connection error: ${sanitizedErrorUrl}. URL (sanitized): ${loggableUrl}`;
      if (err.message && (err.message.toUpperCase().includes('WRONGPASS') || err.message.toUpperCase().includes('NOAUTH'))) {
          specificError = `[Redis Client] Event: FATAL - Redis authentication failed (WRONGPASS/NOAUTH). Please check your REDIS_URL. URL (sanitized): ${loggableUrl}`;
      }
      console.error(specificError, err);
      
      // Ensure we only reject if this is the active connection attempt and not yet ready
      if (redisConnectionPromise && newRedisInstance.status !== 'ready') {
         redisConnectionPromise = null; // Clear the promise on definite failure
         newRedisInstance.disconnect(); // Attempt to clean up
         reject(new Error(specificError)); // Reject the promise
      } else if (newRedisInstance.status !== 'ready') {
         // Error on an instance that wasn't the primary promise or after it resolved (e.g., later disconnection)
         console.error("[Redis Client] Error on Redis instance not matching current connection promise or after resolution.");
      }
    });
    newRedisInstance.on('reconnecting', (delay) => console.log(`[Redis Client] Event: Reconnecting to Redis in ${delay}ms... URL (sanitized): ${loggableUrl}`));
    newRedisInstance.on('end', () => {
      console.log(`[Redis Client] Event: Connection to Redis ENDED. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
      if (redis === newRedisInstance) {
        redis = null; // Clear the global instance if it's this one ending
      }
      // Don't clear redisConnectionPromise here if a reconnect might happen via retryStrategy
      // Only clear it on definite success (ready) or definite failure (error handler).
    });
    newRedisInstance.on('close', () => {
      console.log(`[Redis Client] Event: Connection to Redis CLOSED. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
       if (redis === newRedisInstance) {
        redis = null;
       }
       // Similar to 'end', be careful about clearing the promise if retries are configured.
    });
  });
  
  console.log('[Redis Client] New ioredis client instance created. Connection attempt initiated (eagerly as lazyConnect is false).');
  return redisConnectionPromise;
}

// Global variable to track last error message for status checks if needed elsewhere
let moduleLastError: string | null = null; 

async function getRedisClient(): Promise<Redis.Redis> {
  if (!redis || redis.status !== 'ready') {
    console.log(`[Redis Client getRedisClient] Redis client not ready (Status: ${redis?.status || 'null'}). Ensuring connection...`);
    await connectToRedis(); // This will wait for the redisConnectionPromise to resolve or reject
  }
  
  // After awaiting, check status again
  if (!redis || redis.status !== 'ready') {
    console.error('[Redis Client getRedisClient] CRITICAL: Client is not ready or null even after connectToRedis attempt.');
    moduleLastError = 'Redis client is not connected or ready after connection attempt.';
    throw new Error(moduleLastError + ' Check logs for connection errors, especially WRONGPASS/NOAUTH.');
  }
  console.log('[Redis Client getRedisClient] Returning established Redis client.');
  return redis;
}

export default getRedisClient;
    
// Function to get Redis status (optional, for admin/debug pages)
export function getRedisStatus() {
  return {
    connected: redis ? redis.status === 'ready' : false,
    status: redis ? redis.status : 'disconnected',
    lastError: moduleLastError,
    // Potentially add more info like pending commands if enableOfflineQueue were true
  };
}
