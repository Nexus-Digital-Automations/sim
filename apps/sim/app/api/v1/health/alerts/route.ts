/**
 * Error Tracking and Alerts API Endpoint
 *
 * Provides access to error tracking data, active alerts, and alert management
 * functionality for comprehensive system monitoring and incident response.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import {
  errorTracker,
  parlantErrorTracker,
} from '@sim/parlant-server/error-tracking'
import { parlantLoggers } from '@sim/parlant-server/logging'
import { checkRateLimit, createRateLimitResponse } from '../../middleware'

const logger = createLogger('AlertsAPI')

/**
 * GET /api/v1/health/alerts
 *
 * Returns active alerts and error tracking information
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `alerts-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    logger.info('Alerts API request received', {
      url: request.url,
      requestId,
      userAgent: request.headers.get('user-agent'),
    })

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'health-alerts')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    const url = new URL(request.url)
    const timeWindow = Number.parseInt(url.searchParams.get('window') || '60', 10) // Default 60 minutes
    const includeResolved = url.searchParams.get('resolved') === 'true'
    const severity = url.searchParams.get('severity') // Filter by severity
    const category = url.searchParams.get('category') // Filter by category

    // Get error statistics
    const errorStats = errorTracker.getStats(timeWindow)

    // Get active alerts
    let alerts = errorTracker.getActiveAlerts()

    // Include resolved alerts if requested
    if (includeResolved) {
      alerts = parlantErrorTracker.getActiveAlerts() // This would get all alerts including resolved
    }

    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter((alert) => alert.severity === severity)
    }

    // Filter by category if specified (based on alert errors)
    if (category) {
      alerts = alerts.filter((alert) => alert.errors.some((error) => error.category === category))
    }

    const response = {
      alerts: {
        active: alerts.length,
        total: includeResolved ? alerts.length : alerts.length,
        list: alerts.map((alert) => ({
          id: alert.id,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          timestamp: alert.timestamp,
          resolved: alert.resolved,
          resolvedAt: alert.resolvedAt,
          acknowledgedAt: alert.acknowledgedAt,
          acknowledgedBy: alert.acknowledgedBy,
          errorCount: alert.errors.length,
          categories: [...new Set(alert.errors.map((e) => e.category))],
          services: [...new Set(alert.errors.map((e) => e.service))],
        })),
      },
      errors: {
        window: `${timeWindow} minutes`,
        statistics: errorStats,
        summary: {
          total: errorStats.total,
          criticalCount: errorStats.byLevel.critical || 0,
          errorCount: errorStats.byLevel.error || 0,
          warningCount: errorStats.byLevel.warning || 0,
          mostActiveCategory:
            Object.entries(errorStats.byCategory).sort(([, a], [, b]) => b - a)[0]?.[0] || 'none',
          mostActiveService:
            Object.entries(errorStats.byService).sort(([, a], [, b]) => b - a)[0]?.[0] || 'none',
        },
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: performance.now() - startTime,
        filters: {
          timeWindow,
          includeResolved,
          severity: severity || 'all',
          category: category || 'all',
        },
      },
    }

    // Log alerts access for audit
    parlantLoggers.monitoring.info(
      'Alerts data accessed',
      {
        operation: 'alerts_access',
        duration: response.meta.responseTime,
        activeAlerts: response.alerts.active,
        errorCount: errorStats.total,
        timeWindow,
      },
      requestId
    )

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Alert-Count': response.alerts.active.toString(),
        'X-Error-Count': errorStats.total.toString(),
        'X-Request-Id': requestId,
        'X-Response-Time': `${response.meta.responseTime}ms`,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Alerts API error', { error, duration, requestId })
    parlantLoggers.monitoring.error(
      'Alerts API request failed',
      {
        operation: 'alerts_access',
        duration,
        errorType: 'system',
        errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      },
      requestId
    )

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Alerts API failed',
        requestId,
        timestamp: new Date().toISOString(),
        duration,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
      }
    )
  }
}

/**
 * POST /api/v1/health/alerts/:alertId/acknowledge
 *
 * Acknowledge an alert
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `alert-ack-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    // Check rate limit for alert actions
    const rateLimitResult = await checkRateLimit(request, 'health-alerts-action')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    const body = await request.json()
    const { alertId, acknowledgedBy, action } = body

    if (!alertId || !acknowledgedBy) {
      return NextResponse.json({ error: 'Missing alertId or acknowledgedBy' }, { status: 400 })
    }

    let success = false
    let actionType = 'acknowledge'

    switch (action) {
      case 'acknowledge':
        success = errorTracker.acknowledgeAlert(alertId, acknowledgedBy)
        break
      case 'resolve':
        success = errorTracker.resolveAlert(alertId)
        actionType = 'resolve'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "acknowledge" or "resolve"' },
          { status: 400 }
        )
    }

    if (!success) {
      return NextResponse.json({ error: 'Alert not found or already processed' }, { status: 404 })
    }

    const response = {
      success: true,
      action: actionType,
      alertId,
      acknowledgedBy: action === 'acknowledge' ? acknowledgedBy : undefined,
      timestamp: new Date().toISOString(),
      requestId,
    }

    // Log alert action
    parlantLoggers.monitoring.info(
      `Alert ${actionType}d`,
      {
        operation: `alert_${actionType}`,
        alertId,
        acknowledgedBy,
        duration: performance.now() - startTime,
      },
      requestId
    )

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Alert action API error', { error, duration, requestId })

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Alert action failed',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/health/alerts/rules
 *
 * Get alert rules configuration
 */
export async function GET_RULES(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `alert-rules-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    logger.info('Alert rules request received', { requestId })

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'health-alerts')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    const rules = parlantErrorTracker.getAlertRules()

    const response = {
      rules: rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
        conditions: rule.conditions,
        actions: {
          log: rule.actions.log,
          notify: rule.actions.notify,
          webhook: rule.actions.webhook ? { url: rule.actions.webhook.url } : undefined,
          email: rule.actions.email
            ? { recipientCount: rule.actions.email.recipients.length }
            : undefined,
        },
        cooldownMinutes: rule.cooldownMinutes,
      })),
      summary: {
        total: rules.length,
        enabled: rules.filter((r) => r.enabled).length,
        disabled: rules.filter((r) => !r.enabled).length,
        withWebhooks: rules.filter((r) => r.actions.webhook).length,
        withEmail: rules.filter((r) => r.actions.email).length,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: performance.now() - startTime,
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
        'X-Request-Id': requestId,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Alert rules API error', { error, duration, requestId })

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Alert rules API failed',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/health/alerts/stats
 *
 * Get error and alert statistics
 */
export async function GET_STATS(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `alert-stats-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'health-alerts')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    const url = new URL(request.url)
    const timeWindow = Number.parseInt(url.searchParams.get('window') || '60', 10)

    const errorStats = errorTracker.getStats(timeWindow)
    const activeAlerts = errorTracker.getActiveAlerts()

    // Calculate alert statistics
    const alertStats = {
      total: activeAlerts.length,
      bySeverity: {
        critical: activeAlerts.filter((a) => a.severity === 'critical').length,
        high: activeAlerts.filter((a) => a.severity === 'high').length,
        medium: activeAlerts.filter((a) => a.severity === 'medium').length,
        low: activeAlerts.filter((a) => a.severity === 'low').length,
      },
      acknowledged: activeAlerts.filter((a) => a.acknowledgedAt).length,
      unacknowledged: activeAlerts.filter((a) => !a.acknowledgedAt).length,
      averageErrorsPerAlert:
        activeAlerts.length > 0
          ? activeAlerts.reduce((sum, alert) => sum + alert.errors.length, 0) / activeAlerts.length
          : 0,
    }

    const response = {
      timeWindow: `${timeWindow} minutes`,
      errors: errorStats,
      alerts: alertStats,
      health: {
        errorRate:
          errorStats.total > 0
            ? (((errorStats.byLevel.error || 0) + (errorStats.byLevel.critical || 0)) /
                errorStats.total) *
              100
            : 0,
        criticalIssues: (errorStats.byLevel.critical || 0) + alertStats.bySeverity.critical,
        status:
          alertStats.bySeverity.critical > 0
            ? 'critical'
            : alertStats.bySeverity.high > 0
              ? 'degraded'
              : 'healthy',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: performance.now() - startTime,
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Request-Id': requestId,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Alert stats API error', { error, duration, requestId })

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Alert stats API failed',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
