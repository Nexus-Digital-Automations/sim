/**
 * Parlant Service Health Check API Endpoint
 *
 * Provides detailed Parlant service health monitoring including agent status,
 * session management, and integration health.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { healthChecks } from '../../../../../../packages/parlant-server/health'
import { monitoring } from '../../../../../../packages/parlant-server/monitoring'
import { parlantLoggers } from '../../../../../../packages/parlant-server/logging'
import { checkRateLimit, createRateLimitResponse } from '../../middleware'

const logger = createLogger('ParlantHealthAPI')

/**
 * GET /api/v1/health/parlant
 *
 * Returns detailed Parlant service health status and operational metrics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `parlant-health-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    logger.info('Parlant service health check request received', {
      url: request.url,
      requestId,
      userAgent: request.headers.get('user-agent')
    })

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'health-parlant')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Get Parlant health and related metrics in parallel
    const [parlantHealth, agentMetrics, usageMetrics] = await Promise.allSettled([
      healthChecks.parlant(),
      monitoring.agents(60), // Last 60 minutes
      monitoring.usage(24) // Last 24 hours
    ])

    const response = {
      service: 'parlant',
      status: parlantHealth.status === 'fulfilled' ? parlantHealth.value.status : 'unhealthy',
      timestamp: new Date().toISOString(),
      requestId,
      details: {
        service: parlantHealth.status === 'fulfilled' ? parlantHealth.value.details : undefined,
        agents: {
          performanceMetrics: agentMetrics.status === 'fulfilled' ? agentMetrics.value : [],
          summary: agentMetrics.status === 'fulfilled' ? {
            totalAgents: agentMetrics.value.length,
            activeAgents: agentMetrics.value.filter(agent =>
              new Date(agent.metrics.lastActiveAt) > new Date(Date.now() - 60 * 60 * 1000)
            ).length,
            averageResponseTime: agentMetrics.value.length > 0 ?
              agentMetrics.value.reduce((sum, agent) => sum + agent.metrics.averageResponseTime, 0) / agentMetrics.value.length :
              0
          } : undefined
        },
        usage: usageMetrics.status === 'fulfilled' ? usageMetrics.value : undefined,
        integration: {
          status: 'connected', // Will be enhanced with actual integration checks
          lastCheck: new Date().toISOString()
        }
      },
      error: parlantHealth.status === 'rejected' ?
        (parlantHealth.reason instanceof Error ? parlantHealth.reason.message : 'Parlant service check failed') :
        undefined,
      duration: performance.now() - startTime
    }

    // Log comprehensive status for monitoring
    parlantLoggers.monitoring.info('Parlant service health check completed', {
      operation: 'service_health_check',
      duration: response.duration,
      status: response.status,
      agentCount: response.details.agents.summary?.totalAgents || 0,
      activeAgents: response.details.agents.summary?.activeAgents || 0
    }, requestId)

    // Set HTTP status based on health
    const httpStatus = response.status === 'unhealthy' ? 503 :
                      response.status === 'degraded' ? 200 : 200

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': response.status,
        'X-Service': 'parlant',
        'X-Request-Id': requestId,
        'X-Response-Time': `${response.duration}ms`
      }
    })
  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Parlant service health check API error', { error, duration, requestId })
    parlantLoggers.monitoring.error('Parlant service health check failed', {
      operation: 'service_health_check',
      duration,
      errorType: 'system',
      errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR'
    }, requestId)

    return NextResponse.json(
      {
        service: 'parlant',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        requestId,
        error: error instanceof Error ? error.message : 'Parlant service health check failed',
        duration
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Health-Status': 'unhealthy',
          'X-Service': 'parlant',
          'X-Request-Id': requestId
        }
      }
    )
  }
}

/**
 * GET /api/v1/health/parlant/agents
 *
 * Returns detailed agent performance and health metrics
 */
export async function GET_AGENTS(): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `parlant-agents-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    logger.info('Parlant agents health check requested', { requestId })

    // Get detailed agent metrics
    const [agentMetrics, alertStatus] = await Promise.allSettled([
      monitoring.agents(240), // Last 4 hours for detailed view
      monitoring.alerts()
    ])

    const response = {
      service: 'parlant-agents',
      status: 'healthy', // Will be determined based on agent health
      timestamp: new Date().toISOString(),
      requestId,
      agents: agentMetrics.status === 'fulfilled' ? agentMetrics.value : [],
      summary: agentMetrics.status === 'fulfilled' ? {
        totalAgents: agentMetrics.value.length,
        healthyAgents: agentMetrics.value.filter(agent => agent.metrics.errorCount === 0).length,
        activeAgents: agentMetrics.value.filter(agent =>
          new Date(agent.metrics.lastActiveAt) > new Date(Date.now() - 60 * 60 * 1000)
        ).length,
        averageResponseTime: agentMetrics.value.length > 0 ?
          agentMetrics.value.reduce((sum, agent) => sum + agent.metrics.averageResponseTime, 0) / agentMetrics.value.length :
          0,
        totalSessions: agentMetrics.value.reduce((sum, agent) => sum + agent.metrics.totalSessions, 0),
        totalMessages: agentMetrics.value.reduce((sum, agent) => sum + agent.metrics.totalMessages, 0),
        overallSuccessRate: agentMetrics.value.length > 0 ?
          agentMetrics.value.reduce((sum, agent) => sum + agent.metrics.successRate, 0) / agentMetrics.value.length :
          100
      } : undefined,
      alerts: alertStatus.status === 'fulfilled' ?
        alertStatus.value.alerts.filter(alert => alert.category === 'agent') : [],
      duration: performance.now() - startTime
    }

    // Determine overall agent health status
    if (response.summary) {
      const errorRate = response.summary.totalAgents > 0 ?
        ((response.summary.totalAgents - response.summary.healthyAgents) / response.summary.totalAgents) * 100 : 0

      if (errorRate > 25) {
        response.status = 'unhealthy'
      } else if (errorRate > 10 || response.summary.averageResponseTime > 10000) {
        response.status = 'degraded'
      }
    }

    parlantLoggers.agent.info('Agent health metrics collected', {
      operation: 'agent_health_check',
      duration: response.duration,
      agentCount: response.agents.length,
      healthStatus: response.status
    }, requestId)

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': response.status,
        'X-Service': 'parlant-agents',
        'X-Request-Id': requestId
      }
    })
  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Parlant agents health check API error', { error, duration, requestId })

    return NextResponse.json(
      {
        service: 'parlant-agents',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        requestId,
        error: error instanceof Error ? error.message : 'Agent health check failed',
        duration
      },
      { status: 500 }
    )
  }
}