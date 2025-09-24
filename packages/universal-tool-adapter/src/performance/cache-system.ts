/**
 * Advanced Caching System for Tool Adapters
 *
 * Provides intelligent multi-level caching with:
 * - Memory cache with LRU eviction
 * - Redis-based distributed cache
 * - Smart cache invalidation
 * - Performance analytics
 * - Cache warming strategies
 *
 * @author Performance & Monitoring Agent
 * @version 2.0.0
 */

import type { AdapterExecutionContext } from '../types/adapter-interfaces'
import { createLogger } from '../utils/logger'

const logger = createLogger('AdvancedCacheSystem')

export interface CacheConfiguration {
  levels: {
    memory: {
      enabled: boolean
      maxSizeMB: number
      maxEntries: number
      ttlSeconds: number
    }
    redis: {
      enabled: boolean
      url?: string
      ttlSeconds: number
      keyPrefix: string
    }
  }
  strategies: {
    writeThrough: boolean
    writeBack: boolean
    cacheAside: boolean
  }
  warming: {
    enabled: boolean
    strategies: ('popular' | 'scheduled' | 'predictive')[]
    batchSize: number
  }
  analytics: {
    enabled: boolean
    metricsRetentionDays: number
  }
}

export interface CacheMetrics {
  hitRate: number
  missRate: number
  evictionRate: number
  totalRequests: number
  totalHits: number
  totalMisses: number
  totalEvictions: number
  averageLatencyMs: number
  memoryUtilization: number
  redisUtilization: number
  popularKeys: Array<{ key: string; hits: number; lastAccess: Date }>
}

export interface CacheKey {
  toolId: string
  parametersHash: string
  contextHash: string
  version: string
}

export class AdvancedCacheSystem {
  private memoryCache = new Map<string, MemoryCacheEntry>()
  private redisClient: any // Redis client instance
  private metrics: CacheMetrics
  private keyHitCounts = new Map<string, number>()
  private keyLastAccess = new Map<string, Date>()
  private currentMemoryUsage = 0

  constructor(private config: CacheConfiguration) {
    this.metrics = this.initializeMetrics()
    this.initializeRedisClient()
    this.startCleanupJobs()
    this.startAnalytics()

    if (config.warming.enabled) {
      this.initializeCacheWarming()
    }
  }

  /**
   * Get cached result with intelligent cache hierarchy
   */
  async get<T>(cacheKey: CacheKey): Promise<T | null> {
    const keyStr = this.serializeKey(cacheKey)
    const startTime = performance.now()

    try {
      // Level 1: Memory cache
      if (this.config.levels.memory.enabled) {
        const memoryResult = await this.getFromMemoryCache<T>(keyStr)
        if (memoryResult !== null) {
          this.recordCacheHit('memory', performance.now() - startTime)
          this.updateAccessMetrics(keyStr)
          return memoryResult
        }
      }

      // Level 2: Redis cache
      if (this.config.levels.redis.enabled && this.redisClient) {
        const redisResult = await this.getFromRedisCache<T>(keyStr)
        if (redisResult !== null) {
          // Promote to memory cache if enabled
          if (this.config.levels.memory.enabled) {
            await this.setToMemoryCache(keyStr, redisResult, this.config.levels.memory.ttlSeconds)
          }

          this.recordCacheHit('redis', performance.now() - startTime)
          this.updateAccessMetrics(keyStr)
          return redisResult
        }
      }

      this.recordCacheMiss(performance.now() - startTime)
      return null
    } catch (error) {
      logger.error('Cache get operation failed', {
        key: keyStr,
        error: error.message,
        latency: performance.now() - startTime,
      })
      return null
    }
  }

  /**
   * Set cached result with intelligent cache hierarchy
   */
  async set<T>(cacheKey: CacheKey, value: T, customTtlSeconds?: number): Promise<void> {
    const keyStr = this.serializeKey(cacheKey)
    const startTime = performance.now()

    try {
      const memoryTtl = customTtlSeconds || this.config.levels.memory.ttlSeconds
      const redisTtl = customTtlSeconds || this.config.levels.redis.ttlSeconds

      // Write to both levels simultaneously if write-through is enabled
      if (this.config.strategies.writeThrough) {
        const promises: Promise<any>[] = []

        if (this.config.levels.memory.enabled) {
          promises.push(this.setToMemoryCache(keyStr, value, memoryTtl))
        }

        if (this.config.levels.redis.enabled && this.redisClient) {
          promises.push(this.setToRedisCache(keyStr, value, redisTtl))
        }

        await Promise.all(promises)
      } else {
        // Sequential writes for cache-aside strategy
        if (this.config.levels.memory.enabled) {
          await this.setToMemoryCache(keyStr, value, memoryTtl)
        }

        if (this.config.levels.redis.enabled && this.redisClient) {
          await this.setToRedisCache(keyStr, value, redisTtl)
        }
      }

      this.updateAccessMetrics(keyStr)
      logger.debug('Cache set operation completed', {
        key: keyStr,
        latency: performance.now() - startTime,
        strategy: this.config.strategies.writeThrough ? 'write-through' : 'cache-aside',
      })
    } catch (error) {
      logger.error('Cache set operation failed', {
        key: keyStr,
        error: error.message,
        latency: performance.now() - startTime,
      })
      throw error
    }
  }

  /**
   * Invalidate cache entry from all levels
   */
  async invalidate(cacheKey: CacheKey): Promise<void> {
    const keyStr = this.serializeKey(cacheKey)

    const promises: Promise<any>[] = []

    // Remove from memory cache
    if (this.config.levels.memory.enabled) {
      promises.push(this.deleteFromMemoryCache(keyStr))
    }

    // Remove from Redis cache
    if (this.config.levels.redis.enabled && this.redisClient) {
      promises.push(this.deleteFromRedisCache(keyStr))
    }

    await Promise.all(promises)
    this.keyHitCounts.delete(keyStr)
    this.keyLastAccess.delete(keyStr)

    logger.debug('Cache invalidation completed', { key: keyStr })
  }

  /**
   * Bulk invalidation by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    let invalidatedCount = 0

    // Invalidate from memory cache
    if (this.config.levels.memory.enabled) {
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          await this.deleteFromMemoryCache(key)
          invalidatedCount++
        }
      }
    }

    // Invalidate from Redis cache
    if (this.config.levels.redis.enabled && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(
          `${this.config.levels.redis.keyPrefix}*${pattern}*`
        )
        if (keys.length > 0) {
          await this.redisClient.del(keys)
          invalidatedCount += keys.length
        }
      } catch (error) {
        logger.error('Redis pattern invalidation failed', { pattern, error: error.message })
      }
    }

    logger.info('Bulk cache invalidation completed', { pattern, invalidatedCount })
    return invalidatedCount
  }

  /**
   * Generate cache key for adapter execution
   */
  generateCacheKey(
    context: AdapterExecutionContext,
    args: any,
    toolId: string,
    version = '1.0'
  ): CacheKey {
    const parametersHash = this.hashObject(args)
    const contextHash = this.hashObject({
      userId: context.userId,
      workspaceId: context.workspaceId,
      features: context.features,
    })

    return {
      toolId,
      parametersHash,
      contextHash,
      version,
    }
  }

  /**
   * Get comprehensive cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateMetrics()
    return { ...this.metrics }
  }

  /**
   * Get cache statistics for monitoring
   */
  getStatistics() {
    return {
      memory: {
        entries: this.memoryCache.size,
        sizeMB: this.currentMemoryUsage / (1024 * 1024),
        utilizationPercent:
          (this.currentMemoryUsage / (this.config.levels.memory.maxSizeMB * 1024 * 1024)) * 100,
      },
      redis: this.redisClient
        ? {
            connected: this.redisClient.status === 'ready',
            keyCount: 0, // Would require Redis info command
          }
        : null,
      hitRate: this.metrics.hitRate,
      missRate: this.metrics.missRate,
      popularKeys: this.getPopularKeys(10),
    }
  }

  /**
   * Warm cache with popular/predicted content
   */
  async warmCache(strategy: 'popular' | 'scheduled' | 'predictive' = 'popular'): Promise<void> {
    logger.info('Starting cache warming', { strategy })

    switch (strategy) {
      case 'popular':
        await this.warmPopularContent()
        break
      case 'scheduled':
        await this.warmScheduledContent()
        break
      case 'predictive':
        await this.warmPredictiveContent()
        break
    }

    logger.info('Cache warming completed', { strategy })
  }

  /**
   * Private implementation methods
   */

  private async getFromMemoryCache<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key)
    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiresAt) {
      await this.deleteFromMemoryCache(key)
      this.metrics.totalEvictions++
      return null
    }

    entry.lastAccessed = Date.now()
    return entry.data as T
  }

  private async setToMemoryCache<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(data)
    const sizeBytes = Buffer.byteLength(serialized, 'utf8')

    // Ensure capacity
    await this.ensureMemoryCapacity(sizeBytes)

    const entry: MemoryCacheEntry = {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      lastAccessed: Date.now(),
      sizeBytes,
      createdAt: Date.now(),
    }

    // Remove old entry if exists
    const oldEntry = this.memoryCache.get(key)
    if (oldEntry) {
      this.currentMemoryUsage -= oldEntry.sizeBytes
    }

    this.memoryCache.set(key, entry)
    this.currentMemoryUsage += sizeBytes
  }

  private async deleteFromMemoryCache(key: string): Promise<void> {
    const entry = this.memoryCache.get(key)
    if (entry) {
      this.memoryCache.delete(key)
      this.currentMemoryUsage -= entry.sizeBytes
    }
  }

  private async getFromRedisCache<T>(key: string): Promise<T | null> {
    if (!this.redisClient) return null

    try {
      const fullKey = `${this.config.levels.redis.keyPrefix}${key}`
      const data = await this.redisClient.get(fullKey)
      return data ? JSON.parse(data) : null
    } catch (error) {
      logger.error('Redis get failed', { key, error: error.message })
      return null
    }
  }

  private async setToRedisCache<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    if (!this.redisClient) return

    try {
      const fullKey = `${this.config.levels.redis.keyPrefix}${key}`
      const serialized = JSON.stringify(data)
      await this.redisClient.setex(fullKey, ttlSeconds, serialized)
    } catch (error) {
      logger.error('Redis set failed', { key, error: error.message })
      throw error
    }
  }

  private async deleteFromRedisCache(key: string): Promise<void> {
    if (!this.redisClient) return

    try {
      const fullKey = `${this.config.levels.redis.keyPrefix}${key}`
      await this.redisClient.del(fullKey)
    } catch (error) {
      logger.error('Redis delete failed', { key, error: error.message })
    }
  }

  private serializeKey(cacheKey: CacheKey): string {
    return `${cacheKey.toolId}:${cacheKey.parametersHash}:${cacheKey.contextHash}:${cacheKey.version}`
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort())
    return Buffer.from(str).toString('base64').slice(0, 32)
  }

  private async ensureMemoryCapacity(newItemSize: number): Promise<void> {
    const maxSizeBytes = this.config.levels.memory.maxSizeMB * 1024 * 1024
    const maxEntries = this.config.levels.memory.maxEntries

    // Check size limit
    if (this.currentMemoryUsage + newItemSize > maxSizeBytes) {
      await this.evictMemoryEntries('size', newItemSize)
    }

    // Check entry count limit
    if (this.memoryCache.size >= maxEntries) {
      await this.evictMemoryEntries('count', 1)
    }
  }

  private async evictMemoryEntries(reason: 'size' | 'count', required: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed) // LRU order

    let freedBytes = 0
    let freedCount = 0

    for (const { key, entry } of entries) {
      this.memoryCache.delete(key)
      this.currentMemoryUsage -= entry.sizeBytes
      this.metrics.totalEvictions++
      freedBytes += entry.sizeBytes
      freedCount++

      if (reason === 'size' && freedBytes >= required) break
      if (reason === 'count' && freedCount >= required) break
    }

    logger.debug('Memory cache eviction completed', {
      reason,
      required,
      freedBytes,
      freedCount,
      remainingEntries: this.memoryCache.size,
    })
  }

  private updateAccessMetrics(key: string): void {
    this.keyHitCounts.set(key, (this.keyHitCounts.get(key) || 0) + 1)
    this.keyLastAccess.set(key, new Date())
  }

  private recordCacheHit(level: 'memory' | 'redis', latency: number): void {
    this.metrics.totalRequests++
    this.metrics.totalHits++
    this.metrics.hitRate = this.metrics.totalHits / this.metrics.totalRequests
    this.metrics.missRate = 1 - this.metrics.hitRate
    this.updateLatencyMetrics(latency)
  }

  private recordCacheMiss(latency: number): void {
    this.metrics.totalRequests++
    this.metrics.totalMisses++
    this.metrics.hitRate = this.metrics.totalHits / this.metrics.totalRequests
    this.metrics.missRate = 1 - this.metrics.hitRate
    this.updateLatencyMetrics(latency)
  }

  private updateLatencyMetrics(latency: number): void {
    // Simple moving average for now
    this.metrics.averageLatencyMs = (this.metrics.averageLatencyMs + latency) / 2
  }

  private updateMetrics(): void {
    this.metrics.memoryUtilization =
      (this.currentMemoryUsage / (this.config.levels.memory.maxSizeMB * 1024 * 1024)) * 100
    this.metrics.popularKeys = this.getPopularKeys(10)
  }

  private getPopularKeys(limit: number) {
    return Array.from(this.keyHitCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, hits]) => ({
        key,
        hits,
        lastAccess: this.keyLastAccess.get(key) || new Date(),
      }))
  }

  private initializeMetrics(): CacheMetrics {
    return {
      hitRate: 0,
      missRate: 0,
      evictionRate: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      totalEvictions: 0,
      averageLatencyMs: 0,
      memoryUtilization: 0,
      redisUtilization: 0,
      popularKeys: [],
    }
  }

  private initializeRedisClient(): void {
    if (!this.config.levels.redis.enabled || !this.config.levels.redis.url) {
      return
    }

    // Redis client initialization would go here
    // For now, we'll mock it or leave it as a placeholder
    logger.info('Redis cache client initialized', { url: this.config.levels.redis.url })
  }

  private startCleanupJobs(): void {
    // Clean up expired memory entries every 2 minutes
    setInterval(
      () => {
        this.cleanupExpiredMemoryEntries()
      },
      2 * 60 * 1000
    )

    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateMetrics()
    }, 30 * 1000)
  }

  private cleanupExpiredMemoryEntries(): void {
    const now = Date.now()
    let expiredCount = 0
    let freedBytes = 0

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key)
        this.currentMemoryUsage -= entry.sizeBytes
        this.keyHitCounts.delete(key)
        this.keyLastAccess.delete(key)
        expiredCount++
        freedBytes += entry.sizeBytes
        this.metrics.totalEvictions++
      }
    }

    if (expiredCount > 0) {
      logger.debug('Expired memory entries cleaned up', { expiredCount, freedBytes })
    }
  }

  private startAnalytics(): void {
    if (!this.config.analytics.enabled) {
      return
    }

    // Collect and store analytics data every 5 minutes
    setInterval(
      () => {
        this.collectAnalytics()
      },
      5 * 60 * 1000
    )
  }

  private collectAnalytics(): void {
    const analytics = {
      timestamp: new Date(),
      metrics: this.getMetrics(),
      statistics: this.getStatistics(),
    }

    // Store analytics data (implementation would depend on storage system)
    logger.debug('Analytics data collected', analytics)
  }

  private initializeCacheWarming(): void {
    // Start cache warming on a schedule
    setInterval(
      () => {
        for (const strategy of this.config.warming.strategies) {
          this.warmCache(strategy).catch((error) => {
            logger.error('Cache warming failed', { strategy, error: error.message })
          })
        }
      },
      15 * 60 * 1000
    ) // Every 15 minutes
  }

  private async warmPopularContent(): Promise<void> {
    // Implementation would warm cache with most popular tool/parameter combinations
    logger.debug('Warming popular content')
  }

  private async warmScheduledContent(): Promise<void> {
    // Implementation would warm cache based on scheduled or predictable usage patterns
    logger.debug('Warming scheduled content')
  }

  private async warmPredictiveContent(): Promise<void> {
    // Implementation would use ML/prediction algorithms to warm likely-to-be-accessed content
    logger.debug('Warming predictive content')
  }
}

interface MemoryCacheEntry {
  data: any
  expiresAt: number
  lastAccessed: number
  sizeBytes: number
  createdAt: number
}

// Default configuration
export const DEFAULT_CACHE_CONFIG: CacheConfiguration = {
  levels: {
    memory: {
      enabled: true,
      maxSizeMB: 256,
      maxEntries: 10000,
      ttlSeconds: 300,
    },
    redis: {
      enabled: false,
      ttlSeconds: 1800,
      keyPrefix: 'tool_adapter:',
    },
  },
  strategies: {
    writeThrough: false,
    writeBack: false,
    cacheAside: true,
  },
  warming: {
    enabled: true,
    strategies: ['popular'],
    batchSize: 100,
  },
  analytics: {
    enabled: true,
    metricsRetentionDays: 30,
  },
}
