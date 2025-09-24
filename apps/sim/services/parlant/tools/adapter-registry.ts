/**
 * Universal Tool Adapter Registry
 * ===============================
 *
 * Central registry for managing all tool adapters with features:
 * - Dynamic adapter loading and registration
 * - Tool discovery and enumeration
 * - Quality assurance and health monitoring
 * - Performance optimization with caching
 * - Error tracking and recovery
 */

import type {
  AdapterExecutionResult,
  ParlantTool,
  ToolExecutionContext,
  UniversalToolAdapter,
} from './adapter-framework'

// ================================
// Registry Types
// ================================

/**
 * Adapter metadata for registry management
 */
export interface AdapterMetadata {
  /** Adapter unique identifier */
  id: string
  /** Adapter version */
  version: string
  /** Priority for tool selection (higher = preferred) */
  priority: number
  /** Adapter health status */
  health: 'healthy' | 'degraded' | 'unhealthy'
  /** Performance metrics */
  metrics: {
    totalExecutions: number
    successRate: number
    averageLatencyMs: number
    lastExecuted?: string
    lastError?: string
  }
  /** Feature flags */
  features: {
    caching: boolean
    retries: boolean
    monitoring: boolean
  }
  /** Adapter tags for categorization */
  tags: string[]
}

/**
 * Registry configuration options
 */
export interface RegistryConfig {
  /** Enable performance caching */
  enableCaching: boolean
  /** Cache TTL in seconds */
  cacheTTL: number
  /** Maximum retry attempts */
  maxRetries: number
  /** Health check interval in seconds */
  healthCheckInterval: number
  /** Enable detailed logging */
  enableLogging: boolean
}

/**
 * Adapter execution options
 */
export interface AdapterExecutionOptions {
  /** Enable caching for this execution */
  useCache?: boolean
  /** Number of retry attempts */
  retries?: number
  /** Execution timeout in milliseconds */
  timeout?: number
  /** Additional context for monitoring */
  tags?: Record<string, string>
}

// ================================
// Registry Class
// ================================

/**
 * Central registry for managing all tool adapters
 * Provides discovery, execution, and monitoring capabilities
 */
export class UniversalToolAdapterRegistry {
  private adapters = new Map<string, UniversalToolAdapter>()
  private metadata = new Map<string, AdapterMetadata>()
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private config: RegistryConfig
  private healthCheckTimer?: NodeJS.Timer

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      enableCaching: true,
      cacheTTL: 300, // 5 minutes
      maxRetries: 3,
      healthCheckInterval: 60, // 1 minute
      enableLogging: true,
      ...config,
    }

    // Start health monitoring if enabled
    if (this.config.healthCheckInterval > 0) {
      this.startHealthMonitoring()
    }
  }

  // ================================
  // Adapter Management
  // ================================

  /**
   * Register a new tool adapter
   */
  async registerAdapter(
    adapter: UniversalToolAdapter,
    metadata?: Partial<AdapterMetadata>
  ): Promise<void> {
    const parlantTool = adapter.getParlantTool()
    const adapterId = parlantTool.id

    // Store adapter
    this.adapters.set(adapterId, adapter)

    // Initialize metadata
    this.metadata.set(adapterId, {
      id: adapterId,
      version: '1.0.0',
      priority: 100,
      health: 'healthy',
      metrics: {
        totalExecutions: 0,
        successRate: 1.0,
        averageLatencyMs: 0,
      },
      features: {
        caching: this.config.enableCaching,
        retries: this.config.maxRetries > 0,
        monitoring: this.config.enableLogging,
      },
      tags: [parlantTool.category],
      ...metadata,
    })

    if (this.config.enableLogging) {
      console.log(`[AdapterRegistry] Registered adapter: ${adapterId}`)
    }
  }

  /**
   * Unregister an adapter
   */
  async unregisterAdapter(adapterId: string): Promise<boolean> {
    const removed = this.adapters.delete(adapterId)
    this.metadata.delete(adapterId)

    // Clear related cache entries
    const cacheKeysToRemove = Array.from(this.cache.keys()).filter((key) =>
      key.startsWith(`${adapterId}:`)
    )

    cacheKeysToRemove.forEach((key) => this.cache.delete(key))

    if (this.config.enableLogging && removed) {
      console.log(`[AdapterRegistry] Unregistered adapter: ${adapterId}`)
    }

    return removed
  }

  /**
   * Get an adapter by ID
   */
  getAdapter(adapterId: string): UniversalToolAdapter | undefined {
    return this.adapters.get(adapterId)
  }

  /**
   * Get adapter metadata
   */
  getAdapterMetadata(adapterId: string): AdapterMetadata | undefined {
    return this.metadata.get(adapterId)
  }

  /**
   * List all registered adapters
   */
  listAdapters(): string[] {
    return Array.from(this.adapters.keys())
  }

  /**
   * Get all Parlant tool definitions
   */
  getParlantTools(): ParlantTool[] {
    return Array.from(this.adapters.values()).map((adapter) => adapter.getParlantTool())
  }

  /**
   * Find tools by category
   */
  getToolsByCategory(category: ParlantTool['category']): ParlantTool[] {
    return this.getParlantTools().filter((tool) => tool.category === category)
  }

  /**
   * Search tools by keywords
   */
  searchTools(query: string): ParlantTool[] {
    const queryLower = query.toLowerCase()
    return this.getParlantTools().filter(
      (tool) =>
        tool.name.toLowerCase().includes(queryLower) ||
        tool.description.toLowerCase().includes(queryLower) ||
        tool.usageHints?.some((hint) => hint.toLowerCase().includes(queryLower))
    )
  }

  // ================================
  // Tool Execution
  // ================================

  /**
   * Execute a tool through its adapter
   */
  async executeTool(
    toolId: string,
    parameters: Record<string, any>,
    context: ToolExecutionContext,
    options: AdapterExecutionOptions = {}
  ): Promise<AdapterExecutionResult> {
    const adapter = this.adapters.get(toolId)
    if (!adapter) {
      return {
        success: false,
        error: `Tool '${toolId}' not found in registry`,
        errorDetails: {
          code: 'TOOL_NOT_FOUND',
          message: `No adapter registered for tool ID: ${toolId}`,
          context: { toolId, availableTools: this.listAdapters() },
        },
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0,
        },
      }
    }

    const metadata = this.metadata.get(toolId)!
    const startTime = Date.now()

    try {
      // 1. Check cache if enabled
      if (this.config.enableCaching && options.useCache !== false) {
        const cachedResult = this.getCachedResult(toolId, parameters)
        if (cachedResult) {
          if (this.config.enableLogging) {
            console.log(`[AdapterRegistry] Cache hit for tool: ${toolId}`)
          }
          return cachedResult
        }
      }

      // 2. Execute with retries if configured
      let result: AdapterExecutionResult
      const maxRetries = options.retries ?? this.config.maxRetries
      let lastError: Error | null = null

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (this.config.enableLogging && attempt > 0) {
            console.log(`[AdapterRegistry] Retry attempt ${attempt} for tool: ${toolId}`)
          }

          result = await this.executeWithTimeout(adapter, parameters, context, options.timeout)

          // Success - break out of retry loop
          break
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))

          if (attempt === maxRetries) {
            // Final attempt failed
            result = {
              success: false,
              error: `Tool execution failed after ${maxRetries + 1} attempts: ${lastError.message}`,
              errorDetails: {
                code: 'EXECUTION_FAILED_MAX_RETRIES',
                message: lastError.message,
                stack: lastError.stack,
                context: { toolId, attempts: attempt + 1 },
              },
              timing: {
                startTime: new Date(startTime).toISOString(),
                endTime: new Date().toISOString(),
                duration: Date.now() - startTime,
              },
            }
          } else {
            // Wait before retry (exponential backoff)
            await this.sleep(2 ** attempt * 1000)
          }
        }
      }

      // 3. Update metrics
      this.updateMetrics(toolId, result, Date.now() - startTime)

      // 4. Cache successful results if enabled
      if (result.success && this.config.enableCaching && options.useCache !== false) {
        this.setCachedResult(toolId, parameters, result)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const result: AdapterExecutionResult = {
        success: false,
        error: `Unexpected error during tool execution: ${errorMessage}`,
        errorDetails: {
          code: 'UNEXPECTED_ERROR',
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          context: { toolId },
        },
        timing: {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          duration: Date.now() - startTime,
        },
      }

      this.updateMetrics(toolId, result, Date.now() - startTime)
      return result
    }
  }

  // ================================
  // Caching System
  // ================================

  /**
   * Get cached result if available and valid
   */
  private getCachedResult(
    toolId: string,
    parameters: Record<string, any>
  ): AdapterExecutionResult | null {
    const cacheKey = this.generateCacheKey(toolId, parameters)
    const cached = this.cache.get(cacheKey)

    if (!cached) {
      return null
    }

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > cached.ttl * 1000) {
      this.cache.delete(cacheKey)
      return null
    }

    return cached.data
  }

  /**
   * Cache a successful result
   */
  private setCachedResult(
    toolId: string,
    parameters: Record<string, any>,
    result: AdapterExecutionResult
  ): void {
    const cacheKey = this.generateCacheKey(toolId, parameters)
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL,
    })
  }

  /**
   * Generate cache key from tool ID and parameters
   */
  private generateCacheKey(toolId: string, parameters: Record<string, any>): string {
    const paramString = JSON.stringify(parameters, Object.keys(parameters).sort())
    const hash = this.simpleHash(paramString)
    return `${toolId}:${hash}`
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  // ================================
  // Execution Utilities
  // ================================

  /**
   * Execute with timeout protection
   */
  private async executeWithTimeout(
    adapter: UniversalToolAdapter,
    parameters: Record<string, any>,
    context: ToolExecutionContext,
    timeout?: number
  ): Promise<AdapterExecutionResult> {
    const timeoutMs = timeout ?? 30000 // 30 second default

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      adapter
        .execute(parameters, context)
        .then((result) => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // ================================
  // Metrics and Health Monitoring
  // ================================

  /**
   * Update adapter metrics after execution
   */
  private updateMetrics(toolId: string, result: AdapterExecutionResult, latencyMs: number): void {
    const metadata = this.metadata.get(toolId)
    if (!metadata) return

    const metrics = metadata.metrics
    metrics.totalExecutions++

    // Update success rate (exponential moving average)
    const alpha = 0.1
    const currentSuccess = result.success ? 1 : 0
    metrics.successRate = metrics.successRate * (1 - alpha) + currentSuccess * alpha

    // Update average latency (exponential moving average)
    metrics.averageLatencyMs = metrics.averageLatencyMs * (1 - alpha) + latencyMs * alpha

    // Track last execution and error
    metrics.lastExecuted = new Date().toISOString()
    if (!result.success) {
      metrics.lastError = result.error
    }

    // Update health status based on success rate
    if (metrics.successRate < 0.5) {
      metadata.health = 'unhealthy'
    } else if (metrics.successRate < 0.8) {
      metadata.health = 'degraded'
    } else {
      metadata.health = 'healthy'
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.config.healthCheckInterval * 1000)
  }

  /**
   * Perform health check on all adapters
   */
  private performHealthCheck(): void {
    if (this.config.enableLogging) {
      const totalAdapters = this.adapters.size
      const healthyAdapters = Array.from(this.metadata.values()).filter(
        (m) => m.health === 'healthy'
      ).length

      console.log(
        `[AdapterRegistry] Health check: ${healthyAdapters}/${totalAdapters} adapters healthy`
      )
    }
  }

  /**
   * Get registry health summary
   */
  getHealthSummary(): {
    totalAdapters: number
    healthyAdapters: number
    degradedAdapters: number
    unhealthyAdapters: number
    totalExecutions: number
    overallSuccessRate: number
  } {
    const metadataArray = Array.from(this.metadata.values())

    return {
      totalAdapters: metadataArray.length,
      healthyAdapters: metadataArray.filter((m) => m.health === 'healthy').length,
      degradedAdapters: metadataArray.filter((m) => m.health === 'degraded').length,
      unhealthyAdapters: metadataArray.filter((m) => m.health === 'unhealthy').length,
      totalExecutions: metadataArray.reduce((sum, m) => sum + m.metrics.totalExecutions, 0),
      overallSuccessRate:
        metadataArray.reduce((sum, m) => sum + m.metrics.successRate, 0) / metadataArray.length,
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
    if (this.config.enableLogging) {
      console.log('[AdapterRegistry] Cache cleared')
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
    this.adapters.clear()
    this.metadata.clear()
    this.cache.clear()
  }
}

// ================================
// Global Registry Instance
// ================================

/**
 * Global registry instance for the application
 * Configure this instance during application startup
 */
export const globalAdapterRegistry = new UniversalToolAdapterRegistry({
  enableCaching: true,
  cacheTTL: 300, // 5 minutes
  maxRetries: 3,
  healthCheckInterval: 60, // 1 minute
  enableLogging: process.env.NODE_ENV !== 'production',
})
