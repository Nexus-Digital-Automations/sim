/**
 * Quick Health Status API Endpoint
 *
 * Provides lightweight health status check for load balancers and basic monitoring.
 * This endpoint is optimized for frequent polling with minimal overhead.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { quickHealthCheck } from '../../../../../../packages/parlant-server'

const logger = createLogger('HealthStatusAPI')

/**
 * GET /api/v1/health/status
 *
 * Returns quick health status (healthy/unhealthy) with minimal overhead
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    // Quick health check without detailed diagnostics
    const isHealthy = await quickHealthCheck()
    const responseTime = performance.now() - startTime

    // Log only errors or if explicitly requested via debug header
    const debugMode = request.headers.get('x-debug-health') === 'true'

    if (!isHealthy || debugMode) {
      logger.info('Health status check', {
        healthy: isHealthy,
        responseTime,
        debugMode,
        userAgent: request.headers.get('user-agent')?.slice(0, 100),
      })
    }

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Math.round(responseTime),
    }

    const httpStatus = isHealthy ? 200 : 503

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'X-Health-Status': response.status,
        'X-Response-Time': `${response.responseTime}ms`,
        // Add headers for monitoring systems
        'X-Service': 'parlant-server',
        'X-Version': '1.0.0',
      },
    })
  } catch (error) {
    const responseTime = performance.now() - startTime

    logger.error('Health status check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        responseTime: Math.round(responseTime),
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Health-Status': 'unhealthy',
          'X-Service': 'parlant-server',
        },
      }
    )
  }
}
