/**
 * ToolHealthService - Tool health monitoring and status tracking
 *
 * Monitors tool health, tracks uptime, response times, and provides
 * automated health checks for different types of tools.
 */

import { EventEmitter } from 'events'
import { eq, sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/packages/db'
import { toolRegistry } from '@/packages/db/schema'
import type { ToolHealth } from './types'

const logger = createLogger('ToolHealthService')

/**
 * Service for monitoring and maintaining tool health
 */
export class ToolHealthService extends EventEmitter {
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map()
  private defaultCheckInterval = 5 * 60 * 1000 // 5 minutes

  /**
   * Start health monitoring for all active tools
   */
  async startHealthMonitoring(): Promise<void> {
    logger.info('Starting tool health monitoring')

    try {
      // Get all active tools
      const activeTools = await db
        .select({ id: toolRegistry.id, implementationType: toolRegistry.implementationType })
        .from(toolRegistry)
        .where(eq(toolRegistry.status, 'active'))

      // Start monitoring for each tool
      for (const tool of activeTools) {
        await this.startToolHealthCheck(tool.id)
      }

      logger.info('Health monitoring started for tools', { count: activeTools.length })
    } catch (error) {
      logger.error('Failed to start health monitoring', { error })
      throw error
    }
  }

  /**
   * Stop health monitoring for all tools
   */
  stopHealthMonitoring(): void {
    logger.info('Stopping tool health monitoring')

    // Clear all health check intervals
    for (const [toolId, interval] of this.healthCheckIntervals) {
      clearInterval(interval)
    }

    this.healthCheckIntervals.clear()
    logger.info('Health monitoring stopped')
  }

  /**
   * Start health monitoring for a specific tool
   */
  async startToolHealthCheck(toolId: string): Promise<void> {
    logger.debug('Starting health check for tool', { toolId })

    try {
      // Don't start if already monitoring
      if (this.healthCheckIntervals.has(toolId)) {
        return
      }

      // Perform initial health check
      await this.performHealthCheck(toolId)

      // Set up recurring health checks
      const interval = setInterval(async () => {
        try {
          await this.performHealthCheck(toolId)
        } catch (error) {
          logger.error('Health check failed', { toolId, error })
        }
      }, this.defaultCheckInterval)

      this.healthCheckIntervals.set(toolId, interval)
      logger.debug('Health monitoring started for tool', { toolId })
    } catch (error) {
      logger.error('Failed to start health check for tool', { toolId, error })
    }
  }

  /**
   * Stop health monitoring for a specific tool
   */
  stopToolHealthCheck(toolId: string): void {
    const interval = this.healthCheckIntervals.get(toolId)
    if (interval) {
      clearInterval(interval)
      this.healthCheckIntervals.delete(toolId)
      logger.debug('Health monitoring stopped for tool', { toolId })
    }
  }

  /**
   * Perform a health check for a specific tool
   */
  async performHealthCheck(toolId: string): Promise<ToolHealth> {
    logger.debug('Performing health check', { toolId })

    try {
      // Get tool information
      const [tool] = await db
        .select()
        .from(toolRegistry)
        .where(eq(toolRegistry.id, toolId))
        .limit(1)

      if (!tool) {
        throw new Error(`Tool not found: ${toolId}`)
      }

      let health: ToolHealth

      // Perform health check based on tool type
      switch (tool.implementationType) {
        case 'server':
          health = await this.checkServerToolHealth(tool)
          break
        case 'client':
          health = await this.checkClientToolHealth(tool)
          break
        case 'hybrid':
          health = await this.checkHybridToolHealth(tool)
          break
        default:
          health = await this.checkGenericToolHealth(tool)
      }

      // Update health status in database
      await this.updateToolHealthStatus(toolId, health)

      // Emit health change event if status changed
      const previousStatus = tool.healthStatus
      if (previousStatus !== health.status) {
        this.emit('healthChanged', { toolId, previousStatus, currentStatus: health.status, health })
      }

      logger.debug('Health check completed', { toolId, status: health.status })
      return health
    } catch (error) {
      logger.error('Health check failed', { toolId, error })

      const errorHealth: ToolHealth = {
        status: 'error',
        lastCheckTime: new Date(),
        errorDetails: error instanceof Error ? error.message : 'Unknown health check error',
      }

      await this.updateToolHealthStatus(toolId, errorHealth)
      return errorHealth
    }
  }

  /**
   * Get health status for a specific tool
   */
  async getToolHealth(toolId: string): Promise<ToolHealth | null> {
    try {
      const [tool] = await db
        .select({
          healthStatus: toolRegistry.healthStatus,
          lastHealthCheck: toolRegistry.lastHealthCheck,
          healthCheckDetails: toolRegistry.healthCheckDetails,
        })
        .from(toolRegistry)
        .where(eq(toolRegistry.id, toolId))
        .limit(1)

      if (!tool) {
        return null
      }

      const healthDetails = tool.healthCheckDetails
        ? JSON.parse(tool.healthCheckDetails as string)
        : {}

      return {
        status: tool.healthStatus as any,
        lastCheckTime: tool.lastHealthCheck || undefined,
        uptime: healthDetails.uptime,
        responseTime: healthDetails.responseTime,
        errorDetails: healthDetails.error,
        dependencies: healthDetails.dependencies,
      }
    } catch (error) {
      logger.error('Failed to get tool health', { toolId, error })
      return null
    }
  }

  /**
   * Get health overview for all tools
   */
  async getHealthOverview(): Promise<{
    healthy: number
    warning: number
    error: number
    unknown: number
    total: number
  }> {
    try {
      const [overview] = await db
        .select({
          healthy: sql`COUNT(CASE WHEN ${toolRegistry.healthStatus} = 'healthy' THEN 1 END)`,
          warning: sql`COUNT(CASE WHEN ${toolRegistry.healthStatus} = 'warning' THEN 1 END)`,
          error: sql`COUNT(CASE WHEN ${toolRegistry.healthStatus} = 'error' THEN 1 END)`,
          unknown: sql`COUNT(CASE WHEN ${toolRegistry.healthStatus} = 'unknown' OR ${toolRegistry.healthStatus} IS NULL THEN 1 END)`,
          total: sql`COUNT(*)`,
        })
        .from(toolRegistry)
        .where(eq(toolRegistry.status, 'active'))

      return {
        healthy: Number(overview?.healthy || 0),
        warning: Number(overview?.warning || 0),
        error: Number(overview?.error || 0),
        unknown: Number(overview?.unknown || 0),
        total: Number(overview?.total || 0),
      }
    } catch (error) {
      logger.error('Failed to get health overview', { error })
      return {
        healthy: 0,
        warning: 0,
        error: 0,
        unknown: 0,
        total: 0,
      }
    }
  }

  /**
   * Get health history for a tool
   */
  async getHealthHistory(
    toolId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<Array<{ timestamp: Date; status: string; details?: any }>> {
    // This would typically be stored in a separate health_history table
    // For now, return empty array as placeholder
    logger.debug('Health history not yet implemented', { toolId, timeRange })
    return []
  }

  // Private health check implementations for different tool types

  /**
   * Check health of server-side tools
   */
  private async checkServerToolHealth(tool: any): Promise<ToolHealth> {
    const startTime = Date.now()

    try {
      // For server tools, we could ping their endpoints or check service status
      // This is a simplified implementation

      // Simulate health check
      await this.simulateServerCheck(tool.id)

      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        lastCheckTime: new Date(),
        uptime: 99.9, // This would be calculated from actual uptime data
        responseTime,
      }
    } catch (error) {
      return {
        status: 'error',
        lastCheckTime: new Date(),
        responseTime: Date.now() - startTime,
        errorDetails: error instanceof Error ? error.message : 'Server check failed',
      }
    }
  }

  /**
   * Check health of client-side tools
   */
  private async checkClientToolHealth(tool: any): Promise<ToolHealth> {
    try {
      // For client tools, we check if the tool definition is valid and accessible
      const isValid = await this.validateClientTool(tool)

      if (!isValid) {
        return {
          status: 'warning',
          lastCheckTime: new Date(),
          errorDetails: 'Tool definition validation failed',
        }
      }

      return {
        status: 'healthy',
        lastCheckTime: new Date(),
      }
    } catch (error) {
      return {
        status: 'error',
        lastCheckTime: new Date(),
        errorDetails: error instanceof Error ? error.message : 'Client check failed',
      }
    }
  }

  /**
   * Check health of hybrid tools
   */
  private async checkHybridToolHealth(tool: any): Promise<ToolHealth> {
    try {
      // For hybrid tools, check both client and server aspects
      const [serverHealth, clientHealth] = await Promise.all([
        this.checkServerToolHealth(tool),
        this.checkClientToolHealth(tool),
      ])

      // Determine overall status
      let status: 'healthy' | 'warning' | 'error' = 'healthy'
      if (serverHealth.status === 'error' || clientHealth.status === 'error') {
        status = 'error'
      } else if (serverHealth.status === 'warning' || clientHealth.status === 'warning') {
        status = 'warning'
      }

      return {
        status,
        lastCheckTime: new Date(),
        uptime: serverHealth.uptime,
        responseTime: serverHealth.responseTime,
        errorDetails: serverHealth.errorDetails || clientHealth.errorDetails,
        dependencies: [
          {
            name: 'server',
            status: serverHealth.status,
            responseTime: serverHealth.responseTime,
            lastChecked: new Date(),
          },
          {
            name: 'client',
            status: clientHealth.status,
            lastChecked: new Date(),
          },
        ],
      }
    } catch (error) {
      return {
        status: 'error',
        lastCheckTime: new Date(),
        errorDetails: error instanceof Error ? error.message : 'Hybrid check failed',
      }
    }
  }

  /**
   * Generic health check for unknown tool types
   */
  private async checkGenericToolHealth(tool: any): Promise<ToolHealth> {
    try {
      // Basic validation of tool definition
      const isValid = tool.name && tool.id && tool.schema

      return {
        status: isValid ? 'healthy' : 'warning',
        lastCheckTime: new Date(),
        errorDetails: isValid ? undefined : 'Invalid tool definition',
      }
    } catch (error) {
      return {
        status: 'error',
        lastCheckTime: new Date(),
        errorDetails: error instanceof Error ? error.message : 'Generic check failed',
      }
    }
  }

  /**
   * Update tool health status in database
   */
  private async updateToolHealthStatus(toolId: string, health: ToolHealth): Promise<void> {
    try {
      const healthDetails = {
        uptime: health.uptime,
        responseTime: health.responseTime,
        error: health.errorDetails,
        dependencies: health.dependencies,
      }

      await db
        .update(toolRegistry)
        .set({
          healthStatus: health.status,
          lastHealthCheck: health.lastCheckTime || new Date(),
          healthCheckDetails: JSON.stringify(healthDetails),
          updatedAt: sql`NOW()`,
        })
        .where(eq(toolRegistry.id, toolId))

      logger.debug('Health status updated', { toolId, status: health.status })
    } catch (error) {
      logger.error('Failed to update health status', { toolId, error })
      throw error
    }
  }

  // Helper methods

  /**
   * Simulate server health check (placeholder)
   */
  private async simulateServerCheck(toolId: string): Promise<void> {
    // In a real implementation, this would make actual HTTP requests or service calls
    const delay = Math.random() * 100 + 50 // 50-150ms random delay
    await new Promise((resolve) => setTimeout(resolve, delay))

    // Randomly simulate failures for testing
    if (Math.random() < 0.05) {
      // 5% failure rate
      throw new Error(`Server check failed for ${toolId}`)
    }
  }

  /**
   * Validate client tool (placeholder)
   */
  private async validateClientTool(tool: any): Promise<boolean> {
    // In a real implementation, this would validate the client tool definition
    try {
      return !!(tool.name && tool.id)
    } catch (error) {
      return false
    }
  }
}
