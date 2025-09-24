import { createLogger } from '@/lib/logs/console/logger'
import type { AuthenticatedSocket } from '@/socket-server/middleware/auth'
import { parlantRateLimiter } from '@/socket-server/middleware/parlant-permissions'

const logger = createLogger('ParlantSecurity')

/**
 * Security configuration for Parlant WebSocket connections
 */
export const ParlantSecurityConfig = {
  // Rate limits per user per minute
  rateLimits: {
    joinRoom: 30, // Room joins per minute
    requestStatus: 60, // Status requests per minute
    messageEvents: 300, // General message events per minute
    maxConnections: 10, // Max concurrent connections per user
  },

  // Message size limits
  messageLimits: {
    maxMessageSize: 32 * 1024, // 32KB max message size
    maxContentLength: 16 * 1024, // 16KB max content length
    maxMetadataSize: 8 * 1024, // 8KB max metadata size
  },

  // Connection monitoring
  monitoring: {
    connectionTimeoutMs: 60000, // 60 second connection timeout
    inactivityTimeoutMs: 300000, // 5 minute inactivity timeout
    maxReconnectAttempts: 5, // Max reconnection attempts
    healthCheckIntervalMs: 30000, // Health check interval
  },
}

/**
 * Connection tracking for security monitoring
 */
class ConnectionTracker {
  private userConnections = new Map<string, Set<string>>() // userId -> Set<socketId>
  private connectionAttempts = new Map<string, { count: number; lastAttempt: number }>()
  private suspiciousActivity = new Map<string, { events: string[]; timestamp: number }>()

  /**
   * Track new connection
   */
  trackConnection(userId: string, socketId: string): { allowed: boolean; reason?: string } {
    const userSockets = this.userConnections.get(userId) || new Set()

    // Check max connections per user
    if (userSockets.size >= ParlantSecurityConfig.rateLimits.maxConnections) {
      logger.warn(`User ${userId} exceeded max connections limit`, {
        currentConnections: userSockets.size,
        maxAllowed: ParlantSecurityConfig.rateLimits.maxConnections,
      })
      return { allowed: false, reason: 'Too many concurrent connections' }
    }

    // Add connection
    userSockets.add(socketId)
    this.userConnections.set(userId, userSockets)

    // Reset connection attempts on successful connection
    this.connectionAttempts.delete(userId)

    logger.debug(`Tracked connection for user ${userId}`, {
      socketId,
      totalConnections: userSockets.size,
    })

    return { allowed: true }
  }

  /**
   * Track connection attempt (for failed connections)
   */
  trackConnectionAttempt(userId: string): { allowed: boolean; reason?: string } {
    const now = Date.now()
    const attempts = this.connectionAttempts.get(userId) || { count: 0, lastAttempt: 0 }

    // Reset counter if more than 5 minutes passed
    if (now - attempts.lastAttempt > 300000) {
      attempts.count = 0
    }

    attempts.count++
    attempts.lastAttempt = now
    this.connectionAttempts.set(userId, attempts)

    // Block if too many attempts
    if (attempts.count > ParlantSecurityConfig.monitoring.maxReconnectAttempts) {
      logger.warn(`User ${userId} blocked due to excessive connection attempts`, {
        attempts: attempts.count,
        timeWindow: '5 minutes',
      })
      return { allowed: false, reason: 'Too many connection attempts' }
    }

    return { allowed: true }
  }

  /**
   * Remove connection tracking
   */
  removeConnection(userId: string, socketId: string): void {
    const userSockets = this.userConnections.get(userId)
    if (userSockets) {
      userSockets.delete(socketId)
      if (userSockets.size === 0) {
        this.userConnections.delete(userId)
      } else {
        this.userConnections.set(userId, userSockets)
      }
    }

    logger.debug(`Removed connection tracking for user ${userId}`, { socketId })
  }

  /**
   * Get user's connection count
   */
  getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0
  }

  /**
   * Track suspicious activity
   */
  trackSuspiciousActivity(userId: string, activity: string): void {
    const now = Date.now()
    let userActivity = this.suspiciousActivity.get(userId)

    if (!userActivity || now - userActivity.timestamp > 3600000) {
      // Reset after 1 hour
      userActivity = { events: [], timestamp: now }
    }

    userActivity.events.push(`${new Date().toISOString()}: ${activity}`)
    userActivity.timestamp = now

    // Keep only last 20 events
    if (userActivity.events.length > 20) {
      userActivity.events = userActivity.events.slice(-20)
    }

    this.suspiciousActivity.set(userId, userActivity)

    logger.warn(`Suspicious activity tracked for user ${userId}`, {
      activity,
      totalEvents: userActivity.events.length,
    })
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number
    activeUsers: number
    connectionAttempts: number
    suspiciousUsers: number
  } {
    return {
      totalConnections: Array.from(this.userConnections.values()).reduce(
        (total, sockets) => total + sockets.size,
        0
      ),
      activeUsers: this.userConnections.size,
      connectionAttempts: this.connectionAttempts.size,
      suspiciousUsers: this.suspiciousActivity.size,
    }
  }
}

/**
 * Global connection tracker instance
 */
export const connectionTracker = new ConnectionTracker()

/**
 * Validate and sanitize message content
 */
export function validateMessageContent(content: any): {
  isValid: boolean
  sanitized?: any
  errors: string[]
} {
  const errors: string[] = []

  try {
    // Check if content exists
    if (!content) {
      errors.push('Message content is required')
      return { isValid: false, errors }
    }

    // Calculate content size
    const contentSize = JSON.stringify(content).length
    if (contentSize > ParlantSecurityConfig.messageLimits.maxMessageSize) {
      errors.push(
        `Message size ${contentSize} exceeds limit of ${ParlantSecurityConfig.messageLimits.maxMessageSize}`
      )
    }

    // Sanitize and validate different content types
    let sanitized = content

    if (typeof content === 'string') {
      // Validate string content length
      if (content.length > ParlantSecurityConfig.messageLimits.maxContentLength) {
        errors.push(
          `Content length exceeds limit of ${ParlantSecurityConfig.messageLimits.maxContentLength}`
        )
      }

      // Basic XSS protection - remove script tags and javascript: URLs
      sanitized = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    } else if (typeof content === 'object') {
      // Validate object metadata size
      const metadataSize = JSON.stringify(content).length
      if (metadataSize > ParlantSecurityConfig.messageLimits.maxMetadataSize) {
        errors.push(
          `Metadata size exceeds limit of ${ParlantSecurityConfig.messageLimits.maxMetadataSize}`
        )
      }

      // Recursively sanitize object properties
      sanitized = sanitizeObject(content)
    }

    return {
      isValid: errors.length === 0,
      sanitized: errors.length === 0 ? sanitized : undefined,
      errors,
    }
  } catch (error) {
    logger.error('Error validating message content:', error)
    errors.push('Content validation failed')
    return { isValid: false, errors }
  }
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item))
  }

  const sanitized: any = {}
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key names (remove potential XSS)
    const cleanKey = key.replace(/[<>'"]/g, '')

    if (typeof value === 'string') {
      // Sanitize string values
      sanitized[cleanKey] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    } else {
      sanitized[cleanKey] = sanitizeObject(value)
    }
  }

  return sanitized
}

/**
 * Rate limiting middleware for Parlant events
 */
export function checkRateLimit(
  socket: AuthenticatedSocket,
  action: 'joinRoom' | 'requestStatus' | 'messageEvents'
): { allowed: boolean; remaining: number; resetTime: number } {
  const userId = socket.userId

  if (!userId) {
    logger.warn(`Rate limit check failed: Socket ${socket.id} not authenticated`)
    return { allowed: false, remaining: 0, resetTime: 0 }
  }

  const result = parlantRateLimiter.checkRateLimit(userId, action)

  if (!result.allowed) {
    logger.warn(`Rate limit exceeded for user ${userId}`, {
      action,
      remaining: result.remaining,
      resetTime: result.resetTime,
    })

    // Track suspicious activity for repeated rate limit violations
    connectionTracker.trackSuspiciousActivity(userId, `Rate limit exceeded: ${action}`)
  }

  return result
}

/**
 * IP-based rate limiting (additional security layer)
 */
class IPRateLimiter {
  private ipLimits = new Map<string, { count: number; resetTime: number }>()

  private static readonly IP_LIMITS = {
    connectionsPerMinute: 60, // 60 connections per minute per IP
    requestsPerMinute: 300, // 300 requests per minute per IP
  }

  checkIPRateLimit(
    ipAddress: string,
    action: 'connection' | 'request'
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const limit =
      action === 'connection'
        ? IPRateLimiter.IP_LIMITS.connectionsPerMinute
        : IPRateLimiter.IP_LIMITS.requestsPerMinute

    const key = `${ipAddress}:${action}`
    const now = Date.now()
    const windowStart = Math.floor(now / 60000) * 60000

    let record = this.ipLimits.get(key)

    if (!record || record.resetTime <= now) {
      record = {
        count: 0,
        resetTime: windowStart + 60000,
      }
      this.ipLimits.set(key, record)
    }

    const allowed = record.count < limit
    if (allowed) {
      record.count++
    }

    return {
      allowed,
      remaining: Math.max(0, limit - record.count),
      resetTime: record.resetTime,
    }
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.ipLimits.entries()) {
      if (record.resetTime <= now) {
        this.ipLimits.delete(key)
      }
    }
  }
}

/**
 * Global IP rate limiter
 */
export const ipRateLimiter = new IPRateLimiter()

// Cleanup IP rate limits every minute
setInterval(() => {
  ipRateLimiter.cleanup()
}, 60000)

/**
 * Connection health monitor
 */
export class ParlantConnectionHealthMonitor {
  private healthStats = {
    totalConnections: 0,
    healthyConnections: 0,
    unhealthyConnections: 0,
    averageLatency: 0,
    lastHealthCheck: Date.now(),
  }

  /**
   * Perform health check on active connections
   */
  async performHealthCheck(io: any): Promise<void> {
    try {
      const startTime = Date.now()
      const sockets = await io.fetchSockets()

      let healthyCount = 0
      let totalLatency = 0
      let latencyMeasurements = 0

      for (const socket of sockets) {
        try {
          // Ping socket to measure latency
          const pingStart = Date.now()
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Ping timeout')), 5000)

            socket.emit('ping', { timestamp: pingStart }, (response: any) => {
              clearTimeout(timeout)
              const latency = Date.now() - pingStart
              totalLatency += latency
              latencyMeasurements++
              resolve()
            })
          })

          healthyCount++
        } catch (error) {
          logger.debug(`Socket ${socket.id} failed health check:`, error.message)
          // Could disconnect unhealthy sockets here if needed
        }
      }

      // Update health stats
      this.healthStats = {
        totalConnections: sockets.length,
        healthyConnections: healthyCount,
        unhealthyConnections: sockets.length - healthyCount,
        averageLatency: latencyMeasurements > 0 ? totalLatency / latencyMeasurements : 0,
        lastHealthCheck: Date.now(),
      }

      const healthCheckDuration = Date.now() - startTime

      logger.debug('Parlant connection health check completed', {
        totalConnections: this.healthStats.totalConnections,
        healthyConnections: this.healthStats.healthyConnections,
        unhealthyConnections: this.healthStats.unhealthyConnections,
        averageLatency: Math.round(this.healthStats.averageLatency),
        healthCheckDuration,
      })
    } catch (error) {
      logger.error('Error during Parlant health check:', error)
    }
  }

  /**
   * Get current health statistics
   */
  getHealthStats(): typeof this.healthStats {
    return { ...this.healthStats }
  }

  /**
   * Check if the service is healthy
   */
  isHealthy(): boolean {
    const { totalConnections, healthyConnections, lastHealthCheck } = this.healthStats

    // Consider unhealthy if:
    // 1. More than 50% of connections are unhealthy
    // 2. Health check is more than 2 minutes old
    const healthyRatio = totalConnections > 0 ? healthyConnections / totalConnections : 1
    const healthCheckAge = Date.now() - lastHealthCheck

    return healthyRatio >= 0.5 && healthCheckAge < 120000
  }
}

/**
 * Global health monitor instance
 */
export const parlantHealthMonitor = new ParlantConnectionHealthMonitor()

/**
 * Security event logger for audit trails
 */
export function logSecurityEvent(
  event: string,
  userId?: string,
  socketId?: string,
  details?: any
): void {
  logger.info(`🔒 Parlant Security Event: ${event}`, {
    userId,
    socketId,
    timestamp: new Date().toISOString(),
    details,
  })
}

/**
 * Initialize security monitoring
 */
export function initializeParlantSecurity(io: any): void {
  logger.info('Initializing Parlant security monitoring')

  // Start health check interval
  setInterval(() => {
    parlantHealthMonitor.performHealthCheck(io)
  }, ParlantSecurityConfig.monitoring.healthCheckIntervalMs)

  logger.info('Parlant security monitoring initialized', {
    rateLimits: ParlantSecurityConfig.rateLimits,
    messageLimits: ParlantSecurityConfig.messageLimits,
    monitoring: ParlantSecurityConfig.monitoring,
  })
}
