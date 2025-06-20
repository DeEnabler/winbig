
import Redis from 'ioredis';

let redis: Redis.Redis | null = null;
let redisConnectionPromise: Promise<void> | null = null;
let moduleLastError: string | null = null;

// Updated options for faster failure
const REDIS_CONNECT_TIMEOUT = 5000; // 5 seconds
const REDIS_MAX_RETRIES = 2;

function connectToRedis(): Promise<void> {
  if (redis && redis.status === 'ready') {
    console.log(`[Redis Client connectToRedis] Reusing existing ready Redis client. Timestamp: ${new Date().toISOString()}`);
    return Promise.resolve();
  }

  if (redisConnectionPromise) {
    console.log(`[Redis Client connectToRedis] Connection attempt already in progress. Returning existing promise. Timestamp: ${new Date().toISOString()}`);
    return redisConnectionPromise;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    const errorMsg = `[Redis Client] CRITICAL: REDIS_URL environment variable is not set. Cannot connect to Redis. Timestamp: ${new Date().toISOString()}`;
    console.error(errorMsg);
    moduleLastError = errorMsg;
    return Promise.reject(new Error(errorMsg));
  }

  // DEBUG: Log the raw URL to confirm the format from the environment variable.
  console.log(`[Redis Client DEBUG] Attempting to connect with raw REDIS_URL from env: ${redisUrl}`);

  const options: Redis.RedisOptions = {
    connectTimeout: REDIS_CONNECT_TIMEOUT,
    maxRetriesPerRequest: REDIS_MAX_RETRIES,
    enableOfflineQueue: false, // Fail fast if not connected
    lazyConnect: false, // Explicitly connect eagerly
    retryStrategy: (times) => {
      // Exponential backoff, max 1 second.
      const delay = Math.min(times * 200, 1000); 
      console.log(`[Redis Client] Retry strategy: Attempt ${times}, retrying in ${delay}ms. Timestamp: ${new Date().toISOString()}`);
      return delay;
    },
    // ioredis automatically handles TLS if the URL starts with rediss://
  };

  const loggableUrl = redisUrl.includes('@')
    ? `${redisUrl.substring(0, redisUrl.indexOf('//') + 10)}<credentials_hidden>${redisUrl.substring(redisUrl.indexOf('@'))}`
    : redisUrl;

  console.log(`[Redis Client] Configuring new ioredis client. URL (sanitized): ${loggableUrl}, connectTimeout: ${options.connectTimeout}, maxRetries: ${options.maxRetriesPerRequest}, enableOfflineQueue: ${options.enableOfflineQueue}, lazyConnect: ${options.lazyConnect}. Timestamp: ${new Date().toISOString()}`);
  
  const currentConnectionAttemptPromise = new Promise<void>((resolve, reject) => {
    const newRedisInstance = new Redis(redisUrl, options);

    newRedisInstance.on('connect', () => console.log(`[Redis Client] Event: CONNECT command sent to Redis. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`));
    
    newRedisInstance.on('ready', () => {
      console.log(`✅ [Redis Client] Event: Redis client IS READY! URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
      redis = newRedisInstance;
      moduleLastError = null;
      if (redisConnectionPromise === currentConnectionAttemptPromise) {
        redisConnectionPromise = null;
      }
      resolve();
    });

    newRedisInstance.on('error', (err) => {
      const sanitizedErrorMessage = err.message && err.message.includes(redisUrl) ? err.message.replace(redisUrl, loggableUrl) : err.message;
      let specificError = `[Redis Client] Event: Redis connection error: ${sanitizedErrorMessage}. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`;
      
      if (err.message && (err.message.toUpperCase().includes('WRONGPASS') || err.message.toUpperCase().includes('NOAUTH'))) {
          specificError = `[Redis Client] Event: FATAL - Redis authentication failed (WRONGPASS/NOAUTH). Please check your REDIS_URL. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`;
      }
      console.error(specificError, err.stack); 
      moduleLastError = specificError;
      
      if (redisConnectionPromise === currentConnectionAttemptPromise) {
         redisConnectionPromise = null; 
         newRedisInstance.disconnect(); 
         reject(new Error(specificError)); 
      } else {
         console.warn(`[Redis Client] Error event from an older/different Redis instance. Current active promise not rejected by this event. Error: ${specificError}. Timestamp: ${new Date().toISOString()}`);
         newRedisInstance.disconnect();
      }
    });

    newRedisInstance.on('reconnecting', ({delay, attempt}: {delay: number, attempt: number}) => console.log(`[Redis Client] Event: Reconnecting to Redis in ${delay}ms (attempt ${attempt} of ${REDIS_MAX_RETRIES})... URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`));
    
    newRedisInstance.on('end', () => {
      console.log(`[Redis Client] Event: Connection to Redis ENDED. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
      if (redis === newRedisInstance) {
        redis = null; 
      }
    });

    newRedisInstance.on('close', () => {
      console.log(`[Redis Client] Event: Connection to Redis CLOSED. URL (sanitized): ${loggableUrl}. Timestamp: ${new Date().toISOString()}`);
       if (redis === newRedisInstance) {
        redis = null;
       }
    });
  });
  
  redisConnectionPromise = currentConnectionAttemptPromise;
  console.log(`[Redis Client] New ioredis client instance created and connection promise stored. Connection attempt initiated. Timestamp: ${new Date().toISOString()}`);
  return redisConnectionPromise;
}

async function getRedisClient(): Promise<Redis.Redis> {
  const callTime = new Date().toISOString();
  if (!redis || redis.status !== 'ready') {
    const currentStatus = redis ? redis.status : 'null';
    console.log(`[Redis Client getRedisClient @ ${callTime}] Redis client not ready (Status: ${currentStatus}). Ensuring connection...`);
    console.time(`[Redis Client getRedisClient @ ${callTime}] connectToRedisDuration`);
    try {
      await connectToRedis();
    } catch (connectionError) {
      console.error(`[Redis Client getRedisClient @ ${callTime}] Error during connectToRedis await:`, connectionError instanceof Error ? connectionError.message : String(connectionError));
      moduleLastError = connectionError instanceof Error ? connectionError.message : String(connectionError);
      console.timeEnd(`[Redis Client getRedisClient @ ${callTime}] connectToRedisDuration`);
      throw connectionError; 
    }
    console.timeEnd(`[Redis Client getRedisClient @ ${callTime}] connectToRedisDuration`);
  }
  
  if (!redis || redis.status !== 'ready') {
    const criticalErrorMsg = `[Redis Client getRedisClient @ ${callTime}] CRITICAL: Client is not ready or null even after connectToRedis attempt. Status: ${redis?.status}. Last module error: ${moduleLastError}`;
    console.error(criticalErrorMsg);
    throw new Error(moduleLastError || 'Redis client is not connected or ready after connection attempt. Check logs.');
  }
  return redis;
}

export default getRedisClient;
    
export function getRedisStatus() {
  return {
    connected: redis ? redis.status === 'ready' : false,
    status: redis ? redis.status : 'disconnected',
    lastError: moduleLastError,
  };
}
