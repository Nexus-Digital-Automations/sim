/**
 * Conversion Cache Service
 * ========================
 *
 * High-performance caching for workflow-to-journey conversions.
 * Implements intelligent cache invalidation and memory management.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { parlantConversionCache } from '@/db/parlant-schema'
import { eq, and, lt, desc, asc, sql } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import { createHash } from '@/lib/utils/hash'
import {
  type JourneyConversionResult,
  type ConversionCacheEntry,
  type CacheStats,
} from './types'

const logger = createLogger('CacheService')

export class CacheService {
  private memoryCache = new Map<string, ConversionCacheEntry>()
  private readonly maxMemoryCacheSize = 100 // Number of entries
  private readonly defaultCacheDurationMs = 30 * 60 * 1000 // 30 minutes

  /**
   * Generate a cache key for a conversion request
   */
  generateCacheKey(
    workflowId: string,
    templateVersion?: string,
    parameters?: Record<string, any>
  ): string {
    const keyData = {
      workflowId,
      templateVersion: templateVersion || 'direct',
      parameters: parameters || {},
    }

    return createHash(JSON.stringify(keyData, Object.keys(keyData).sort()))
  }

  /**
   * Get cached conversion result
   */
  async get(cacheKey: string, workspaceId: string): Promise<JourneyConversionResult | null> {
    const startTime = Date.now()

    try {
      // Check memory cache first
      const memoryResult = this.getFromMemory(cacheKey)
      if (memoryResult && this.isNotExpired(memoryResult)) {
        logger.debug('Memory cache hit', { cacheKey, workspaceId })
        await this.updateHitCount(cacheKey)
        return memoryResult.result
      }

      // Check database cache
      const cacheEntry = await db.query.parlantConversionCache.findFirst({
        where: and(
          eq(parlantConversionCache.cacheKey, cacheKey),
          eq(parlantConversionCache.workspaceId, workspaceId),
          sql`${parlantConversionCache.expiresAt} > now()`
        ),
      })

      if (cacheEntry) {
        logger.debug('Database cache hit', { cacheKey, workspaceId })

        const result = cacheEntry.conversionResult as JourneyConversionResult

        // Store in memory cache for faster access
        this.setInMemory(cacheKey, {
          cache_key: cacheKey,
          workflow_id: cacheEntry.workflowId,
          template_id: cacheEntry.templateId,
          workspace_id: workspaceId,
          parameters_hash: cacheEntry.parametersHash,
          result,
          created_at: cacheEntry.createdAt.toISOString(),
          expires_at: cacheEntry.expiresAt.toISOString(),
          hit_count: cacheEntry.hitCount,
          last_accessed: new Date().toISOString(),
        })

        // Update hit count and last accessed time
        await this.updateHitCount(cacheKey)

        logger.debug('Cache retrieval completed', {
          cacheKey,
          duration: Date.now() - startTime,
          source: 'database',
        })

        return result
      }

      logger.debug('Cache miss', { cacheKey, workspaceId })
      return null

    } catch (error) {
      logger.error('Cache retrieval failed', { error: error.message, cacheKey, workspaceId })
      return null
    }
  }

  /**
   * Store conversion result in cache
   */
  async set(
    cacheKey: string,
    result: JourneyConversionResult,
    workspaceId: string,
    durationMs: number = this.defaultCacheDurationMs,
    templateId?: string
  ): Promise<void> {
    const startTime = Date.now()

    try {
      const expiresAt = new Date(Date.now() + durationMs)
      const parametersHash = this.generateParametersHash(result.parameters_used)
      const sizeBytes = this.calculateSizeBytes(result)

      // Store in database
      await db
        .insert(parlantConversionCache)
        .values({
          id: generateId('cache'),
          cacheKey,
          workflowId: result.metadata.source_workflow_id,
          templateId,
          workspaceId,
          parametersHash,
          conversionResult: result as any,
          sizeBytes,
          hitCount: 0,
          lastAccessed: new Date(),
          expiresAt,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: parlantConversionCache.cacheKey,
          set: {
            conversionResult: result as any,
            sizeBytes,
            parametersHash,
            expiresAt,
            lastAccessed: new Date(),
          },
        })

      // Store in memory cache
      this.setInMemory(cacheKey, {
        cache_key: cacheKey,
        workflow_id: result.metadata.source_workflow_id,
        template_id: templateId,
        workspace_id: workspaceId,
        parameters_hash: parametersHash,
        result,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        hit_count: 0,
        last_accessed: new Date().toISOString(),
      })

      logger.debug('Cache entry stored', {
        cacheKey,
        sizeBytes,
        durationMs,
        storageDuration: Date.now() - startTime,
      })

    } catch (error) {
      logger.error('Cache storage failed', { error: error.message, cacheKey })
    }
  }

  /**
   * Clear cache entries
   */
  async clear(workspaceId: string, templateId?: string): Promise<void> {
    const startTime = Date.now()

    try {
      let deletedCount: number

      if (templateId) {
        // Clear cache for specific template
        const result = await db
          .delete(parlantConversionCache)
          .where(
            and(
              eq(parlantConversionCache.workspaceId, workspaceId),
              eq(parlantConversionCache.templateId, templateId)
            )
          )
        deletedCount = result.rowCount || 0

        // Clear from memory cache
        for (const [key, entry] of this.memoryCache.entries()) {
          if (entry.workspace_id === workspaceId && entry.template_id === templateId) {
            this.memoryCache.delete(key)
          }
        }
      } else {
        // Clear all cache for workspace
        const result = await db
          .delete(parlantConversionCache)
          .where(eq(parlantConversionCache.workspaceId, workspaceId))
        deletedCount = result.rowCount || 0

        // Clear from memory cache
        for (const [key, entry] of this.memoryCache.entries()) {
          if (entry.workspace_id === workspaceId) {
            this.memoryCache.delete(key)
          }
        }
      }

      logger.info('Cache cleared', {
        workspaceId,
        templateId,
        deletedCount,
        duration: Date.now() - startTime,
      })

    } catch (error) {
      logger.error('Cache clear failed', { error: error.message, workspaceId, templateId })
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(workspaceId: string): Promise<CacheStats> {
    try {
      const [
        totalEntries,
        hitStats,
        sizeStats,
        ageStats
      ] = await Promise.all([
        // Total entries count
        db
          .select({ count: sql`count(*)` })
          .from(parlantConversionCache)
          .where(eq(parlantConversionCache.workspaceId, workspaceId)),

        // Hit rate statistics
        db
          .select({
            totalHits: sql`sum(${parlantConversionCache.hitCount})`,
            avgHits: sql`avg(${parlantConversionCache.hitCount})`,
          })
          .from(parlantConversionCache)
          .where(eq(parlantConversionCache.workspaceId, workspaceId)),

        // Size statistics
        db
          .select({
            totalSize: sql`sum(${parlantConversionCache.sizeBytes})`,
            avgSize: sql`avg(${parlantConversionCache.sizeBytes})`,
          })
          .from(parlantConversionCache)
          .where(eq(parlantConversionCache.workspaceId, workspaceId)),

        // Age statistics
        db
          .select({
            oldest: sql`min(${parlantConversionCache.createdAt})`,
            newest: sql`max(${parlantConversionCache.createdAt})`,
          })
          .from(parlantConversionCache)
          .where(eq(parlantConversionCache.workspaceId, workspaceId)),
      ])

      const total = Number(totalEntries[0]?.count || 0)
      const totalHits = Number(hitStats[0]?.totalHits || 0)
      const totalRequests = total + totalHits // Approximation

      return {
        total_entries: total,
        hit_rate: totalRequests > 0 ? totalHits / totalRequests : 0,
        miss_rate: totalRequests > 0 ? (totalRequests - totalHits) / totalRequests : 0,
        average_conversion_time_ms: 0, // Would need to track this separately
        cache_size_mb: Number(sizeStats[0]?.totalSize || 0) / (1024 * 1024),
        oldest_entry: ageStats[0]?.oldest?.toISOString() || '',
        newest_entry: ageStats[0]?.newest?.toISOString() || '',
      }

    } catch (error) {
      logger.error('Failed to get cache stats', { error: error.message, workspaceId })

      return {
        total_entries: 0,
        hit_rate: 0,
        miss_rate: 0,
        average_conversion_time_ms: 0,
        cache_size_mb: 0,
        oldest_entry: '',
        newest_entry: '',
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<void> {
    try {
      const startTime = Date.now()

      // Remove expired entries from database
      const result = await db
        .delete(parlantConversionCache)
        .where(lt(parlantConversionCache.expiresAt, new Date()))

      const deletedCount = result.rowCount || 0

      // Remove expired entries from memory cache
      let memoryDeletedCount = 0
      for (const [key, entry] of this.memoryCache.entries()) {
        if (!this.isNotExpired(entry)) {
          this.memoryCache.delete(key)
          memoryDeletedCount++
        }
      }

      if (deletedCount > 0 || memoryDeletedCount > 0) {
        logger.info('Cache cleanup completed', {
          deletedFromDatabase: deletedCount,
          deletedFromMemory: memoryDeletedCount,
          duration: Date.now() - startTime,
        })
      }

    } catch (error) {
      logger.error('Cache cleanup failed', { error: error.message })
    }
  }

  // Private helper methods

  private getFromMemory(cacheKey: string): ConversionCacheEntry | null {
    return this.memoryCache.get(cacheKey) || null
  }

  private setInMemory(cacheKey: string, entry: ConversionCacheEntry): void {
    // Implement LRU eviction if needed
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value
      if (firstKey) {
        this.memoryCache.delete(firstKey)
      }
    }

    this.memoryCache.set(cacheKey, entry)
  }

  private isNotExpired(entry: ConversionCacheEntry): boolean {
    return new Date(entry.expires_at) > new Date()
  }

  private async updateHitCount(cacheKey: string): Promise<void> {
    try {
      await db
        .update(parlantConversionCache)
        .set({
          hitCount: sql`${parlantConversionCache.hitCount} + 1`,
          lastAccessed: new Date(),
        })
        .where(eq(parlantConversionCache.cacheKey, cacheKey))

      // Update memory cache entry if exists
      const memoryEntry = this.memoryCache.get(cacheKey)
      if (memoryEntry) {
        memoryEntry.hit_count++
        memoryEntry.last_accessed = new Date().toISOString()
      }
    } catch (error) {
      logger.warn('Failed to update hit count', { error: error.message, cacheKey })
    }
  }

  private generateParametersHash(parametersUsed: string[]): string {
    return createHash(parametersUsed.sort().join(','))
  }

  private calculateSizeBytes(result: JourneyConversionResult): number {
    try {
      return Buffer.byteLength(JSON.stringify(result), 'utf8')
    } catch {
      return 0
    }
  }
}

// Start cleanup interval
const cacheCleanupInterval = setInterval(async () => {
  await cacheService.cleanup()
}, 5 * 60 * 1000) // Run every 5 minutes

// Cleanup on process exit
process.on('SIGTERM', () => {
  clearInterval(cacheCleanupInterval)
})

process.on('SIGINT', () => {
  clearInterval(cacheCleanupInterval)
})

// Export singleton instance
export const cacheService = new CacheService()