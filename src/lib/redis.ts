
// src/lib/redis.ts
// This file centralizes the Redis client initialization for the application.
import { Redis } from '@upstash/redis';

// Environment validation
const requiredEnvVars = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required Redis environment variables:', missingVars);
  console.log('Available Redis env vars:', Object.keys(process.env).filter(key => key.includes('REDIS')));
  throw new Error(`Missing required Redis environment variables: ${missingVars.join(', ')}`);
}

// Global singleton pattern for serverless optimization
declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined;
}

if (!globalThis.__redisClient) {
  globalThis.__redisClient = Redis.fromEnv({
    // Production retry configuration with exponential backoff
    retry: {
      retries: 3,
      // Exponential backoff: 50ms, 135ms, 403ms, capped at 2s for faster recovery
      backoff: (retryCount) => Math.min(Math.exp(retryCount) * 50, 2000),
    },
    // Request timeout: 3 seconds for better UX in prediction markets
    signal: () => AbortSignal.timeout(3000),
    // Automatic JSON serialization (default: true)
    automaticDeserialization: true,
  });
}

export const redis = globalThis.__redisClient;

// Redis performance monitoring
interface RedisMetrics {
  operationCount: number;
  errorCount: number;
  totalLatency: number;
  lastError?: string;
  lastErrorTime?: number;
}

const metrics: RedisMetrics = {
  operationCount: 0,
  errorCount: 0,
  totalLatency: 0,
};

// Error handling wrapper for Redis operations with monitoring
export async function safeRedisOperation<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | null> {
  const startTime = Date.now();
  metrics.operationCount++;

  try {
    const result = await operation();
    const latency = Date.now() - startTime;
    metrics.totalLatency += latency;

    // Log slow operations (>1000ms)
    if (latency > 1000) {
      console.warn(`Slow Redis operation detected: ${latency}ms`);
    }

    return result;
  } catch (error) {
    metrics.errorCount++;
    metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
    metrics.lastErrorTime = Date.now();
    
    console.error('Redis operation failed:', error);
    
    // Return fallback value if provided, otherwise null
    return fallback !== undefined ? fallback : null;
  }
}

// Example usage with error handling for prediction market data
export async function getWithFallback<T>(
  key: string, 
  fallback: T
): Promise<T> {
  const result = await safeRedisOperation(
    () => redis.get<T>(key),
    fallback
  );
  return result ?? fallback;
}

// Circuit breaker pattern for resilient Redis operations
let redisHealthy = true;
let lastFailureTime = 0;
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

export async function resilientRedisGet<T>(key: string): Promise<T | null> {
  // Check circuit breaker
  if (!redisHealthy && Date.now() - lastFailureTime < CIRCUIT_BREAKER_TIMEOUT) {
    return null; // Circuit open, skip Redis
  }

  try {
    const result = await redis.get<T>(key);
    redisHealthy = true; // Reset on success
    return result;
  } catch (error) {
    redisHealthy = false;
    lastFailureTime = Date.now();
    console.error('Redis circuit breaker triggered:', error);
    return null;
  }
}

// Health check and monitoring functions
export async function getRedisHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
  metrics: RedisMetrics & { averageLatency: number };
}> {
  const startTime = Date.now();
  
  try {
    await redis.ping();
    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      latency,
      metrics: {
        ...metrics,
        averageLatency: metrics.operationCount > 0 ? metrics.totalLatency / metrics.operationCount : 0,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      metrics: {
        ...metrics,
        averageLatency: metrics.operationCount > 0 ? metrics.totalLatency / metrics.operationCount : 0,
      },
    };
  }
}

// Reset metrics (useful for periodic monitoring)
export function resetRedisMetrics(): void {
  metrics.operationCount = 0;
  metrics.errorCount = 0;
  metrics.totalLatency = 0;
  metrics.lastError = undefined;
  metrics.lastErrorTime = undefined;
}

// Get current circuit breaker status
export function getCircuitBreakerStatus(): {
  healthy: boolean;
  lastFailureTime: number | null;
  timeUntilRetry: number;
} {
  const timeUntilRetry = redisHealthy ? 0 : Math.max(0, CIRCUIT_BREAKER_TIMEOUT - (Date.now() - lastFailureTime));
  
  return {
    healthy: redisHealthy,
    lastFailureTime: redisHealthy ? null : lastFailureTime,
    timeUntilRetry,
  };
}

export default redis;
