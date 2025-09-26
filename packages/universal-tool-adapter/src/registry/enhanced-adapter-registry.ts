/**
 * Enhanced Adapter Registry
 *
 * Advanced registry system for managing tool adapters with health monitoring,
 * performance tracking, failover capabilities, and comprehensive analytics.
 *
 * @author Claude Code Framework Architecture Agent
 * @version 2.0.0
 */

import { EventEmitter } from 'events'
import type { BaseAdapter } from '../core/base-adapter'
import type {
  AdapterExecutionResult,
  AdapterPlugin,
  AdapterRegistryEntry,
  DiscoveredTool,
  ToolDiscoveryQuery,
} from '../types/adapter-interfaces'
import type { ParlantExecutionContext } from '../types/parlant-interfaces'
import { createLogger } from '../utils/logger'

const logger = createLogger('EnhancedAdapterRegistry')

/**
 * Enhanced registry with comprehensive adapter management capabilities
 */
export class EnhancedAdapterRegistry extends EventEmitter {
  // Core registry storage
  private readonly adapters = new Map<string, AdapterRegistryEntry>()
  private readonly categories = new Map<string, Set<string>>()
  private readonly tags = new Map<string, Set<string>>()

  // Health monitoring
  private readonly healthMonitor: HealthMonitor
  private readonly performanceTracker: PerformanceTracker
  private readonly failoverManager: FailoverManager

  // Plugin system
  private readonly plugins = new Map<string, AdapterPlugin>()
  private readonly pluginExecutor: PluginExecutor

  // Configuration and metrics
  private readonly config: RegistryConfiguration
  private readonly metrics: RegistryMetrics
  private readonly analytics: RegistryAnalytics

  // Caching and optimization
  private readonly discoveryCache = new Map<string, DiscoveredTool[]>()
  private readonly executionCache = new Map<string, any>()
  private readonly loadBalancer: LoadBalancer

  // Lifecycle management
  private isShuttingDown = false
  private readonly startTime = Date.now()

  constructor(config: RegistryConfiguration = {}) {
    super()

    this.config = {
      // Default configuration
      maxAdapters: 1000,
      healthCheckIntervalMs: 30000, // 30 seconds
      performanceWindowMs: 300000, // 5 minutes
      discoveryCache: {
        enabled: true,
        ttlMs: 60000, // 1 minute
        maxSize: 100,
      },
      executionCache: {
        enabled: true,
        ttlMs: 300000, // 5 minutes
        maxSize: 500,
      },
      failover: {
        enabled: true,
        maxRetries: 3,
        backoffMs: 1000,
        circuitBreakerThreshold: 0.5,
      },
      metrics: {
        enabled: true,
        retentionDays: 30,
      },
      loadBalancing: {
        enabled: true,
        strategy: 'round_robin',
      },
      ...config,
    }

    // Initialize subsystems
    this.healthMonitor = new HealthMonitor(this.config, this)
    this.performanceTracker = new PerformanceTracker(this.config)
    this.failoverManager = new FailoverManager(this.config, this)
    this.pluginExecutor = new PluginExecutor(this.plugins)
    this.metrics = new RegistryMetrics(this.config)
    this.analytics = new RegistryAnalytics()
    this.loadBalancer = new LoadBalancer()

    // Start monitoring
    this.startPeriodicTasks()

    logger.info('Enhanced Adapter Registry initialized', {
      maxAdapters: this.config.maxAdapters,
      healthCheckInterval: this.config.healthCheckIntervalMs,
      caching: this.config.discoveryCache?.enabled,
    })
  }

  /**
   * Register an adapter with configuration (backwards compatibility)
   */
  async registerAdapter(simTool: any, config: any): Promise<void> {
    // Create a mock BaseAdapter from the SimTool and config
    const adapter = {
      id: config.parlantId || `sim_${simTool.name}`,
      getSimTool: () => simTool,
      getConfiguration: () => config,
      metadata: {
        category: config.category || 'utility',
        tags: config.tags || [],
      },
    } as any

    await this.register(adapter as BaseAdapter, {
      category: config.category || 'utility',
      tags: config.tags || [],
    })
  }

  /**
   * Register a new adapter with comprehensive configuration
   */
  async register(
    adapter: BaseAdapter,
    metadata: Partial<AdapterRegistryEntry['metadata']> = {}
  ): Promise<void> {
    if (this.adapters.size >= (this.config.maxAdapters || 1000)) {
      throw new Error(`Registry capacity exceeded: ${this.config.maxAdapters || 1000}`)
    }

    const adapterId = adapter.id

    if (this.adapters.has(adapterId)) {
      logger.warn('Overwriting existing adapter', { adapterId })
      await this.unregister(adapterId)
    }

    // Create registry entry
    const entry: AdapterRegistryEntry = {
      id: adapterId,
      simTool: adapter.getSimTool(),
      config: adapter.getConfiguration(),
      adapter,
      metadata: {
        registeredAt: new Date(),
        version: '2.0.0',
        source: 'enhanced_registry',
        category: adapter.metadata.category || 'utility',
        tags: adapter.metadata.tags || [],
        ...metadata,
      },
      statistics: {
        executionCount: 0,
        averageExecutionTimeMs: 0,
        successRate: 1.0,
        errorCount: 0,
        lastUsed: new Date(),
      },
      health: {
        status: 'healthy',
        lastCheckAt: new Date(),
        issues: [],
      },
    }

    // Store in registry
    this.adapters.set(adapterId, entry)

    // Update indexes
    this.updateCategoryIndex(adapterId, entry.metadata.category)
    this.updateTagIndex(adapterId, entry.metadata.tags)

    // Initialize health monitoring
    await this.healthMonitor.initializeAdapter(entry)

    // Apply plugins
    await this.pluginExecutor.onAdapterRegistered(entry)

    // Clear relevant caches
    this.clearDiscoveryCache()

    // Emit event
    this.emit('adapter:registered', entry)

    logger.info('Adapter registered successfully', {
      adapterId,
      category: entry.metadata.category,
      tags: entry.metadata.tags,
      totalAdapters: this.adapters.size,
    })

    // Update metrics
    this.metrics.recordAdapterRegistration(entry)
  }

  /**
   * Unregister an adapter with proper cleanup
   */
  async unregister(adapterId: string): Promise<boolean> {
    const entry = this.adapters.get(adapterId)
    if (!entry) {
      return false
    }

    logger.info('Unregistering adapter', { adapterId })

    try {
      // Stop health monitoring
      await this.healthMonitor.stopMonitoring(adapterId)

      // Apply plugins
      await this.pluginExecutor.onAdapterUnregistered(entry)

      // Cleanup adapter if supported
      if (
        entry.adapter &&
        'cleanup' in entry.adapter &&
        typeof entry.adapter.cleanup === 'function'
      ) {
        await entry.adapter.cleanup()
      }

      // Remove from indexes
      this.removeFromCategoryIndex(adapterId, entry.metadata.category)
      this.removeFromTagIndex(adapterId, entry.metadata.tags)

      // Remove from registry
      this.adapters.delete(adapterId)

      // Clear caches
      this.clearDiscoveryCache()
      this.clearExecutionCache(adapterId)

      // Emit event
      this.emit('adapter:unregistered', entry)

      logger.info('Adapter unregistered successfully', {
        adapterId,
        remainingAdapters: this.adapters.size,
      })

      return true
    } catch (error) {
      logger.error('Error during adapter unregistration', {
        adapterId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get adapter with automatic health checking
   */
  async get(adapterId: string): Promise<BaseAdapter | undefined> {
    const entry = this.adapters.get(adapterId)
    if (!entry) {
      return undefined
    }

    // Check health status
    if (entry.health?.status === 'unhealthy' && this.config.failover?.enabled) {
      // Try to find a healthy alternative
      const alternative = await this.findHealthyAlternative(entry)
      if (alternative) {
        logger.warn('Using healthy alternative for unhealthy adapter', {
          originalId: adapterId,
          alternativeId: alternative.id,
        })
        return alternative.adapter
      }
    }

    // Update last used timestamp
    if (entry.statistics) {
      entry.statistics.lastUsed = new Date()
    }

    return entry.adapter
  }

  /**
   * Execute adapter with comprehensive monitoring and failover
   */
  async execute(
    adapterId: string,
    context: ParlantExecutionContext,
    args: any
  ): Promise<AdapterExecutionResult> {
    const startTime = Date.now()
    const executionId = `${adapterId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    logger.debug('Starting adapter execution', {
      executionId,
      adapterId,
      contextType: context.type,
    })

    try {
      // Get adapter with health check
      const adapter = await this.get(adapterId)
      if (!adapter) {
        throw new Error(`Adapter not found: ${adapterId}`)
      }

      const entry = this.adapters.get(adapterId)!

      // Check execution cache
      const cacheKey = this.generateCacheKey(adapterId, args)
      if (this.config.executionCache?.enabled) {
        const cachedResult = this.executionCache.get(cacheKey)
        if (cachedResult) {
          logger.debug('Returning cached execution result', { executionId, adapterId })
          this.metrics.recordCacheHit(adapterId)
          return cachedResult
        }
        this.metrics.recordCacheMiss(adapterId)
      }

      // Apply pre-execution plugins
      const adapterContext = {
        ...context,
        toolId: adapterId,
        adapterVersion: entry.metadata.version || '1.0.0',
        startedAt: new Date(),
        requestSource: 'enhanced_registry',
      }
      await this.pluginExecutor.onBeforeExecution(entry, adapterContext, args)

      // Execute with failover support
      const result = await this.failoverManager.executeWithFailover(
        adapter,
        adapterContext,
        args,
        executionId
      )

      // Apply post-execution plugins
      await this.pluginExecutor.onAfterExecution(entry, adapterContext, result)

      // Update statistics
      const duration = Date.now() - startTime
      this.updateExecutionStatistics(entry, duration, true)

      // Cache result if successful
      if (this.config.executionCache?.enabled && result.success) {
        this.executionCache.set(cacheKey, result)
        setTimeout(
          () => this.executionCache.delete(cacheKey),
          this.config.executionCache?.ttlMs || 300000
        )
      }

      // Update performance tracking
      this.performanceTracker.recordExecution(adapterId, duration, result.success)

      // Emit event
      this.emit('adapter:executed', { entry, result, duration })

      logger.debug('Adapter execution completed', {
        executionId,
        adapterId,
        success: result.success,
        duration,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const entry = this.adapters.get(adapterId)

      if (entry) {
        this.updateExecutionStatistics(entry, duration, false)
        const errorObj = error instanceof Error ? error : new Error(String(error))
        const adapterContext = {
          ...context,
          toolId: adapterId,
          adapterVersion: entry.metadata.version || '1.0.0',
          startedAt: new Date(),
          requestSource: 'enhanced_registry',
        }
        await this.pluginExecutor.onError(entry, adapterContext, errorObj)
      }

      this.performanceTracker.recordExecution(adapterId, duration, false)

      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Adapter execution failed', {
        executionId,
        adapterId,
        duration,
        error: errorMessage,
      })

      // Emit error event
      this.emit('adapter:error', { adapterId, error, duration })

      // Return error result
      return {
        success: false,
        executionId,
        toolId: adapterId,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: duration,
        error: {
          type: error instanceof Error ? error.constructor.name : 'UnknownError',
          message: error instanceof Error ? error.message : String(error),
          recoverable: error instanceof Error ? this.isRecoverableError(error) : false,
        },
      }
    }
  }

  /**
   * Advanced tool discovery with caching and relevance scoring
   */
  async discover(query: ToolDiscoveryQuery): Promise<DiscoveredTool[]> {
    // Check discovery cache
    const cacheKey = this.generateDiscoveryCacheKey(query)
    if (this.config.discoveryCache?.enabled) {
      const cached = this.discoveryCache.get(cacheKey)
      if (cached) {
        logger.debug('Returning cached discovery results', { query: query.query })
        return cached
      }
    }

    const results: DiscoveredTool[] = []
    const scoringContext = await this.buildScoringContext(query)

    // Search through registered adapters
    for (const [id, entry] of Array.from(this.adapters.entries())) {
      // Skip unhealthy adapters unless specifically requested
      if (entry.health?.status === 'unhealthy' && !query.includeUnhealthy) {
        continue
      }

      const relevanceScore = await this.calculateRelevanceScore(entry, query, scoringContext)

      if (relevanceScore > 0) {
        const discovered: DiscoveredTool = {
          id,
          name: entry.config.displayName || entry.simTool.name,
          description: entry.config.description || '',
          category: entry.metadata.category,
          tags: entry.metadata.tags,
          relevanceScore,
          usageStats: {
            executionCount: entry.statistics?.executionCount || 0,
            successRate: entry.statistics?.successRate || 0,
            averageRating: this.analytics.getAverageRating(id),
          },
          capabilities: this.extractCapabilities(entry),
          requirements: this.extractRequirements(entry),
          performance: {
            averageExecutionTimeMs: entry.statistics?.averageExecutionTimeMs || 0,
            healthStatus: entry.health?.status || 'unknown',
            lastUsed: entry.statistics?.lastUsed,
          },
          popularity: this.analytics.getPopularityScore(id),
        }

        results.push(discovered)
      }
    }

    // Sort by relevance and apply ordering
    this.applyDiscoveryOrdering(results, query)

    // Apply pagination
    const paginatedResults = this.applyPagination(results, query)

    // Cache results
    if (this.config.discoveryCache?.enabled) {
      this.discoveryCache.set(cacheKey, paginatedResults)
      setTimeout(
        () => this.discoveryCache.delete(cacheKey),
        this.config.discoveryCache?.ttlMs || 60000
      )
    }

    logger.debug('Discovery completed', {
      query: query.query,
      totalFound: results.length,
      returned: paginatedResults.length,
    })

    return paginatedResults
  }

  /**
   * Get comprehensive registry statistics
   */
  getStatistics(): EnhancedRegistryStats {
    const now = Date.now()
    const entries = Array.from(this.adapters.values())

    const stats: EnhancedRegistryStats = {
      // Basic counts
      totalAdapters: entries.length,
      healthyAdapters: entries.filter((e) => e.health?.status === 'healthy').length,
      degradedAdapters: entries.filter((e) => e.health?.status === 'degraded').length,
      unhealthyAdapters: entries.filter((e) => e.health?.status === 'unhealthy').length,

      // Performance metrics
      totalExecutions: entries.reduce((sum, e) => sum + (e.statistics?.executionCount || 0), 0),
      averageSuccessRate: this.calculateAverageSuccessRate(entries),
      averageExecutionTime: this.calculateAverageExecutionTime(entries),

      // Category and tag distributions
      categoryDistribution: this.getCategoryDistribution(),
      tagDistribution: this.getTagDistribution(),

      // Cache performance
      cacheHitRate: this.metrics.getCacheHitRate(),
      cacheSize: this.executionCache.size,

      // System metrics
      memoryUsageMB: this.getMemoryUsage(),
      uptime: now - this.startTime,

      // Plugin information
      pluginsLoaded: this.plugins.size,

      // Recent activity
      recentActivity: this.getRecentActivity(),

      // Health summary
      healthSummary: this.getHealthSummary(entries),
    }

    return stats
  }

  /**
   * Register a plugin for extending functionality
   */
  async registerPlugin(plugin: AdapterPlugin): Promise<void> {
    // Validate plugin
    if (!plugin.name || !plugin.version) {
      throw new Error('Plugin must have name and version')
    }

    if (this.plugins.has(plugin.name)) {
      logger.warn('Overwriting existing plugin', { name: plugin.name })
    }

    // Check dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin dependency not found: ${dep}`)
        }
      }
    }

    // Register plugin
    this.plugins.set(plugin.name, plugin)

    // Apply to existing adapters if needed
    if (plugin.onInitialize) {
      for (const entry of Array.from(this.adapters.values())) {
        try {
          await plugin.onInitialize(entry.adapter)
        } catch (error) {
          logger.warn('Failed to initialize plugin for existing adapter', {
            plugin: plugin.name,
            adapterId: entry.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    logger.info('Plugin registered successfully', {
      name: plugin.name,
      version: plugin.version,
      dependencies: plugin.dependencies?.length || 0,
    })
  }

  /**
   * Get adapters by health status
   */
  getAdaptersByHealth(status: 'healthy' | 'degraded' | 'unhealthy'): AdapterRegistryEntry[] {
    return Array.from(this.adapters.values()).filter((entry) => entry.health?.status === status)
  }

  /**
   * Force health check on specific adapter
   */
  async checkAdapterHealth(adapterId: string): Promise<void> {
    const entry = this.adapters.get(adapterId)
    if (!entry) {
      throw new Error(`Adapter not found: ${adapterId}`)
    }

    await this.healthMonitor.performHealthCheck(entry)
  }

  /**
   * Graceful shutdown with cleanup
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return
    }

    this.isShuttingDown = true
    logger.info('Starting registry shutdown')

    try {
      // Stop health monitoring
      await this.healthMonitor.shutdown()

      // Stop performance tracking
      await this.performanceTracker.shutdown()

      // Cleanup all adapters
      const cleanupPromises = Array.from(this.adapters.values())
        .filter((entry) => entry.adapter && 'cleanup' in entry.adapter)
        .map((entry) => entry.adapter.cleanup!())

      await Promise.allSettled(cleanupPromises)

      // Clear caches
      this.discoveryCache.clear()
      this.executionCache.clear()

      // Save analytics
      await this.analytics.flush()

      logger.info('Registry shutdown completed')
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // Private helper methods

  private startPeriodicTasks(): void {
    // Health monitoring
    setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.healthMonitor.performPeriodicChecks()
      }
    }, this.config.healthCheckIntervalMs)

    // Cache cleanup
    setInterval(() => {
      if (!this.isShuttingDown) {
        this.performCacheCleanup()
      }
    }, 60000) // Every minute

    // Metrics collection
    setInterval(() => {
      if (!this.isShuttingDown) {
        this.metrics.collectMetrics(this.adapters)
      }
    }, 30000) // Every 30 seconds
  }

  private updateCategoryIndex(adapterId: string, category: string): void {
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set())
    }
    this.categories.get(category)!.add(adapterId)
  }

  private updateTagIndex(adapterId: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set())
      }
      this.tags.get(tag)!.add(adapterId)
    }
  }

  private removeFromCategoryIndex(adapterId: string, category: string): void {
    const categorySet = this.categories.get(category)
    if (categorySet) {
      categorySet.delete(adapterId)
      if (categorySet.size === 0) {
        this.categories.delete(category)
      }
    }
  }

  private removeFromTagIndex(adapterId: string, tags: string[]): void {
    for (const tag of tags) {
      const tagSet = this.tags.get(tag)
      if (tagSet) {
        tagSet.delete(adapterId)
        if (tagSet.size === 0) {
          this.tags.delete(tag)
        }
      }
    }
  }

  private clearDiscoveryCache(): void {
    this.discoveryCache.clear()
  }

  private clearExecutionCache(adapterId?: string): void {
    if (adapterId) {
      // Clear only caches for specific adapter
      for (const [key] of Array.from(this.executionCache.entries())) {
        if (key.startsWith(adapterId)) {
          this.executionCache.delete(key)
        }
      }
    } else {
      this.executionCache.clear()
    }
  }

  private generateCacheKey(adapterId: string, args: any): string {
    return `${adapterId}_${JSON.stringify(args)}`
  }

  private generateDiscoveryCacheKey(query: ToolDiscoveryQuery): string {
    return JSON.stringify(query)
  }

  private async findHealthyAlternative(
    entry: AdapterRegistryEntry
  ): Promise<AdapterRegistryEntry | undefined> {
    // Find adapters with similar capabilities
    const candidates = Array.from(this.adapters.values()).filter(
      (candidate) =>
        candidate.id !== entry.id &&
        candidate.health?.status === 'healthy' &&
        candidate.metadata.category === entry.metadata.category
    )

    if (candidates.length === 0) {
      return undefined
    }

    // Return the one with best performance
    return candidates.reduce((best, current) => {
      const currentSuccessRate = current.statistics?.successRate || 0
      const bestSuccessRate = best.statistics?.successRate || 0
      return currentSuccessRate > bestSuccessRate ? current : best
    })
  }

  private updateExecutionStatistics(
    entry: AdapterRegistryEntry,
    duration: number,
    success: boolean
  ): void {
    if (!entry.statistics) {
      logger.warn('Entry statistics is undefined', { entryId: entry.id })
      return
    }

    const stats = entry.statistics

    // Update execution count
    stats.executionCount++

    // Update success rate (exponential moving average)
    const alpha = 0.1 // Smoothing factor
    stats.successRate = stats.successRate * (1 - alpha) + (success ? 1 : 0) * alpha

    // Update average execution time (exponential moving average)
    stats.averageExecutionTimeMs = stats.averageExecutionTimeMs * (1 - alpha) + duration * alpha

    // Update error count
    if (!success) {
      stats.errorCount++
    }

    // Update last used
    stats.lastUsed = new Date()
  }

  private async buildScoringContext(query: ToolDiscoveryQuery): Promise<ScoringContext> {
    return {
      currentTime: Date.now(),
      userPreferences: await this.analytics.getUserPreferences(query.userId),
      workspaceContext: await this.analytics.getWorkspaceContext(query.workspaceId),
      trendingTools: await this.analytics.getTrendingTools(),
    }
  }

  private async calculateRelevanceScore(
    entry: AdapterRegistryEntry,
    query: ToolDiscoveryQuery,
    context: ScoringContext
  ): Promise<number> {
    let score = 0

    // Text matching
    if (query.query) {
      score += this.calculateTextMatchScore(entry, query.query)
    }

    // Category matching
    if (query.category && entry.metadata.category === query.category) {
      score += 20
    }

    // Tag matching
    if (query.tags) {
      const matchingTags = query.tags.filter((tag) => entry.metadata.tags.includes(tag))
      score += matchingTags.length * 5
    }

    // Performance scoring
    score += (entry.statistics?.successRate || 0) * 10
    score += Math.max(0, 10 - (entry.statistics?.averageExecutionTimeMs || 0) / 1000) // Faster = better

    // Health status penalty
    if (entry.health?.status === 'degraded') score *= 0.8
    if (entry.health?.status === 'unhealthy') score *= 0.3

    // Popularity boost
    const popularity = this.analytics.getPopularityScore(entry.id)
    score += popularity * 2

    // User preference boost
    if (context.userPreferences?.preferredTools?.includes(entry.id)) {
      score += 15
    }

    return Math.max(0, score)
  }

  private calculateTextMatchScore(entry: AdapterRegistryEntry, searchText: string): number {
    const text = searchText.toLowerCase()
    let score = 0

    const name = (entry.config.displayName || entry.simTool.name || '').toLowerCase()
    const description = (entry.config.description || '').toLowerCase()
    const tags = entry.metadata.tags.join(' ').toLowerCase()

    // Exact name match
    if (name === text) score += 50
    // Name contains text
    else if (name.includes(text)) score += 30
    // Description contains text
    else if (description.includes(text)) score += 15
    // Tags contain text
    else if (tags.includes(text)) score += 10

    // Word matching
    const words = text.split(/\s+/)
    for (const word of words) {
      if (name.includes(word)) score += 5
      if (description.includes(word)) score += 3
      if (tags.includes(word)) score += 2
    }

    return score
  }

  private applyDiscoveryOrdering(results: DiscoveredTool[], query: ToolDiscoveryQuery): void {
    switch (query.orderBy) {
      case 'relevance':
        results.sort((a, b) => b.relevanceScore - a.relevanceScore)
        break
      case 'usage':
        results.sort((a, b) => b.usageStats.executionCount - a.usageStats.executionCount)
        break
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'category':
        results.sort((a, b) => a.category.localeCompare(b.category))
        break
      default:
        results.sort((a, b) => b.relevanceScore - a.relevanceScore)
        break
    }
  }

  private applyPagination(results: DiscoveredTool[], query: ToolDiscoveryQuery): DiscoveredTool[] {
    if (!query.limit) return results

    const offset = query.offset || 0
    return results.slice(offset, offset + query.limit)
  }

  private isRecoverableError(error: Error): boolean {
    // Define which errors are potentially recoverable
    const recoverableErrors = [
      'NetworkError',
      'TimeoutError',
      'RateLimitError',
      'TemporaryServiceUnavailable',
    ]

    return recoverableErrors.includes(error.constructor.name)
  }

  private extractCapabilities(entry: AdapterRegistryEntry): string[] {
    const capabilities = [...entry.metadata.tags]

    // Add capabilities based on configuration
    if (entry.config.naturalLanguage) {
      capabilities.push('natural_language')
    }
    if (entry.config.caching?.enabled) {
      capabilities.push('caching')
    }
    // Monitoring capability check - removed due to MonitoringConfig interface mismatch
    // if (entry.config.monitoring?.enabled) {
    //   capabilities.push('monitoring')
    // }

    return Array.from(new Set(capabilities))
  }

  private extractRequirements(entry: AdapterRegistryEntry): string[] {
    const requirements: string[] = []

    // Security requirements - Removed as security property doesn't exist on AdapterConfiguration
    // TODO: Add security requirements when AdapterConfiguration interface is updated

    // OAuth requirements
    if (entry.metadata.tags.includes('authentication')) {
      requirements.push('authentication')
    }

    return Array.from(new Set(requirements))
  }

  private performCacheCleanup(): void {
    // Clean expired execution cache entries
    // This would be more sophisticated with TTL tracking
    if (this.executionCache.size > (this.config.executionCache?.maxSize || 500)) {
      const keysToDelete = Array.from(this.executionCache.keys()).slice(
        0,
        Math.floor(this.executionCache.size * 0.1)
      )

      keysToDelete.forEach((key) => this.executionCache.delete(key))
    }

    // Clean discovery cache
    if (this.discoveryCache.size > (this.config.discoveryCache?.maxSize || 100)) {
      const keysToDelete = Array.from(this.discoveryCache.keys()).slice(
        0,
        Math.floor(this.discoveryCache.size * 0.1)
      )

      keysToDelete.forEach((key) => this.discoveryCache.delete(key))
    }
  }

  private calculateAverageSuccessRate(entries: AdapterRegistryEntry[]): number {
    if (entries.length === 0) return 0
    return entries.reduce((sum, e) => sum + (e.statistics?.successRate || 0), 0) / entries.length
  }

  private calculateAverageExecutionTime(entries: AdapterRegistryEntry[]): number {
    if (entries.length === 0) return 0
    return (
      entries.reduce((sum, e) => sum + (e.statistics?.averageExecutionTimeMs || 0), 0) /
      entries.length
    )
  }

  private getCategoryDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {}
    for (const [category, adapters] of Array.from(this.categories.entries())) {
      distribution[category] = adapters.size
    }
    return distribution
  }

  private getTagDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {}
    for (const [tag, adapters] of Array.from(this.tags.entries())) {
      distribution[tag] = adapters.size
    }
    return distribution
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    }
    return 0
  }

  private getRecentActivity(): RecentActivity {
    const now = Date.now()
    const oneHourAgo = now - 3600000

    const recentExecutions = Array.from(this.adapters.values()).filter(
      (e) => e.statistics?.lastUsed && e.statistics.lastUsed.getTime() > oneHourAgo
    ).length

    return {
      executionsLastHour: recentExecutions,
      newAdaptersLast24h: Array.from(this.adapters.values()).filter(
        (e) => e.metadata.registeredAt.getTime() > now - 86400000
      ).length,
    }
  }

  private getHealthSummary(entries: AdapterRegistryEntry[]): HealthSummary {
    const healthIssues = entries
      .filter((e) => e.health?.issues && e.health.issues.length > 0)
      .map((e) => ({
        adapterId: e.id,
        issues: e.health?.issues || [],
      }))

    return {
      totalIssues: healthIssues.reduce((sum, h) => sum + h.issues.length, 0),
      adaptersWithIssues: healthIssues.length,
      criticalIssues: healthIssues.filter((h) =>
        h.issues.some((issue) => issue.includes('critical'))
      ).length,
    }
  }
}

// Supporting classes for the enhanced registry

class HealthMonitor {
  private readonly checkIntervals = new Map<string, NodeJS.Timeout>()

  constructor(
    private readonly config: RegistryConfiguration,
    private readonly registry: EnhancedAdapterRegistry
  ) {}

  async initializeAdapter(entry: AdapterRegistryEntry): Promise<void> {
    // Perform initial health check
    await this.performHealthCheck(entry)

    // Set up periodic monitoring
    const interval = setInterval(async () => {
      await this.performHealthCheck(entry)
    }, this.config.healthCheckIntervalMs)

    this.checkIntervals.set(entry.id, interval)
  }

  async performHealthCheck(entry: AdapterRegistryEntry): Promise<void> {
    try {
      const startTime = Date.now()
      const issues: string[] = []

      // Check adapter responsiveness
      if (entry.adapter && 'healthCheck' in entry.adapter) {
        const healthResult = await entry.adapter.healthCheck()
        if (!healthResult.healthy) {
          issues.push(...(healthResult.issues || ['Health check failed']))
        }
      }

      // Check success rate
      if (entry.statistics && entry.statistics.successRate < 0.5) {
        issues.push(`Low success rate: ${entry.statistics.successRate.toFixed(2)}`)
      }

      // Check if adapter is being used
      const lastUsed = entry.statistics?.lastUsed
      if (lastUsed && Date.now() - lastUsed.getTime() > 86400000) {
        // 24 hours
        issues.push('Adapter not used in 24 hours')
      }

      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy'
      if (issues.length === 0) {
        status = 'healthy'
      } else if (issues.length <= 2 && !issues.some((i) => i.includes('critical'))) {
        status = 'degraded'
      } else {
        status = 'unhealthy'
      }

      // Update health info
      entry.health = {
        status,
        lastCheckAt: new Date(),
        issues: issues.length > 0 ? issues : [],
      }

      const duration = Date.now() - startTime
      logger.debug('Health check completed', {
        adapterId: entry.id,
        status,
        issuesCount: issues.length,
        duration,
      })
    } catch (error) {
      entry.health = {
        status: 'unhealthy',
        lastCheckAt: new Date(),
        issues: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
      }

      logger.warn('Health check error', {
        adapterId: entry.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async performPeriodicChecks(): Promise<void> {
    // This could be implemented to check overall system health
  }

  async stopMonitoring(adapterId: string): Promise<void> {
    const interval = this.checkIntervals.get(adapterId)
    if (interval) {
      clearInterval(interval)
      this.checkIntervals.delete(adapterId)
    }
  }

  async shutdown(): Promise<void> {
    for (const interval of Array.from(this.checkIntervals.values())) {
      clearInterval(interval)
    }
    this.checkIntervals.clear()
  }
}

class PerformanceTracker {
  private readonly executionHistory = new Map<string, ExecutionRecord[]>()

  constructor(private readonly config: RegistryConfiguration) {}

  recordExecution(adapterId: string, duration: number, success: boolean): void {
    if (!this.executionHistory.has(adapterId)) {
      this.executionHistory.set(adapterId, [])
    }

    const history = this.executionHistory.get(adapterId)!
    const record: ExecutionRecord = {
      timestamp: Date.now(),
      duration,
      success,
    }

    history.push(record)

    // Keep only records within the performance window
    const cutoff = Date.now() - (this.config.performanceWindowMs || 300000)
    const filtered = history.filter((r) => r.timestamp > cutoff)
    this.executionHistory.set(adapterId, filtered)
  }

  getPerformanceMetrics(adapterId: string): PerformanceMetrics {
    const history = this.executionHistory.get(adapterId) || []

    if (history.length === 0) {
      return {
        averageDuration: 0,
        successRate: 0,
        executionCount: 0,
        p95Duration: 0,
        p99Duration: 0,
      }
    }

    const durations = history.map((r) => r.duration).sort((a, b) => a - b)
    const successes = history.filter((r) => r.success).length

    return {
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      successRate: successes / history.length,
      executionCount: history.length,
      p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
      p99Duration: durations[Math.floor(durations.length * 0.99)] || 0,
    }
  }

  async shutdown(): Promise<void> {
    this.executionHistory.clear()
  }
}

class FailoverManager {
  constructor(
    private readonly config: RegistryConfiguration,
    private readonly registry: EnhancedAdapterRegistry
  ) {}

  async executeWithFailover(
    adapter: BaseAdapter,
    context: ParlantExecutionContext,
    args: any,
    executionId: string
  ): Promise<AdapterExecutionResult> {
    const maxRetries = this.config.failover?.maxRetries || 3
    const backoffMs = this.config.failover?.backoffMs || 1000

    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add execution context
        const enhancedContext = {
          ...context,
          executionId,
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
        }

        const result = await adapter.execute(enhancedContext, args)

        return {
          success: true,
          executionId,
          toolId: adapter.id,
          startedAt: new Date(),
          completedAt: new Date(),
          durationMs: 0, // Will be calculated by caller
          data: result.data,
          metadata: {
            attempts: attempt + 1,
            ...result.metadata,
          },
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < maxRetries) {
          logger.warn('Execution failed, retrying', {
            executionId,
            adapterId: adapter.id,
            attempt: attempt + 1,
            error: error instanceof Error ? error.message : String(error),
          })

          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, backoffMs * 2 ** attempt))
        }
      }
    }

    throw lastError || new Error('Execution failed after all retries')
  }
}

class PluginExecutor {
  constructor(private readonly plugins: Map<string, AdapterPlugin>) {}

  async onAdapterRegistered(entry: AdapterRegistryEntry): Promise<void> {
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onInitialize) {
        try {
          await plugin.onInitialize(entry.adapter)
        } catch (error) {
          logger.warn('Plugin initialization failed', {
            plugin: plugin.name,
            adapterId: entry.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
  }

  async onAdapterUnregistered(entry: AdapterRegistryEntry): Promise<void> {
    // Could add plugin cleanup hooks here
  }

  async onBeforeExecution(entry: AdapterRegistryEntry, context: any, args: any): Promise<void> {
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onBeforeExecution) {
        try {
          await plugin.onBeforeExecution(context, args)
        } catch (error) {
          logger.warn('Plugin pre-execution failed', {
            plugin: plugin.name,
            adapterId: entry.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
  }

  async onAfterExecution(
    entry: AdapterRegistryEntry,
    context: any,
    result: AdapterExecutionResult
  ): Promise<void> {
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onAfterExecution) {
        try {
          await plugin.onAfterExecution(context, result)
        } catch (error) {
          logger.warn('Plugin post-execution failed', {
            plugin: plugin.name,
            adapterId: entry.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
  }

  async onError(entry: AdapterRegistryEntry, context: any, error: Error): Promise<void> {
    for (const plugin of Array.from(this.plugins.values())) {
      if (plugin.onError) {
        try {
          await plugin.onError(error, context)
        } catch (pluginError) {
          logger.warn('Plugin error handler failed', {
            plugin: plugin.name,
            adapterId: entry.id,
            error: pluginError instanceof Error ? pluginError.message : String(pluginError),
          })
        }
      }
    }
  }
}

class RegistryMetrics {
  private cacheHits = 0
  private cacheMisses = 0

  constructor(private readonly config: RegistryConfiguration) {}

  recordCacheHit(adapterId: string): void {
    this.cacheHits++
  }

  recordCacheMiss(adapterId: string): void {
    this.cacheMisses++
  }

  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses
    return total > 0 ? this.cacheHits / total : 0
  }

  recordAdapterRegistration(entry: AdapterRegistryEntry): void {
    // Record metrics about new adapter registration
  }

  collectMetrics(adapters: Map<string, AdapterRegistryEntry>): void {
    // Collect periodic metrics
  }
}

class RegistryAnalytics {
  async getUserPreferences(userId?: string): Promise<UserPreferences | undefined> {
    if (!userId) return undefined
    // Would fetch from analytics storage
    return undefined
  }

  async getWorkspaceContext(workspaceId?: string): Promise<WorkspaceContext | undefined> {
    if (!workspaceId) return undefined
    // Would fetch workspace-specific context
    return undefined
  }

  async getTrendingTools(): Promise<string[]> {
    // Would calculate trending tools based on recent usage
    return []
  }

  getAverageRating(adapterId: string): number | undefined {
    // Would fetch from ratings storage
    return undefined
  }

  getPopularityScore(adapterId: string): number {
    // Would calculate based on usage frequency, recency, etc.
    return 0
  }

  async flush(): Promise<void> {
    // Save analytics data
  }
}

class LoadBalancer {}

// Supporting interfaces and types

interface RegistryConfiguration {
  maxAdapters?: number
  healthCheckIntervalMs?: number
  performanceWindowMs?: number
  discoveryCache?: {
    enabled: boolean
    ttlMs: number
    maxSize: number
  }
  executionCache?: {
    enabled: boolean
    ttlMs: number
    maxSize: number
  }
  failover?: {
    enabled: boolean
    maxRetries: number
    backoffMs: number
    circuitBreakerThreshold: number
  }
  metrics?: {
    enabled: boolean
    retentionDays: number
  }
  loadBalancing?: {
    enabled: boolean
    strategy: 'round_robin' | 'least_connections' | 'weighted'
  }
}

interface EnhancedRegistryStats {
  totalAdapters: number
  healthyAdapters: number
  degradedAdapters: number
  unhealthyAdapters: number
  totalExecutions: number
  averageSuccessRate: number
  averageExecutionTime: number
  categoryDistribution: Record<string, number>
  tagDistribution: Record<string, number>
  cacheHitRate: number
  cacheSize: number
  memoryUsageMB: number
  uptime: number
  pluginsLoaded: number
  recentActivity: RecentActivity
  healthSummary: HealthSummary
}

interface ScoringContext {
  currentTime: number
  userPreferences?: UserPreferences
  workspaceContext?: WorkspaceContext
  trendingTools: string[]
}

interface UserPreferences {
  preferredTools?: string[]
  preferredCategories?: string[]
  recentlyUsed?: string[]
}

interface WorkspaceContext {
  activeIntegrations?: string[]
  permissions?: string[]
  preferences?: Record<string, any>
}

interface ExecutionRecord {
  timestamp: number
  duration: number
  success: boolean
}

interface PerformanceMetrics {
  averageDuration: number
  successRate: number
  executionCount: number
  p95Duration: number
  p99Duration: number
}

interface RecentActivity {
  executionsLastHour: number
  newAdaptersLast24h: number
}

interface HealthSummary {
  totalIssues: number
  adaptersWithIssues: number
  criticalIssues: number
}

// Extend the DiscoveredTool interface with additional fields
declare module '../types/adapter-interfaces' {
  interface DiscoveredTool {
    performance?: {
      averageExecutionTimeMs: number
      healthStatus: string
      lastUsed?: Date
    }
    popularity?: number
  }

  interface ToolDiscoveryQuery {
    includeUnhealthy?: boolean
  }
}
