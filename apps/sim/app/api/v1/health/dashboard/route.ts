/**
 * Monitoring Dashboard API Endpoint
 *
 * Provides comprehensive monitoring dashboard data including all health checks,
 * metrics, alerts, and system status for operational visibility.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { parlantHealthChecker } from '../../../../../../packages/parlant-server/health'
import { parlantLoggers } from '../../../../../../packages/parlant-server/logging'
import { monitoring } from '../../../../../../packages/parlant-server/monitoring'
import { checkRateLimit, createRateLimitResponse } from '../../middleware'

const logger = createLogger('MonitoringDashboardAPI')

/**
 * GET /api/v1/health/dashboard
 *
 * Returns comprehensive monitoring dashboard data
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    logger.info('Monitoring dashboard data requested', {
      url: request.url,
      requestId,
      userAgent: request.headers.get('user-agent'),
    })

    // Check rate limit for dashboard endpoint
    const rateLimitResult = await checkRateLimit(request, 'health-dashboard')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Collect all monitoring data in parallel for performance
    const [comprehensiveHealth, systemMetrics, usageMetrics, alertStatus, dashboardData] =
      await Promise.allSettled([
        parlantHealthChecker.checkHealth(),
        monitoring.system(),
        monitoring.usage(24), // Last 24 hours
        monitoring.alerts(),
        monitoring.dashboard(),
      ])

    // Process results and handle failures gracefully
    const healthData =
      comprehensiveHealth.status === 'fulfilled'
        ? comprehensiveHealth.value
        : {
            status: 'unhealthy' as const,
            timestamp: new Date().toISOString(),
            uptime: 0,
            services: {
              database: {
                status: 'unknown',
                timestamp: new Date().toISOString(),
                service: 'database',
                duration: 0,
              },
              parlant: {
                status: 'unknown',
                timestamp: new Date().toISOString(),
                service: 'parlant',
                duration: 0,
              },
              integration: {
                status: 'unknown',
                timestamp: new Date().toISOString(),
                service: 'integration',
                duration: 0,
              },
            },
            metrics: { uptime: 0 },
          }

    const metrics = systemMetrics.status === 'fulfilled' ? systemMetrics.value : undefined

    const usage =
      usageMetrics.status === 'fulfilled'
        ? usageMetrics.value
        : {
            period: { start: new Date().toISOString(), end: new Date().toISOString() },
            agents: { total: 0, active: 0, created: 0 },
            sessions: { total: 0, active: 0, completed: 0, failed: 0 },
            messages: { total: 0, user: 0, agent: 0, system: 0 },
            tools: { totalCalls: 0, uniqueTools: 0, successRate: 100, mostUsed: [] },
          }

    const alerts =
      alertStatus.status === 'fulfilled'
        ? alertStatus.value
        : { alerts: [], systemHealth: 'healthy' as const }

    const dashboard = dashboardData.status === 'fulfilled' ? dashboardData.value : undefined

    // Build comprehensive response
    const response = {
      dashboard: 'parlant-monitoring',
      status: healthData.status,
      timestamp: new Date().toISOString(),
      requestId,
      lastUpdated: metrics?.timestamp || new Date().toISOString(),

      // System Overview
      overview: {
        systemStatus: healthData.status,
        uptime: healthData.uptime,
        systemHealth: alerts.systemHealth,
        activeAlerts: alerts.alerts.length,
        criticalAlerts: alerts.alerts.filter((alert) => alert.severity === 'critical').length,
        services: {
          total: 3,
          healthy: Object.values(healthData.services).filter((s) => s.status === 'healthy').length,
          degraded: Object.values(healthData.services).filter((s) => s.status === 'degraded')
            .length,
          unhealthy: Object.values(healthData.services).filter((s) => s.status === 'unhealthy')
            .length,
        },
      },

      // Service Status Details
      services: {
        database: {
          status: healthData.services.database.status,
          responseTime: healthData.services.database.duration,
          details: healthData.services.database.details || {},
          metrics: metrics
            ? {
                connections: metrics.database.connectionCount,
                activeQueries: metrics.database.activeQueries,
                averageQueryTime: metrics.database.queryTime.average,
                slowQueries: metrics.database.slowQueries,
              }
            : undefined,
        },
        parlant: {
          status: healthData.services.parlant.status,
          responseTime: healthData.services.parlant.duration,
          details: healthData.services.parlant.details || {},
          agents: {
            total: usage.agents.total,
            active: usage.agents.active,
            created: usage.agents.created,
          },
        },
        integration: {
          status: healthData.services.integration.status,
          responseTime: healthData.services.integration.duration,
          details: healthData.services.integration.details || {},
        },
      },

      // Performance Metrics
      performance: {
        system: metrics
          ? {
              memory: {
                heapUsed: metrics.memory.heapUsed,
                heapTotal: metrics.memory.heapTotal,
                heapUsagePercent: (
                  (metrics.memory.heapUsed / metrics.memory.heapTotal) *
                  100
                ).toFixed(2),
                rss: metrics.memory.rss,
                external: metrics.memory.external,
              },
              cpu: metrics.cpu,
              uptime: metrics.uptime,
            }
          : undefined,
        database: metrics
          ? {
              connectionCount: metrics.database.connectionCount,
              queryTimes: metrics.database.queryTime,
              activeQueries: metrics.database.activeQueries,
              slowQueries: metrics.database.slowQueries,
            }
          : undefined,
      },

      // Usage Statistics
      usage: {
        period: usage.period,
        agents: usage.agents,
        sessions: usage.sessions,
        messages: usage.messages,
        tools: usage.tools,
        summary: {
          messagesPerAgent:
            usage.agents.total > 0 ? (usage.messages.total / usage.agents.total).toFixed(1) : '0',
          sessionsPerAgent:
            usage.agents.total > 0 ? (usage.sessions.total / usage.agents.total).toFixed(1) : '0',
          sessionSuccessRate:
            usage.sessions.total > 0
              ? `${((usage.sessions.completed / usage.sessions.total) * 100).toFixed(1)}%`
              : '100%',
        },
      },

      // Alerts and Issues
      monitoring: {
        alerts: alerts.alerts,
        summary: {
          total: alerts.alerts.length,
          critical: alerts.alerts.filter((a) => a.severity === 'critical').length,
          warning: alerts.alerts.filter((a) => a.severity === 'warning').length,
          categories: {
            database: alerts.alerts.filter((a) => a.category === 'database').length,
            memory: alerts.alerts.filter((a) => a.category === 'memory').length,
            agent: alerts.alerts.filter((a) => a.category === 'agent').length,
          },
        },
      },

      // Response Metadata
      meta: {
        requestId,
        responseTime: performance.now() - startTime,
        apiVersion: '1.0',
        dataFreshness: {
          health: 'real-time',
          metrics: 'real-time',
          usage: '24-hour window',
          alerts: 'real-time',
        },
        errors: {
          healthCheck: comprehensiveHealth.status === 'rejected',
          systemMetrics: systemMetrics.status === 'rejected',
          usageMetrics: usageMetrics.status === 'rejected',
          alertCheck: alertStatus.status === 'rejected',
        },
      },
    }

    // Log dashboard access for analytics
    parlantLoggers.monitoring.info(
      'Monitoring dashboard accessed',
      {
        operation: 'dashboard_access',
        duration: response.meta.responseTime,
        systemStatus: response.status,
        alertCount: response.monitoring.alerts.length,
        serviceCount: response.overview.services.total,
        healthyServices: response.overview.services.healthy,
      },
      requestId
    )

    // Set appropriate headers
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': response.status,
      'X-System-Health': alerts.systemHealth,
      'X-Request-Id': requestId,
      'X-Response-Time': `${response.meta.responseTime}ms`,
      'X-Alert-Count': alerts.alerts.length.toString(),
      'X-Services-Healthy': response.overview.services.healthy.toString(),
    }

    return NextResponse.json(response, { status: 200, headers })
  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Monitoring dashboard API error', { error, duration, requestId })
    parlantLoggers.monitoring.error(
      'Dashboard data collection failed',
      {
        operation: 'dashboard_access',
        duration,
        errorType: 'system',
        errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      },
      requestId
    )

    return NextResponse.json(
      {
        dashboard: 'parlant-monitoring',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        requestId,
        error: error instanceof Error ? error.message : 'Dashboard data collection failed',
        meta: {
          requestId,
          responseTime: duration,
          apiVersion: '1.0',
          errors: {
            dashboardFailure: true,
          },
        },
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Health-Status': 'unhealthy',
          'X-Request-Id': requestId,
        },
      }
    )
  }
}

/**
 * GET /api/v1/health/dashboard/summary
 *
 * Returns condensed dashboard summary for lightweight monitoring
 */
export async function GET_SUMMARY(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `dashboard-summary-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    // Lighter rate limiting for summary endpoint
    const rateLimitResult = await checkRateLimit(request, 'health-dashboard-summary')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Get minimal essential data
    const [healthStatus, alertStatus] = await Promise.allSettled([
      parlantHealthChecker.checkHealth(),
      monitoring.alerts(),
    ])

    const health =
      healthStatus.status === 'fulfilled' ? healthStatus.value : { status: 'unhealthy', uptime: 0 }

    const alerts =
      alertStatus.status === 'fulfilled'
        ? alertStatus.value
        : { alerts: [], systemHealth: 'healthy' }

    const response = {
      status: health.status,
      systemHealth: alerts.systemHealth,
      uptime: health.uptime,
      alertCount: alerts.alerts.length,
      criticalAlerts: alerts.alerts.filter((a) => a.severity === 'critical').length,
      timestamp: new Date().toISOString(),
      requestId,
      responseTime: performance.now() - startTime,
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10', // Allow brief caching for summary
        'X-Health-Status': response.status,
        'X-Request-Id': requestId,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        requestId,
        error: error instanceof Error ? error.message : 'Summary generation failed',
        responseTime: duration,
      },
      { status: 500 }
    )
  }
}
