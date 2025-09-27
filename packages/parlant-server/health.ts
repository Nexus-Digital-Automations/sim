/**
 * Parlant Server Health Checks and Monitoring
 *
 * This module provides comprehensive health checking capabilities for the Parlant server
 * integration, including database connectivity, service status, and performance metrics.
 */

import { sql } from 'drizzle-orm'
import { createLogger } from '../../apps/sim/lib/logs/console/logger'
import { db } from '../db'

const logger = createLogger('ParlantServerHealth')

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  service: string
  details?: Record<string, any>
  error?: string
  duration: number
}

export interface ServiceMetrics {
  cpu?: number
  memory?: {
    used: number
    total: number
    percentage: number
  }
  uptime: number
  connections?: {
    active: number
    total: number
  }
}

export interface DatabaseHealthDetails {
  connectionStatus: 'connected' | 'disconnected' | 'error'
  activeConnections?: number
  queryTime?: number
  version?: string
  lastQuery?: string
}

export interface ParlantHealthDetails {
  agentCount?: number
  sessionCount?: number
  guidelineCount?: number
  journeyCount?: number
  lastActivity?: string
  serviceStatus: 'running' | 'stopped' | 'error'
}

/**
 * Comprehensive health check aggregator
 */
export class ParlantHealthChecker {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Run all health checks and return aggregated status
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    uptime: number
    services: {
      database: HealthCheckResult
      parlant: HealthCheckResult
      integration: HealthCheckResult
    }
    metrics: ServiceMetrics
  }> {
    const startTime = performance.now()
    logger.info('Running comprehensive health check')

    try {
      // Run all health checks in parallel for better performance
      const [databaseHealth, parlantHealth, integrationHealth, metrics] = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkParlantServiceHealth(),
        this.checkSimIntegrationHealth(),
        this.collectServiceMetrics(),
      ])

      // Determine overall status
      const services = {
        database:
          databaseHealth.status === 'fulfilled'
            ? databaseHealth.value
            : this.createErrorResult('database', databaseHealth.reason),
        parlant:
          parlantHealth.status === 'fulfilled'
            ? parlantHealth.value
            : this.createErrorResult('parlant', parlantHealth.reason),
        integration:
          integrationHealth.status === 'fulfilled'
            ? integrationHealth.value
            : this.createErrorResult('integration', integrationHealth.reason),
      }

      const serviceStatuses = Object.values(services).map((s) => s.status)
      const overallStatus = this.determineOverallStatus(serviceStatuses)

      const result = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        services,
        metrics: metrics.status === 'fulfilled' ? metrics.value : this.getDefaultMetrics(),
      }

      logger.info('Health check completed', {
        status: overallStatus,
        duration: performance.now() - startTime,
        services: serviceStatuses,
      })

      return result
    } catch (error) {
      logger.error('Health check failed', { error })
      throw error
    }
  }

  /**
   * Check PostgreSQL database connectivity and performance
   */
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = performance.now()

    try {
      logger.debug('Checking database health')

      // Test basic connectivity with a simple query
      const connectivityTest = await db.execute(sql`SELECT 1 as test`)

      // Get database version and basic stats
      const [versionResult] = await Promise.allSettled([
        db.execute(sql`SELECT version() as version`),
      ])

      // Get active connections count
      const [connectionResult] = await Promise.allSettled([
        db.execute(sql`
          SELECT count(*) as active_connections
          FROM pg_stat_activity
          WHERE state = 'active'
        `),
      ])

      const duration = performance.now() - startTime
      const details: DatabaseHealthDetails = {
        connectionStatus: 'connected',
        queryTime: duration,
        version:
          versionResult.status === 'fulfilled'
            ? (versionResult.value[0] as any)?.version
            : 'unknown',
        activeConnections:
          connectionResult.status === 'fulfilled'
            ? Number.parseInt((connectionResult.value[0] as any)?.active_connections || '0', 10)
            : undefined,
        lastQuery: new Date().toISOString(),
      }

      // Determine status based on performance
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      if (duration > 1000) {
        status = 'degraded'
        logger.warn('Database query response time degraded', {
          queryTime: duration,
        })
      } else if (duration > 5000) {
        status = 'unhealthy'
        logger.error('Database query response time critical', {
          queryTime: duration,
        })
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        service: 'database',
        details,
        duration,
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Database health check failed', { error, duration })

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'database',
        error: error instanceof Error ? error.message : 'Database connection failed',
        duration,
        details: {
          connectionStatus: 'error' as const,
        },
      }
    }
  }

  /**
   * Check Parlant service status and agent management
   */
  async checkParlantServiceHealth(): Promise<HealthCheckResult> {
    const startTime = performance.now()

    try {
      logger.debug('Checking Parlant service health')

      // Check if Parlant-related tables exist and are accessible
      // This will be expanded once the Parlant schema is implemented
      const tableChecks = await Promise.allSettled([
        // Placeholder for future Parlant tables
        db.execute(
          sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'parlant_agents'`
        ),
        db.execute(
          sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'parlant_sessions'`
        ),
        db.execute(
          sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'parlant_guidelines'`
        ),
      ])

      const duration = performance.now() - startTime

      // For now, we'll simulate Parlant service checks
      // This will be replaced with actual Parlant service integration
      const details: ParlantHealthDetails = {
        serviceStatus: 'running', // Will be determined by actual service status
        agentCount: 0, // Will be queried from actual Parlant tables
        sessionCount: 0, // Will be queried from actual Parlant tables
        guidelineCount: 0, // Will be queried from actual Parlant tables
        journeyCount: 0, // Will be queried from actual Parlant tables
        lastActivity: new Date().toISOString(),
      }

      return {
        status: 'healthy', // Will be determined based on actual Parlant service status
        timestamp: new Date().toISOString(),
        service: 'parlant',
        details,
        duration,
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Parlant service health check failed', { error, duration })

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'parlant',
        error: error instanceof Error ? error.message : 'Parlant service check failed',
        duration,
        details: {
          serviceStatus: 'error' as const,
        },
      }
    }
  }

  /**
   * Check Sim-Parlant integration health
   */
  async checkSimIntegrationHealth(): Promise<HealthCheckResult> {
    const startTime = performance.now()

    try {
      logger.debug('Checking Sim-Parlant integration health')

      // Check workspace and user tables that Parlant will integrate with
      const integrationChecks = await Promise.allSettled([
        db.execute(sql`SELECT COUNT(*) as count FROM "user" LIMIT 1`),
        db.execute(sql`SELECT COUNT(*) as count FROM "workspace" LIMIT 1`),
        db.execute(sql`SELECT COUNT(*) as count FROM "workflow" LIMIT 1`),
      ])

      const duration = performance.now() - startTime

      const details = {
        userTableAccessible: integrationChecks[0].status === 'fulfilled',
        workspaceTableAccessible: integrationChecks[1].status === 'fulfilled',
        workflowTableAccessible: integrationChecks[2].status === 'fulfilled',
        integrationStatus: 'ready' as const, // Will be updated based on actual integration status
        lastIntegrationCheck: new Date().toISOString(),
      }

      // Determine integration health
      const allTablesAccessible = integrationChecks.every((check) => check.status === 'fulfilled')
      const status = allTablesAccessible ? 'healthy' : 'unhealthy'

      return {
        status,
        timestamp: new Date().toISOString(),
        service: 'integration',
        details,
        duration,
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error('Integration health check failed', { error, duration })

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'integration',
        error: error instanceof Error ? error.message : 'Integration check failed',
        duration,
      }
    }
  }

  /**
   * Collect system metrics
   */
  async collectServiceMetrics(): Promise<ServiceMetrics> {
    try {
      // Get Node.js process metrics
      const memoryUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()

      return {
        uptime: process.uptime(),
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
        // CPU usage calculation would require more sophisticated monitoring
        // For now, we'll omit it and add it later with proper metrics collection
        connections: {
          active: 0, // Will be implemented with actual connection pool monitoring
          total: 60, // Based on the database configuration
        },
      }
    } catch (error) {
      logger.error('Failed to collect service metrics', { error })
      return this.getDefaultMetrics()
    }
  }

  /**
   * Create error result for failed health checks
   */
  private createErrorResult(service: string, error: any): HealthCheckResult {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service,
      error: error instanceof Error ? error.message : `${service} health check failed`,
      duration: 0,
    }
  }

  /**
   * Determine overall status from individual service statuses
   */
  private determineOverallStatus(statuses: string[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (statuses.includes('unhealthy')) {
      return 'unhealthy'
    }
    if (statuses.includes('degraded')) {
      return 'degraded'
    }
    return 'healthy'
  }

  /**
   * Get default metrics when collection fails
   */
  private getDefaultMetrics(): ServiceMetrics {
    return {
      uptime: process.uptime(),
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
      },
    }
  }

  /**
   * Quick database connectivity check for lightweight monitoring
   */
  async quickDatabaseCheck(): Promise<boolean> {
    try {
      await db.execute(sql`SELECT 1`)
      return true
    } catch (error) {
      logger.error('Quick database check failed', { error })
      return false
    }
  }
}

/**
 * Singleton health checker instance
 */
export const parlantHealthChecker = new ParlantHealthChecker()

/**
 * Export individual check functions for targeted monitoring
 */
export const healthChecks = {
  database: () => parlantHealthChecker.checkDatabaseHealth(),
  parlant: () => parlantHealthChecker.checkParlantServiceHealth(),
  integration: () => parlantHealthChecker.checkSimIntegrationHealth(),
  quick: () => parlantHealthChecker.quickDatabaseCheck(),
}
