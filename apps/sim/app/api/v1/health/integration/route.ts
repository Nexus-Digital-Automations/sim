/**
 * Integration Health Check API Endpoint
 *
 * Provides comprehensive monitoring of Parlant-Sim integration health,
 * including dependency checks, data flow validation, and integration readiness.
 */

import { integrationHealth } from '@sim/parlant-server/integration-health'
import { parlantLoggers } from '@sim/parlant-server/logging'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { checkRateLimit, createRateLimitResponse } from '../../middleware'

const logger = createLogger('IntegrationHealthAPI')

/**
 * GET /api/v1/health/integration
 *
 * Returns comprehensive Parlant-Sim integration health status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `integration-health-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    logger.info('Integration health check request received', {
      url: request.url,
      requestId,
      userAgent: request.headers.get('user-agent'),
    })

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'health-integration')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    const url = new URL(request.url)
    const component = url.searchParams.get('component') // Filter by specific component
    const comprehensive = url.searchParams.get('comprehensive') === 'true' // Run all checks

    let response: any

    if (comprehensive) {
      // Run comprehensive integration health check
      const comprehensiveResult = await integrationHealth.checkComprehensive()

      response = {
        service: 'integration',
        mode: 'comprehensive',
        status: comprehensiveResult.overallStatus,
        timestamp: comprehensiveResult.timestamp,
        requestId,
        summary: comprehensiveResult.summary,
        components: comprehensiveResult.components,
        recommendations: {
          immediate: comprehensiveResult.summary.criticalIssues,
          suggested: comprehensiveResult.summary.recommendations,
          next_steps: generateNextSteps(comprehensiveResult),
        },
        duration: comprehensiveResult.duration,
      }
    } else if (component) {
      // Check specific component
      let componentResult

      switch (component.toLowerCase()) {
        case 'sim-tables':
        case 'tables':
          componentResult = await integrationHealth.checkSimTables()
          break
        case 'parlant-schema':
        case 'schema':
          componentResult = await integrationHealth.checkParlantSchema()
          break
        case 'workspace-isolation':
        case 'workspace':
          componentResult = await integrationHealth.checkWorkspaceIsolation()
          break
        case 'api-integration':
        case 'api':
          componentResult = await integrationHealth.checkApiIntegration()
          break
        default:
          return NextResponse.json(
            {
              error:
                'Invalid component. Use: sim-tables, parlant-schema, workspace-isolation, or api-integration',
              availableComponents: [
                'sim-tables',
                'parlant-schema',
                'workspace-isolation',
                'api-integration',
              ],
            },
            { status: 400 }
          )
      }

      response = {
        service: 'integration',
        mode: 'component',
        component: component.toLowerCase(),
        status: componentResult.status,
        timestamp: componentResult.timestamp,
        requestId,
        details: componentResult.details,
        recommendations: generateComponentRecommendations(componentResult),
        duration: componentResult.duration,
      }
    } else {
      // Quick integration overview using cached results
      const cachedResults = integrationHealth.getLastResults()

      if (cachedResults.size === 0) {
        // No cached results, run a quick comprehensive check
        const comprehensiveResult = await integrationHealth.checkComprehensive()

        response = {
          service: 'integration',
          mode: 'overview',
          status: comprehensiveResult.overallStatus,
          timestamp: comprehensiveResult.timestamp,
          requestId,
          summary: {
            totalComponents: comprehensiveResult.summary.totalChecks,
            healthy: comprehensiveResult.summary.healthyChecks,
            degraded: comprehensiveResult.summary.degradedChecks,
            unhealthy: comprehensiveResult.summary.unhealthyChecks,
            readinessScore: calculateReadinessScore(comprehensiveResult.summary),
          },
          components: Object.fromEntries(
            Object.entries(comprehensiveResult.components).map(([name, result]) => [
              name,
              {
                status: result.status,
                lastCheck: result.timestamp,
                duration: result.duration,
              },
            ])
          ),
          duration: comprehensiveResult.duration,
        }
      } else {
        // Use cached results for quick overview
        const components = Array.from(cachedResults.entries())
        const statuses = components.map(([_, result]) => result.status)

        const overallStatus = statuses.includes('unhealthy')
          ? 'unhealthy'
          : statuses.includes('degraded')
            ? 'degraded'
            : 'healthy'

        response = {
          service: 'integration',
          mode: 'overview',
          status: overallStatus,
          timestamp: new Date().toISOString(),
          requestId,
          summary: {
            totalComponents: components.length,
            healthy: statuses.filter((s) => s === 'healthy').length,
            degraded: statuses.filter((s) => s === 'degraded').length,
            unhealthy: statuses.filter((s) => s === 'unhealthy').length,
            readinessScore: calculateReadinessScore({
              totalChecks: components.length,
              healthyChecks: statuses.filter((s) => s === 'healthy').length,
              degradedChecks: statuses.filter((s) => s === 'degraded').length,
              unhealthyChecks: statuses.filter((s) => s === 'unhealthy').length,
            }),
          },
          components: Object.fromEntries(
            components.map(([name, result]) => [
              name,
              {
                status: result.status,
                lastCheck: result.timestamp,
                duration: result.duration,
                cached: true,
              },
            ])
          ),
          duration: performance.now() - startTime,
        }
      }
    }

    // Log integration health check
    parlantLoggers.integration.info(
      'Integration health check completed',
      {
        operation: 'integration_health_check',
        mode: response.mode,
        status: response.status,
        duration: response.duration,
        component: component || 'all',
        comprehensive,
      },
      requestId
    )

    // Set HTTP status based on health
    const httpStatus =
      response.status === 'unhealthy' ? 503 : response.status === 'degraded' ? 200 : 200

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': comprehensive
          ? 'no-cache, no-store, must-revalidate'
          : 'private, max-age=60',
        'X-Health-Status': response.status,
        'X-Service': 'integration',
        'X-Request-Id': requestId,
        'X-Response-Time': `${response.duration}ms`,
        'X-Mode': response.mode,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Integration health check API error', { error, duration, requestId })
    parlantLoggers.integration.error(
      'Integration health check failed',
      {
        operation: 'integration_health_check',
        duration,
        errorType: 'system',
        errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      },
      requestId
    )

    return NextResponse.json(
      {
        service: 'integration',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        requestId,
        error: error instanceof Error ? error.message : 'Integration health check failed',
        duration,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Health-Status': 'unhealthy',
          'X-Service': 'integration',
          'X-Request-Id': requestId,
        },
      }
    )
  }
}

/**
 * POST /api/v1/health/integration/reset
 *
 * Reset integration health cache and force fresh checks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `integration-reset-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    logger.info('Integration health cache reset requested', { requestId })

    // Check rate limit for reset action
    const rateLimitResult = await checkRateLimit(request, 'health-integration-action')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Clear cached results
    integrationHealth.clearCache()

    const response = {
      service: 'integration',
      action: 'cache_reset',
      timestamp: new Date().toISOString(),
      requestId,
      message: 'Integration health cache cleared successfully',
      duration: performance.now() - startTime,
    }

    parlantLoggers.integration.info(
      'Integration health cache reset',
      {
        operation: 'integration_cache_reset',
        duration: response.duration,
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
    logger.error('Integration health cache reset API error', { error, duration, requestId })

    return NextResponse.json(
      {
        service: 'integration',
        action: 'cache_reset',
        status: 'failed',
        timestamp: new Date().toISOString(),
        requestId,
        error: error instanceof Error ? error.message : 'Cache reset failed',
        duration,
      },
      { status: 500 }
    )
  }
}

/**
 * Generate next steps based on comprehensive health check
 */
function generateNextSteps(comprehensiveResult: any): string[] {
  const nextSteps: string[] = []

  // Analyze each component and suggest next steps
  Object.entries(comprehensiveResult.components).forEach(([name, result]: [string, any]) => {
    switch (result.status) {
      case 'unhealthy':
        switch (name) {
          case 'sim-table-access':
            nextSteps.push(
              'Verify database connection and ensure core Sim tables (user, workspace, workflow) are accessible'
            )
            break
          case 'parlant-schema':
            nextSteps.push(
              'Run Parlant database migration to create required tables and foreign key constraints'
            )
            break
          case 'workspace-isolation':
            nextSteps.push(
              'Ensure workspace table has proper structure and contains workspace data for multi-tenancy'
            )
            break
          case 'api-integration':
            nextSteps.push(
              'Review API endpoint configuration and environment variables for integration services'
            )
            break
        }
        break
      case 'degraded':
        switch (name) {
          case 'parlant-schema':
            nextSteps.push(
              'Complete Parlant schema setup - some tables or constraints may be missing'
            )
            break
          case 'workspace-isolation':
            nextSteps.push(
              'Verify Parlant-workspace foreign key relationships are properly configured'
            )
            break
        }
        break
    }
  })

  if (nextSteps.length === 0) {
    nextSteps.push('All integration components are healthy - system ready for Parlant operations')
  }

  return nextSteps
}

/**
 * Generate component-specific recommendations
 */
function generateComponentRecommendations(componentResult: any): string[] {
  const recommendations: string[] = []

  if (componentResult.status === 'healthy') {
    recommendations.push(`${componentResult.component} is functioning properly`)
  } else {
    // Add specific recommendations based on component and status
    if (componentResult.details.error) {
      recommendations.push(`Address error: ${componentResult.details.error}`)
    }

    switch (componentResult.component) {
      case 'sim-table-access':
        if (!componentResult.details.coreTablesAccessible) {
          recommendations.push(
            'Ensure database connection is stable and core tables are accessible'
          )
          recommendations.push('Verify database user has proper permissions for table access')
        }
        break
      case 'parlant-schema':
        if (!componentResult.details.schema?.hasRequiredTables) {
          recommendations.push('Run Parlant database migration to create required tables')
        }
        if (!componentResult.details.schema?.foreignKeysConfigured) {
          recommendations.push(
            'Configure foreign key constraints to link Parlant data with Sim workspaces'
          )
        }
        break
    }
  }

  return recommendations
}

/**
 * Calculate integration readiness score (0-100)
 */
function calculateReadinessScore(summary: any): number {
  const total = summary.totalChecks || 1
  const healthy = summary.healthyChecks || 0
  const degraded = summary.degradedChecks || 0

  // Full points for healthy, half points for degraded, no points for unhealthy
  const score = (healthy * 100 + degraded * 50) / total
  return Math.round(score)
}
