// src/app/api/health/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { getRedisHealth, getCircuitBreakerStatus } from '@/lib/redis';
import { debugRedisAccess } from '@/lib/marketService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check Redis health
    const redisHealth = await getRedisHealth();
    const circuitBreakerStatus = getCircuitBreakerStatus();
    
    // Test Redis data access
    const dataAccessWorking = await debugRedisAccess();
    
    const totalTime = Date.now() - startTime;
    
    const healthStatus = {
      status: redisHealth.healthy && dataAccessWorking ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        redis: {
          healthy: redisHealth.healthy,
          latency: redisHealth.latency,
          error: redisHealth.error,
          metrics: redisHealth.metrics,
        },
        circuitBreaker: circuitBreakerStatus,
        dataAccess: {
          working: dataAccessWorking,
        },
      },
      responseTime: totalTime,
    };
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(healthStatus, { status: statusCode });
    
  } catch (error) {
    console.error('[Health Check] Critical error:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    }, { status: 500 });
  }
} 