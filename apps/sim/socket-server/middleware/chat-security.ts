import { createLogger } from '@/lib/logs/console/logger'
import type { AuthenticatedSocket } from '@/socket-server/middleware/auth'

const logger = createLogger('ChatSecurity')

/**
 * Enhanced chat security middleware for real-time messaging
 * Extends existing Parlant security with chat-specific validations
 */

// Chat-specific rate limiting
const CHAT_RATE_LIMITS = {
  message: { maxRequests: 30, windowMs: 60000 }, // 30 messages per minute
  typing: { maxRequests: 60, windowMs: 60000 }, // 60 typing indicators per minute
  joinSession: { maxRequests: 10, windowMs: 60000 }, // 10 session joins per minute
  historyRequest: { maxRequests: 5, windowMs: 60000 }, // 5 history requests per minute
}

// Track rate limits per socket
const socketRateLimits = new Map<string, Map<string, { count: number; resetTime: number }>>()

/**
 * Content validation for chat messages
 */
export interface ChatMessageValidation {
  isValid: boolean
  errors: string[]
  sanitizedContent?: string
}

/**
 * Validate chat message content for security and compliance
 */
export function validateChatMessage(content: string): ChatMessageValidation {
  const errors: string[] = []
  let sanitizedContent = content

  // Check message length
  if (!content || content.trim().length === 0) {
    errors.push('Message content cannot be empty')
  }

  if (content.length > 10000) {
    errors.push('Message content exceeds maximum length (10000 characters)')
  }

  // Basic content sanitization
  // Remove potentially dangerous HTML/JavaScript
  sanitizedContent = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /eval\s*\(/gi,
    /document\.write/gi,
    /document\.cookie/gi,
    /window\.location/gi,
    /XMLHttpRequest/gi,
    /fetch\s*\(/gi,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitizedContent)) {
      errors.push('Message contains potentially unsafe content')
      break
    }
  }

  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{20,}/gi, // Repeated characters
    /(http|https|ftp):\/\/[^\s]+/gi, // URLs (might want to allow these based on policy)
    /\b(buy now|click here|limited time|act now)\b/gi, // Common spam phrases
  ]

  let hasSpamPattern = false
  for (const pattern of spamPatterns) {
    if (pattern.test(sanitizedContent)) {
      hasSpamPattern = true
      break
    }
  }

  if (hasSpamPattern) {
    errors.push('Message appears to contain spam or suspicious content')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedContent: errors.length === 0 ? sanitizedContent : undefined,
  }
}

/**
 * Enhanced rate limiting for chat operations
 */
export function checkChatRateLimit(
  socket: AuthenticatedSocket,
  operation: keyof typeof CHAT_RATE_LIMITS
): { allowed: boolean; resetTime: number; remaining: number } {
  const socketId = socket.id
  const limit = CHAT_RATE_LIMITS[operation]
  const now = Date.now()

  // Initialize socket tracking if needed
  if (!socketRateLimits.has(socketId)) {
    socketRateLimits.set(socketId, new Map())
  }

  const socketLimits = socketRateLimits.get(socketId)!

  // Get or initialize operation tracking
  let operationLimit = socketLimits.get(operation)
  if (!operationLimit || operationLimit.resetTime <= now) {
    operationLimit = {
      count: 0,
      resetTime: now + limit.windowMs,
    }
    socketLimits.set(operation, operationLimit)
  }

  // Check if limit exceeded
  if (operationLimit.count >= limit.maxRequests) {
    return {
      allowed: false,
      resetTime: operationLimit.resetTime,
      remaining: 0,
    }
  }

  // Increment counter
  operationLimit.count++

  return {
    allowed: true,
    resetTime: operationLimit.resetTime,
    remaining: limit.maxRequests - operationLimit.count,
  }
}

/**
 * Chat session validation
 */
export interface ChatSessionValidation {
  isValid: boolean
  errors: string[]
  sessionId?: string
  workspaceId?: string
  agentId?: string
}

/**
 * Validate chat session parameters
 */
export function validateChatSession(data: {
  sessionId?: string
  workspaceId?: string
  agentId?: string
}): ChatSessionValidation {
  const errors: string[] = []
  const { sessionId, workspaceId, agentId } = data

  // Validate session ID format
  if (sessionId) {
    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      errors.push('Session ID must be a non-empty string')
    } else if (sessionId.length > 100) {
      errors.push('Session ID too long')
    } else if (!/^[a-zA-Z0-9\-_]+$/.test(sessionId)) {
      errors.push('Session ID contains invalid characters')
    }
  }

  // Validate workspace ID format
  if (workspaceId) {
    if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
      errors.push('Workspace ID must be a non-empty string')
    } else if (workspaceId.length > 100) {
      errors.push('Workspace ID too long')
    } else if (!/^[a-zA-Z0-9\-_]+$/.test(workspaceId)) {
      errors.push('Workspace ID contains invalid characters')
    }
  }

  // Validate agent ID format
  if (agentId) {
    if (typeof agentId !== 'string' || agentId.trim().length === 0) {
      errors.push('Agent ID must be a non-empty string')
    } else if (agentId.length > 100) {
      errors.push('Agent ID too long')
    } else if (!/^[a-zA-Z0-9\-_]+$/.test(agentId)) {
      errors.push('Agent ID contains invalid characters')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sessionId: errors.length === 0 ? sessionId : undefined,
    workspaceId: errors.length === 0 ? workspaceId : undefined,
    agentId: errors.length === 0 ? agentId : undefined,
  }
}

/**
 * Chat security event types
 */
export type ChatSecurityEventType =
  | 'message_blocked'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'session_validation_failed'
  | 'unauthorized_access_attempt'

/**
 * Log chat security events
 */
export function logChatSecurityEvent(
  event: ChatSecurityEventType,
  userId: string,
  socketId: string,
  details?: any
): void {
  logger.warn(`Chat Security Event: ${event}`, {
    userId,
    socketId,
    timestamp: new Date().toISOString(),
    details,
  })

  // In production, this would also:
  // 1. Send to security monitoring system
  // 2. Update user risk score
  // 3. Trigger automated responses for severe events
  // 4. Store in security audit log
}

/**
 * Connection tracking for chat sessions
 */
class ChatConnectionTracker {
  private connections = new Map<string, Set<string>>() // userId -> Set<socketId>
  private maxConnectionsPerUser = 5

  trackConnection(userId: string, socketId: string): { allowed: boolean; reason?: string } {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set())
    }

    const userConnections = this.connections.get(userId)!

    // Check connection limit
    if (userConnections.size >= this.maxConnectionsPerUser) {
      return {
        allowed: false,
        reason: `Maximum connections per user exceeded (${this.maxConnectionsPerUser})`,
      }
    }

    // Add connection
    userConnections.add(socketId)

    return { allowed: true }
  }

  removeConnection(userId: string, socketId: string): void {
    const userConnections = this.connections.get(userId)
    if (userConnections) {
      userConnections.delete(socketId)
      if (userConnections.size === 0) {
        this.connections.delete(userId)
      }
    }
  }

  getConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size || 0
  }

  getAllConnections(): Map<string, Set<string>> {
    return new Map(this.connections)
  }
}

// Export singleton instance
export const chatConnectionTracker = new ChatConnectionTracker()

/**
 * Cleanup rate limiting data for disconnected sockets
 */
export function cleanupSocketRateLimits(socketId: string): void {
  socketRateLimits.delete(socketId)
}

/**
 * Get rate limiting statistics
 */
export function getChatRateLimitStats(): {
  trackedSockets: number
  totalOperations: number
  operationBreakdown: Record<string, number>
} {
  let totalOperations = 0
  const operationBreakdown: Record<string, number> = {}

  for (const [socketId, operations] of socketRateLimits.entries()) {
    for (const [operation, data] of operations.entries()) {
      totalOperations += data.count
      operationBreakdown[operation] = (operationBreakdown[operation] || 0) + data.count
    }
  }

  return {
    trackedSockets: socketRateLimits.size,
    totalOperations,
    operationBreakdown,
  }
}

/**
 * Initialize chat security monitoring
 */
export function initializeChatSecurity(): void {
  // Cleanup expired rate limit entries every 5 minutes
  setInterval(
    () => {
      const now = Date.now()
      for (const [socketId, operations] of socketRateLimits.entries()) {
        for (const [operation, data] of operations.entries()) {
          if (data.resetTime <= now) {
            operations.delete(operation)
          }
        }
        if (operations.size === 0) {
          socketRateLimits.delete(socketId)
        }
      }
    },
    5 * 60 * 1000
  ) // 5 minutes

  logger.info('Chat security monitoring initialized')
}
