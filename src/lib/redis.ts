
import Redis from 'ioredis';

let redis: Redis.Redis | null = null;
let redisConnectionPromise: Promise<void> | null = null;
let moduleLastError: string | null = null;

// Updated options for faster failure and TLS debugging
const REDIS_CONNECT_TIMEOUT = 10000; // Increased timeout for TLS negotiation
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

  let connectionOptions: Redis.RedisOptions;

  try {
    const parsedUrl = new URL(redisUrl);
    connectionOptions = {
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port, 10),
      password: parsedUrl.password,
      // Per user request, setting explicit TLS options to debug connection
      tls: {
        servername: parsedUrl.hostname,
        rejectUnauthorized: false, // Most likely culprit for handshake issues
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3'
      },
      connectTimeout: REDIS_CONNECT_TIMEOUT,
      maxRetriesPerRequest: REDIS_MAX_RETRIES,
      enableOfflineQueue: false, // Fail fast if not connected
      lazyConnect: false, // Explicitly connect eagerly
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 1000);
        console.log(`[Redis Client] Retry strategy: Attempt ${times}, retrying in ${delay}ms. Timestamp: ${new Date().toISOString()}`);
        return delay;
      },
    };
    console.log(`[Redis Client DEBUG] Connecting with explicit object options. Host: ${connectionOptions.host}, Port: ${connectionOptions.port}, TLS servername: ${connectionOptions.tls?.servername}, rejectUnauthorized: ${connectionOptions.tls?.rejectUnauthorized}`);
  } catch (e) {
      const errorMsg = `[Redis Client] CRITICAL: Invalid REDIS_URL format. Could not parse. URL: ${redisUrl}. Error: ${e instanceof Error ? e.message : String(e)}`;
      console.error(errorMsg);
      moduleLastError = errorMsg;
      return Promise.reject(new Error(errorMsg));
  }
  
  const currentConnectionAttemptPromise = new Promise<void>((resolve, reject) => {
    // Pass the object of options instead of the URL string
    const newRedisInstance = new Redis(connectionOptions);

    newRedisInstance.on('connect', () => console.log(`[Redis Client] Event: CONNECT command sent to Redis. Host: ${connectionOptions.host}. Timestamp: ${new Date().toISOString()}`));
    
    newRedisInstance.on('ready', () => {
      console.log(`✅ [Redis Client] Event: Redis client IS READY! Host: ${connectionOptions.host}. Timestamp: ${new Date().toISOString()}`);
      redis = newRedisInstance;
      moduleLastError = null;
      if (redisConnectionPromise === currentConnectionAttemptPromise) {
        redisConnectionPromise = null;
      }
      resolve();
    });

    newRedisInstance.on('error', (err) => {
      let specificError = `[Redis Client] Event: Redis connection error: ${err.message}. Host: ${connectionOptions.host}. Timestamp: ${new Date().toISOString()}`;
      
      if (err.message && (err.message.toUpperCase().includes('WRONGPASS') || err.message.toUpperCase().includes('NOAUTH'))) {
          specificError = `[Redis Client] Event: FATAL - Redis authentication failed (WRONGPASS/NOAUTH). Please check your REDIS_URL. Host: ${connectionOptions.host}. Timestamp: ${new Date().toISOString()}`;
      } else if (err.message && (err.message.toUpperCase().includes('TLS') || err.message.toUpperCase().includes('SSL') || err.message.toUpperCase().includes('ECONNRESET'))) {
          specificError = `[Redis Client] Event: FATAL - TLS handshake/connection error. Host: ${connectionOptions.host}. Error: ${err.message}. Timestamp: ${new Date().toISOString()}`;
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

    newRedisInstance.on('reconnecting', ({delay, attempt}: {delay: number, attempt: number}) => console.log(`[Redis Client] Event: Reconnecting to Redis in ${delay}ms (attempt ${attempt} of ${REDIS_MAX_RETRIES})... Host: ${connectionOptions.host}. Timestamp: ${new Date().toISOString()}`));
    
    newRedisInstance.on('end', () => {
      console.log(`[Redis Client] Event: Connection to Redis ENDED. Host: ${connectionOptions.host}. Timestamp: ${new Date().toISOString()}`);
      if (redis === newRedisInstance) {
        redis = null; 
      }
    });

    newRedisInstance.on('close', () => {
      console.log(`[Redis Client] Event: Connection to Redis CLOSED. Host: ${connectionOptions.host}. Timestamp: ${new Date().toISOString()}`);
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
