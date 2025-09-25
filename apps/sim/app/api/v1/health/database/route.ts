/**
 * Database Health Check API Endpoint
 *
 * Provides detailed database health monitoring including connection pool status,
 * query performance metrics, and database-specific health indicators.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { healthChecks } from '@sim/parlant-server/health'
import { monitoring } from '@sim/parlant-server/monitoring'
import { checkRateLimit, createRateLimitResponse } from '../../middleware'

const logger = createLogger('DatabaseHealthAPI')

/**
 * GET /api/v1/health/database
 *
 * Returns detailed database health status and performance metrics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    logger.info('Database health check request received', {
      url: request.url,
      userAgent: request.headers.get('user-agent'),
    })

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'health-database')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Get database health and system metrics in parallel
    const [databaseHealth, systemMetrics] = await Promise.allSettled([
      healthChecks.database(),
      monitoring.system(),
    ])

    const response = {
      service: 'database',
      status: databaseHealth.status === 'fulfilled' ? databaseHealth.value.status : 'unhealthy',
      timestamp: new Date().toISOString(),
      details: databaseHealth.status === 'fulfilled' ? databaseHealth.value.details : undefined,
      error:
        databaseHealth.status === 'rejected'
          ? databaseHealth.reason instanceof Error
            ? databaseHealth.reason.message
            : 'Database check failed'
          : undefined,
      metrics:
        systemMetrics.status === 'fulfilled'
          ? {
              database: systemMetrics.value.database,
              responseTime: performance.now() - startTime,
            }
          : undefined,
      duration: performance.now() - startTime,
    }

    // Set HTTP status based on health
    const httpStatus =
      response.status === 'unhealthy' ? 503 : response.status === 'degraded' ? 200 : 200

    logger.info('Database health check completed', {
      status: response.status,
      duration: response.duration,
      httpStatus,
      connectionCount:
        systemMetrics.status === 'fulfilled'
          ? systemMetrics.value.database.connectionCount
          : 'unknown',
    })

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': response.status,
        'X-Service': 'database',
        'X-Response-Time': `${response.duration}ms`,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Database health check API error', { error, duration })

    return NextResponse.json(
      {
        service: 'database',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Database health check failed',
        duration,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Health-Status': 'unhealthy',
          'X-Service': 'database',
        },
      }
    )
  }
}

/**
 * GET /api/v1/health/database?details=true
 *
 * Returns extended database diagnostics including connection pool info,
 * slow queries, and performance statistics
 */
export async function GET_WITH_DETAILS(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const includeDetails = url.searchParams.get('details') === 'true'

  if (!includeDetails) {
    return GET(request)
  }

  const startTime = performance.now()

  try {
    logger.info('Detailed database health check requested')

    // Check rate limit for detailed check
    const rateLimitResult = await checkRateLimit(request, 'health-database-detailed')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Get comprehensive database health and metrics
    const [databaseHealth, systemMetrics, alertStatus] = await Promise.allSettled([
      healthChecks.database(),
      monitoring.system(),
      monitoring.alerts(),
    ])

    const response = {
      service: 'database',
      status: databaseHealth.status === 'fulfilled' ? databaseHealth.value.status : 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        basic: databaseHealth.status === 'fulfilled' ? databaseHealth.value.details : undefined,
        performance:
          systemMetrics.status === 'fulfilled' ? systemMetrics.value.database : undefined,
        alerts:
          alertStatus.status === 'fulfilled'
            ? alertStatus.value.alerts.filter((alert) => alert.category === 'database')
            : [],
        connectionPool:
          systemMetrics.status === 'fulfilled'
            ? {
                active: systemMetrics.value.database.activeQueries,
                total: systemMetrics.value.database.connectionCount,
                utilization:
                  systemMetrics.value.database.connectionCount > 0
                    ? `${((systemMetrics.value.database.activeQueries / systemMetrics.value.database.connectionCount) * 100).toFixed(2)}%`
                    : '0%',
              }
            : undefined,
        queryPerformance:
          systemMetrics.status === 'fulfilled'
            ? {
                averageTime: systemMetrics.value.database.queryTime.average,
                p95: systemMetrics.value.database.queryTime.p95,
                p99: systemMetrics.value.database.queryTime.p99,
                slowQueries: systemMetrics.value.database.slowQueries,
              }
            : undefined,
      },
      diagnostics: {
        lastCheckDuration:
          databaseHealth.status === 'fulfilled' ? databaseHealth.value.duration : undefined,
        apiResponseTime: performance.now() - startTime,
        systemUptime: systemMetrics.status === 'fulfilled' ? systemMetrics.value.uptime : undefined,
      },
      duration: performance.now() - startTime,
    }

    const httpStatus =
      response.status === 'unhealthy' ? 503 : response.status === 'degraded' ? 200 : 200

    logger.info('Detailed database health check completed', {
      status: response.status,
      duration: response.duration,
      alertCount: Array.isArray(response.details.alerts) ? response.details.alerts.length : 0,
    })

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': response.status,
        'X-Service': 'database',
        'X-Details-Mode': 'extended',
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Detailed database health check API error', { error, duration })

    return NextResponse.json(
      {
        service: 'database',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Detailed database health check failed',
        duration,
      },
      { status: 500 }
    )
  }
}
