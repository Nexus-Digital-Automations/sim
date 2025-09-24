/**
 * Monitoring API Endpoint
 *
 * Provides detailed monitoring data for Parlant server operations,
 * including system metrics, agent performance, and usage statistics.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { monitoring } from '../../../../../packages/parlant-server/monitoring'
import { checkRateLimit, createRateLimitResponse } from '../middleware'

const logger = createLogger('MonitoringAPI')

/**
 * GET /api/v1/monitoring
 *
 * Returns comprehensive monitoring dashboard data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    const url = new URL(request.url)
    const view = url.searchParams.get('view') // 'dashboard', 'system', 'agents', 'usage', 'alerts'
    const timeWindow = Number.parseInt(url.searchParams.get('timeWindow') || '60') // minutes for agent metrics
    const period = Number.parseInt(url.searchParams.get('period') || '24') // hours for usage metrics
    const agentId = url.searchParams.get('agentId')

    logger.info('Monitoring request received', {
      view,
      timeWindow,
      period,
      agentId,
      userAgent: request.headers.get('user-agent'),
    })

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'logs')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    let response: any

    switch (view) {
      case 'system':
        response = {
          type: 'system',
          data: await monitoring.system(),
          requestInfo: {
            responseTime: performance.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        }
        break

      case 'agents':
        response = {
          type: 'agents',
          data: await monitoring.agents(timeWindow, agentId || undefined),
          filters: {
            timeWindow,
            agentId: agentId || null,
          },
          requestInfo: {
            responseTime: performance.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        }
        break

      case 'usage':
        response = {
          type: 'usage',
          data: await monitoring.usage(period),
          filters: {
            period,
          },
          requestInfo: {
            responseTime: performance.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        }
        break

      case 'alerts':
        response = {
          type: 'alerts',
          data: await monitoring.alerts(),
          requestInfo: {
            responseTime: performance.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        }
        break
      default:
        response = {
          type: 'dashboard',
          data: await monitoring.dashboard(),
          requestInfo: {
            responseTime: performance.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        }
        break
    }

    logger.info('Monitoring request completed', {
      view: view || 'dashboard',
      duration: performance.now() - startTime,
      dataType: response.type,
    })

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Monitoring-View': response.type,
        'X-Response-Time': `${response.requestInfo.responseTime}ms`,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Monitoring API error', { error, duration })

    return NextResponse.json(
      {
        error: 'Monitoring data unavailable',
        message: error instanceof Error ? error.message : 'Failed to retrieve monitoring data',
        timestamp: new Date().toISOString(),
        duration,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

/**
 * POST /api/v1/monitoring/record
 *
 * Records performance metrics from client or other services
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    logger.info('Monitoring record request received')

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'logs')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    const body = await request.json()
    const { type, value, metadata } = body

    if (!type || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: type and value' },
        { status: 400 }
      )
    }

    // Record different types of metrics
    switch (type) {
      case 'query_time':
        monitoring.recordQuery(value)
        logger.debug('Recorded query time', { value, metadata })
        break

      case 'agent_response_time':
        // Future implementation for agent response time tracking
        logger.debug('Recorded agent response time', { value, metadata })
        break

      case 'tool_execution_time':
        // Future implementation for tool execution time tracking
        logger.debug('Recorded tool execution time', { value, metadata })
        break

      default:
        logger.warn('Unknown metric type', { type, value })
        return NextResponse.json({ error: `Unknown metric type: ${type}` }, { status: 400 })
    }

    const response = {
      success: true,
      recorded: {
        type,
        value,
        timestamp: new Date().toISOString(),
      },
      responseTime: performance.now() - startTime,
    }

    logger.info('Metric recorded successfully', {
      type,
      value,
      duration: response.responseTime,
    })

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Monitoring record API error', { error, duration })

    return NextResponse.json(
      {
        error: 'Failed to record metric',
        message: error instanceof Error ? error.message : 'Recording failed',
        timestamp: new Date().toISOString(),
        duration,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

/**
 * GET /api/v1/monitoring/status
 *
 * Quick status check for monitoring system health
 */
export async function GET_STATUS(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()

  try {
    logger.debug('Monitoring status check requested')

    // Quick system check without full metrics collection
    const alertStatus = await monitoring.alerts()

    const response = {
      status: alertStatus.systemHealth,
      activeAlerts: alertStatus.alerts.length,
      severity: alertStatus.alerts.some((a) => a.severity === 'critical')
        ? 'critical'
        : alertStatus.alerts.some((a) => a.severity === 'warning')
          ? 'warning'
          : 'none',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: performance.now() - startTime,
    }

    const httpStatus =
      response.status === 'critical' ? 503 : response.status === 'degraded' ? 200 : 200

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Monitoring-Status': response.status,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Monitoring status check error', { error, duration })

    return NextResponse.json(
      {
        status: 'unknown',
        error: 'Status check failed',
        timestamp: new Date().toISOString(),
        duration,
      },
      { status: 500 }
    )
  }
}
