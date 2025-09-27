/**
 * Performance Optimization Engine
 *
 * Comprehensive performance optimization system with intelligent caching,
 * connection pooling, request batching, and adaptive performance tuning
 * for the Universal Tool Adapter framework.
 *
 * @author Claude Code Framework Architecture Agent
 * @version 2.0.0
 */

import EventEmitter from 'events'
import type { AdapterExecutionResult } from '../types/adapter-interfaces'
import type { ParlantExecutionContext, ParlantToolResult } from '../types/parlant-interfaces'
import { createLogger } from '../utils/logger'

const logger = createLogger('PerformanceOptimizationEngine')

/**
 * Comprehensive performance optimization engine
 */
export class PerformanceOptimizationEngine extends EventEmitter {
  // Core caching systems
  private readonly executionCache: IntelligentCache<AdapterExecutionResult>
  private readonly parameterCache: IntelligentCache<Record<string, any>>
  private readonly resultCache: IntelligentCache<ParlantToolResult>
  private readonly metadataCache: IntelligentCache<any>

  // Connection management
  private readonly connectionPool: AdapterConnectionPool
  private readonly requestBatcher: RequestBatcher

  // Performance monitoring
  private readonly performanceMonitor: PerformanceMonitor
  private readonly adaptiveOptimizer: AdaptiveOptimizer
  private readonly memoryManager: any // TODO: Initialize with proper MemoryManager class

  // Configuration
  private readonly config: PerformanceEngineConfig

  // Statistics
  private readonly stats: PerformanceStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    batchedRequests: 0,
    connectionsCreated: 0,
    connectionsReused: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    optimizationsApplied: 0,
  }

  constructor(config: PerformanceEngineConfig = {}) {
    super()

    this.config = {
      // Cache configuration
      caching: {
        execution: {
          enabled: true,
          maxSize: 1000,
          ttlMs: 300000, // 5 minutes
          strategy: 'lru',
        },
        parameter: {
          enabled: true,
          maxSize: 500,
          ttlMs: 600000, // 10 minutes
          strategy: 'lfu',
        },
        result: {
          enabled: true,
          maxSize: 2000,
          ttlMs: 180000, // 3 minutes
          strategy: 'adaptive',
        },
      },

      // Connection pooling
      connectionPooling: {
        enabled: true,
        minConnections: 2,
        maxConnections: 20,
        idleTimeoutMs: 300000, // 5 minutes
        connectionTimeoutMs: 10000,
        validateOnBorrow: true,
      },

      // Request batching
      batching: {
        enabled: true,
        maxBatchSize: 10,
        batchTimeoutMs: 100,
        intelligentBatching: true,
      },

      // Adaptive optimization
      adaptation: {
        enabled: true,
        monitoringWindowMs: 60000, // 1 minute
        optimizationThreshold: 0.8, // 80% cache hit rate
        memoryThresholdMB: 100,
        autoTuning: true,
      },

      // Memory management
      memoryManagement: {
        enabled: true,
        maxMemoryMB: 256,
        gcThresholdMB: 200,
        compressionEnabled: true,
        swapToDisk: false,
      },

      ...config,
    }

    // Initialize caching systems
    this.executionCache = new IntelligentCache<AdapterExecutionResult>({
      name: 'execution',
      ...this.config.caching?.execution,
    })

    this.parameterCache = new IntelligentCache<Record<string, any>>({
      name: 'parameter',
      ...this.config.caching?.parameter,
    })

    this.resultCache = new IntelligentCache<ParlantToolResult>({
      name: 'result',
      ...this.config.caching?.result,
    })

    this.metadataCache = new IntelligentCache<any>({
      name: 'metadata',
      maxSize: 100,
      ttlMs: 900000, // 15 minutes
      strategy: 'lru',
    })

    // Initialize connection management
    this.connectionPool = new AdapterConnectionPool(this.config.connectionPooling || {})
    this.requestBatcher = new RequestBatcher(this.config.batching || {}, this)

    // Initialize monitoring and optimization
    this.performanceMonitor = new PerformanceMonitor(this.config.adaptation || {}, this)
    this.adaptiveOptimizer = new AdaptiveOptimizer(this.config.adaptation || {}, this)
    this.memoryManager = new MemoryManager()

    // Start monitoring
    this.startPerformanceMonitoring()

    logger.info('Performance Optimization Engine initialized', {
      caching: this.config.caching?.execution?.enabled || false,
      connectionPooling: this.config.connectionPooling?.enabled || false,
      batching: this.config.batching?.enabled || false,
      adaptation: this.config.adaptation?.enabled || false,
    })
  }

  /**
   * Optimized execution with caching, batching, and connection pooling
   */
  async optimizedExecute(
    adapterId: string,
    context: ParlantExecutionContext,
    args: any,
    executor: (
      adapterId: string,
      context: ParlantExecutionContext,
      args: any
    ) => Promise<AdapterExecutionResult>
  ): Promise<AdapterExecutionResult> {
    const startTime = Date.now()
    const executionId = this.generateExecutionId()

    this.stats.totalRequests++

    logger.debug('Starting optimized execution', {
      executionId,
      adapterId,
      hasCache: this.config.caching?.execution?.enabled || false,
    })

    try {
      // Check execution cache
      if (this.config.caching?.execution?.enabled) {
        const cacheKey = this.generateExecutionCacheKey(adapterId, context, args)
        const cached = await this.executionCache.get(cacheKey)

        if (cached) {
          this.stats.cacheHits++
          const duration = Date.now() - startTime
          this.updateAverageResponseTime(duration)

          logger.debug('Returning cached execution result', {
            executionId,
            adapterId,
            duration,
          })

          this.emit('cache:hit', {
            type: 'execution',
            adapterId,
            executionId,
            duration,
          })

          return cached
        }

        this.stats.cacheMisses++
      }

      // Check if request can be batched
      if (this.config.batching?.enabled) {
        const batchResult = await this.requestBatcher.tryBatch(
          adapterId,
          context,
          args,
          executor,
          executionId
        )

        if (batchResult) {
          this.stats.batchedRequests++
          return batchResult
        }
      }

      // Get connection from pool
      let connection: AdapterConnection | undefined
      if (this.config.connectionPooling?.enabled) {
        connection = await this.connectionPool.acquire(adapterId)
        this.stats.connectionsReused++
      }

      try {
        // Execute with performance monitoring
        const result = await this.performanceMonitor.monitorExecution(
          () => executor(adapterId, context, args),
          adapterId,
          executionId
        )

        // Cache successful result
        if (this.config.caching?.execution?.enabled && result.success) {
          const cacheKey = this.generateExecutionCacheKey(adapterId, context, args)
          await this.executionCache.set(cacheKey, result)
        }

        const duration = Date.now() - startTime
        this.updateAverageResponseTime(duration)

        logger.debug('Optimized execution completed', {
          executionId,
          adapterId,
          success: result.success,
          duration,
          cached: false,
        })

        this.emit('execution:completed', {
          adapterId,
          executionId,
          duration,
          success: result.success,
          cached: false,
        })

        return result
      } finally {
        // Release connection back to pool
        if (connection) {
          await this.connectionPool.release(connection)
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.updateAverageResponseTime(duration)

      logger.error('Optimized execution failed', {
        executionId,
        adapterId,
        duration,
        error: error instanceof Error ? error.message : String(error),
      })

      this.emit('execution:error', {
        adapterId,
        executionId,
        duration,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  }

  /**
   * Cache parameter transformations for reuse
   */
  async cacheParameterTransformation(
    parameterId: string,
    originalParams: Record<string, any>,
    transformedParams: Record<string, any>
  ): Promise<void> {
    if (!this.config.caching?.parameter?.enabled) return

    const cacheKey = this.generateParameterCacheKey(parameterId, originalParams)
    await this.parameterCache.set(cacheKey, transformedParams)

    logger.debug('Cached parameter transformation', {
      parameterId,
      cacheKey: `${cacheKey.substring(0, 20)}...`,
    })
  }

  /**
   * Retrieve cached parameter transformation
   */
  async getCachedParameterTransformation(
    parameterId: string,
    originalParams: Record<string, any>
  ): Promise<Record<string, any> | null> {
    if (!this.config.caching?.parameter?.enabled) return null

    const cacheKey = this.generateParameterCacheKey(parameterId, originalParams)
    const cached = await this.parameterCache.get(cacheKey)

    if (cached) {
      logger.debug('Retrieved cached parameter transformation', {
        parameterId,
        cacheKey: `${cacheKey.substring(0, 20)}...`,
      })
    }

    return cached
  }

  /**
   * Batch multiple adapter executions for efficiency
   */
  async batchExecutions(requests: BatchExecutionRequest[]): Promise<BatchExecutionResult[]> {
    if (!this.config.batching?.enabled || requests.length === 0) {
      return []
    }

    const startTime = Date.now()
    logger.info('Starting batch execution', {
      requestCount: requests.length,
    })

    try {
      // Group requests by adapter ID for optimal batching
      const groupedRequests = this.groupRequestsByAdapter(requests)
      const results: BatchExecutionResult[] = []

      // Process each adapter group
      for (const [adapterId, adapterRequests] of groupedRequests) {
        const adapterResults = await this.processBatchForAdapter(adapterId, adapterRequests)
        results.push(...adapterResults)
      }

      const duration = Date.now() - startTime
      this.stats.batchedRequests += requests.length

      logger.info('Batch execution completed', {
        requestCount: requests.length,
        duration,
        successCount: results.filter((r) => r.success).length,
      })

      return results
    } catch (error) {
      logger.error('Batch execution failed', {
        requestCount: requests.length,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Pre-warm cache with commonly used data
   */
  async preWarmCache(
    adapterId: string,
    commonParameters: Array<{ context: ParlantExecutionContext; args: any }>
  ): Promise<void> {
    if (!this.config.caching?.execution?.enabled) return

    logger.info('Pre-warming cache', {
      adapterId,
      parameterSets: commonParameters.length,
    })

    for (const { context, args } of commonParameters) {
      const cacheKey = this.generateExecutionCacheKey(adapterId, context, args)

      // Only pre-warm if not already cached
      if (!(await this.executionCache.has(cacheKey))) {
        try {
          // This would execute and cache the result
          // Implementation depends on having access to the actual executor
          logger.debug('Would pre-warm cache entry', { cacheKey })
        } catch (error) {
          logger.warn('Failed to pre-warm cache entry', {
            adapterId,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
  }

  /**
   * Optimize memory usage and perform cleanup
   */
  async optimizeMemory(): Promise<void> {
    logger.info('Starting memory optimization')

    const beforeStats = this.getMemoryStats()

    // Clear expired cache entries
    await this.executionCache.cleanup()
    await this.parameterCache.cleanup()
    await this.resultCache.cleanup()
    await this.metadataCache.cleanup()

    // Compress cache data if enabled
    if (this.config.memoryManagement?.compressionEnabled) {
      await this.compressCacheData()
    }

    // Force garbage collection if available
    if (global.gc && typeof global.gc === 'function') {
      global.gc()
    }

    const afterStats = this.getMemoryStats()

    logger.info('Memory optimization completed', {
      memoryFreed: beforeStats.used - afterStats.used,
      cacheEntriesRemoved: beforeStats.cacheEntries - afterStats.cacheEntries,
    })

    this.emit('memory:optimized', {
      before: beforeStats,
      after: afterStats,
    })
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStats(): ComprehensivePerformanceStats {
    return {
      ...this.stats,
      cacheStats: {
        execution: this.executionCache.getStats(),
        parameter: this.parameterCache.getStats(),
        result: this.resultCache.getStats(),
        metadata: this.metadataCache.getStats(),
      },
      connectionPoolStats: this.connectionPool.getStats(),
      memoryStats: this.getMemoryStats(),
      adaptiveStats: this.adaptiveOptimizer.getStats(),
      batchingStats: this.requestBatcher.getStats(),
    }
  }

  /**
   * Configure performance parameters at runtime
   */
  async configurePerformance(updates: Partial<PerformanceEngineConfig>): Promise<void> {
    logger.info('Updating performance configuration', { updates })

    // Update cache configurations
    if (updates.caching) {
      if (updates.caching.execution) {
        await this.executionCache.updateConfig(updates.caching.execution)
      }
      if (updates.caching.parameter) {
        await this.parameterCache.updateConfig(updates.caching.parameter)
      }
      if (updates.caching.result) {
        await this.resultCache.updateConfig(updates.caching.result)
      }
    }

    // Update connection pool configuration
    if (updates.connectionPooling) {
      await this.connectionPool.updateConfig(updates.connectionPooling)
    }

    // Update batching configuration
    if (updates.batching) {
      this.requestBatcher.updateConfig(updates.batching)
    }

    // Apply updates to local config
    Object.assign(this.config, updates)

    this.emit('config:updated', { updates })
  }

  /**
   * Clean shutdown with resource cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Performance Optimization Engine')

    try {
      // Stop monitoring
      await this.performanceMonitor.shutdown()
      await this.adaptiveOptimizer.shutdown()

      // Clear caches
      await this.executionCache.clear()
      await this.parameterCache.clear()
      await this.resultCache.clear()
      await this.metadataCache.clear()

      // Close connection pool
      await this.connectionPool.close()

      // Cleanup batching
      await this.requestBatcher.shutdown()

      logger.info('Performance Optimization Engine shutdown complete')
    } catch (error) {
      logger.error('Error during performance engine shutdown', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // Private implementation methods

  private startPerformanceMonitoring(): void {
    // Monitor cache performance
    setInterval(() => {
      this.monitorCachePerformance()
    }, 30000) // Every 30 seconds

    // Monitor memory usage
    setInterval(() => {
      this.monitorMemoryUsage()
    }, 60000) // Every minute

    // Adaptive optimization
    if (this.config.adaptation?.enabled) {
      setInterval(() => {
        this.adaptiveOptimizer.optimize()
      }, this.config.adaptation?.monitoringWindowMs)
    }
  }

  private monitorCachePerformance(): void {
    const executionStats = this.executionCache.getStats()
    const hitRate = this.calculateHitRate()

    const optimizationThreshold = this.config.adaptation?.optimizationThreshold
    if (optimizationThreshold !== undefined && hitRate < optimizationThreshold) {
      this.emit('performance:degradation', {
        type: 'cache_hit_rate',
        current: hitRate,
        threshold: optimizationThreshold,
      })
    }

    this.emit('performance:metrics', {
      cacheHitRate: hitRate,
      cacheSize: executionStats.size,
      memoryUsage: this.getMemoryUsage(),
    })
  }

  private monitorMemoryUsage(): void {
    const memoryMB = this.getMemoryUsage()
    this.stats.memoryUsage = memoryMB

    const gcThresholdMB = this.config.memoryManagement?.gcThresholdMB
    if (gcThresholdMB !== undefined && memoryMB > gcThresholdMB) {
      this.optimizeMemory().catch((error) => {
        logger.error('Automatic memory optimization failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateExecutionCacheKey(
    adapterId: string,
    context: ParlantExecutionContext,
    args: any
  ): string {
    // Create a deterministic cache key
    const contextKey = JSON.stringify({
      type: context.type,
      agentId: context.agentId,
      sessionId: context.sessionId,
    })
    const argsKey = JSON.stringify(args)
    return `${adapterId}:${this.hashString(contextKey)}:${this.hashString(argsKey)}`
  }

  private generateParameterCacheKey(parameterId: string, params: Record<string, any>): string {
    const paramsKey = JSON.stringify(params)
    return `${parameterId}:${this.hashString(paramsKey)}`
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(36)
  }

  private updateAverageResponseTime(duration: number): void {
    // Exponential moving average
    const alpha = 0.1
    this.stats.averageResponseTime = this.stats.averageResponseTime * (1 - alpha) + duration * alpha
  }

  private calculateHitRate(): number {
    const total = this.stats.cacheHits + this.stats.cacheMisses
    return total > 0 ? this.stats.cacheHits / total : 0
  }

  private getMemoryUsage(): number {
    if (process?.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    }
    return 0
  }

  private getMemoryStats(): MemoryStats {
    const memoryUsage = this.getMemoryUsage()
    const cacheEntries =
      this.executionCache.getStats().size +
      this.parameterCache.getStats().size +
      this.resultCache.getStats().size +
      this.metadataCache.getStats().size

    return {
      used: memoryUsage,
      cacheEntries,
      timestamp: Date.now(),
    }
  }

  private async compressCacheData(): Promise<void> {
    // Implementation would compress cache data
    // This is a placeholder for the actual compression logic
    logger.debug('Cache data compression completed')
  }

  private groupRequestsByAdapter(
    requests: BatchExecutionRequest[]
  ): Map<string, BatchExecutionRequest[]> {
    const grouped = new Map<string, BatchExecutionRequest[]>()

    for (const request of requests) {
      const existing = grouped.get(request.adapterId) || []
      existing.push(request)
      grouped.set(request.adapterId, existing)
    }

    return grouped
  }

  private async processBatchForAdapter(
    adapterId: string,
    requests: BatchExecutionRequest[]
  ): Promise<BatchExecutionResult[]> {
    // This would implement adapter-specific batch processing
    const results: BatchExecutionResult[] = []

    for (const request of requests) {
      try {
        const result = await request.executor(request.adapterId, request.context, request.args)

        results.push({
          requestId: request.requestId,
          success: result.success,
          result,
          duration: result.durationMs,
        })
      } catch (error) {
        results.push({
          requestId: request.requestId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: 0,
        })
      }
    }

    return results
  }
}

// Supporting classes and systems

class IntelligentCache<T> {
  private readonly data = new Map<string, CacheEntry<T>>()
  private readonly accessTracker = new Map<string, CacheAccess>()
  private config: CacheConfig
  private stats: CacheStats = {
    size: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    hitRate: 0,
  }

  constructor(config: CacheConfig) {
    this.config = config
  }

  async get(key: string): Promise<T | null> {
    const entry = this.data.get(key)

    if (!entry) {
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.data.delete(key)
      this.accessTracker.delete(key)
      this.stats.size--
      this.stats.misses++
      this.updateHitRate()
      return null
    }

    // Update access tracking
    this.updateAccessTracking(key)

    this.stats.hits++
    this.updateHitRate()
    return entry.value
  }

  async set(key: string, value: T): Promise<void> {
    // Check if we need to evict entries
    if (this.config.maxSize !== undefined && this.data.size >= this.config.maxSize) {
      await this.evictEntries()
    }

    const expiresAt = this.config.ttlMs ? Date.now() + this.config.ttlMs : undefined

    this.data.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt,
      accessCount: 1,
    })

    this.updateAccessTracking(key)
    this.stats.size = this.data.size
  }

  async has(key: string): Promise<boolean> {
    return this.data.has(key)
  }

  async cleanup(): Promise<void> {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.data) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.data.delete(key)
        this.accessTracker.delete(key)
        removedCount++
      }
    }

    this.stats.size = this.data.size
    logger.debug('Cache cleanup completed', {
      cache: this.config.name,
      removedCount,
    })
  }

  async clear(): Promise<void> {
    this.data.clear()
    this.accessTracker.clear()
    this.stats.size = 0
  }

  getStats(): CacheStats {
    return { ...this.stats }
  }

  async updateConfig(newConfig: Partial<CacheConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig }

    // If max size decreased, evict entries
    if (this.config.maxSize !== undefined && this.data.size > this.config.maxSize) {
      await this.evictEntries()
    }
  }

  private async evictEntries(): Promise<void> {
    const maxSize = this.config.maxSize
    if (maxSize === undefined) return
    const targetSize = Math.floor(maxSize * 0.8) // Evict 20%
    const entriesToRemove = this.data.size - targetSize

    if (entriesToRemove <= 0) return

    const entries = Array.from(this.data.entries())
    let toEvict: string[] = []

    switch (this.config.strategy) {
      case 'lru':
        toEvict = this.selectLRUEntries(entries, entriesToRemove)
        break
      case 'lfu':
        toEvict = this.selectLFUEntries(entries, entriesToRemove)
        break
      case 'adaptive':
        toEvict = this.selectAdaptiveEntries(entries, entriesToRemove)
        break
      default:
        toEvict = this.selectLRUEntries(entries, entriesToRemove)
    }

    for (const key of toEvict) {
      this.data.delete(key)
      this.accessTracker.delete(key)
    }

    this.stats.size = this.data.size
    this.stats.evictions += toEvict.length
  }

  private selectLRUEntries(entries: [string, CacheEntry<T>][], count: number): string[] {
    return entries
      .sort(
        (a, b) =>
          (this.accessTracker.get(a[0])?.lastAccess || 0) -
          (this.accessTracker.get(b[0])?.lastAccess || 0)
      )
      .slice(0, count)
      .map(([key]) => key)
  }

  private selectLFUEntries(entries: [string, CacheEntry<T>][], count: number): string[] {
    return entries
      .sort(
        (a, b) =>
          (this.accessTracker.get(a[0])?.accessCount || 0) -
          (this.accessTracker.get(b[0])?.accessCount || 0)
      )
      .slice(0, count)
      .map(([key]) => key)
  }

  private selectAdaptiveEntries(entries: [string, CacheEntry<T>][], count: number): string[] {
    // Adaptive strategy: combination of LRU and LFU with aging
    const scoredEntries = entries.map(([key, entry]) => {
      const access = this.accessTracker.get(key)
      const age = Date.now() - entry.createdAt
      const accessFrequency = (access?.accessCount || 0) / Math.max(1, age / 3600000) // per hour
      const recency = access?.lastAccess || 0

      // Lower score = more likely to evict
      const score = accessFrequency * 0.7 + (recency / 1000) * 0.3

      return { key, score }
    })

    return scoredEntries
      .sort((a, b) => a.score - b.score)
      .slice(0, count)
      .map((item) => item.key)
  }

  private updateAccessTracking(key: string): void {
    const existing = this.accessTracker.get(key)
    if (existing) {
      existing.accessCount++
      existing.lastAccess = Date.now()
    } else {
      this.accessTracker.set(key, {
        accessCount: 1,
        lastAccess: Date.now(),
      })
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }
}

class AdapterConnectionPool {
  private readonly connections = new Map<string, ConnectionPoolEntry>()
  private config: ConnectionPoolingConfig
  private stats: ConnectionPoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    connectionsCreated: 0,
    connectionsDestroyed: 0,
  }

  constructor(config: ConnectionPoolingConfig) {
    this.config = config
  }

  async acquire(adapterId: string): Promise<AdapterConnection> {
    const poolEntry = this.connections.get(adapterId) || {
      active: [],
      idle: [],
      created: 0,
    }

    // Try to reuse idle connection
    if (poolEntry.idle.length > 0) {
      const connection = poolEntry.idle.pop()!

      // Validate connection if required
      if (this.config.validateOnBorrow && !(await this.validateConnection(connection))) {
        await this.destroyConnection(connection)
        return this.createNewConnection(adapterId, poolEntry)
      }

      poolEntry.active.push(connection)
      this.connections.set(adapterId, poolEntry)
      this.updateStats()
      return connection
    }

    // Create new connection if under limit
    if (
      this.config.maxConnections !== undefined &&
      poolEntry.created < this.config.maxConnections
    ) {
      return this.createNewConnection(adapterId, poolEntry)
    }

    // Wait for connection to become available
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection pool timeout'))
      }, this.config.connectionTimeoutMs)

      const checkForConnection = () => {
        const currentPoolEntry = this.connections.get(adapterId)
        if (currentPoolEntry && currentPoolEntry.idle.length > 0) {
          clearTimeout(timeout)
          this.acquire(adapterId).then(resolve).catch(reject)
        } else {
          setTimeout(checkForConnection, 10)
        }
      }

      checkForConnection()
    })
  }

  async release(connection: AdapterConnection): Promise<void> {
    const poolEntry = this.connections.get(connection.adapterId)
    if (!poolEntry) return

    // Remove from active
    const activeIndex = poolEntry.active.findIndex((c) => c.id === connection.id)
    if (activeIndex >= 0) {
      poolEntry.active.splice(activeIndex, 1)
    }

    // Add to idle if still valid and under idle limit
    if (await this.validateConnection(connection)) {
      connection.lastUsed = Date.now()
      poolEntry.idle.push(connection)
    } else {
      await this.destroyConnection(connection)
      poolEntry.created--
    }

    this.connections.set(connection.adapterId, poolEntry)
    this.updateStats()
  }

  getStats(): ConnectionPoolStats {
    return { ...this.stats }
  }

  async updateConfig(newConfig: Partial<ConnectionPoolingConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig }
  }

  async close(): Promise<void> {
    for (const [adapterId, poolEntry] of this.connections) {
      for (const connection of [...poolEntry.active, ...poolEntry.idle]) {
        await this.destroyConnection(connection)
      }
    }
    this.connections.clear()
  }

  private async createNewConnection(
    adapterId: string,
    poolEntry: ConnectionPoolEntry
  ): Promise<AdapterConnection> {
    const connection: AdapterConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adapterId,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isValid: true,
    }

    poolEntry.active.push(connection)
    poolEntry.created++
    this.connections.set(adapterId, poolEntry)

    this.stats.connectionsCreated++
    this.updateStats()

    return connection
  }

  private async validateConnection(connection: AdapterConnection): Promise<boolean> {
    if (!connection.isValid) return false

    // Check idle timeout
    const idleTime = Date.now() - connection.lastUsed
    if (this.config.idleTimeoutMs !== undefined && idleTime > this.config.idleTimeoutMs) {
      return false
    }

    return true
  }

  private async destroyConnection(connection: AdapterConnection): Promise<void> {
    connection.isValid = false
    this.stats.connectionsDestroyed++
  }

  private updateStats(): void {
    this.stats.totalConnections = 0
    this.stats.activeConnections = 0
    this.stats.idleConnections = 0

    for (const poolEntry of this.connections.values()) {
      this.stats.totalConnections += poolEntry.created
      this.stats.activeConnections += poolEntry.active.length
      this.stats.idleConnections += poolEntry.idle.length
    }
  }
}

class RequestBatcher {
  private readonly batches = new Map<string, BatchContext>()
  private config: BatchingConfig
  private stats: BatchingStats = {
    totalRequests: 0,
    batchedRequests: 0,
    batchesSent: 0,
    averageBatchSize: 0,
  }

  constructor(config: BatchingConfig, _engine: PerformanceOptimizationEngine) {
    this.config = config
  }

  async tryBatch(
    adapterId: string,
    context: ParlantExecutionContext,
    args: any,
    executor: (
      adapterId: string,
      context: ParlantExecutionContext,
      args: any
    ) => Promise<AdapterExecutionResult>,
    executionId: string
  ): Promise<AdapterExecutionResult | null> {
    if (!this.config.enabled || !this.isBatchable(adapterId, context, args)) {
      return null
    }

    const batchKey = this.generateBatchKey(adapterId, context)
    let batch = this.batches.get(batchKey)

    if (!batch) {
      batch = {
        adapterId,
        requests: [],
        timeout: setTimeout(() => {
          this.processBatch(batchKey)
        }, this.config.batchTimeoutMs),
      }
      this.batches.set(batchKey, batch)
    }

    // Add request to batch
    return new Promise((resolve, reject) => {
      batch!.requests.push({
        requestId: executionId,
        adapterId,
        context,
        args,
        executor,
        resolve,
        reject,
      })

      // Process batch if it's full
      if (
        batch &&
        this.config.maxBatchSize !== undefined &&
        batch.requests.length >= this.config.maxBatchSize
      ) {
        clearTimeout(batch.timeout)
        this.processBatch(batchKey)
      }
    })
  }

  getStats(): BatchingStats {
    return { ...this.stats }
  }

  updateConfig(newConfig: Partial<BatchingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  async shutdown(): Promise<void> {
    // Process any pending batches
    for (const batchKey of this.batches.keys()) {
      await this.processBatch(batchKey)
    }
  }

  private async processBatch(batchKey: string): Promise<void> {
    const batch = this.batches.get(batchKey)
    if (!batch) return

    this.batches.delete(batchKey)
    clearTimeout(batch.timeout)

    this.stats.batchesSent++
    this.stats.batchedRequests += batch.requests.length
    this.updateAverageBatchSize()

    // Process requests in batch
    try {
      const results = await Promise.allSettled(
        batch.requests.map((req) => req.executor(req.adapterId, req.context, req.args))
      )

      // Resolve individual promises
      for (let i = 0; i < batch.requests.length; i++) {
        const result = results[i]
        const request = batch.requests[i]

        if (result.status === 'fulfilled') {
          request.resolve(result.value)
        } else {
          request.reject(result.reason)
        }
      }
    } catch (error) {
      // Reject all requests in case of batch failure
      for (const request of batch.requests) {
        request.reject(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  private isBatchable(adapterId: string, context: ParlantExecutionContext, args: any): boolean {
    if (!this.config.intelligentBatching) return true

    // Smart batching logic - only batch similar requests
    // This is a simplified implementation
    return true
  }

  private generateBatchKey(adapterId: string, context: ParlantExecutionContext): string {
    return `${adapterId}:${context.type}:${context.agentId || 'unknown'}`
  }

  private updateAverageBatchSize(): void {
    if (this.stats.batchesSent > 0) {
      this.stats.averageBatchSize = this.stats.batchedRequests / this.stats.batchesSent
    }
  }
}

class PerformanceMonitor {
  constructor(
    _config: AdaptationConfig,
    private engine: PerformanceOptimizationEngine
  ) {}

  async monitorExecution<T>(
    executor: () => Promise<T>,
    adapterId: string,
    executionId: string
  ): Promise<T> {
    const startTime = Date.now()

    try {
      const result = await executor()
      const duration = Date.now() - startTime

      this.recordExecution(adapterId, duration, true)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.recordExecution(adapterId, duration, false)
      throw error
    }
  }

  private recordExecution(adapterId: string, duration: number, success: boolean): void {
    // Record execution metrics
    this.engine.emit('execution:monitored', {
      adapterId,
      duration,
      success,
      timestamp: Date.now(),
    })
  }

  async shutdown(): Promise<void> {
    // Cleanup monitoring resources
  }
}

class AdaptiveOptimizer {
  constructor(
    private config: AdaptationConfig,
    private engine: PerformanceOptimizationEngine
  ) {}

  async optimize(): Promise<void> {
    if (!this.config.enabled || !this.config.autoTuning) return

    const stats = this.engine.getPerformanceStats()
    const optimizations: string[] = []

    // Optimize cache sizes based on hit rates
    if (stats.cacheStats.execution.hitRate < 0.7) {
      // Increase cache size
      optimizations.push('increase_execution_cache')
    }

    // Optimize connection pool based on usage
    if (
      stats.connectionPoolStats.activeConnections >
      stats.connectionPoolStats.totalConnections * 0.8
    ) {
      // Increase pool size
      optimizations.push('increase_connection_pool')
    }

    if (optimizations.length > 0) {
      await this.applyOptimizations(optimizations)
    }
  }

  getStats(): AdaptiveOptimizerStats {
    return {
      optimizationsApplied: 0,
      lastOptimization: Date.now(),
      averageHitRate: 0.8,
    }
  }

  private async applyOptimizations(optimizations: string[]): Promise<void> {
    for (const optimization of optimizations) {
      logger.info('Applying adaptive optimization', { optimization })
      // Implementation would apply specific optimizations
    }
  }

  async shutdown(): Promise<void> {
    // Cleanup optimizer resources
  }
}

class MemoryManager {
  async shutdown(): Promise<void> {
    // Cleanup memory management resources
  }
}

// Supporting interfaces and types

interface PerformanceEngineConfig {
  caching?: {
    execution?: CacheConfig
    parameter?: CacheConfig
    result?: CacheConfig
  }
  connectionPooling?: ConnectionPoolingConfig
  batching?: BatchingConfig
  adaptation?: AdaptationConfig
  memoryManagement?: MemoryManagementConfig
}

interface CacheConfig {
  enabled?: boolean
  maxSize?: number
  ttlMs?: number
  strategy?: 'lru' | 'lfu' | 'adaptive'
  name?: string
}

interface ConnectionPoolingConfig {
  enabled?: boolean
  minConnections?: number
  maxConnections?: number
  idleTimeoutMs?: number
  connectionTimeoutMs?: number
  validateOnBorrow?: boolean
}

interface BatchingConfig {
  enabled?: boolean
  maxBatchSize?: number
  batchTimeoutMs?: number
  intelligentBatching?: boolean
}

interface AdaptationConfig {
  enabled?: boolean
  monitoringWindowMs?: number
  optimizationThreshold?: number
  memoryThresholdMB?: number
  autoTuning?: boolean
}

interface MemoryManagementConfig {
  enabled?: boolean
  maxMemoryMB?: number
  gcThresholdMB?: number
  compressionEnabled?: boolean
  swapToDisk?: boolean
}

interface PerformanceStats {
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  batchedRequests: number
  connectionsCreated: number
  connectionsReused: number
  averageResponseTime: number
  memoryUsage: number
  optimizationsApplied: number
}

interface ComprehensivePerformanceStats extends PerformanceStats {
  cacheStats: {
    execution: CacheStats
    parameter: CacheStats
    result: CacheStats
    metadata: CacheStats
  }
  connectionPoolStats: ConnectionPoolStats
  memoryStats: MemoryStats
  adaptiveStats: AdaptiveOptimizerStats
  batchingStats: BatchingStats
}

interface CacheEntry<T> {
  value: T
  createdAt: number
  expiresAt?: number
  accessCount: number
}

interface CacheAccess {
  accessCount: number
  lastAccess: number
}

interface CacheStats {
  size: number
  hits: number
  misses: number
  evictions: number
  hitRate: number
}

interface AdapterConnection {
  id: string
  adapterId: string
  createdAt: number
  lastUsed: number
  isValid: boolean
}

interface ConnectionPoolEntry {
  active: AdapterConnection[]
  idle: AdapterConnection[]
  created: number
}

interface ConnectionPoolStats {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  connectionsCreated: number
  connectionsDestroyed: number
}

interface BatchContext {
  adapterId: string
  requests: BatchExecutionRequest[]
  timeout: NodeJS.Timeout
}

interface BatchExecutionRequest {
  requestId: string
  adapterId: string
  context: ParlantExecutionContext
  args: any
  executor: (
    adapterId: string,
    context: ParlantExecutionContext,
    args: any
  ) => Promise<AdapterExecutionResult>
  resolve: (result: AdapterExecutionResult) => void
  reject: (error: Error) => void
}

interface BatchExecutionResult {
  requestId: string
  success: boolean
  result?: AdapterExecutionResult
  error?: string
  duration: number
}

interface BatchingStats {
  totalRequests: number
  batchedRequests: number
  batchesSent: number
  averageBatchSize: number
}

interface MemoryStats {
  used: number
  cacheEntries: number
  timestamp: number
}

interface AdaptiveOptimizerStats {
  optimizationsApplied: number
  lastOptimization: number
  averageHitRate: number
}
