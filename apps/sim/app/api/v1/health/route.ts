/**
 * Health Check API Endpoint
 *
 * Provides comprehensive health status for the Parlant server integration
 * including database connectivity, service status, and system metrics.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { healthChecks, parlantHealthChecker } from '../../../../../packages/parlant-server/health'
import { checkRateLimit, createRateLimitResponse } from '../middleware'

const logger = createLogger('HealthAPI')

/**
 * GET /api/v1/health
 *
 * Returns comprehensive health status for all Parlant-related services
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    logger.info('Health check request received', {
      url: request.url,
      userAgent: request.headers.get('user-agent'),
    })

    // Check rate limit for this endpoint
    const rateLimitResult = await checkRateLimit(request, 'logs')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Run comprehensive health check
    const healthStatus = await parlantHealthChecker.checkHealth()

    // Add API-specific metrics
    const apiMetrics = {
      ...healthStatus.metrics,
      api: {
        responseTime: performance.now() - startTime,
        endpoint: '/api/v1/health',
        timestamp: new Date().toISOString(),
      },
    }

    const response = {
      ...healthStatus,
      metrics: apiMetrics,
    }

    // Set appropriate HTTP status based on health
    let httpStatus = 200
    if (healthStatus.status === 'degraded') {
      httpStatus = 200 // Still operational but with warnings
    } else if (healthStatus.status === 'unhealthy') {
      httpStatus = 503 // Service unavailable
    }

    logger.info('Health check completed', {
      status: healthStatus.status,
      duration: performance.now() - startTime,
      httpStatus,
    })

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': healthStatus.status,
        'X-Response-Time': `${apiMetrics.api.responseTime}ms`,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Health check API error', { error, duration })

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
        duration,
        services: {
          database: { status: 'unknown' },
          parlant: { status: 'unknown' },
          integration: { status: 'unknown' },
        },
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Health-Status': 'unhealthy',
        },
      }
    )
  }
}

/**
 * GET /api/v1/health?service=database|parlant|integration
 *
 * Returns health status for a specific service
 */
export async function GET_SERVICE(request: NextRequest, service: string): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    logger.info(`Individual health check request for service: ${service}`)

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'logs-detail')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    let healthCheck
    switch (service.toLowerCase()) {
      case 'database':
        healthCheck = await healthChecks.database()
        break
      case 'parlant':
        healthCheck = await healthChecks.parlant()
        break
      case 'integration':
        healthCheck = await healthChecks.integration()
        break
      case 'quick': {
        const isHealthy = await healthChecks.quick()
        return NextResponse.json({
          status: isHealthy ? 'healthy' : 'unhealthy',
          service: 'database',
          timestamp: new Date().toISOString(),
          duration: performance.now() - startTime,
        })
      }
      default:
        return NextResponse.json(
          { error: 'Invalid service. Use: database, parlant, integration, or quick' },
          { status: 400 }
        )
    }

    const response = {
      ...healthCheck,
      api: {
        responseTime: performance.now() - startTime,
        endpoint: `/api/v1/health?service=${service}`,
        timestamp: new Date().toISOString(),
      },
    }

    const httpStatus = healthCheck.status === 'unhealthy' ? 503 : 200

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': healthCheck.status,
        'X-Service': service,
      },
    })
  } catch (error) {
    logger.error(`Health check error for service ${service}`, { error })

    return NextResponse.json(
      {
        status: 'unhealthy',
        service,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Service health check failed',
        duration: performance.now() - startTime,
      },
      { status: 500 }
    )
  }
}

// Handle query parameter routing
export async function GET_WITH_PARAMS(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const service = url.searchParams.get('service')

  if (service) {
    return GET_SERVICE(request, service)
  }

  return GET(request)
}
