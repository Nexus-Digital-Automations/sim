/**
 * Parlant Tool Adapter Service
 *
 * Main service orchestrator that coordinates all tool adapters,
 * provides unified interface for Parlant integration, and manages
 * the complete lifecycle of tool executions.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { globalToolAdapterRegistry } from './adapter-registry'
import { globalConfigurationManager } from './configuration'
import { globalErrorHandler } from './error-handling'
import { globalCache, globalPerformanceMonitor, globalRateLimiter } from './performance'
import type { AdapterContext, AdapterResult, ParlantToolSchema, ToolRecommendation } from './types'

const logger = createLogger('ParlantToolAdapterService')

export class ParlantToolAdapterService {
  private initialized = false

  constructor(
    private registry = globalToolAdapterRegistry,
    private configManager = globalConfigurationManager,
    private errorHandler = globalErrorHandler,
    private performanceMonitor = globalPerformanceMonitor,
    private cache = globalCache,
    private rateLimiter = globalRateLimiter
  ) {}

  /**
   * Initialize the service and auto-register all available tool adapters
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Service already initialized')
      return
    }

    logger.info('Initializing Parlant Tool Adapter Service')

    try {
      // Load and register all available adapters
      await this.autoRegisterAdapters()

      // Validate configuration
      const validation = this.configManager.validateConfiguration()
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors?.join(', ')}`)
      }

      this.initialized = true
      logger.info('Service initialized successfully', {
        totalAdapters: this.registry.getToolNames().length,
      })
    } catch (error: any) {
      logger.error('Service initialization failed', { error: error.message })
      throw error
    }
  }

  /**
   * Execute a tool with comprehensive monitoring and error handling
   */
  async executeTool(toolName: string, args: any, context: AdapterContext): Promise<AdapterResult> {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    const timer = this.performanceMonitor.startTimer(toolName, context)

    try {
      // Get tool adapter
      const adapter = this.registry.get(toolName)
      if (!adapter) {
        return {
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: `Tool '${toolName}' not found`,
            user_message: `The requested tool '${toolName}' is not available.`,
            suggestions: [
              'Check the tool name for typos',
              'View available tools with listTools()',
              'Contact support if the tool should be available',
            ],
            retryable: false,
          },
        }
      }

      // Check if tool is enabled for this context
      const toolConfig = this.configManager.getToolConfig(
        toolName,
        context.workspace_id,
        context.user_id
      )
      if (!toolConfig.enabled) {
        return {
          success: false,
          error: {
            code: 'TOOL_DISABLED',
            message: `Tool '${toolName}' is disabled`,
            user_message: `The tool '${toolName}' is currently disabled.`,
            suggestions: [
              'Contact your workspace administrator to enable this tool',
              'Try an alternative tool',
            ],
            retryable: false,
          },
        }
      }

      // Check rate limits
      const rateLimitKey = `${context.workspace_id}:${context.user_id}:${toolName}`
      const globalConfig = this.configManager.getGlobalConfig(context.workspace_id, context.user_id)

      if (globalConfig.rate_limiting.enabled) {
        const allowed = await this.rateLimiter.checkLimit(
          rateLimitKey,
          globalConfig.rate_limiting.default_requests_per_minute,
          globalConfig.rate_limiting.default_concurrent_limit
        )

        if (!allowed) {
          return {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded',
              user_message:
                'You have made too many requests. Please wait a moment before trying again.',
              suggestions: [
                'Wait a few minutes before retrying',
                'Consider using batch operations',
              ],
              retryable: true,
            },
          }
        }
      }

      // Check cache if enabled
      let result: AdapterResult | null = null
      const cacheKey = this.cache.createKey(toolName, args, context)

      if (globalConfig.caching.enabled && adapter.supportsCaching()) {
        result = await this.cache.get<AdapterResult>(cacheKey)
        if (result) {
          timer.addMetadata('cached', true)
          const duration = timer.end()
          this.performanceMonitor.recordExecution(toolName, duration, result.success)

          logger.debug('Cache hit for tool execution', {
            toolName,
            cacheKey,
            success: result.success,
          })

          return {
            ...result,
            metadata: {
              ...result.metadata,
              cached: true,
              execution_time_ms: duration,
            },
          }
        }
      }

      // Execute the tool
      timer.addMetadata('cached', false)
      result = await adapter.execute(args, context)

      // Cache successful results if caching is enabled
      if (globalConfig.caching.enabled && adapter.supportsCaching() && result.success) {
        await this.cache.set(cacheKey, result, globalConfig.caching.default_ttl_seconds)
      }

      const duration = timer.end()
      this.performanceMonitor.recordExecution(toolName, duration, result.success)

      logger.info('Tool execution completed', {
        toolName,
        success: result.success,
        duration,
        userId: context.user_id,
        workspaceId: context.workspace_id,
      })

      return result
    } catch (error: any) {
      const duration = timer.end()
      this.performanceMonitor.recordExecution(toolName, duration, false)

      logger.error('Tool execution failed with exception', {
        toolName,
        error: error.message,
        duration,
        userId: context.user_id,
        workspaceId: context.workspace_id,
      })

      return await this.errorHandler.handleError(error, {
        toolName,
        userId: context.user_id,
        workspaceId: context.workspace_id,
      })
    }
  }

  /**
   * Get all tool schemas for Parlant registration
   */
  getToolSchemas(context?: AdapterContext): ParlantToolSchema[] {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    if (context) {
      // Return only tools accessible to this user/workspace
      const accessibleTools = this.registry.getAccessibleTools(context)
      return accessibleTools.map((adapter) => adapter.schema)
    }

    return this.registry.getAllSchemas()
  }

  /**
   * Get contextual tool recommendations
   */
  async getRecommendations(context: AdapterContext, maxResults = 5): Promise<ToolRecommendation[]> {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    return this.registry.getRecommendations(context, maxResults)
  }

  /**
   * Search available tools
   */
  searchTools(query: string, context?: AdapterContext): ParlantToolSchema[] {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    let tools = this.registry.search(query)

    // Filter by accessibility if context provided
    if (context) {
      const accessibleToolNames = new Set(
        this.registry.getAccessibleTools(context).map((adapter) => adapter.schema.name)
      )
      tools = tools.filter((adapter) => accessibleToolNames.has(adapter.schema.name))
    }

    return tools.map((adapter) => adapter.schema)
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string, context?: AdapterContext): ParlantToolSchema[] {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    let tools = this.registry.getByCategory(category as any)

    // Filter by accessibility if context provided
    if (context) {
      const accessibleToolNames = new Set(
        this.registry.getAccessibleTools(context).map((adapter) => adapter.schema.name)
      )
      tools = tools.filter((adapter) => accessibleToolNames.has(adapter.schema.name))
    }

    return tools.map((adapter) => adapter.schema)
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(toolName?: string) {
    return this.performanceMonitor.getMetrics(toolName)
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<ServiceHealthStatus> {
    const metrics = this.performanceMonitor.getMetrics()
    const cacheStats = this.cache.getStats()
    const registryStats = this.registry.getStats()

    return {
      status: this.initialized ? 'healthy' : 'initializing',
      initialized: this.initialized,
      metrics: {
        totalExecutions: metrics.totalExecutions,
        successRate: metrics.successRate,
        averageExecutionTime: metrics.averageDurationMs,
      },
      cache: {
        entries: cacheStats.totalEntries,
        utilizationPercent: cacheStats.utilizationPercent,
      },
      registry: {
        totalTools: registryStats.totalTools,
        categories: Object.keys(registryStats.categories).length,
      },
      lastHealthCheck: new Date().toISOString(),
    }
  }

  /**
   * Refresh tool registrations (useful for hot-reloading in development)
   */
  async refreshToolRegistrations(): Promise<void> {
    logger.info('Refreshing tool registrations')
    await this.autoRegisterAdapters()
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up service resources')

    try {
      await Promise.all([this.registry.cleanup(), this.cache.clear()])

      this.initialized = false
      logger.info('Service cleanup completed')
    } catch (error: any) {
      logger.error('Error during service cleanup', { error: error.message })
      throw error
    }
  }

  /**
   * Private helper methods
   */
  private async autoRegisterAdapters(): Promise<void> {
    try {
      // Import and register all adapters from the adapters directory
      const { registerAllAdapters } = await import('./adapters')
      await registerAllAdapters(this.registry)

      logger.info('Auto-registered tool adapters', {
        count: this.registry.getToolNames().length,
      })
    } catch (error: any) {
      logger.error('Failed to auto-register adapters', { error: error.message })
      throw error
    }
  }
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'initializing'
  initialized: boolean
  metrics: {
    totalExecutions: number
    successRate: number
    averageExecutionTime: number
  }
  cache: {
    entries: number
    utilizationPercent: number
  }
  registry: {
    totalTools: number
    categories: number
  }
  lastHealthCheck: string
}

// Global service instance
let globalService: ParlantToolAdapterService | null = null

/**
 * Get or create the global service instance
 */
export function getParlantToolAdapterService(): ParlantToolAdapterService {
  if (!globalService) {
    globalService = new ParlantToolAdapterService()
  }
  return globalService
}

/**
 * Initialize the global service instance
 */
export async function initializeParlantToolAdapterService(): Promise<ParlantToolAdapterService> {
  const service = getParlantToolAdapterService()
  if (!service.initialized) {
    await service.initialize()
  }
  return service
}
