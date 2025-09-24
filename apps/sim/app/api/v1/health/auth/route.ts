/**
 * Authentication System Health Check API Endpoint
 *
 * Provides comprehensive authentication system health monitoring including
 * auth service status, token validation, and integration health.
 */

import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '../../../../../../packages/db'
import { parlantLoggers } from '../../../../../../packages/parlant-server/logging'
import { checkRateLimit, createRateLimitResponse } from '../../middleware'

const logger = createLogger('AuthHealthAPI')

/**
 * Check authentication system component health
 */
async function checkAuthSystemHealth() {
  const startTime = performance.now()

  try {
    // Check user table accessibility (core auth requirement)
    const userTableCheck = await db.execute(sql`
      SELECT COUNT(*) as user_count
      FROM "user"
      LIMIT 1
    `)

    // Check workspace table accessibility (auth context requirement)
    const workspaceTableCheck = await db.execute(sql`
      SELECT COUNT(*) as workspace_count
      FROM "workspace"
      LIMIT 1
    `)

    // Check session-related tables if they exist
    const sessionChecks = await Promise.allSettled([
      db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_name = 'session'
      `),
      db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_name = 'account'
      `),
      db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_name = 'verification_token'
      `),
    ])

    const duration = performance.now() - startTime

    return {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      service: 'auth',
      details: {
        userTable: {
          accessible: true,
          recordCount: Number.parseInt((userTableCheck[0] as any)?.user_count || '0'),
        },
        workspaceTable: {
          accessible: true,
          recordCount: Number.parseInt((workspaceTableCheck[0] as any)?.workspace_count || '0'),
        },
        authTables: {
          sessionTable:
            sessionChecks[0].status === 'fulfilled' &&
            Number.parseInt((sessionChecks[0].value as any)[0]?.count || '0') > 0,
          accountTable:
            sessionChecks[1].status === 'fulfilled' &&
            Number.parseInt((sessionChecks[1].value as any)[0]?.count || '0') > 0,
          verificationTable:
            sessionChecks[2].status === 'fulfilled' &&
            Number.parseInt((sessionChecks[2].value as any)[0]?.count || '0') > 0,
        },
        connectivity: {
          databaseConnection: true,
          queryResponseTime: duration,
        },
      },
      duration,
    }
  } catch (error) {
    const duration = performance.now() - startTime

    return {
      status: 'unhealthy' as const,
      timestamp: new Date().toISOString(),
      service: 'auth',
      error: error instanceof Error ? error.message : 'Auth system check failed',
      details: {
        connectivity: {
          databaseConnection: false,
          queryResponseTime: duration,
        },
      },
      duration,
    }
  }
}

/**
 * Check OAuth integration health
 */
async function checkOAuthIntegrationHealth() {
  const startTime = performance.now()

  try {
    // Check if OAuth-related environment variables are configured
    const oauthConfig = {
      stripeConfigured: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      nextAuthConfigured: !!(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL),
      githubConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    }

    // Check OAuth token table accessibility if it exists
    const oauthTableCheck = await Promise.allSettled([
      db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_name LIKE '%oauth%' OR table_name LIKE '%token%'
      `),
    ])

    const duration = performance.now() - startTime

    return {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      service: 'oauth',
      details: {
        providers: oauthConfig,
        tables: {
          oauthTablesFound:
            oauthTableCheck[0].status === 'fulfilled'
              ? Number.parseInt((oauthTableCheck[0].value as any)[0]?.count || '0')
              : 0,
        },
        configuration: {
          totalProvidersConfigured: Object.values(oauthConfig).filter(Boolean).length,
          missingConfigs: Object.entries(oauthConfig)
            .filter(([_, configured]) => !configured)
            .map(([provider, _]) => provider),
        },
      },
      duration,
    }
  } catch (error) {
    const duration = performance.now() - startTime

    return {
      status: 'degraded' as const,
      timestamp: new Date().toISOString(),
      service: 'oauth',
      error: error instanceof Error ? error.message : 'OAuth integration check failed',
      duration,
    }
  }
}

/**
 * GET /api/v1/health/auth
 *
 * Returns comprehensive authentication system health status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `auth-health-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    logger.info('Authentication system health check requested', {
      url: request.url,
      requestId,
      userAgent: request.headers.get('user-agent'),
    })

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, 'health-auth')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Run auth system checks in parallel
    const [authSystemHealth, oauthHealth] = await Promise.allSettled([
      checkAuthSystemHealth(),
      checkOAuthIntegrationHealth(),
    ])

    const authResult =
      authSystemHealth.status === 'fulfilled'
        ? authSystemHealth.value
        : {
            status: 'unhealthy' as const,
            service: 'auth',
            error: 'Auth system check failed',
            timestamp: new Date().toISOString(),
            duration: 0,
          }

    const oauthResult =
      oauthHealth.status === 'fulfilled'
        ? oauthHealth.value
        : {
            status: 'degraded' as const,
            service: 'oauth',
            error: 'OAuth check failed',
            timestamp: new Date().toISOString(),
            duration: 0,
          }

    // Determine overall auth health
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (authResult.status === 'unhealthy') {
      overallStatus = 'unhealthy'
    } else if (
      authResult.status === 'degraded' ||
      oauthResult.status === 'degraded' ||
      oauthResult.status === 'unhealthy'
    ) {
      overallStatus = 'degraded'
    }

    const response = {
      service: 'auth',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      requestId,
      components: {
        authSystem: authResult,
        oauthIntegration: oauthResult,
      },
      summary: {
        coreAuthFunctional: authResult.status !== 'unhealthy',
        oauthIntegrationHealthy: oauthResult.status === 'healthy',
        totalProviders: oauthResult.details?.configuration?.totalProvidersConfigured || 0,
        userTableAccessible: authResult.details?.userTable?.accessible || false,
        workspaceTableAccessible: authResult.details?.workspaceTable?.accessible || false,
      },
      duration: performance.now() - startTime,
    }

    // Log comprehensive auth health status
    parlantLoggers.auth.info(
      'Authentication system health check completed',
      {
        operation: 'auth_health_check',
        duration: response.duration,
        status: overallStatus,
        coreAuthStatus: authResult.status,
        oauthStatus: oauthResult.status,
        providersConfigured: response.summary.totalProviders,
      },
      requestId
    )

    // Set HTTP status based on health
    const httpStatus =
      overallStatus === 'unhealthy' ? 503 : overallStatus === 'degraded' ? 200 : 200

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': overallStatus,
        'X-Service': 'auth',
        'X-Request-Id': requestId,
        'X-Response-Time': `${response.duration}ms`,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime

    logger.error('Authentication health check API error', { error, duration, requestId })
    parlantLoggers.auth.error(
      'Authentication health check failed',
      {
        operation: 'auth_health_check',
        duration,
        errorType: 'system',
        errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      },
      requestId
    )

    return NextResponse.json(
      {
        service: 'auth',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        requestId,
        error: error instanceof Error ? error.message : 'Authentication health check failed',
        duration,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Health-Status': 'unhealthy',
          'X-Service': 'auth',
          'X-Request-Id': requestId,
        },
      }
    )
  }
}

/**
 * GET /api/v1/health/auth/validate
 *
 * Validates authentication functionality with test operations
 */
export async function GET_VALIDATE(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now()
  const requestId = `auth-validate-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

  try {
    logger.info('Authentication validation check requested', { requestId })

    // Rate limit validation endpoint more strictly
    const rateLimitResult = await checkRateLimit(request, 'health-auth-validate')
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Perform validation tests
    const validationResults = {
      userLookup: false,
      workspaceAccess: false,
      sessionSupport: false,
    }

    try {
      // Test user table query
      await db.execute(sql`SELECT id FROM "user" LIMIT 1`)
      validationResults.userLookup = true
    } catch (error) {
      logger.warn('User lookup validation failed', { error })
    }

    try {
      // Test workspace access
      await db.execute(sql`SELECT id FROM "workspace" LIMIT 1`)
      validationResults.workspaceAccess = true
    } catch (error) {
      logger.warn('Workspace access validation failed', { error })
    }

    try {
      // Test session table if it exists
      const sessionTableExists = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_name = 'session'
      `)
      validationResults.sessionSupport =
        Number.parseInt((sessionTableExists[0] as any)?.count || '0') > 0
    } catch (error) {
      logger.warn('Session support validation failed', { error })
    }

    const validationCount = Object.values(validationResults).filter(Boolean).length
    const totalTests = Object.keys(validationResults).length

    const status =
      validationCount === totalTests
        ? 'healthy'
        : validationCount >= totalTests / 2
          ? 'degraded'
          : 'unhealthy'

    const response = {
      service: 'auth-validation',
      status,
      timestamp: new Date().toISOString(),
      requestId,
      validationResults,
      summary: {
        testsRun: totalTests,
        testsPassed: validationCount,
        successRate: `${((validationCount / totalTests) * 100).toFixed(1)}%`,
      },
      duration: performance.now() - startTime,
    }

    parlantLoggers.auth.info(
      'Authentication validation completed',
      {
        operation: 'auth_validation',
        duration: response.duration,
        status,
        testsRun: totalTests,
        testsPassed: validationCount,
      },
      requestId
    )

    return NextResponse.json(response, {
      status: status === 'unhealthy' ? 503 : 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Health-Status': status,
        'X-Service': 'auth-validation',
        'X-Request-Id': requestId,
      },
    })
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error('Authentication validation API error', { error, duration, requestId })

    return NextResponse.json(
      {
        service: 'auth-validation',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        requestId,
        error: error instanceof Error ? error.message : 'Authentication validation failed',
        duration,
      },
      { status: 500 }
    )
  }
}
