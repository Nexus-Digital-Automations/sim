/**
 * Universal Tool Adapter System - Result Cache
 *
 * High-performance caching system for formatted results with compression,
 * TTL support, and intelligent cache management.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { FormattedResult, ResultCacheEntry } from '../types'

const logger = createLogger('ResultCache')

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  enabled: boolean
  ttl: number // Time to live in seconds
  maxEntries: number
  compressionEnabled: boolean
}

/**
 * High-performance result cache with intelligent management
 */
export class ResultCache {
  private cache = new Map<string, ResultCacheEntry>()
  private accessQueue: string[] = [] // For LRU eviction
  private expirationTimers = new Map<string, NodeJS.Timeout>()
  private config: CacheConfig
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    compressionSavings: 0,
  }

  constructor(config: CacheConfig) {
    this.config = config
    logger.info('ResultCache initialized', {
      enabled: config.enabled,
      ttl: config.ttl,
      maxEntries: config.maxEntries,
      compressionEnabled: config.compressionEnabled,
    })

    // Periodic cleanup
    if (config.enabled) {
      this.startPeriodicCleanup()
    }
  }

  /**
   * Get cached result by key
   */
  async get(key: string): Promise<FormattedResult | null> {
    if (!this.config.enabled) {
      return null
    }

    const entry = this.cache.get(key)
    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check expiration
    if (this.isExpired(entry)) {
      this.delete(key)
      this.stats.misses++
      return null
    }

    // Update access tracking
    this.updateAccess(key, entry)
    this.stats.hits++

    // Decompress if needed
    const result = this.config.compressionEnabled
      ? this.decompress(entry.result)
      : entry.result

    logger.debug(`Cache hit for key: ${key.substring(0, 8)}...`)
    return result
  }

  /**
   * Set cached result
   */
  async set(key: string, result: FormattedResult): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    try {
      // Compress if enabled
      const compressedResult = this.config.compressionEnabled
        ? this.compress(result)
        : result

      // Calculate compression savings
      if (this.config.compressionEnabled) {
        const originalSize = this.estimateSize(result)
        const compressedSize = this.estimateSize(compressedResult)
        this.stats.compressionSavings += originalSize - compressedSize
      }

      // Create cache entry
      const entry: ResultCacheEntry = {
        key,
        result: compressedResult,
        metadata: {
          createdAt: new Date().toISOString(),
          expiresAt: this.calculateExpirationTime(),
          accessCount: 1,
          lastAccessed: new Date().toISOString(),
          tags: this.generateTags(result),
        },
      }

      // Ensure cache size limit
      await this.ensureCapacity()

      // Store entry
      this.cache.set(key, entry)
      this.accessQueue.push(key)
      this.stats.sets++

      // Set expiration timer
      if (this.config.ttl > 0) {
        const timer = setTimeout(() => {
          this.delete(key)
        }, this.config.ttl * 1000)
        this.expirationTimers.set(key, timer)
      }

      logger.debug(`Cached result for key: ${key.substring(0, 8)}...`, {
        size: this.estimateSize(compressedResult),
        compressed: this.config.compressionEnabled,
      })

    } catch (error) {
      logger.error(`Failed to cache result for key: ${key}`, error)
    }
  }

  /**
   * Delete cached entry
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    // Remove from cache
    this.cache.delete(key)

    // Remove from access queue
    const index = this.accessQueue.indexOf(key)
    if (index > -1) {
      this.accessQueue.splice(index, 1)
    }

    // Clear expiration timer
    const timer = this.expirationTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.expirationTimers.delete(key)
    }

    logger.debug(`Removed cache entry: ${key.substring(0, 8)}...`)
    return true
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    // Clear all timers
    for (const timer of this.expirationTimers.values()) {
      clearTimeout(timer)
    }

    this.cache.clear()
    this.accessQueue.length = 0
    this.expirationTimers.clear()
    this.stats.evictions += this.cache.size

    logger.info('Cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    hits: number
    misses: number
    hitRate: number
    sets: number
    evictions: number
    compressionSavings: number
    memoryUsage: number
  } {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Number((hitRate * 100).toFixed(2)),
      sets: this.stats.sets,
      evictions: this.stats.evictions,
      compressionSavings: this.stats.compressionSavings,
      memoryUsage: this.estimateMemoryUsage(),
    }
  }

  /**
   * Get entries by tag
   */
  getByTag(tag: string): FormattedResult[] {
    const results: FormattedResult[] = []

    for (const entry of this.cache.values()) {
      if (entry.metadata.tags.includes(tag) && !this.isExpired(entry)) {
        const result = this.config.compressionEnabled
          ? this.decompress(entry.result)
          : entry.result
        results.push(result)
      }
    }

    return results
  }

  /**
   * Invalidate entries by tag
   */
  invalidateByTag(tag: string): number {
    let invalidated = 0

    const keysToDelete: string[] = []
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.tags.includes(tag)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.delete(key)
      invalidated++
    }

    logger.info(`Invalidated ${invalidated} entries with tag: ${tag}`)
    return invalidated
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    try {
      const stats = this.getStats()
      const healthy = stats.size <= this.config.maxEntries

      return {
        healthy,
        details: {
          ...stats,
          config: this.config,
          timersActive: this.expirationTimers.size,
        },
      }
    } catch (error) {
      return {
        healthy: false,
        details: { error: (error as Error).message },
      }
    }
  }

  // Private methods

  private isExpired(entry: ResultCacheEntry): boolean {
    if (!entry.metadata.expiresAt) {
      return false
    }

    return new Date() > new Date(entry.metadata.expiresAt)
  }

  private updateAccess(key: string, entry: ResultCacheEntry): void {
    entry.metadata.accessCount++
    entry.metadata.lastAccessed = new Date().toISOString()

    // Move to end of access queue (most recently used)
    const index = this.accessQueue.indexOf(key)
    if (index > -1) {
      this.accessQueue.splice(index, 1)
    }
    this.accessQueue.push(key)
  }

  private calculateExpirationTime(): string | undefined {
    if (this.config.ttl <= 0) {
      return undefined
    }

    const expirationTime = new Date(Date.now() + this.config.ttl * 1000)
    return expirationTime.toISOString()
  }

  private generateTags(result: FormattedResult): string[] {
    const tags: string[] = []

    // Format-based tag
    tags.push(`format:${result.format}`)

    // Tool-based tag
    if (result.originalResult) {
      tags.push(`success:${result.originalResult.success}`)
    }

    // Content-based tags
    if (result.content.type) {
      tags.push(`type:${result.content.type}`)
    }

    // Quality-based tag
    if (result.metadata.qualityScore) {
      const qualityBucket = result.metadata.qualityScore >= 0.8 ? 'high' :
                           result.metadata.qualityScore >= 0.6 ? 'medium' : 'low'
      tags.push(`quality:${qualityBucket}`)
    }

    return tags
  }

  private async ensureCapacity(): Promise<void> {
    if (this.cache.size < this.config.maxEntries) {
      return
    }

    // LRU eviction
    const entriesToEvict = Math.max(1, Math.floor(this.config.maxEntries * 0.1))

    for (let i = 0; i < entriesToEvict && this.accessQueue.length > 0; i++) {
      const oldestKey = this.accessQueue.shift()!
      if (this.cache.has(oldestKey)) {
        this.delete(oldestKey)
        this.stats.evictions++
      }
    }

    logger.debug(`Evicted ${entriesToEvict} cache entries`)
  }

  private compress(result: FormattedResult): FormattedResult {
    // Simple compression simulation - in reality, you'd use zlib or similar
    const compressed = {
      ...result,
      _compressed: true,
      content: this.compressContent(result.content),
    }
    return compressed
  }

  private decompress(result: FormattedResult): FormattedResult {
    if (!(result as any)._compressed) {
      return result
    }

    return {
      ...result,
      content: this.decompressContent(result.content),
    }
  }

  private compressContent(content: any): any {
    // Placeholder compression logic
    // In production, implement actual compression
    return content
  }

  private decompressContent(content: any): any {
    // Placeholder decompression logic
    // In production, implement actual decompression
    return content
  }

  private estimateSize(obj: any): number {
    // Rough size estimation
    return JSON.stringify(obj).length * 2 // Approximate bytes (UTF-16)
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0
    for (const entry of this.cache.values()) {
      totalSize += this.estimateSize(entry)
    }
    return totalSize
  }

  private startPeriodicCleanup(): void {
    // Clean up expired entries every 5 minutes
    const cleanupInterval = 5 * 60 * 1000

    setInterval(() => {
      this.cleanupExpired()
    }, cleanupInterval)
  }

  private cleanupExpired(): void {
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.delete(key)
    }

    if (keysToDelete.length > 0) {
      logger.info(`Cleaned up ${keysToDelete.length} expired cache entries`)
    }
  }
}