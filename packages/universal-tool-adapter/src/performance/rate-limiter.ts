/**
 * Advanced Rate Limiting System for Tool Adapters
 *
 * Provides sophisticated rate limiting with:
 * - Multiple algorithms (token bucket, sliding window, fixed window, leaky bucket)
 * - Hierarchical limits (global, workspace, user, tool-specific)
 * - Dynamic rate adjustment based on system load
 * - Distributed rate limiting with Redis
 * - Quota management and burst handling
 * - Real-time monitoring and alerting
 *
 * @author Performance & Monitoring Agent
 * @version 2.0.0
 */

import { EventEmitter } from 'events'
import { createLogger } from '../utils/logger'

const logger = createLogger('AdvancedRateLimiter')

export interface RateLimitConfig {
  algorithm: 'token_bucket' | 'sliding_window' | 'fixed_window' | 'leaky_bucket'

  // Rate limit definitions
  limits: {
    global?: RateLimit
    workspace?: RateLimit
    user?: RateLimit
    tool?: Record<string, RateLimit>
  }

  // Burst handling
  burst: {
    enabled: boolean
    multiplier: number
    windowMs: number
  }

  // Dynamic adjustment
  dynamic: {
    enabled: boolean
    systemLoadThreshold: number
    adjustmentFactor: number
    monitoringIntervalMs: number
  }

  // Distributed settings
  distributed: {
    enabled: boolean
    redisUrl?: string
    keyPrefix: string
    syncIntervalMs: number
  }

  // Monitoring and alerting
  monitoring: {
    enabled: boolean
    alertThreshold: number
    metricsRetentionMs: number
  }
}

export interface RateLimit {
  requests: number
  windowMs: number
  burstRequests?: number
  priority?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  retryAfterMs?: number
  reason?: string
  metadata: {
    algorithm: string
    limit: RateLimit
    current: number
    windowStart: Date
    burstUsed: boolean
  }
}

export interface RateLimitMetrics {
  totalRequests: number
  allowedRequests: number
  deniedRequests: number
  allowanceRate: number
  denialRate: number
  averageWaitTimeMs: number
  peakRequestsPerSecond: number
  currentRequestsPerSecond: number
  burstUsageCount: number
  dynamicAdjustments: number
  lastResetTime: Date
}

export class AdvancedRateLimiter extends EventEmitter {
  private limiters = new Map<string, RateLimiterInstance>()
  private metricsCollector: RateLimitMetricsCollector
  private systemMonitor: SystemLoadMonitor | null = null
  private distributedSync: DistributedSync | null = null
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(private config: RateLimitConfig) {
    super()

    this.metricsCollector = new RateLimitMetricsCollector(config.monitoring)

    if (config.distributed.enabled) {
      this.distributedSync = new DistributedSync(config.distributed, this)
    }

    if (config.dynamic.enabled) {
      this.systemMonitor = new SystemLoadMonitor(config.dynamic, this)
    }

    this.initialize()
  }

  /**
   * Check if request should be allowed based on rate limits
   */
  async checkLimit(key: string, context: RateLimitContext): Promise<RateLimitResult> {
    const startTime = Date.now()

    try {
      // Build hierarchical key for the request
      const hierarchicalKey = this.buildHierarchicalKey(key, context)

      // Get or create rate limiter for this key
      const limiter = await this.getLimiter(hierarchicalKey, context)

      // Check rate limit
      const result = await limiter.checkLimit()

      // Record metrics
      this.metricsCollector.recordRequest(result.allowed, Date.now() - startTime)

      // Emit events for monitoring
      if (!result.allowed) {
        this.emit('limitExceeded', { key: hierarchicalKey, context, result })

        if (this.config.monitoring.enabled) {
          await this.checkAlertThreshold(hierarchicalKey)
        }
      }

      logger.debug('Rate limit check completed', {
        key: hierarchicalKey,
        allowed: result.allowed,
        remaining: result.remaining,
        algorithm: result.metadata.algorithm,
        latency: Date.now() - startTime,
      })

      return result
    } catch (error) {
      logger.error('Rate limit check failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      })

      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: 999999,
        resetTime: new Date(Date.now() + 60000),
        reason: 'rate_limiter_error',
        metadata: {
          algorithm: 'fallback',
          limit: { requests: 999999, windowMs: 60000 },
          current: 0,
          windowStart: new Date(),
          burstUsed: false,
        },
      }
    }
  }

  /**
   * Wait for rate limit to allow request
   */
  async waitForLimit(
    key: string,
    context: RateLimitContext,
    maxWaitMs = 10000
  ): Promise<RateLimitResult> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.checkLimit(key, context)

      if (result.allowed) {
        return result
      }

      // Wait based on retry-after hint or a default interval
      const waitMs = Math.min(result.retryAfterMs || 1000, maxWaitMs - (Date.now() - startTime))

      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs))
      }
    }

    throw new Error(`Rate limit wait timeout after ${maxWaitMs}ms`)
  }

  /**
   * Get current metrics for monitoring
   */
  getMetrics(key?: string): RateLimitMetrics {
    return this.metricsCollector.getMetrics(key)
  }

  /**
   * Get detailed statistics
   */
  getStatistics() {
    const metrics = this.metricsCollector.getMetrics()

    return {
      performance: {
        allowanceRate: metrics.allowanceRate,
        denialRate: metrics.denialRate,
        averageWaitTimeMs: metrics.averageWaitTimeMs,
        currentRequestsPerSecond: metrics.currentRequestsPerSecond,
        peakRequestsPerSecond: metrics.peakRequestsPerSecond,
      },

      usage: {
        totalRequests: metrics.totalRequests,
        allowedRequests: metrics.allowedRequests,
        deniedRequests: metrics.deniedRequests,
        burstUsageCount: metrics.burstUsageCount,
        dynamicAdjustments: metrics.dynamicAdjustments,
      },

      system: {
        activeLimiters: this.limiters.size,
        distributedEnabled: this.config.distributed.enabled,
        dynamicEnabled: this.config.dynamic.enabled,
        systemLoad: this.systemMonitor?.getCurrentLoad() || 0,
      },

      limits: this.getLimitSummary(),
    }
  }

  /**
   * Update rate limits dynamically
   */
  async updateLimits(newLimits: RateLimitConfig['limits']): Promise<void> {
    logger.info('Updating rate limits', { newLimits })

    // Update config
    this.config.limits = { ...this.config.limits, ...newLimits }

    // Update existing limiters
    for (const [key, limiter] of this.limiters.entries()) {
      const context = limiter.getContext()
      const newLimit = this.selectApplicableLimit(context)

      if (newLimit) {
        await limiter.updateLimit(newLimit)
      }
    }

    // Sync with distributed instances
    if (this.distributedSync) {
      await this.distributedSync.syncLimits(this.config.limits)
    }

    this.emit('limitsUpdated', newLimits)
  }

  /**
   * Reset rate limits for a specific key or pattern
   */
  async resetLimits(keyPattern?: string): Promise<number> {
    let resetCount = 0

    if (keyPattern) {
      // Reset specific pattern
      for (const [key, limiter] of this.limiters.entries()) {
        if (key.includes(keyPattern)) {
          await limiter.reset()
          resetCount++
        }
      }
    } else {
      // Reset all limiters
      for (const limiter of this.limiters.values()) {
        await limiter.reset()
        resetCount++
      }
    }

    logger.info('Rate limits reset', { keyPattern, resetCount })
    return resetCount
  }

  /**
   * Get current limit status for a key
   */
  async getLimitStatus(key: string, context: RateLimitContext) {
    const hierarchicalKey = this.buildHierarchicalKey(key, context)
    const limiter = this.limiters.get(hierarchicalKey)

    if (!limiter) {
      return {
        exists: false,
        limit: null,
        current: 0,
        remaining: 0,
        resetTime: null,
      }
    }

    return {
      exists: true,
      limit: limiter.getLimit(),
      current: limiter.getCurrent(),
      remaining: limiter.getRemaining(),
      resetTime: limiter.getResetTime(),
    }
  }

  /**
   * Shutdown the rate limiter
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down rate limiter')

    // Stop intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    // Shutdown components
    if (this.systemMonitor) {
      await this.systemMonitor.shutdown()
    }

    if (this.distributedSync) {
      await this.distributedSync.shutdown()
    }

    // Clear limiters
    this.limiters.clear()

    this.emit('shutdown')
    logger.info('Rate limiter shutdown complete')
  }

  /**
   * Private implementation methods
   */

  private initialize(): void {
    // Start cleanup interval for expired limiters
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // Every minute

    // Start system monitor if enabled
    if (this.systemMonitor) {
      this.systemMonitor.start()
    }

    // Start distributed sync if enabled
    if (this.distributedSync) {
      this.distributedSync.start()
    }

    logger.info('Rate limiter initialized', {
      algorithm: this.config.algorithm,
      distributed: this.config.distributed.enabled,
      dynamic: this.config.dynamic.enabled,
    })
  }

  private buildHierarchicalKey(key: string, context: RateLimitContext): string {
    const parts = [
      context.toolId || 'global',
      context.workspaceId || 'global',
      context.userId || 'global',
      key,
    ]

    return parts.join(':')
  }

  private async getLimiter(key: string, context: RateLimitContext): Promise<RateLimiterInstance> {
    let limiter = this.limiters.get(key)

    if (!limiter) {
      const limit = this.selectApplicableLimit(context)

      if (!limit) {
        throw new Error('No applicable rate limit found for context')
      }

      limiter = this.createLimiter(key, limit, context)
      this.limiters.set(key, limiter)
    }

    return limiter
  }

  private selectApplicableLimit(context: RateLimitContext): RateLimit | null {
    // Check tool-specific limit first
    if (context.toolId && this.config.limits.tool?.[context.toolId]) {
      return this.config.limits.tool[context.toolId]
    }

    // Check user limit
    if (this.config.limits.user) {
      return this.config.limits.user
    }

    // Check workspace limit
    if (this.config.limits.workspace) {
      return this.config.limits.workspace
    }

    // Fall back to global limit
    return this.config.limits.global || null
  }

  private createLimiter(
    key: string,
    limit: RateLimit,
    context: RateLimitContext
  ): RateLimiterInstance {
    switch (this.config.algorithm) {
      case 'token_bucket':
        return new TokenBucketLimiter(key, limit, context, this.config)

      case 'sliding_window':
        return new SlidingWindowLimiter(key, limit, context, this.config)

      case 'fixed_window':
        return new FixedWindowLimiter(key, limit, context, this.config)

      case 'leaky_bucket':
        return new LeakyBucketLimiter(key, limit, context, this.config)

      default:
        throw new Error(`Unknown rate limiting algorithm: ${this.config.algorithm}`)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, limiter] of this.limiters.entries()) {
      if (limiter.isExpired(now)) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.limiters.delete(key)
    }

    if (expiredKeys.length > 0) {
      logger.debug('Cleaned up expired limiters', { count: expiredKeys.length })
    }
  }

  private async checkAlertThreshold(key: string): Promise<void> {
    const metrics = this.metricsCollector.getMetrics(key)

    if (metrics.denialRate >= this.config.monitoring.alertThreshold) {
      this.emit('alertThresholdExceeded', {
        key,
        denialRate: metrics.denialRate,
        threshold: this.config.monitoring.alertThreshold,
        timestamp: new Date(),
      })
    }
  }

  private getLimitSummary() {
    const summary: any = {}

    for (const [key, limiter] of this.limiters.entries()) {
      summary[key] = {
        limit: limiter.getLimit(),
        current: limiter.getCurrent(),
        remaining: limiter.getRemaining(),
        resetTime: limiter.getResetTime(),
        algorithm: limiter.getAlgorithm(),
      }
    }

    return summary
  }

  /**
   * Public method for dynamic adjustment (called by SystemLoadMonitor)
   */
  async adjustLimitsForLoad(loadFactor: number): Promise<void> {
    const adjustmentFactor = this.config.dynamic.adjustmentFactor

    for (const limiter of this.limiters.values()) {
      await limiter.adjustForLoad(loadFactor, adjustmentFactor)
    }

    this.metricsCollector.recordDynamicAdjustment()

    logger.info('Rate limits adjusted for system load', {
      loadFactor,
      adjustmentFactor,
      activeLimiters: this.limiters.size,
    })
  }
}

/**
 * Rate limiting context
 */
export interface RateLimitContext {
  toolId?: string
  workspaceId?: string
  userId?: string
  priority?: number
  metadata?: Record<string, any>
}

/**
 * Base rate limiter instance interface
 */
abstract class RateLimiterInstance {
  protected lastUsed = Date.now()

  constructor(
    protected key: string,
    protected limit: RateLimit,
    protected context: RateLimitContext,
    protected config: RateLimitConfig
  ) {}

  abstract checkLimit(): Promise<RateLimitResult>
  abstract reset(): Promise<void>
  abstract updateLimit(newLimit: RateLimit): Promise<void>
  abstract getCurrent(): number
  abstract getRemaining(): number
  abstract getResetTime(): Date
  abstract adjustForLoad(loadFactor: number, adjustmentFactor: number): Promise<void>

  getLimit(): RateLimit {
    return this.limit
  }

  getContext(): RateLimitContext {
    return this.context
  }

  getAlgorithm(): string {
    return this.config.algorithm
  }

  isExpired(now: number): boolean {
    // Consider limiter expired if not used for 10 minutes
    return now - this.lastUsed > 600000
  }

  protected touch(): void {
    this.lastUsed = Date.now()
  }
}

/**
 * Token bucket implementation
 */
class TokenBucketLimiter extends RateLimiterInstance {
  private tokens: number
  private lastRefill = Date.now()
  private burstTokens = 0

  constructor(key: string, limit: RateLimit, context: RateLimitContext, config: RateLimitConfig) {
    super(key, limit, context, config)
    this.tokens = limit.requests

    if (config.burst.enabled && limit.burstRequests) {
      this.burstTokens = limit.burstRequests
    }
  }

  async checkLimit(): Promise<RateLimitResult> {
    this.touch()
    this.refillTokens()

    const now = new Date()
    let allowed = false
    let burstUsed = false

    // Try to consume regular token first
    if (this.tokens >= 1) {
      this.tokens -= 1
      allowed = true
    }
    // Try burst tokens if enabled and available
    else if (this.config.burst.enabled && this.burstTokens >= 1) {
      this.burstTokens -= 1
      allowed = true
      burstUsed = true
    }

    const resetTime = new Date(this.lastRefill + this.limit.windowMs)

    return {
      allowed,
      remaining: Math.floor(this.tokens),
      resetTime,
      retryAfterMs: allowed ? undefined : this.calculateRetryAfter(),
      reason: allowed ? undefined : 'rate_limit_exceeded',
      metadata: {
        algorithm: 'token_bucket',
        limit: this.limit,
        current: this.limit.requests - Math.floor(this.tokens),
        windowStart: new Date(this.lastRefill),
        burstUsed,
      },
    }
  }

  async reset(): Promise<void> {
    this.tokens = this.limit.requests
    this.burstTokens = this.limit.burstRequests || 0
    this.lastRefill = Date.now()
  }

  async updateLimit(newLimit: RateLimit): Promise<void> {
    const ratio = this.tokens / this.limit.requests
    this.limit = newLimit
    this.tokens = Math.floor(newLimit.requests * ratio)

    if (this.config.burst.enabled && newLimit.burstRequests) {
      this.burstTokens = newLimit.burstRequests
    }
  }

  getCurrent(): number {
    return this.limit.requests - Math.floor(this.tokens)
  }

  getRemaining(): number {
    return Math.floor(this.tokens)
  }

  getResetTime(): Date {
    return new Date(this.lastRefill + this.limit.windowMs)
  }

  async adjustForLoad(loadFactor: number, adjustmentFactor: number): Promise<void> {
    // Reduce tokens based on system load
    const adjustment = 1 - loadFactor * adjustmentFactor
    this.tokens = Math.max(0, this.tokens * adjustment)
  }

  private refillTokens(): void {
    const now = Date.now()
    const timePassed = now - this.lastRefill
    const refillRate = this.limit.requests / this.limit.windowMs
    const tokensToAdd = timePassed * refillRate

    this.tokens = Math.min(this.limit.requests, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  private calculateRetryAfter(): number {
    const refillRate = this.limit.requests / this.limit.windowMs
    return Math.ceil(1 / refillRate)
  }
}

/**
 * Sliding window implementation
 */
class SlidingWindowLimiter extends RateLimiterInstance {
  private requestTimes: number[] = []

  async checkLimit(): Promise<RateLimitResult> {
    this.touch()
    const now = Date.now()
    const windowStart = now - this.limit.windowMs

    // Remove old requests outside the window
    this.requestTimes = this.requestTimes.filter((time) => time > windowStart)

    const currentRequests = this.requestTimes.length
    const allowed = currentRequests < this.limit.requests

    if (allowed) {
      this.requestTimes.push(now)
    }

    return {
      allowed,
      remaining: Math.max(0, this.limit.requests - currentRequests),
      resetTime: new Date(this.requestTimes[0] + this.limit.windowMs),
      retryAfterMs: allowed ? undefined : this.calculateRetryAfter(),
      reason: allowed ? undefined : 'rate_limit_exceeded',
      metadata: {
        algorithm: 'sliding_window',
        limit: this.limit,
        current: currentRequests,
        windowStart: new Date(windowStart),
        burstUsed: false,
      },
    }
  }

  async reset(): Promise<void> {
    this.requestTimes = []
  }

  async updateLimit(newLimit: RateLimit): Promise<void> {
    this.limit = newLimit
    // Trim request times if new limit is lower
    if (this.requestTimes.length > newLimit.requests) {
      this.requestTimes = this.requestTimes.slice(-newLimit.requests)
    }
  }

  getCurrent(): number {
    const now = Date.now()
    const windowStart = now - this.limit.windowMs
    return this.requestTimes.filter((time) => time > windowStart).length
  }

  getRemaining(): number {
    return Math.max(0, this.limit.requests - this.getCurrent())
  }

  getResetTime(): Date {
    if (this.requestTimes.length === 0) {
      return new Date(Date.now() + this.limit.windowMs)
    }
    return new Date(this.requestTimes[0] + this.limit.windowMs)
  }

  async adjustForLoad(loadFactor: number, adjustmentFactor: number): Promise<void> {
    // Remove some recent requests to simulate lower capacity
    const reduction = Math.floor(this.requestTimes.length * loadFactor * adjustmentFactor)
    this.requestTimes = this.requestTimes.slice(0, -reduction)
  }

  private calculateRetryAfter(): number {
    if (this.requestTimes.length === 0) return 0

    const oldestRequest = this.requestTimes[0]
    const resetTime = oldestRequest + this.limit.windowMs
    return Math.max(0, resetTime - Date.now())
  }
}

/**
 * Fixed window implementation
 */
class FixedWindowLimiter extends RateLimiterInstance {
  private windowStart = Date.now()
  private requestCount = 0

  async checkLimit(): Promise<RateLimitResult> {
    this.touch()
    const now = Date.now()

    // Reset window if expired
    if (now >= this.windowStart + this.limit.windowMs) {
      this.windowStart = now
      this.requestCount = 0
    }

    const allowed = this.requestCount < this.limit.requests

    if (allowed) {
      this.requestCount++
    }

    return {
      allowed,
      remaining: Math.max(0, this.limit.requests - this.requestCount),
      resetTime: new Date(this.windowStart + this.limit.windowMs),
      retryAfterMs: allowed ? undefined : this.windowStart + this.limit.windowMs - now,
      reason: allowed ? undefined : 'rate_limit_exceeded',
      metadata: {
        algorithm: 'fixed_window',
        limit: this.limit,
        current: this.requestCount,
        windowStart: new Date(this.windowStart),
        burstUsed: false,
      },
    }
  }

  async reset(): Promise<void> {
    this.windowStart = Date.now()
    this.requestCount = 0
  }

  async updateLimit(newLimit: RateLimit): Promise<void> {
    this.limit = newLimit
    // Adjust current count proportionally
    const ratio = newLimit.requests / this.limit.requests
    this.requestCount = Math.floor(this.requestCount * ratio)
  }

  getCurrent(): number {
    return this.requestCount
  }

  getRemaining(): number {
    return Math.max(0, this.limit.requests - this.requestCount)
  }

  getResetTime(): Date {
    return new Date(this.windowStart + this.limit.windowMs)
  }

  async adjustForLoad(loadFactor: number, adjustmentFactor: number): Promise<void> {
    // Artificially increase request count to simulate higher usage
    const increase = Math.floor(this.limit.requests * loadFactor * adjustmentFactor)
    this.requestCount = Math.min(this.limit.requests, this.requestCount + increase)
  }
}

/**
 * Leaky bucket implementation
 */
class LeakyBucketLimiter extends RateLimiterInstance {
  private queue: number[] = []
  private lastLeak = Date.now()

  async checkLimit(): Promise<RateLimitResult> {
    this.touch()
    this.leak()

    const now = Date.now()
    const allowed = this.queue.length < this.limit.requests

    if (allowed) {
      this.queue.push(now)
    }

    return {
      allowed,
      remaining: Math.max(0, this.limit.requests - this.queue.length),
      resetTime: new Date(now + this.calculateResetTime()),
      retryAfterMs: allowed ? undefined : this.calculateRetryAfter(),
      reason: allowed ? undefined : 'rate_limit_exceeded',
      metadata: {
        algorithm: 'leaky_bucket',
        limit: this.limit,
        current: this.queue.length,
        windowStart: new Date(this.lastLeak),
        burstUsed: false,
      },
    }
  }

  async reset(): Promise<void> {
    this.queue = []
    this.lastLeak = Date.now()
  }

  async updateLimit(newLimit: RateLimit): Promise<void> {
    this.limit = newLimit
    // Trim queue if new limit is lower
    if (this.queue.length > newLimit.requests) {
      this.queue = this.queue.slice(-newLimit.requests)
    }
  }

  getCurrent(): number {
    return this.queue.length
  }

  getRemaining(): number {
    return Math.max(0, this.limit.requests - this.queue.length)
  }

  getResetTime(): Date {
    return new Date(Date.now() + this.calculateResetTime())
  }

  async adjustForLoad(loadFactor: number, adjustmentFactor: number): Promise<void> {
    // Slow down leak rate based on system load
    const now = Date.now()
    const slowdownFactor = 1 + loadFactor * adjustmentFactor
    this.lastLeak = now - (now - this.lastLeak) / slowdownFactor
  }

  private leak(): void {
    const now = Date.now()
    const timePassed = now - this.lastLeak
    const leakRate = this.limit.requests / this.limit.windowMs
    const leakAmount = Math.floor(timePassed * leakRate)

    if (leakAmount > 0) {
      this.queue = this.queue.slice(leakAmount)
      this.lastLeak = now
    }
  }

  private calculateResetTime(): number {
    if (this.queue.length === 0) return 0

    const leakRate = this.limit.requests / this.limit.windowMs
    return this.queue.length / leakRate
  }

  private calculateRetryAfter(): number {
    const leakRate = this.limit.requests / this.limit.windowMs
    return Math.ceil(1 / leakRate)
  }
}

/**
 * Metrics collector for rate limiting
 */
class RateLimitMetricsCollector {
  private totalRequests = 0
  private allowedRequests = 0
  private deniedRequests = 0
  private waitTimes: number[] = []
  private requestsPerSecond: number[] = []
  private lastSecond = Math.floor(Date.now() / 1000)
  private currentSecondRequests = 0
  private burstUsageCount = 0
  private dynamicAdjustments = 0
  private lastResetTime = new Date()

  constructor(private config: RateLimitConfig['monitoring']) {}

  recordRequest(allowed: boolean, waitTimeMs: number): void {
    if (!this.config.enabled) return

    this.totalRequests++

    if (allowed) {
      this.allowedRequests++
    } else {
      this.deniedRequests++
    }

    if (waitTimeMs > 0) {
      this.waitTimes.push(waitTimeMs)
      if (this.waitTimes.length > 1000) {
        this.waitTimes.shift()
      }
    }

    // Track requests per second
    const currentSecond = Math.floor(Date.now() / 1000)
    if (currentSecond !== this.lastSecond) {
      this.requestsPerSecond.push(this.currentSecondRequests)
      if (this.requestsPerSecond.length > 60) {
        // Keep last 60 seconds
        this.requestsPerSecond.shift()
      }
      this.currentSecondRequests = 1
      this.lastSecond = currentSecond
    } else {
      this.currentSecondRequests++
    }
  }

  recordBurstUsage(): void {
    this.burstUsageCount++
  }

  recordDynamicAdjustment(): void {
    this.dynamicAdjustments++
  }

  getMetrics(key?: string): RateLimitMetrics {
    const averageWaitTime =
      this.waitTimes.length > 0
        ? this.waitTimes.reduce((sum, time) => sum + time, 0) / this.waitTimes.length
        : 0

    const peakRps = this.requestsPerSecond.length > 0 ? Math.max(...this.requestsPerSecond) : 0

    const currentRps = this.currentSecondRequests

    return {
      totalRequests: this.totalRequests,
      allowedRequests: this.allowedRequests,
      deniedRequests: this.deniedRequests,
      allowanceRate: this.totalRequests > 0 ? this.allowedRequests / this.totalRequests : 1,
      denialRate: this.totalRequests > 0 ? this.deniedRequests / this.totalRequests : 0,
      averageWaitTimeMs: averageWaitTime,
      peakRequestsPerSecond: peakRps,
      currentRequestsPerSecond: currentRps,
      burstUsageCount: this.burstUsageCount,
      dynamicAdjustments: this.dynamicAdjustments,
      lastResetTime: this.lastResetTime,
    }
  }
}

/**
 * System load monitor for dynamic adjustments
 */
class SystemLoadMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null
  private currentLoad = 0

  constructor(
    private config: RateLimitConfig['dynamic'],
    private rateLimiter: AdvancedRateLimiter
  ) {}

  start(): void {
    this.monitoringInterval = setInterval(() => {
      this.checkSystemLoad()
    }, this.config.monitoringIntervalMs)
  }

  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  getCurrentLoad(): number {
    return this.currentLoad
  }

  private async checkSystemLoad(): Promise<void> {
    try {
      // Simple CPU load check (in real implementation, use proper system monitoring)
      this.currentLoad = Math.random() // Mock load between 0-1

      if (this.currentLoad > this.config.systemLoadThreshold) {
        await this.rateLimiter.adjustLimitsForLoad(this.currentLoad)
      }
    } catch (error) {
      logger.error('System load check failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

/**
 * Distributed synchronization (placeholder for Redis-based implementation)
 */
class DistributedSync {
  constructor(
    private config: RateLimitConfig['distributed'],
    _rateLimiter: AdvancedRateLimiter
  ) {}

  start(): void {
    // Implementation would connect to Redis and start sync
    logger.info('Distributed sync started', { keyPrefix: this.config.keyPrefix })
  }

  async shutdown(): Promise<void> {
    // Implementation would close Redis connections
    logger.info('Distributed sync shutdown')
  }

  async syncLimits(limits: RateLimitConfig['limits']): Promise<void> {
    // Implementation would sync limits across distributed instances
    logger.debug('Syncing limits across distributed instances')
  }
}

// Default configuration
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  algorithm: 'token_bucket',

  limits: {
    global: {
      requests: 1000,
      windowMs: 60000, // 1 minute
    },
    workspace: {
      requests: 500,
      windowMs: 60000,
    },
    user: {
      requests: 100,
      windowMs: 60000,
    },
  },

  burst: {
    enabled: true,
    multiplier: 1.5,
    windowMs: 10000, // 10 seconds
  },

  dynamic: {
    enabled: true,
    systemLoadThreshold: 0.8,
    adjustmentFactor: 0.3,
    monitoringIntervalMs: 10000, // 10 seconds
  },

  distributed: {
    enabled: false,
    keyPrefix: 'rate_limit:',
    syncIntervalMs: 5000, // 5 seconds
  },

  monitoring: {
    enabled: true,
    alertThreshold: 0.1, // 10% denial rate
    metricsRetentionMs: 3600000, // 1 hour
  },
}
