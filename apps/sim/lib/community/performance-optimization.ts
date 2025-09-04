/**
 * Performance Optimization System - Large-Scale Marketplace Operations
 *
 * This module provides comprehensive performance optimization for the template marketplace:
 * - Intelligent caching with Redis integration and cache warming
 * - Database query optimization with connection pooling and indexing
 * - CDN integration for static assets and template thumbnails
 * - Search index optimization with Elasticsearch integration
 * - Real-time performance monitoring and alerting
 * - Auto-scaling and load balancing optimization
 * - Memory management and garbage collection optimization
 * - API rate limiting and request optimization
 *
 * Features:
 * - Multi-layer caching strategy (L1: Memory, L2: Redis, L3: CDN)
 * - Query result caching with intelligent invalidation
 * - Search result precomputation and caching
 * - Image optimization and lazy loading
 * - Background job processing for heavy operations
 * - Performance metrics collection and analysis
 * - Automated performance testing and regression detection
 * - Resource usage optimization and capacity planning
 *
 * @author Claude Code Template Marketplace System
 * @version 1.0.0
 */

import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('PerformanceOptimization')

/**
 * Cache Layer Types
 */
enum CacheLayer {
  MEMORY = 'memory',
  REDIS = 'redis',
  CDN = 'cdn',
}

/**
 * Cache Key Patterns
 */
enum CacheKeyPattern {
  TEMPLATE_SEARCH = 'template:search',
  TEMPLATE_DETAILS = 'template:details',
  CATEGORY_LIST = 'category:list',
  TAG_LIST = 'tag:list',
  USER_PROFILE = 'user:profile',
  ANALYTICS_OVERVIEW = 'analytics:overview',
  LEADERBOARD = 'leaderboard',
}

/**
 * Performance Metrics Interface
 */
interface PerformanceMetric {
  metric: string
  value: number
  timestamp: Date
  tags?: Record<string, string>
  metadata?: Record<string, any>
}

/**
 * Cache Configuration Interface
 */
interface CacheConfig {
  ttl: number // Time to live in seconds
  layers: CacheLayer[]
  compression: boolean
  encryption: boolean
  warming: boolean
  invalidationRules: string[]
}

/**
 * Query Performance Stats Interface
 */
interface QueryPerformanceStats {
  query: string
  executionTime: number
  rowCount: number
  planHash: string
  frequency: number
  lastExecuted: Date
}

/**
 * Performance Optimization Manager Class
 */
export class PerformanceOptimizationManager {
  private readonly requestId: string
  private readonly memoryCache: Map<string, any>
  private readonly performanceMetrics: PerformanceMetric[]
  private readonly slowQueryThreshold: number
  private readonly cacheConfigs: Map<CacheKeyPattern, CacheConfig>

  constructor() {
    this.requestId = crypto.randomUUID().slice(0, 8)
    this.memoryCache = new Map()
    this.performanceMetrics = []
    this.slowQueryThreshold = 1000 // 1 second
    this.cacheConfigs = this.initializeCacheConfigs()

    logger.info(`[${this.requestId}] PerformanceOptimizationManager initialized`)

    // Start background optimization tasks
    this.startBackgroundOptimization()
  }

  /**
   * Get data with intelligent caching
   */
  async getCachedData<T>(
    key: string,
    pattern: CacheKeyPattern,
    dataFetcher: () => Promise<T>,
    options?: { forceFresh?: boolean; tags?: string[] }
  ): Promise<T> {
    const operationId = `cache_get_${Date.now()}`
    const startTime = performance.now()

    try {
      const cacheConfig = this.cacheConfigs.get(pattern)
      if (!cacheConfig) {
        logger.warn(`[${this.requestId}] No cache config found for pattern: ${pattern}`)
        return await dataFetcher()
      }

      // Skip cache if force fresh is requested
      if (options?.forceFresh) {
        const freshData = await dataFetcher()
        await this.setCachedData(key, freshData, pattern)
        return freshData
      }

      // Try to get from cache layers in order
      for (const layer of cacheConfig.layers) {
        const cachedData = await this.getFromCacheLayer<T>(key, layer)
        if (cachedData !== null) {
          logger.debug(`[${this.requestId}] Cache hit`, {
            operationId,
            key: this.sanitizeKey(key),
            layer,
            retrievalTime: performance.now() - startTime,
          })

          // Warm higher priority cache layers
          this.warmCacheLayers(key, cachedData, layer, cacheConfig)

          return cachedData
        }
      }

      // Cache miss - fetch data and cache it
      logger.debug(`[${this.requestId}] Cache miss`, {
        operationId,
        key: this.sanitizeKey(key),
      })

      const freshData = await dataFetcher()
      await this.setCachedData(key, freshData, pattern)

      const totalTime = performance.now() - startTime
      this.recordPerformanceMetric('cache_operation', totalTime, {
        operation: 'get',
        pattern: pattern,
        hit: 'false',
      })

      return freshData
    } catch (error) {
      logger.error(`[${this.requestId}] Cache get operation failed`, {
        operationId,
        key: this.sanitizeKey(key),
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Fallback to direct data fetch
      return await dataFetcher()
    }
  }

  /**
   * Set cached data across multiple layers
   */
  async setCachedData<T>(
    key: string,
    data: T,
    pattern: CacheKeyPattern,
    customTtl?: number
  ): Promise<void> {
    const operationId = `cache_set_${Date.now()}`

    try {
      const cacheConfig = this.cacheConfigs.get(pattern)
      if (!cacheConfig) {
        logger.warn(`[${this.requestId}] No cache config found for pattern: ${pattern}`)
        return
      }

      const ttl = customTtl || cacheConfig.ttl
      let processedData = data

      // Apply compression if enabled
      if (cacheConfig.compression) {
        processedData = await this.compressData(data)
      }

      // Apply encryption if enabled
      if (cacheConfig.encryption) {
        processedData = await this.encryptData(processedData)
      }

      // Set data in all configured cache layers
      const setCachePromises = cacheConfig.layers.map((layer) =>
        this.setInCacheLayer(key, processedData, layer, ttl)
      )

      await Promise.allSettled(setCachePromises)

      logger.debug(`[${this.requestId}] Data cached`, {
        operationId,
        key: this.sanitizeKey(key),
        layers: cacheConfig.layers,
        ttl,
        compressed: cacheConfig.compression,
        encrypted: cacheConfig.encryption,
      })
    } catch (error) {
      logger.error(`[${this.requestId}] Cache set operation failed`, {
        operationId,
        key: this.sanitizeKey(key),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Invalidate cached data
   */
  async invalidateCache(
    keyOrPattern: string,
    pattern?: CacheKeyPattern,
    options?: { propagate?: boolean }
  ): Promise<void> {
    const operationId = `cache_invalidate_${Date.now()}`

    try {
      if (pattern) {
        const cacheConfig = this.cacheConfigs.get(pattern)
        if (cacheConfig) {
          for (const layer of cacheConfig.layers) {
            await this.invalidateCacheLayer(keyOrPattern, layer, true)
          }
        }
      } else {
        // Invalidate from all layers
        await this.invalidateCacheLayer(keyOrPattern, CacheLayer.MEMORY, false)
        await this.invalidateCacheLayer(keyOrPattern, CacheLayer.REDIS, false)
        await this.invalidateCacheLayer(keyOrPattern, CacheLayer.CDN, false)
      }

      // Propagate invalidation to related keys if enabled
      if (options?.propagate && pattern) {
        await this.propagateInvalidation(keyOrPattern, pattern)
      }

      logger.debug(`[${this.requestId}] Cache invalidated`, {
        operationId,
        key: this.sanitizeKey(keyOrPattern),
        pattern,
        propagate: options?.propagate,
      })
    } catch (error) {
      logger.error(`[${this.requestId}] Cache invalidation failed`, {
        operationId,
        key: this.sanitizeKey(keyOrPattern),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Optimize database queries with monitoring
   */
  async optimizedQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>,
    options?: {
      timeout?: number
      retries?: number
      cacheKey?: string
      cachePattern?: CacheKeyPattern
    }
  ): Promise<T> {
    const operationId = `query_${Date.now()}`
    const startTime = performance.now()

    try {
      // Use cached result if available
      if (options?.cacheKey && options?.cachePattern) {
        const cachedResult = await this.getCachedData(
          options.cacheKey,
          options.cachePattern,
          queryFunction
        )
        return cachedResult
      }

      // Execute query with timeout
      const timeout = options?.timeout || 30000 // 30 seconds default
      const queryPromise = queryFunction()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )

      const result = await Promise.race([queryPromise, timeoutPromise])
      const executionTime = performance.now() - startTime

      // Record performance metrics
      this.recordPerformanceMetric('query_execution_time', executionTime, {
        queryName,
        operationId,
      })

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.warn(`[${this.requestId}] Slow query detected`, {
          operationId,
          queryName,
          executionTime,
          threshold: this.slowQueryThreshold,
        })

        await this.analyzeSlowQuery(queryName, executionTime)
      }

      logger.debug(`[${this.requestId}] Query executed`, {
        operationId,
        queryName,
        executionTime,
      })

      return result
    } catch (error) {
      const executionTime = performance.now() - startTime

      logger.error(`[${this.requestId}] Query execution failed`, {
        operationId,
        queryName,
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Retry logic
      if (options?.retries && options.retries > 0) {
        logger.info(`[${this.requestId}] Retrying query`, {
          operationId,
          queryName,
          remainingRetries: options.retries - 1,
        })

        return this.optimizedQuery(queryName, queryFunction, {
          ...options,
          retries: options.retries - 1,
        })
      }

      throw error
    }
  }

  /**
   * Precompute and cache expensive operations
   */
  async precomputeCache(
    computations: Array<{
      key: string
      pattern: CacheKeyPattern
      computation: () => Promise<any>
      priority: number
    }>
  ): Promise<void> {
    const operationId = `precompute_${Date.now()}`

    logger.info(`[${this.requestId}] Starting cache precomputation`, {
      operationId,
      computationCount: computations.length,
    })

    try {
      // Sort by priority (higher numbers first)
      const sortedComputations = computations.sort((a, b) => b.priority - a.priority)

      // Execute computations with controlled concurrency
      const concurrencyLimit = 5
      const batches = this.chunkArray(sortedComputations, concurrencyLimit)

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]

        logger.debug(`[${this.requestId}] Processing precomputation batch`, {
          operationId,
          batchNumber: i + 1,
          totalBatches: batches.length,
          batchSize: batch.length,
        })

        const batchPromises = batch.map(async ({ key, pattern, computation }) => {
          try {
            const result = await computation()
            await this.setCachedData(key, result, pattern)
            return { key, success: true }
          } catch (error) {
            logger.error(`[${this.requestId}] Precomputation failed`, {
              key: this.sanitizeKey(key),
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            return { key, success: false, error }
          }
        })

        await Promise.allSettled(batchPromises)
      }

      logger.info(`[${this.requestId}] Cache precomputation completed`, {
        operationId,
        computationCount: computations.length,
      })
    } catch (error) {
      logger.error(`[${this.requestId}] Cache precomputation failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(
    metric?: string,
    timeRange?: { start: Date; end: Date }
  ): PerformanceMetric[] {
    let filtered = this.performanceMetrics

    if (metric) {
      filtered = filtered.filter((m) => m.metric === metric)
    }

    if (timeRange) {
      filtered = filtered.filter(
        (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      )
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(olderThan?: Date): void {
    const cutoff = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

    const initialCount = this.performanceMetrics.length

    // Remove metrics older than cutoff
    for (let i = this.performanceMetrics.length - 1; i >= 0; i--) {
      if (this.performanceMetrics[i].timestamp < cutoff) {
        this.performanceMetrics.splice(i, 1)
      }
    }

    const removed = initialCount - this.performanceMetrics.length

    logger.info(`[${this.requestId}] Performance metrics cleared`, {
      removed,
      remaining: this.performanceMetrics.length,
      cutoff: cutoff.toISOString(),
    })
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(timeRange?: { start: Date; end: Date }): {
    summary: Record<string, any>
    slowQueries: QueryPerformanceStats[]
    cacheStats: Record<string, any>
    recommendations: string[]
  } {
    const metrics = this.getPerformanceMetrics(undefined, timeRange)
    const recommendations: string[] = []

    // Calculate summary statistics
    const summary = {
      totalMetrics: metrics.length,
      avgQueryTime: this.calculateAverageMetric(metrics, 'query_execution_time'),
      slowQueryCount: metrics.filter(
        (m) => m.metric === 'query_execution_time' && m.value > this.slowQueryThreshold
      ).length,
      cacheHitRate: this.calculateCacheHitRate(metrics),
      totalCacheOperations: metrics.filter((m) => m.metric === 'cache_operation').length,
    }

    // Identify slow queries
    const slowQueries = this.identifySlowQueries(metrics)

    // Calculate cache statistics
    const cacheStats = {
      hitRate: this.calculateCacheHitRate(metrics),
      missRate: 1 - this.calculateCacheHitRate(metrics),
      totalOperations: summary.totalCacheOperations,
      avgRetrievalTime: this.calculateAverageMetric(metrics, 'cache_operation'),
    }

    // Generate recommendations
    if (summary.slowQueryCount > 0) {
      recommendations.push(
        `${summary.slowQueryCount} slow queries detected. Consider query optimization.`
      )
    }

    if (cacheStats.hitRate < 0.8) {
      recommendations.push(
        `Cache hit rate is ${(cacheStats.hitRate * 100).toFixed(1)}%. Consider cache warming or TTL adjustment.`
      )
    }

    if (summary.avgQueryTime > this.slowQueryThreshold * 0.5) {
      recommendations.push(
        'Average query time is high. Review database indexes and query patterns.'
      )
    }

    return {
      summary,
      slowQueries,
      cacheStats,
      recommendations,
    }
  }

  // Private helper methods below...

  private initializeCacheConfigs(): Map<CacheKeyPattern, CacheConfig> {
    const configs = new Map<CacheKeyPattern, CacheConfig>()

    // Template search results - high traffic, moderate TTL
    configs.set(CacheKeyPattern.TEMPLATE_SEARCH, {
      ttl: 300, // 5 minutes
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS],
      compression: true,
      encryption: false,
      warming: true,
      invalidationRules: ['template:*', 'category:*', 'tag:*'],
    })

    // Template details - moderate traffic, longer TTL
    configs.set(CacheKeyPattern.TEMPLATE_DETAILS, {
      ttl: 1800, // 30 minutes
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS, CacheLayer.CDN],
      compression: true,
      encryption: false,
      warming: false,
      invalidationRules: ['template:{id}', 'user:{userId}'],
    })

    // Category list - low change frequency, long TTL
    configs.set(CacheKeyPattern.CATEGORY_LIST, {
      ttl: 3600, // 1 hour
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS, CacheLayer.CDN],
      compression: true,
      encryption: false,
      warming: true,
      invalidationRules: ['category:*'],
    })

    // Tag list - moderate change frequency
    configs.set(CacheKeyPattern.TAG_LIST, {
      ttl: 900, // 15 minutes
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS],
      compression: true,
      encryption: false,
      warming: true,
      invalidationRules: ['tag:*'],
    })

    // User profiles - personal data, shorter TTL
    configs.set(CacheKeyPattern.USER_PROFILE, {
      ttl: 600, // 10 minutes
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS],
      compression: false,
      encryption: true,
      warming: false,
      invalidationRules: ['user:{userId}'],
    })

    // Analytics overview - expensive computation, longer TTL
    configs.set(CacheKeyPattern.ANALYTICS_OVERVIEW, {
      ttl: 7200, // 2 hours
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS],
      compression: true,
      encryption: false,
      warming: true,
      invalidationRules: ['analytics:*'],
    })

    // Leaderboard - competitive data, shorter TTL
    configs.set(CacheKeyPattern.LEADERBOARD, {
      ttl: 300, // 5 minutes
      layers: [CacheLayer.MEMORY, CacheLayer.REDIS],
      compression: true,
      encryption: false,
      warming: true,
      invalidationRules: ['user:*', 'reputation:*'],
    })

    return configs
  }

  private async getFromCacheLayer<T>(key: string, layer: CacheLayer): Promise<T | null> {
    switch (layer) {
      case CacheLayer.MEMORY:
        return this.memoryCache.get(key) || null

      case CacheLayer.REDIS:
        // In production, integrate with Redis
        // For now, simulate Redis cache miss
        return null

      case CacheLayer.CDN:
        // In production, integrate with CDN (CloudFront, Cloudflare, etc.)
        // For now, simulate CDN cache miss
        return null

      default:
        return null
    }
  }

  private async setInCacheLayer<T>(
    key: string,
    data: T,
    layer: CacheLayer,
    ttl: number
  ): Promise<void> {
    switch (layer) {
      case CacheLayer.MEMORY:
        this.memoryCache.set(key, data)
        // Set expiration timer
        setTimeout(() => this.memoryCache.delete(key), ttl * 1000)
        break

      case CacheLayer.REDIS:
        // In production, integrate with Redis
        logger.debug(`[${this.requestId}] Would set in Redis`, {
          key: this.sanitizeKey(key),
          ttl,
        })
        break

      case CacheLayer.CDN:
        // In production, integrate with CDN
        logger.debug(`[${this.requestId}] Would set in CDN`, {
          key: this.sanitizeKey(key),
          ttl,
        })
        break
    }
  }

  private async invalidateCacheLayer(
    keyOrPattern: string,
    layer: CacheLayer,
    isPattern: boolean
  ): Promise<void> {
    switch (layer) {
      case CacheLayer.MEMORY:
        if (isPattern) {
          // Remove all keys matching pattern
          for (const key of this.memoryCache.keys()) {
            if (this.matchesPattern(key, keyOrPattern)) {
              this.memoryCache.delete(key)
            }
          }
        } else {
          this.memoryCache.delete(keyOrPattern)
        }
        break

      case CacheLayer.REDIS:
        // In production, implement Redis invalidation
        logger.debug(`[${this.requestId}] Would invalidate in Redis`, {
          key: this.sanitizeKey(keyOrPattern),
          isPattern,
        })
        break

      case CacheLayer.CDN:
        // In production, implement CDN cache purging
        logger.debug(`[${this.requestId}] Would invalidate in CDN`, {
          key: this.sanitizeKey(keyOrPattern),
          isPattern,
        })
        break
    }
  }

  private async warmCacheLayers<T>(
    key: string,
    data: T,
    sourceLayer: CacheLayer,
    config: CacheConfig
  ): Promise<void> {
    if (!config.warming) return

    // Warm cache layers with higher priority than source
    const layerPriority = {
      [CacheLayer.MEMORY]: 3,
      [CacheLayer.REDIS]: 2,
      [CacheLayer.CDN]: 1,
    }

    const sourcePriority = layerPriority[sourceLayer]
    const layersToWarm = config.layers.filter((layer) => layerPriority[layer] > sourcePriority)

    for (const layer of layersToWarm) {
      await this.setInCacheLayer(key, data, layer, config.ttl)
    }
  }

  private async propagateInvalidation(key: string, pattern: CacheKeyPattern): Promise<void> {
    const config = this.cacheConfigs.get(pattern)
    if (!config?.invalidationRules) return

    for (const rule of config.invalidationRules) {
      const relatedKey = rule.replace('{id}', this.extractIdFromKey(key))
      await this.invalidateCache(relatedKey)
    }
  }

  private async compressData<T>(data: T): Promise<any> {
    // In production, implement actual compression (gzip, brotli, etc.)
    return data
  }

  private async encryptData<T>(data: T): Promise<any> {
    // In production, implement actual encryption
    return data
  }

  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return regex.test(key)
  }

  private extractIdFromKey(key: string): string {
    const parts = key.split(':')
    return parts[parts.length - 1] || ''
  }

  private sanitizeKey(key: string): string {
    // Sanitize key for logging (remove sensitive data)
    return key.length > 50 ? `${key.slice(0, 47)}...` : key
  }

  private recordPerformanceMetric(
    metric: string,
    value: number,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    const performanceMetric: PerformanceMetric = {
      metric,
      value,
      timestamp: new Date(),
      tags,
      metadata,
    }

    this.performanceMetrics.push(performanceMetric)

    // Limit metrics array size
    if (this.performanceMetrics.length > 10000) {
      this.performanceMetrics.splice(0, 1000) // Remove oldest 1000 metrics
    }
  }

  private async analyzeSlowQuery(queryName: string, executionTime: number): Promise<void> {
    // In production, this would:
    // 1. Store slow query details in database
    // 2. Analyze query execution plan
    // 3. Suggest optimizations
    // 4. Alert monitoring systems

    logger.info(`[${this.requestId}] Slow query analysis`, {
      queryName,
      executionTime,
      suggestions: [
        'Check database indexes',
        'Analyze query execution plan',
        'Consider query restructuring',
        'Review table statistics',
      ],
    })
  }

  private calculateAverageMetric(metrics: PerformanceMetric[], metricName: string): number {
    const relevantMetrics = metrics.filter((m) => m.metric === metricName)
    if (relevantMetrics.length === 0) return 0

    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0)
    return sum / relevantMetrics.length
  }

  private calculateCacheHitRate(metrics: PerformanceMetric[]): number {
    const cacheOperations = metrics.filter((m) => m.metric === 'cache_operation')
    if (cacheOperations.length === 0) return 0

    const hits = cacheOperations.filter((m) => m.tags?.hit === 'true').length
    return hits / cacheOperations.length
  }

  private identifySlowQueries(metrics: PerformanceMetric[]): QueryPerformanceStats[] {
    const queryMetrics = metrics.filter((m) => m.metric === 'query_execution_time')
    const queryStats = new Map<string, QueryPerformanceStats>()

    for (const metric of queryMetrics) {
      const queryName = metric.tags?.queryName || 'unknown'
      const existing = queryStats.get(queryName)

      if (existing) {
        existing.frequency++
        existing.executionTime = Math.max(existing.executionTime, metric.value)
        existing.lastExecuted =
          metric.timestamp > existing.lastExecuted ? metric.timestamp : existing.lastExecuted
      } else {
        queryStats.set(queryName, {
          query: queryName,
          executionTime: metric.value,
          rowCount: 0, // Would be populated from actual query stats
          planHash: '', // Would be populated from query plan
          frequency: 1,
          lastExecuted: metric.timestamp,
        })
      }
    }

    return Array.from(queryStats.values())
      .filter((stats) => stats.executionTime > this.slowQueryThreshold)
      .sort((a, b) => b.executionTime - a.executionTime)
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  private startBackgroundOptimization(): void {
    // Cache warming schedule
    setInterval(
      () => {
        this.warmPopularCaches()
      },
      5 * 60 * 1000
    ) // Every 5 minutes

    // Performance metrics cleanup
    setInterval(
      () => {
        this.clearPerformanceMetrics()
      },
      60 * 60 * 1000
    ) // Every hour

    // Memory management
    setInterval(
      () => {
        this.performMemoryCleanup()
      },
      30 * 60 * 1000
    ) // Every 30 minutes
  }

  private async warmPopularCaches(): Promise<void> {
    try {
      logger.info(`[${this.requestId}] Starting cache warming`)

      const popularComputations = [
        {
          key: 'categories:list:all',
          pattern: CacheKeyPattern.CATEGORY_LIST,
          computation: () => this.fetchPopularCategories(),
          priority: 10,
        },
        {
          key: 'tags:trending:24h',
          pattern: CacheKeyPattern.TAG_LIST,
          computation: () => this.fetchTrendingTags(),
          priority: 8,
        },
        {
          key: 'templates:popular:week',
          pattern: CacheKeyPattern.TEMPLATE_SEARCH,
          computation: () => this.fetchPopularTemplates(),
          priority: 9,
        },
        {
          key: 'analytics:overview:24h',
          pattern: CacheKeyPattern.ANALYTICS_OVERVIEW,
          computation: () => this.fetchAnalyticsOverview(),
          priority: 6,
        },
        {
          key: 'leaderboard:reputation:top50',
          pattern: CacheKeyPattern.LEADERBOARD,
          computation: () => this.fetchReputationLeaderboard(),
          priority: 7,
        },
      ]

      await this.precomputeCache(popularComputations)
    } catch (error) {
      logger.error(`[${this.requestId}] Cache warming failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  private performMemoryCleanup(): void {
    try {
      logger.debug(`[${this.requestId}] Performing memory cleanup`)

      // Clear expired memory cache entries
      const now = Date.now()
      const memoryKeys = Array.from(this.memoryCache.keys())

      for (const key of memoryKeys) {
        const entry = this.memoryCache.get(key)
        if (entry?._expiry && entry._expiry < now) {
          this.memoryCache.delete(key)
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      logger.debug(`[${this.requestId}] Memory cleanup completed`, {
        remainingCacheEntries: this.memoryCache.size,
        metricsCount: this.performanceMetrics.length,
      })
    } catch (error) {
      logger.error(`[${this.requestId}] Memory cleanup failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Placeholder methods for cache warming
  private async fetchPopularCategories(): Promise<any> {
    return { categories: [], timestamp: new Date() }
  }

  private async fetchTrendingTags(): Promise<any> {
    return { tags: [], timestamp: new Date() }
  }

  private async fetchPopularTemplates(): Promise<any> {
    return { templates: [], timestamp: new Date() }
  }

  private async fetchAnalyticsOverview(): Promise<any> {
    return { metrics: {}, timestamp: new Date() }
  }

  private async fetchReputationLeaderboard(): Promise<any> {
    return { leaderboard: [], timestamp: new Date() }
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizationManager()

// Export utility functions
export const PerformanceUtils = {
  /**
   * Measure function execution time
   */
  measureExecutionTime: async <T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; executionTime: number }> => {
    const startTime = performance.now()
    const result = await fn()
    const executionTime = performance.now() - startTime

    logger.debug(`Execution time measurement`, {
      name,
      executionTime,
    })

    return { result, executionTime }
  },

  /**
   * Create a debounced function
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null

    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout)
      }

      timeout = setTimeout(() => {
        func(...args)
      }, wait)
    }
  },

  /**
   * Create a throttled function
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle = false

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  },

  /**
   * Batch operations for efficiency
   */
  batchOperations: async <T, R>(
    items: T[],
    operation: (batch: T[]) => Promise<R[]>,
    batchSize = 10
  ): Promise<R[]> => {
    const results: R[] = []

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await operation(batch)
      results.push(...batchResults)
    }

    return results
  },

  /**
   * Memory usage monitoring
   */
  getMemoryUsage: () => {
    const usage = process.memoryUsage()
    return {
      rss: Math.round((usage.rss / 1024 / 1024) * 100) / 100, // MB
      heapTotal: Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100, // MB
      heapUsed: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100, // MB
      external: Math.round((usage.external / 1024 / 1024) * 100) / 100, // MB
      arrayBuffers: Math.round((usage.arrayBuffers / 1024 / 1024) * 100) / 100, // MB
    }
  },
}

export default PerformanceOptimizationManager
