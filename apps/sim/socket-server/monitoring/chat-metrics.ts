import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ChatMetrics')

/**
 * Performance metrics for chat operations
 */
interface ChatMetrics {
  // Connection metrics
  totalConnections: number
  activeConnections: number
  connectionDuration: number
  averageConnectionTime: number

  // Session metrics
  activeSessions: number
  totalSessions: number
  averageSessionDuration: number
  sessionsPerWorkspace: Map<string, number>

  // Message metrics
  totalMessages: number
  messagesPerSecond: number
  averageMessageSize: number
  messageLatency: number

  // Typing metrics
  typingEventsPerSecond: number
  averageTypingDuration: number

  // Presence metrics
  presenceUpdatesPerSecond: number

  // Error metrics
  connectionErrors: number
  messageErrors: number
  rateLimitHits: number

  // Performance metrics
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage | null
  eventLoopDelay: number
}

/**
 * Real-time metrics collection and monitoring for chat performance
 */
class ChatMetricsCollector {
  private metrics: Partial<ChatMetrics> = {}
  private counters = new Map<string, number>()
  private timers = new Map<string, number[]>()
  private intervalId: NodeJS.Timeout | null = null
  private lastCpuUsage: NodeJS.CpuUsage | null = null

  // Connection tracking
  private connections = new Set<string>()
  private sessions = new Set<string>()
  private sessionStartTimes = new Map<string, number>()
  private connectionStartTimes = new Map<string, number>()

  // Message tracking
  private messageBuffer: Array<{ timestamp: number; size: number; latency?: number }> = []
  private typingBuffer: Array<{ timestamp: number; duration: number }> = []
  private presenceBuffer: Array<{ timestamp: number }> = []

  constructor() {
    this.startCollection()
  }

  /**
   * Start metrics collection
   */
  private startCollection(): void {
    // Collect metrics every 30 seconds
    this.intervalId = setInterval(() => {
      this.calculateMetrics()
      this.cleanupOldData()
    }, 30000)

    // Initialize CPU usage tracking
    this.lastCpuUsage = process.cpuUsage()

    logger.info('Chat metrics collection started')
  }

  /**
   * Stop metrics collection
   */
  stopCollection(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    logger.info('Chat metrics collection stopped')
  }

  // Connection metrics
  trackConnection(socketId: string): void {
    this.connections.add(socketId)
    this.connectionStartTimes.set(socketId, Date.now())
    this.incrementCounter('total_connections')
  }

  trackDisconnection(socketId: string): void {
    this.connections.delete(socketId)
    const startTime = this.connectionStartTimes.get(socketId)
    if (startTime) {
      const duration = Date.now() - startTime
      this.addTimer('connection_duration', duration)
      this.connectionStartTimes.delete(socketId)
    }
  }

  // Session metrics
  trackSessionStart(sessionId: string, workspaceId?: string): void {
    this.sessions.add(sessionId)
    this.sessionStartTimes.set(sessionId, Date.now())
    this.incrementCounter('total_sessions')

    if (workspaceId) {
      const currentCount = this.counters.get(`workspace_sessions_${workspaceId}`) || 0
      this.counters.set(`workspace_sessions_${workspaceId}`, currentCount + 1)
    }
  }

  trackSessionEnd(sessionId: string, workspaceId?: string): void {
    this.sessions.delete(sessionId)
    const startTime = this.sessionStartTimes.get(sessionId)
    if (startTime) {
      const duration = Date.now() - startTime
      this.addTimer('session_duration', duration)
      this.sessionStartTimes.delete(sessionId)
    }

    if (workspaceId) {
      const currentCount = this.counters.get(`workspace_sessions_${workspaceId}`) || 0
      this.counters.set(`workspace_sessions_${workspaceId}`, Math.max(0, currentCount - 1))
    }
  }

  // Message metrics
  trackMessage(messageSize: number, latency?: number): void {
    this.messageBuffer.push({
      timestamp: Date.now(),
      size: messageSize,
      latency,
    })
    this.incrementCounter('total_messages')
  }

  // Typing metrics
  trackTypingEvent(duration: number): void {
    this.typingBuffer.push({
      timestamp: Date.now(),
      duration,
    })
    this.incrementCounter('typing_events')
  }

  // Presence metrics
  trackPresenceUpdate(): void {
    this.presenceBuffer.push({
      timestamp: Date.now(),
    })
    this.incrementCounter('presence_updates')
  }

  // Error metrics
  trackConnectionError(): void {
    this.incrementCounter('connection_errors')
  }

  trackMessageError(): void {
    this.incrementCounter('message_errors')
  }

  trackRateLimitHit(): void {
    this.incrementCounter('rate_limit_hits')
  }

  // Helper methods
  private incrementCounter(key: string): void {
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + 1)
  }

  private addTimer(key: string, value: number): void {
    if (!this.timers.has(key)) {
      this.timers.set(key, [])
    }
    this.timers.get(key)!.push(value)
  }

  private getAverageTimer(key: string): number {
    const values = this.timers.get(key) || []
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  private getEventsPerSecond(buffer: Array<{ timestamp: number }>, windowMs: number = 60000): number {
    const now = Date.now()
    const recentEvents = buffer.filter(event => now - event.timestamp <= windowMs)
    return (recentEvents.length / windowMs) * 1000
  }

  /**
   * Calculate current metrics
   */
  private calculateMetrics(): void {
    const now = Date.now()

    // Connection metrics
    this.metrics.totalConnections = this.counters.get('total_connections') || 0
    this.metrics.activeConnections = this.connections.size
    this.metrics.averageConnectionTime = this.getAverageTimer('connection_duration')

    // Session metrics
    this.metrics.activeSessions = this.sessions.size
    this.metrics.totalSessions = this.counters.get('total_sessions') || 0
    this.metrics.averageSessionDuration = this.getAverageTimer('session_duration')

    // Workspace session distribution
    this.metrics.sessionsPerWorkspace = new Map()
    for (const [key, value] of this.counters.entries()) {
      if (key.startsWith('workspace_sessions_')) {
        const workspaceId = key.replace('workspace_sessions_', '')
        this.metrics.sessionsPerWorkspace.set(workspaceId, value)
      }
    }

    // Message metrics
    this.metrics.totalMessages = this.counters.get('total_messages') || 0
    this.metrics.messagesPerSecond = this.getEventsPerSecond(this.messageBuffer)

    const recentMessages = this.messageBuffer.filter(msg => now - msg.timestamp <= 60000)
    if (recentMessages.length > 0) {
      this.metrics.averageMessageSize = recentMessages.reduce((sum, msg) => sum + msg.size, 0) / recentMessages.length

      const messagesWithLatency = recentMessages.filter(msg => msg.latency !== undefined)
      if (messagesWithLatency.length > 0) {
        this.metrics.messageLatency = messagesWithLatency.reduce((sum, msg) => sum + (msg.latency || 0), 0) / messagesWithLatency.length
      }
    }

    // Typing metrics
    this.metrics.typingEventsPerSecond = this.getEventsPerSecond(this.typingBuffer)
    const recentTyping = this.typingBuffer.filter(event => now - event.timestamp <= 60000)
    if (recentTyping.length > 0) {
      this.metrics.averageTypingDuration = recentTyping.reduce((sum, event) => sum + event.duration, 0) / recentTyping.length
    }

    // Presence metrics
    this.metrics.presenceUpdatesPerSecond = this.getEventsPerSecond(this.presenceBuffer)

    // Error metrics
    this.metrics.connectionErrors = this.counters.get('connection_errors') || 0
    this.metrics.messageErrors = this.counters.get('message_errors') || 0
    this.metrics.rateLimitHits = this.counters.get('rate_limit_hits') || 0

    // Performance metrics
    this.metrics.memoryUsage = process.memoryUsage()
    if (this.lastCpuUsage) {
      this.metrics.cpuUsage = process.cpuUsage(this.lastCpuUsage)
      this.lastCpuUsage = process.cpuUsage()
    }

    // Event loop delay (simplified measurement)
    const start = process.hrtime.bigint()
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1e6 // Convert to milliseconds
      this.metrics.eventLoopDelay = delay
    })
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  private cleanupOldData(): void {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes

    // Clean up message buffer
    this.messageBuffer = this.messageBuffer.filter(msg => now - msg.timestamp <= maxAge)

    // Clean up typing buffer
    this.typingBuffer = this.typingBuffer.filter(event => now - event.timestamp <= maxAge)

    // Clean up presence buffer
    this.presenceBuffer = this.presenceBuffer.filter(event => now - event.timestamp <= maxAge)

    // Clean up timer data older than 1 hour
    const timerMaxAge = 60 * 60 * 1000
    for (const [key, values] of this.timers.entries()) {
      // Keep only recent timer values
      this.timers.set(key, values.slice(-100)) // Keep last 100 values
    }
  }

  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics(): ChatMetrics {
    this.calculateMetrics()
    return { ...this.metrics } as ChatMetrics
  }

  /**
   * Get metrics summary for monitoring dashboards
   */
  getMetricsSummary(): {
    connections: { active: number; total: number; avgDuration: number }
    sessions: { active: number; total: number; avgDuration: number }
    messages: { total: number; rate: number; avgSize: number; avgLatency: number }
    performance: { memory: number; cpu: number; eventLoopDelay: number }
    errors: { connections: number; messages: number; rateLimits: number }
  } {
    const metrics = this.getCurrentMetrics()

    return {
      connections: {
        active: metrics.activeConnections || 0,
        total: metrics.totalConnections || 0,
        avgDuration: Math.round((metrics.averageConnectionTime || 0) / 1000), // Convert to seconds
      },
      sessions: {
        active: metrics.activeSessions || 0,
        total: metrics.totalSessions || 0,
        avgDuration: Math.round((metrics.averageSessionDuration || 0) / 1000), // Convert to seconds
      },
      messages: {
        total: metrics.totalMessages || 0,
        rate: Math.round((metrics.messagesPerSecond || 0) * 100) / 100, // Round to 2 decimal places
        avgSize: Math.round(metrics.averageMessageSize || 0),
        avgLatency: Math.round(metrics.messageLatency || 0),
      },
      performance: {
        memory: Math.round((metrics.memoryUsage?.heapUsed || 0) / 1024 / 1024), // Convert to MB
        cpu: metrics.cpuUsage ? Math.round((metrics.cpuUsage.user + metrics.cpuUsage.system) / 1000) : 0, // Convert to ms
        eventLoopDelay: Math.round(metrics.eventLoopDelay || 0),
      },
      errors: {
        connections: metrics.connectionErrors || 0,
        messages: metrics.messageErrors || 0,
        rateLimits: metrics.rateLimitHits || 0,
      },
    }
  }

  /**
   * Log metrics to console for monitoring
   */
  logMetrics(): void {
    const summary = this.getMetricsSummary()

    logger.info('Chat Metrics Summary', {
      connections: summary.connections,
      sessions: summary.sessions,
      messages: summary.messages,
      performance: summary.performance,
      errors: summary.errors,
      timestamp: new Date().toISOString(),
    })

    // Log warnings for concerning metrics
    if (summary.performance.memory > 500) {
      logger.warn('High memory usage detected', { memoryMB: summary.performance.memory })
    }

    if (summary.performance.eventLoopDelay > 10) {
      logger.warn('High event loop delay detected', { delayMs: summary.performance.eventLoopDelay })
    }

    if (summary.errors.rateLimits > 100) {
      logger.warn('High rate limit hits detected', { hits: summary.errors.rateLimits })
    }

    if (summary.messages.avgLatency > 1000) {
      logger.warn('High message latency detected', { latencyMs: summary.messages.avgLatency })
    }
  }

  /**
   * Get health status based on metrics
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    issues: string[]
    score: number
  } {
    const summary = this.getMetricsSummary()
    const issues: string[] = []
    let score = 100

    // Check memory usage (unhealthy > 1GB, degraded > 500MB)
    if (summary.performance.memory > 1000) {
      issues.push(`High memory usage: ${summary.performance.memory}MB`)
      score -= 30
    } else if (summary.performance.memory > 500) {
      issues.push(`Elevated memory usage: ${summary.performance.memory}MB`)
      score -= 10
    }

    // Check event loop delay (unhealthy > 50ms, degraded > 10ms)
    if (summary.performance.eventLoopDelay > 50) {
      issues.push(`High event loop delay: ${summary.performance.eventLoopDelay}ms`)
      score -= 25
    } else if (summary.performance.eventLoopDelay > 10) {
      issues.push(`Elevated event loop delay: ${summary.performance.eventLoopDelay}ms`)
      score -= 10
    }

    // Check error rates
    if (summary.errors.connections > 50) {
      issues.push(`High connection error rate: ${summary.errors.connections}`)
      score -= 20
    }

    if (summary.errors.messages > 100) {
      issues.push(`High message error rate: ${summary.errors.messages}`)
      score -= 20
    }

    if (summary.errors.rateLimits > 200) {
      issues.push(`High rate limit hits: ${summary.errors.rateLimits}`)
      score -= 15
    }

    // Check message latency (unhealthy > 2s, degraded > 1s)
    if (summary.messages.avgLatency > 2000) {
      issues.push(`High message latency: ${summary.messages.avgLatency}ms`)
      score -= 25
    } else if (summary.messages.avgLatency > 1000) {
      issues.push(`Elevated message latency: ${summary.messages.avgLatency}ms`)
      score -= 10
    }

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (score >= 80) {
      status = 'healthy'
    } else if (score >= 60) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }

    return { status, issues, score }
  }
}

// Export singleton instance
export const chatMetricsCollector = new ChatMetricsCollector()

/**
 * Performance optimization recommendations
 */
export class ChatPerformanceOptimizer {
  private metricsCollector: ChatMetricsCollector

  constructor(metricsCollector: ChatMetricsCollector) {
    this.metricsCollector = metricsCollector
  }

  /**
   * Get performance optimization recommendations
   */
  getOptimizationRecommendations(): Array<{
    priority: 'high' | 'medium' | 'low'
    category: 'memory' | 'performance' | 'scaling' | 'errors'
    recommendation: string
    impact: string
  }> {
    const summary = this.metricsCollector.getMetricsSummary()
    const recommendations: Array<{
      priority: 'high' | 'medium' | 'low'
      category: 'memory' | 'performance' | 'scaling' | 'errors'
      recommendation: string
      impact: string
    }> = []

    // Memory optimization
    if (summary.performance.memory > 500) {
      recommendations.push({
        priority: summary.performance.memory > 1000 ? 'high' : 'medium',
        category: 'memory',
        recommendation: 'Implement message buffer cleanup and optimize data structures',
        impact: 'Reduce memory usage by 20-40%',
      })
    }

    // Event loop optimization
    if (summary.performance.eventLoopDelay > 10) {
      recommendations.push({
        priority: summary.performance.eventLoopDelay > 50 ? 'high' : 'medium',
        category: 'performance',
        recommendation: 'Implement message batching and async processing queues',
        impact: 'Improve response time by 30-60%',
      })
    }

    // Scaling recommendations
    if (summary.connections.active > 1000) {
      recommendations.push({
        priority: 'medium',
        category: 'scaling',
        recommendation: 'Consider implementing horizontal scaling with Redis adapter',
        impact: 'Support 10x more concurrent connections',
      })
    }

    if (summary.messages.rate > 100) {
      recommendations.push({
        priority: 'medium',
        category: 'scaling',
        recommendation: 'Implement message queuing and worker processes',
        impact: 'Handle 5x more messages per second',
      })
    }

    // Error handling
    if (summary.errors.rateLimits > 100) {
      recommendations.push({
        priority: 'high',
        category: 'errors',
        recommendation: 'Implement adaptive rate limiting and client-side backoff',
        impact: 'Reduce rate limit hits by 80%',
      })
    }

    if (summary.errors.connections > 50) {
      recommendations.push({
        priority: 'high',
        category: 'errors',
        recommendation: 'Improve connection resilience and retry mechanisms',
        impact: 'Reduce connection failures by 70%',
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Apply automatic optimizations based on metrics
   */
  applyAutomaticOptimizations(): void {
    const summary = this.metricsCollector.getMetricsSummary()

    // Auto-cleanup if memory usage is high
    if (summary.performance.memory > 800) {
      logger.info('Applying automatic memory cleanup due to high usage')
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
    }

    // Log optimization applied
    logger.info('Automatic optimizations applied', {
      memoryUsage: summary.performance.memory,
      eventLoopDelay: summary.performance.eventLoopDelay,
    })
  }
}

export const chatPerformanceOptimizer = new ChatPerformanceOptimizer(chatMetricsCollector)