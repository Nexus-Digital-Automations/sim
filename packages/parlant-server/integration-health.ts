/**
 * Parlant-Sim Integration Health Monitoring
 *
 * This module provides comprehensive health monitoring for the integration between
 * Parlant services and Sim's existing infrastructure, including dependency checks,
 * data flow validation, and integration point monitoring.
 */

import { createLogger } from '../../apps/sim/lib/logs/console/logger'
import { parlantLoggers } from './logging'
import { errorTracker } from './error-tracking'
import { db } from '../db'
import { sql } from 'drizzle-orm'

const logger = createLogger('ParlantIntegrationHealth')

export interface IntegrationHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  component: string
  details: Record<string, any>
  duration: number
  dependencies?: {
    [key: string]: {
      status: 'available' | 'unavailable' | 'degraded'
      responseTime?: number
      version?: string
      lastCheck?: string
    }
  }
}

export interface DependencyCheckResult {
  name: string
  type: 'database_table' | 'api_endpoint' | 'service' | 'configuration'
  status: 'available' | 'unavailable' | 'degraded'
  responseTime?: number
  details?: Record<string, any>
  error?: string
}

/**
 * Integration Health Monitor for Parlant-Sim ecosystem
 */
export class ParlantIntegrationHealthMonitor {
  private lastCheckResults = new Map<string, IntegrationHealthResult>()

  /**
   * Check core Sim table accessibility required for Parlant integration
   */
  async checkSimTableAccess(): Promise<IntegrationHealthResult> {
    const startTime = performance.now()

    try {
      logger.debug('Checking Sim table accessibility')

      // Core tables required for Parlant integration
      const tableChecks = await Promise.allSettled([
        // User management tables
        db.execute(sql`SELECT COUNT(*) as count FROM "user" LIMIT 1`),
        db.execute(sql`SELECT COUNT(*) as count FROM "workspace" LIMIT 1`),

        // Workflow and execution tables
        db.execute(sql`SELECT COUNT(*) as count FROM "workflow" LIMIT 1`),

        // Check if billing/subscription tables exist (optional for Parlant)
        db.execute(sql`
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_name = 'subscription'
        `),

        // Check session tables for auth integration
        db.execute(sql`
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_name = 'session'
        `)
      ])

      const duration = performance.now() - startTime

      const tableStatus = {
        user: tableChecks[0].status === 'fulfilled',
        workspace: tableChecks[1].status === 'fulfilled',
        workflow: tableChecks[2].status === 'fulfilled',
        subscription: tableChecks[3].status === 'fulfilled' &&
          parseInt((tableChecks[3].value as any)[0]?.count || '0') > 0,
        session: tableChecks[4].status === 'fulfilled' &&
          parseInt((tableChecks[4].value as any)[0]?.count || '0') > 0
      }

      // Determine status - core tables must be accessible
      const coreTablesHealthy = tableStatus.user && tableStatus.workspace && tableStatus.workflow
      const status = coreTablesHealthy ? 'healthy' : 'unhealthy'

      if (!coreTablesHealthy) {
        await errorTracker.trackError(
          'integration',
          'sim-table-access',
          'Core Sim tables not accessible for Parlant integration',
          new Error('Table access validation failed'),
          {
            operation: 'sim_table_access_check',
            duration
          }
        )
      }

      const result: IntegrationHealthResult = {
        status,
        timestamp: new Date().toISOString(),
        component: 'sim-table-access',
        duration,
        details: {
          tables: tableStatus,
          coreTablesAccessible: coreTablesHealthy,
          optionalTablesAvailable: {
            subscription: tableStatus.subscription,
            session: tableStatus.session
          },
          accessValidation: {
            userTableRecords: tableChecks[0].status === 'fulfilled' ?
              parseInt((tableChecks[0].value as any)[0]?.count || '0') : 0,
            workspaceTableRecords: tableChecks[1].status === 'fulfilled' ?
              parseInt((tableChecks[1].value as any)[0]?.count || '0') : 0,
            workflowTableRecords: tableChecks[2].status === 'fulfilled' ?
              parseInt((tableChecks[2].value as any)[0]?.count || '0') : 0
          }
        }
      }

      this.lastCheckResults.set('sim-table-access', result)

      parlantLoggers.integration.info('Sim table access check completed', {
        operation: 'sim_table_access_check',
        status,
        duration,
        coreTablesHealthy,
        tablesChecked: Object.keys(tableStatus).length
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      await errorTracker.trackError(
        'integration',
        'sim-table-access',
        'Failed to check Sim table accessibility',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          operation: 'sim_table_access_check',
          duration,
          errorType: 'integration'
        }
      )

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        component: 'sim-table-access',
        duration,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          tables: {},
          coreTablesAccessible: false
        }
      }
    }
  }

  /**
   * Check Parlant-specific schema readiness
   */
  async checkParlantSchemaReadiness(): Promise<IntegrationHealthResult> {
    const startTime = performance.now()

    try {
      logger.debug('Checking Parlant schema readiness')

      // Check for Parlant-specific tables
      const parlantTableChecks = await Promise.allSettled([
        db.execute(sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_name LIKE 'parlant_%'
        `),

        // Check for foreign key constraints to Sim tables
        db.execute(sql`
          SELECT COUNT(*) as count
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
          AND kcu.table_name LIKE 'parlant_%'
        `)
      ])

      const duration = performance.now() - startTime

      const parlantTables = parlantTableChecks[0].status === 'fulfilled' ?
        (parlantTableChecks[0].value as any[]).map(row => row.table_name) : []

      const foreignKeyCount = parlantTableChecks[1].status === 'fulfilled' ?
        parseInt((parlantTableChecks[1].value as any)[0]?.count || '0') : 0

      // Expected Parlant tables
      const expectedTables = ['parlant_agents', 'parlant_sessions', 'parlant_guidelines', 'parlant_journeys']
      const hasRequiredTables = expectedTables.every(table => parlantTables.includes(table))

      const status = hasRequiredTables && foreignKeyCount > 0 ? 'healthy' :
                    parlantTables.length > 0 ? 'degraded' : 'unhealthy'

      const result: IntegrationHealthResult = {
        status,
        timestamp: new Date().toISOString(),
        component: 'parlant-schema',
        duration,
        details: {
          schema: {
            tablesFound: parlantTables,
            expectedTables,
            hasRequiredTables,
            foreignKeyConstraints: foreignKeyCount
          },
          readiness: {
            schemaInstalled: parlantTables.length > 0,
            foreignKeysConfigured: foreignKeyCount > 0,
            fullIntegrationReady: hasRequiredTables && foreignKeyCount > 0
          }
        }
      }

      if (status === 'unhealthy') {
        await errorTracker.trackWarning(
          'integration',
          'parlant-schema',
          'Parlant schema not fully ready for integration',
          undefined,
          {
            operation: 'parlant_schema_check',
            duration,
            tablesFound: parlantTables.length,
            expectedTables: expectedTables.length
          }
        )
      }

      this.lastCheckResults.set('parlant-schema', result)

      parlantLoggers.integration.info('Parlant schema readiness check completed', {
        operation: 'parlant_schema_check',
        status,
        duration,
        tablesFound: parlantTables.length,
        foreignKeyCount
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      await errorTracker.trackError(
        'integration',
        'parlant-schema',
        'Failed to check Parlant schema readiness',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          operation: 'parlant_schema_check',
          duration,
          errorType: 'integration'
        }
      )

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        component: 'parlant-schema',
        duration,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          schema: { tablesFound: [], expectedTables: [], hasRequiredTables: false }
        }
      }
    }
  }

  /**
   * Check workspace isolation and multi-tenancy readiness
   */
  async checkWorkspaceIsolation(): Promise<IntegrationHealthResult> {
    const startTime = performance.now()

    try {
      logger.debug('Checking workspace isolation readiness')

      // Check workspace table structure and sample data
      const workspaceChecks = await Promise.allSettled([
        // Check workspace table structure
        db.execute(sql`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'workspace'
        `),

        // Get sample workspace data
        db.execute(sql`
          SELECT id, name, created_at
          FROM "workspace"
          ORDER BY created_at DESC
          LIMIT 5
        `),

        // Check for workspace-related foreign keys in Parlant tables
        db.execute(sql`
          SELECT kcu.table_name, kcu.column_name
          FROM information_schema.key_column_usage kcu
          JOIN information_schema.table_constraints tc ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name LIKE '%workspace%'
          AND kcu.table_name LIKE 'parlant_%'
        `)
      ])

      const duration = performance.now() - startTime

      const workspaceColumns = workspaceChecks[0].status === 'fulfilled' ?
        (workspaceChecks[0].value as any[]).map(col => ({ name: col.column_name, type: col.data_type })) : []

      const sampleWorkspaces = workspaceChecks[1].status === 'fulfilled' ?
        (workspaceChecks[1].value as any[]) : []

      const parlantWorkspaceKeys = workspaceChecks[2].status === 'fulfilled' ?
        (workspaceChecks[2].value as any[]) : []

      // Check if workspace table has required fields for isolation
      const requiredColumns = ['id', 'name']
      const hasRequiredColumns = requiredColumns.every(col =>
        workspaceColumns.some(wCol => wCol.name === col)
      )

      const status = hasRequiredColumns && sampleWorkspaces.length > 0 ? 'healthy' :
                    hasRequiredColumns ? 'degraded' : 'unhealthy'

      const result: IntegrationHealthResult = {
        status,
        timestamp: new Date().toISOString(),
        component: 'workspace-isolation',
        duration,
        details: {
          workspace: {
            tableStructure: workspaceColumns,
            hasRequiredColumns,
            sampleCount: sampleWorkspaces.length,
            parlantIntegrationKeys: parlantWorkspaceKeys.length
          },
          isolation: {
            multiTenancyReady: hasRequiredColumns,
            parlantLinksConfigured: parlantWorkspaceKeys.length > 0,
            workspacesAvailable: sampleWorkspaces.length > 0
          },
          sampleWorkspaces: sampleWorkspaces.slice(0, 3) // Include sample data for debugging
        }
      }

      this.lastCheckResults.set('workspace-isolation', result)

      parlantLoggers.integration.info('Workspace isolation check completed', {
        operation: 'workspace_isolation_check',
        status,
        duration,
        workspaceCount: sampleWorkspaces.length,
        parlantKeys: parlantWorkspaceKeys.length
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      await errorTracker.trackError(
        'integration',
        'workspace-isolation',
        'Failed to check workspace isolation readiness',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          operation: 'workspace_isolation_check',
          duration,
          errorType: 'integration'
        }
      )

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        component: 'workspace-isolation',
        duration,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          workspace: { hasRequiredColumns: false, sampleCount: 0 }
        }
      }
    }
  }

  /**
   * Check API integration readiness and connectivity
   */
  async checkApiIntegrationHealth(): Promise<IntegrationHealthResult> {
    const startTime = performance.now()

    try {
      logger.debug('Checking API integration health')

      // Check if essential API endpoints are accessible (mock check for now)
      const apiChecks = {
        healthEndpoint: true, // We know this works since we're running
        authEndpoint: await this.checkEndpointAccessibility('/api/v1/auth'),
        logsEndpoint: await this.checkEndpointAccessibility('/api/v1/logs'),
        webhookEndpoint: process.env.WEBHOOK_URL ? true : false
      }

      // Check environment configuration
      const envConfig = {
        databaseUrl: !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL,
        nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: !!process.env.NEXTAUTH_URL,
        parlantConfig: !!process.env.PARLANT_API_KEY || !!process.env.PARLANT_SERVER_URL
      }

      const duration = performance.now() - startTime

      const endpointsHealthy = Object.values(apiChecks).filter(Boolean).length
      const configHealthy = Object.values(envConfig).filter(Boolean).length

      const status = endpointsHealthy >= 3 && configHealthy >= 3 ? 'healthy' :
                    endpointsHealthy >= 2 && configHealthy >= 2 ? 'degraded' : 'unhealthy'

      const result: IntegrationHealthResult = {
        status,
        timestamp: new Date().toISOString(),
        component: 'api-integration',
        duration,
        details: {
          endpoints: apiChecks,
          configuration: envConfig,
          health: {
            endpointsAccessible: endpointsHealthy,
            totalEndpoints: Object.keys(apiChecks).length,
            configurationComplete: configHealthy,
            totalConfigItems: Object.keys(envConfig).length
          }
        }
      }

      this.lastCheckResults.set('api-integration', result)

      parlantLoggers.integration.info('API integration health check completed', {
        operation: 'api_integration_check',
        status,
        duration,
        endpointsHealthy,
        configHealthy
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      await errorTracker.trackError(
        'integration',
        'api-integration',
        'Failed to check API integration health',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          operation: 'api_integration_check',
          duration,
          errorType: 'integration'
        }
      )

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        component: 'api-integration',
        duration,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Check endpoint accessibility (simplified version)
   */
  private async checkEndpointAccessibility(endpoint: string): Promise<boolean> {
    try {
      // For now, we'll assume endpoints are accessible if the basic routing works
      // In a full implementation, this could make actual HTTP requests
      return true
    } catch {
      return false
    }
  }

  /**
   * Run comprehensive integration health check
   */
  async checkComprehensiveIntegrationHealth(): Promise<{
    overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    components: Record<string, IntegrationHealthResult>
    summary: {
      totalChecks: number
      healthyChecks: number
      degradedChecks: number
      unhealthyChecks: number
      criticalIssues: string[]
      recommendations: string[]
    }
    duration: number
  }> {
    const startTime = performance.now()

    try {
      logger.info('Running comprehensive integration health check')

      // Run all integration checks in parallel
      const [
        simTableAccess,
        parlantSchema,
        workspaceIsolation,
        apiIntegration
      ] = await Promise.allSettled([
        this.checkSimTableAccess(),
        this.checkParlantSchemaReadiness(),
        this.checkWorkspaceIsolation(),
        this.checkApiIntegrationHealth()
      ])

      const components = {
        'sim-table-access': simTableAccess.status === 'fulfilled' ? simTableAccess.value :
          { status: 'unhealthy' as const, timestamp: new Date().toISOString(), component: 'sim-table-access', duration: 0, details: {} },
        'parlant-schema': parlantSchema.status === 'fulfilled' ? parlantSchema.value :
          { status: 'unhealthy' as const, timestamp: new Date().toISOString(), component: 'parlant-schema', duration: 0, details: {} },
        'workspace-isolation': workspaceIsolation.status === 'fulfilled' ? workspaceIsolation.value :
          { status: 'unhealthy' as const, timestamp: new Date().toISOString(), component: 'workspace-isolation', duration: 0, details: {} },
        'api-integration': apiIntegration.status === 'fulfilled' ? apiIntegration.value :
          { status: 'unhealthy' as const, timestamp: new Date().toISOString(), component: 'api-integration', duration: 0, details: {} }
      }

      // Calculate summary statistics
      const statuses = Object.values(components).map(c => c.status)
      const totalChecks = statuses.length
      const healthyChecks = statuses.filter(s => s === 'healthy').length
      const degradedChecks = statuses.filter(s => s === 'degraded').length
      const unhealthyChecks = statuses.filter(s => s === 'unhealthy').length

      // Determine overall status
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      if (unhealthyChecks > 0) {
        overallStatus = 'unhealthy'
      } else if (degradedChecks > 0) {
        overallStatus = 'degraded'
      }

      // Generate recommendations
      const criticalIssues: string[] = []
      const recommendations: string[] = []

      Object.entries(components).forEach(([name, result]) => {
        if (result.status === 'unhealthy') {
          criticalIssues.push(`${name}: ${result.details.error || 'Critical failure'}`)
        }
        if (result.status === 'degraded') {
          recommendations.push(`${name}: Review and optimize for better performance`)
        }
      })

      const duration = performance.now() - startTime

      const result = {
        overallStatus,
        timestamp: new Date().toISOString(),
        components,
        summary: {
          totalChecks,
          healthyChecks,
          degradedChecks,
          unhealthyChecks,
          criticalIssues,
          recommendations
        },
        duration
      }

      // Log comprehensive results
      parlantLoggers.integration.info('Comprehensive integration health check completed', {
        operation: 'comprehensive_integration_check',
        overallStatus,
        duration,
        healthyChecks,
        degradedChecks,
        unhealthyChecks,
        criticalIssues: criticalIssues.length
      })

      // Track critical issues
      if (unhealthyChecks > 0) {
        await errorTracker.trackError(
          'integration',
          'comprehensive-health',
          `Integration health check failed: ${unhealthyChecks} unhealthy components`,
          new Error(`Critical integration issues detected`),
          {
            operation: 'comprehensive_integration_check',
            duration,
            unhealthyChecks,
            criticalIssues: criticalIssues.length
          }
        )
      }

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      await errorTracker.trackCritical(
        'integration',
        'comprehensive-health',
        'Comprehensive integration health check failed completely',
        error instanceof Error ? error : new Error('Unknown error'),
        {
          operation: 'comprehensive_integration_check',
          duration,
          errorType: 'system'
        }
      )

      throw error
    }
  }

  /**
   * Get cached check results
   */
  getLastCheckResults(): Map<string, IntegrationHealthResult> {
    return new Map(this.lastCheckResults)
  }

  /**
   * Clear cached results
   */
  clearCache(): void {
    this.lastCheckResults.clear()
    logger.info('Integration health check cache cleared')
  }
}

/**
 * Singleton integration health monitor
 */
export const parlantIntegrationHealthMonitor = new ParlantIntegrationHealthMonitor()

/**
 * Convenience functions for integration health checking
 */
export const integrationHealth = {
  checkSimTables: () => parlantIntegrationHealthMonitor.checkSimTableAccess(),
  checkParlantSchema: () => parlantIntegrationHealthMonitor.checkParlantSchemaReadiness(),
  checkWorkspaceIsolation: () => parlantIntegrationHealthMonitor.checkWorkspaceIsolation(),
  checkApiIntegration: () => parlantIntegrationHealthMonitor.checkApiIntegrationHealth(),
  checkComprehensive: () => parlantIntegrationHealthMonitor.checkComprehensiveIntegrationHealth(),
  getLastResults: () => parlantIntegrationHealthMonitor.getLastCheckResults(),
  clearCache: () => parlantIntegrationHealthMonitor.clearCache()
}