/**
 * Performance Monitoring and Optimization for Tool Adapters
 *
 * Provides comprehensive performance management including:
 * - Execution time monitoring and profiling
 * - Intelligent caching with TTL and invalidation
 * - Connection pooling for external APIs
 * - Rate limiting with token bucket algorithm
 * - Resource usage tracking and optimization
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { AdapterContext, PerformanceMetadata } from './types'

const logger = createLogger('AdapterPerformance')

export interface PerformanceMonitor {
  startTimer(toolName: string, context: AdapterContext): PerformanceTimer
  recordExecution(toolName: string, duration: number, success: boolean): void
  getMetrics(toolName?: string): PerformanceMetrics
  resetMetrics(toolName?: string): void
}

export interface PerformanceTimer {
  end(): number
  addMetadata(key: string, value: any): void
  getElapsed(): number
}

export interface PerformanceMetrics {
  toolName?: string
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageDurationMs: number
  minDurationMs: number
  maxDurationMs: number
  p95DurationMs: number
  p99DurationMs: number
  lastExecutionTime: Date | null
  successRate: number
}

export class AdapterPerformanceMonitor implements PerformanceMonitor {
  private metrics = new Map<string, ToolMetrics>()
  private durations = new Map<string, number[]>()

  startTimer(toolName: string, context: AdapterContext): PerformanceTimer {
    return new PerformanceTimerImpl(toolName, context, this)
  }

  recordExecution(toolName: string, duration: number, success: boolean): void {
    let metrics = this.metrics.get(toolName)
    if (!metrics) {
      metrics = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalDurationMs: 0,
        minDurationMs: Infinity,
        maxDurationMs: 0,
        lastExecutionTime: null,
      }
      this.metrics.set(toolName, metrics)
      this.durations.set(toolName, [])
    }

    // Update counters
    metrics.totalExecutions++
    if (success) {
      metrics.successfulExecutions++
    } else {
      metrics.failedExecutions++
    }

    // Update duration statistics
    metrics.totalDurationMs += duration
    metrics.minDurationMs = Math.min(metrics.minDurationMs, duration)
    metrics.maxDurationMs = Math.max(metrics.maxDurationMs, duration)
    metrics.lastExecutionTime = new Date()

    // Store duration for percentile calculations (keep last 1000 executions)
    const durations = this.durations.get(toolName)!
    durations.push(duration)
    if (durations.length > 1000) {
      durations.shift()
    }

    logger.debug('Recorded tool execution', {
      toolName,
      duration,
      success,
      totalExecutions: metrics.totalExecutions,
    })
  }

  getMetrics(toolName?: string): PerformanceMetrics {
    if (toolName) {
      return this.getToolMetrics(toolName)
    }

    // Return aggregated metrics for all tools
    const allMetrics: PerformanceMetrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDurationMs: 0,
      minDurationMs: Infinity,
      maxDurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
      lastExecutionTime: null,
      successRate: 0,
    }

    let totalDuration = 0
    let lastExecution: Date | null = null

    for (const [tool, metrics] of this.metrics.entries()) {
      allMetrics.totalExecutions += metrics.totalExecutions
      allMetrics.successfulExecutions += metrics.successfulExecutions
      allMetrics.failedExecutions += metrics.failedExecutions
      totalDuration += metrics.totalDurationMs
      allMetrics.minDurationMs = Math.min(allMetrics.minDurationMs, metrics.minDurationMs)
      allMetrics.maxDurationMs = Math.max(allMetrics.maxDurationMs, metrics.maxDurationMs)

      if (metrics.lastExecutionTime && (!lastExecution || metrics.lastExecutionTime > lastExecution)) {
        lastExecution = metrics.lastExecutionTime
      }
    }

    if (allMetrics.totalExecutions > 0) {
      allMetrics.averageDurationMs = totalDuration / allMetrics.totalExecutions
      allMetrics.successRate = allMetrics.successfulExecutions / allMetrics.totalExecutions
    }

    allMetrics.lastExecutionTime = lastExecution

    return allMetrics
  }

  resetMetrics(toolName?: string): void {
    if (toolName) {
      this.metrics.delete(toolName)
      this.durations.delete(toolName)
      logger.info('Reset metrics for tool', { toolName })
    } else {
      this.metrics.clear()
      this.durations.clear()
      logger.info('Reset all metrics')
    }
  }

  private getToolMetrics(toolName: string): PerformanceMetrics {
    const metrics = this.metrics.get(toolName)
    const durations = this.durations.get(toolName) || []

    if (!metrics) {
      return {
        toolName,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageDurationMs: 0,
        minDurationMs: 0,
        maxDurationMs: 0,
        p95DurationMs: 0,
        p99DurationMs: 0,
        lastExecutionTime: null,
        successRate: 0,
      }
    }

    const sortedDurations = [...durations].sort((a, b) => a - b)
    const p95Index = Math.ceil(sortedDurations.length * 0.95) - 1
    const p99Index = Math.ceil(sortedDurations.length * 0.99) - 1

    return {
      toolName,
      totalExecutions: metrics.totalExecutions,
      successfulExecutions: metrics.successfulExecutions,
      failedExecutions: metrics.failedExecutions,
      averageDurationMs: metrics.totalDurationMs / metrics.totalExecutions,
      minDurationMs: metrics.minDurationMs === Infinity ? 0 : metrics.minDurationMs,
      maxDurationMs: metrics.maxDurationMs,
      p95DurationMs: sortedDurations[p95Index] || 0,
      p99DurationMs: sortedDurations[p99Index] || 0,
      lastExecutionTime: metrics.lastExecutionTime,
      successRate: metrics.successfulExecutions / metrics.totalExecutions,
    }
  }
}

class PerformanceTimerImpl implements PerformanceTimer {
  private startTime = Date.now()
  private metadata = new Map<string, any>()

  constructor(
    private toolName: string,
    private context: AdapterContext,
    private monitor: AdapterPerformanceMonitor
  ) {}

  end(): number {
    const duration = Date.now() - this.startTime

    logger.debug('Timer ended', {
      toolName: this.toolName,
      duration,
      metadata: Object.fromEntries(this.metadata.entries()),
    })

    return duration
  }

  addMetadata(key: string, value: any): void {
    this.metadata.set(key, value)
  }

  getElapsed(): number {
    return Date.now() - this.startTime
  }
}

interface ToolMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  totalDurationMs: number
  minDurationMs: number
  maxDurationMs: number
  lastExecutionTime: Date | null
}

/**
 * Intelligent Caching System
 */
export class AdapterCache {
  private cache = new Map<string, CacheEntry>()
  private maxSizeMB: number
  private currentSizeBytes = 0

  constructor(maxSizeMB: number = 100) {
    this.maxSizeMB = maxSizeMB
    this.setupCleanupInterval()
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.currentSizeBytes -= entry.sizeBytes
      return null
    }

    // Update access time for LRU eviction
    entry.lastAccessed = Date.now()
    return entry.data as T
  }

  async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    const dataStr = JSON.stringify(data)
    const sizeBytes = Buffer.byteLength(dataStr, 'utf8')

    // Check if we need to evict items
    await this.ensureCapacity(sizeBytes)

    const entry: CacheEntry = {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000),
      lastAccessed: Date.now(),
      sizeBytes,
    }

    // Remove old entry if exists
    const oldEntry = this.cache.get(key)
    if (oldEntry) {
      this.currentSizeBytes -= oldEntry.sizeBytes
    }

    this.cache.set(key, entry)
    this.currentSizeBytes += sizeBytes

    logger.debug('Cache entry set', { key, sizeBytes, ttlSeconds, totalSize: this.currentSizeBytes })
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    if (entry) {
      this.cache.delete(key)
      this.currentSizeBytes -= entry.sizeBytes
      return true
    }
    return false
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.currentSizeBytes = 0
    logger.info('Cache cleared')
  }

  getStats(): CacheStats {
    return {
      totalEntries: this.cache.size,
      totalSizeBytes: this.currentSizeBytes,
      totalSizeMB: this.currentSizeBytes / (1024 * 1024),
      maxSizeMB: this.maxSizeMB,
      utilizationPercent: (this.currentSizeBytes / (this.maxSizeMB * 1024 * 1024)) * 100,
    }
  }

  createKey(toolName: string, args: any, context: AdapterContext): string {
    const keyData = {
      tool: toolName,
      args,
      workspace: context.workspace_id,
      // Don't include user_id for workspace-level caching
    }
    return `${toolName}:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt
  }

  private async ensureCapacity(newItemSize: number): Promise<void> {
    const maxSizeBytes = this.maxSizeMB * 1024 * 1024
    const requiredSpace = this.currentSizeBytes + newItemSize

    if (requiredSpace <= maxSizeBytes) {
      return
    }

    // Sort entries by last accessed time (LRU)
    const entries = Array.from(this.cache.entries()).sort((a, b) =>
      a[1].lastAccessed - b[1].lastAccessed
    )

    // Remove oldest entries until we have enough space
    let freedBytes = 0
    for (const [key, entry] of entries) {
      if (this.currentSizeBytes + newItemSize - freedBytes <= maxSizeBytes) {
        break
      }

      this.cache.delete(key)
      freedBytes += entry.sizeBytes
      this.currentSizeBytes -= entry.sizeBytes
    }

    logger.debug('Cache eviction completed', { freedBytes, remainingEntries: this.cache.size })
  }

  private setupCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now()
      let expiredCount = 0
      let freedBytes = 0

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key)
          this.currentSizeBytes -= entry.sizeBytes
          expiredCount++
          freedBytes += entry.sizeBytes
        }
      }

      if (expiredCount > 0) {
        logger.debug('Cache cleanup completed', { expiredCount, freedBytes })
      }
    }, 5 * 60 * 1000)
  }
}

interface CacheEntry {
  data: any
  expiresAt: number
  lastAccessed: number
  sizeBytes: number
}

export interface CacheStats {
  totalEntries: number
  totalSizeBytes: number
  totalSizeMB: number
  maxSizeMB: number
  utilizationPercent: number
}

/**
 * Rate Limiter with Token Bucket Algorithm
 */
export class RateLimiter {
  private buckets = new Map<string, TokenBucket>()

  async checkLimit(key: string, requestsPerMinute: number, maxConcurrent: number = 10): Promise<boolean> {
    let bucket = this.buckets.get(key)
    if (!bucket) {
      bucket = new TokenBucket(requestsPerMinute, maxConcurrent)
      this.buckets.set(key, bucket)
    }

    return bucket.consume()
  }

  async waitForToken(key: string, requestsPerMinute: number, timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      if (await this.checkLimit(key, requestsPerMinute)) {
        return true
      }

      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return false
  }

  getRemainingTokens(key: string): number {
    const bucket = this.buckets.get(key)
    return bucket ? bucket.getTokens() : 0
  }

  resetLimits(key?: string): void {
    if (key) {
      this.buckets.delete(key)
    } else {
      this.buckets.clear()
    }
  }
}

class TokenBucket {
  private tokens: number
  private lastRefill = Date.now()
  private activeRequests = 0

  constructor(
    private capacity: number,
    private maxConcurrent: number
  ) {
    this.tokens = capacity
  }

  consume(): boolean {
    this.refill()

    if (this.tokens >= 1 && this.activeRequests < this.maxConcurrent) {
      this.tokens -= 1
      this.activeRequests++

      // Release concurrent slot after a delay
      setTimeout(() => {
        this.activeRequests = Math.max(0, this.activeRequests - 1)
      }, 1000)

      return true
    }

    return false
  }

  getTokens(): number {
    this.refill()
    return Math.floor(this.tokens)
  }

  private refill(): void {
    const now = Date.now()
    const timePassed = now - this.lastRefill
    const tokensToAdd = (timePassed / (60 * 1000)) * this.capacity

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
    this.lastRefill = now
  }
}

/**
 * Connection Pool for External APIs
 */
export class ConnectionPool {
  private pools = new Map<string, Pool>()

  getPool(serviceName: string, maxConnections: number = 10): Pool {
    let pool = this.pools.get(serviceName)
    if (!pool) {
      pool = new Pool(serviceName, maxConnections)
      this.pools.set(serviceName, pool)
    }
    return pool
  }

  async cleanup(): Promise<void> {
    for (const pool of this.pools.values()) {
      await pool.close()
    }
    this.pools.clear()
  }
}

class Pool {
  private available: Connection[] = []
  private active = new Set<Connection>()

  constructor(
    private serviceName: string,
    private maxConnections: number
  ) {}

  async acquire(): Promise<Connection> {
    if (this.available.length > 0) {
      const conn = this.available.pop()!
      this.active.add(conn)
      return conn
    }

    if (this.active.size < this.maxConnections) {
      const conn = new Connection(this.serviceName)
      this.active.add(conn)
      return conn
    }

    // Wait for a connection to become available
    return new Promise((resolve) => {
      const checkForAvailable = () => {
        if (this.available.length > 0) {
          const conn = this.available.pop()!
          this.active.add(conn)
          resolve(conn)
        } else {
          setTimeout(checkForAvailable, 10)
        }
      }
      checkForAvailable()
    })
  }

  release(connection: Connection): void {
    if (this.active.has(connection)) {
      this.active.delete(connection)
      if (connection.isHealthy()) {
        this.available.push(connection)
      }
    }
  }

  async close(): Promise<void> {
    for (const conn of [...this.active, ...this.available]) {
      await conn.close()
    }
    this.active.clear()
    this.available.length = 0
  }
}

class Connection {
  private healthy = true
  private lastUsed = Date.now()

  constructor(private serviceName: string) {}

  isHealthy(): boolean {
    // Consider connection stale after 5 minutes
    const maxAge = 5 * 60 * 1000
    return this.healthy && (Date.now() - this.lastUsed) < maxAge
  }

  markUsed(): void {
    this.lastUsed = Date.now()
  }

  markUnhealthy(): void {
    this.healthy = false
  }

  async close(): Promise<void> {
    this.healthy = false
  }
}

// Global instances
export const globalPerformanceMonitor = new AdapterPerformanceMonitor()
export const globalCache = new AdapterCache()
export const globalRateLimiter = new RateLimiter()
export const globalConnectionPool = new ConnectionPool()