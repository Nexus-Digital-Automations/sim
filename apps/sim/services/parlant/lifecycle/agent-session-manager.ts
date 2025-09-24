/**
 * Agent Session Lifecycle Manager
 * ================================
 *
 * Comprehensive agent session lifecycle management for chat conversations.
 * Handles agent instantiation, configuration, session management, and cleanup
 * procedures with real-time Socket.io integration.
 *
 * Key Features:
 * - Agent session creation, configuration, and cleanup
 * - Chat session lifecycle (start, active, paused, ended)
 * - Agent context and memory management across conversations
 * - Resource management and optimization
 * - Real-time event broadcasting via Socket.io
 * - Multi-agent coordination capabilities
 * - Performance monitoring and analytics
 */

import { createLogger } from '@/lib/logs/console/logger'
import { io, type Socket as SocketIOServer } from 'socket.io'
import type {
  Agent,
  Session,
  AuthContext,
  AgentConfig,
  Event,
  EventType
} from '../types'
import { agentService } from '../agent-service'
import { createSession, endSession, pauseSession, resumeSession } from '../sessions'
import { EventEmitter } from 'events'

const logger = createLogger('AgentSessionManager')

/**
 * Agent session lifecycle states
 */
export type SessionLifecycleState =
  | 'initializing'
  | 'active'
  | 'paused'
  | 'ending'
  | 'ended'
  | 'error'

/**
 * Agent session context containing all session-related data
 */
export interface AgentSessionContext {
  sessionId: string
  agentId: string
  userId: string
  workspaceId: string
  state: SessionLifecycleState
  createdAt: Date
  lastActivityAt: Date
  config: AgentConfig
  metadata: Record<string, any>
  conversationHistory: Event[]
  resourceUsage: SessionResourceUsage
  performanceMetrics: SessionPerformanceMetrics
}

/**
 * Resource usage tracking for sessions
 */
export interface SessionResourceUsage {
  memoryUsageMB: number
  cpuUsagePercent: number
  messagesProcessed: number
  toolsExecuted: number
  tokensConsumed: number
  sessionDurationMs: number
}

/**
 * Performance metrics for sessions
 */
export interface SessionPerformanceMetrics {
  averageResponseTimeMs: number
  p95ResponseTimeMs: number
  p99ResponseTimeMs: number
  errorRate: number
  successRate: number
  lastUpdated: Date
}

/**
 * Agent session configuration options
 */
export interface AgentSessionOptions {
  maxTurns?: number
  idleTimeoutMs?: number
  maxMemoryMB?: number
  enablePerformanceTracking?: boolean
  enableResourceMonitoring?: boolean
  customMetadata?: Record<string, any>
}

/**
 * Session lifecycle event types
 */
export type SessionLifecycleEvent =
  | 'session:created'
  | 'session:started'
  | 'session:paused'
  | 'session:resumed'
  | 'session:ended'
  | 'session:error'
  | 'agent:message'
  | 'user:message'
  | 'resource:warning'
  | 'performance:degraded'

/**
 * Main Agent Session Manager class
 */
export class AgentSessionManager extends EventEmitter {
  private sessions = new Map<string, AgentSessionContext>()
  private sessionCleanupTimers = new Map<string, NodeJS.Timeout>()
  private performanceMonitors = new Map<string, NodeJS.Timeout>()
  private socketServer?: SocketIOServer

  constructor() {
    super()
    logger.info('Agent Session Manager initialized')
  }

  /**
   * Initialize Socket.io server for real-time communication
   */
  public initializeSocketServer(server: any) {
    this.socketServer = io(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    })

    this.socketServer.on('connection', (socket) => {
      logger.info(`Client connected to agent session manager`, { socketId: socket.id })

      socket.on('join-agent-session', (data) => {
        const { sessionId } = data
        socket.join(`session-${sessionId}`)
        logger.debug(`Socket joined agent session`, { socketId: socket.id, sessionId })
      })

      socket.on('leave-agent-session', (data) => {
        const { sessionId } = data
        socket.leave(`session-${sessionId}`)
        logger.debug(`Socket left agent session`, { socketId: socket.id, sessionId })
      })
    })

    logger.info('Socket.io server initialized for agent session management')
  }

  /**
   * Create a new agent session with comprehensive lifecycle management
   */
  public async createAgentSession(
    agentId: string,
    auth: AuthContext,
    options: AgentSessionOptions = {}
  ): Promise<AgentSessionContext> {
    logger.info(`Creating agent session`, { agentId, userId: auth.user_id, workspaceId: auth.workspace_id })

    try {
      // Validate agent exists and user has access
      const agentResponse = await agentService.getAgent(agentId, auth)
      if (!agentResponse.success || !agentResponse.data) {
        throw new Error(`Agent ${agentId} not found or access denied`)
      }

      const agent = agentResponse.data

      // Create Parlant session
      const sessionResponse = await createSession({
        agent_id: agentId,
        user_id: auth.user_id,
        workspace_id: auth.workspace_id || agent.workspace_id,
        metadata: {
          lifecycle_managed: true,
          created_by: 'agent-session-manager',
          options
        }
      }, auth)

      // Create session context
      const sessionContext: AgentSessionContext = {
        sessionId: sessionResponse.id,
        agentId,
        userId: auth.user_id,
        workspaceId: auth.workspace_id || agent.workspace_id,
        state: 'initializing',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        config: agent.config || {},
        metadata: {
          ...options.customMetadata,
          agent_name: agent.name,
          agent_description: agent.description
        },
        conversationHistory: [],
        resourceUsage: {
          memoryUsageMB: 0,
          cpuUsagePercent: 0,
          messagesProcessed: 0,
          toolsExecuted: 0,
          tokensConsumed: 0,
          sessionDurationMs: 0
        },
        performanceMetrics: {
          averageResponseTimeMs: 0,
          p95ResponseTimeMs: 0,
          p99ResponseTimeMs: 0,
          errorRate: 0,
          successRate: 1.0,
          lastUpdated: new Date()
        }
      }

      // Store session
      this.sessions.set(sessionResponse.id, sessionContext)

      // Start session lifecycle
      await this.transitionSessionState(sessionResponse.id, 'active')

      // Setup monitoring if enabled
      if (options.enablePerformanceTracking || options.enableResourceMonitoring) {
        this.startSessionMonitoring(sessionResponse.id, options)
      }

      // Setup idle timeout if specified
      if (options.idleTimeoutMs) {
        this.setSessionTimeout(sessionResponse.id, options.idleTimeoutMs)
      }

      // Emit lifecycle event
      this.emitLifecycleEvent('session:created', sessionContext)

      logger.info(`Agent session created successfully`, {
        sessionId: sessionResponse.id,
        agentId,
        userId: auth.user_id,
        state: sessionContext.state
      })

      return sessionContext

    } catch (error) {
      logger.error(`Failed to create agent session`, {
        agentId,
        userId: auth.user_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Retrieve agent session context
   */
  public getAgentSession(sessionId: string): AgentSessionContext | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Update agent session with activity tracking
   */
  public async updateSessionActivity(
    sessionId: string,
    event: Event,
    responseTimeMs?: number
  ): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      logger.warn(`Session not found for activity update`, { sessionId })
      return
    }

    // Update activity timestamp
    session.lastActivityAt = new Date()

    // Add to conversation history
    session.conversationHistory.push(event)

    // Update resource usage
    session.resourceUsage.messagesProcessed++
    if (event.metadata?.tokensUsed) {
      session.resourceUsage.tokensConsumed += event.metadata.tokensUsed
    }

    // Update performance metrics if response time provided
    if (responseTimeMs) {
      this.updatePerformanceMetrics(session, responseTimeMs, true)
    }

    // Reset idle timeout
    this.resetSessionTimeout(sessionId)

    // Emit activity event
    this.emitLifecycleEvent('session:updated', session)

    logger.debug(`Session activity updated`, {
      sessionId,
      eventType: event.type,
      messagesProcessed: session.resourceUsage.messagesProcessed
    })
  }

  /**
   * Pause an agent session
   */
  public async pauseAgentSession(sessionId: string, auth: AuthContext): Promise<void> {
    logger.info(`Pausing agent session`, { sessionId })

    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    // Pause Parlant session
    await pauseSession(sessionId, auth)

    // Transition state
    await this.transitionSessionState(sessionId, 'paused')

    // Stop monitoring
    this.stopSessionMonitoring(sessionId)

    // Emit lifecycle event
    this.emitLifecycleEvent('session:paused', session)

    logger.info(`Agent session paused`, { sessionId })
  }

  /**
   * Resume a paused agent session
   */
  public async resumeAgentSession(sessionId: string, auth: AuthContext): Promise<void> {
    logger.info(`Resuming agent session`, { sessionId })

    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    // Resume Parlant session
    await resumeSession(sessionId, auth)

    // Transition state
    await this.transitionSessionState(sessionId, 'active')

    // Restart monitoring
    this.startSessionMonitoring(sessionId, {
      enablePerformanceTracking: true,
      enableResourceMonitoring: true
    })

    // Emit lifecycle event
    this.emitLifecycleEvent('session:resumed', session)

    logger.info(`Agent session resumed`, { sessionId })
  }

  /**
   * End an agent session with cleanup
   */
  public async endAgentSession(sessionId: string, auth: AuthContext): Promise<void> {
    logger.info(`Ending agent session`, { sessionId })

    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    // Transition to ending state
    await this.transitionSessionState(sessionId, 'ending')

    try {
      // End Parlant session
      await endSession(sessionId, auth)

      // Calculate final metrics
      this.calculateFinalMetrics(session)

      // Transition to ended state
      await this.transitionSessionState(sessionId, 'ended')

      // Cleanup resources
      await this.cleanupSession(sessionId)

      // Emit lifecycle event
      this.emitLifecycleEvent('session:ended', session)

      logger.info(`Agent session ended successfully`, {
        sessionId,
        duration: Date.now() - session.createdAt.getTime(),
        messagesProcessed: session.resourceUsage.messagesProcessed
      })

    } catch (error) {
      await this.transitionSessionState(sessionId, 'error')
      this.emitLifecycleEvent('session:error', session)
      throw error
    }
  }

  /**
   * Get all active sessions for a user/workspace
   */
  public getActiveSessions(userId?: string, workspaceId?: string): AgentSessionContext[] {
    const activeSessions = Array.from(this.sessions.values()).filter(session => {
      if (session.state === 'ended' || session.state === 'error') return false
      if (userId && session.userId !== userId) return false
      if (workspaceId && session.workspaceId !== workspaceId) return false
      return true
    })

    return activeSessions
  }

  /**
   * Get session analytics and metrics
   */
  public getSessionAnalytics(timeframe: '1h' | '24h' | '7d' | '30d' = '24h') {
    const now = new Date()
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }

    const cutoff = new Date(now.getTime() - timeframes[timeframe])
    const recentSessions = Array.from(this.sessions.values()).filter(
      session => session.createdAt >= cutoff
    )

    return {
      totalSessions: recentSessions.length,
      activeSessions: recentSessions.filter(s => s.state === 'active').length,
      averageSessionDuration: this.calculateAverageSessionDuration(recentSessions),
      totalMessagesProcessed: recentSessions.reduce((sum, s) => sum + s.resourceUsage.messagesProcessed, 0),
      averageResponseTime: this.calculateAverageResponseTime(recentSessions),
      errorRate: this.calculateErrorRate(recentSessions),
      resourceUtilization: this.calculateResourceUtilization(recentSessions)
    }
  }

  // Private helper methods

  private async transitionSessionState(sessionId: string, newState: SessionLifecycleState): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const oldState = session.state
    session.state = newState

    logger.debug(`Session state transition`, {
      sessionId,
      from: oldState,
      to: newState
    })

    // Broadcast state change via Socket.io
    this.broadcastToSession(sessionId, 'session:state-changed', {
      sessionId,
      previousState: oldState,
      currentState: newState,
      timestamp: new Date().toISOString()
    })
  }

  private startSessionMonitoring(sessionId: string, options: AgentSessionOptions): void {
    if (options.enableResourceMonitoring || options.enablePerformanceTracking) {
      const monitor = setInterval(() => {
        this.monitorSessionResources(sessionId)
      }, 5000) // Monitor every 5 seconds

      this.performanceMonitors.set(sessionId, monitor)
    }
  }

  private stopSessionMonitoring(sessionId: string): void {
    const monitor = this.performanceMonitors.get(sessionId)
    if (monitor) {
      clearInterval(monitor)
      this.performanceMonitors.delete(sessionId)
    }
  }

  private monitorSessionResources(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    // Update resource usage (simplified - would use actual system metrics)
    session.resourceUsage.sessionDurationMs = Date.now() - session.createdAt.getTime()

    // Check for resource warnings
    if (session.resourceUsage.memoryUsageMB > 500) {
      this.emitLifecycleEvent('resource:warning', session)
    }

    // Check for performance degradation
    if (session.performanceMetrics.averageResponseTimeMs > 5000) {
      this.emitLifecycleEvent('performance:degraded', session)
    }
  }

  private setSessionTimeout(sessionId: string, timeoutMs: number): void {
    const timer = setTimeout(async () => {
      logger.info(`Session idle timeout reached`, { sessionId, timeoutMs })
      const session = this.sessions.get(sessionId)
      if (session && session.state === 'active') {
        await this.transitionSessionState(sessionId, 'paused')
        this.emitLifecycleEvent('session:idle-timeout', session)
      }
    }, timeoutMs)

    this.sessionCleanupTimers.set(sessionId, timer)
  }

  private resetSessionTimeout(sessionId: string): void {
    const timer = this.sessionCleanupTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.sessionCleanupTimers.delete(sessionId)
    }
  }

  private updatePerformanceMetrics(
    session: AgentSessionContext,
    responseTimeMs: number,
    success: boolean
  ): void {
    const metrics = session.performanceMetrics
    const totalRequests = session.resourceUsage.messagesProcessed

    // Update response times (simplified moving average)
    metrics.averageResponseTimeMs =
      (metrics.averageResponseTimeMs * (totalRequests - 1) + responseTimeMs) / totalRequests

    // Update success/error rates
    if (success) {
      metrics.successRate = (metrics.successRate * (totalRequests - 1) + 1) / totalRequests
    } else {
      metrics.errorRate = (metrics.errorRate * (totalRequests - 1) + 1) / totalRequests
      metrics.successRate = 1 - metrics.errorRate
    }

    metrics.lastUpdated = new Date()
  }

  private calculateFinalMetrics(session: AgentSessionContext): void {
    session.resourceUsage.sessionDurationMs = Date.now() - session.createdAt.getTime()

    // Calculate additional final metrics
    logger.info(`Final session metrics calculated`, {
      sessionId: session.sessionId,
      duration: session.resourceUsage.sessionDurationMs,
      messages: session.resourceUsage.messagesProcessed,
      avgResponseTime: session.performanceMetrics.averageResponseTime,
      successRate: session.performanceMetrics.successRate
    })
  }

  private async cleanupSession(sessionId: string): Promise<void> {
    // Stop monitoring
    this.stopSessionMonitoring(sessionId)

    // Clear timeouts
    this.resetSessionTimeout(sessionId)

    // Archive session data (could save to database here)
    logger.debug(`Session cleaned up`, { sessionId })
  }

  private emitLifecycleEvent(event: SessionLifecycleEvent, session: AgentSessionContext): void {
    // Emit to EventEmitter listeners
    this.emit(event, session)

    // Broadcast via Socket.io
    this.broadcastToSession(session.sessionId, event, {
      sessionId: session.sessionId,
      agentId: session.agentId,
      state: session.state,
      timestamp: new Date().toISOString(),
      metadata: session.metadata
    })
  }

  private broadcastToSession(sessionId: string, event: string, data: any): void {
    if (this.socketServer) {
      this.socketServer.to(`session-${sessionId}`).emit(event, data)
    }
  }

  // Analytics helper methods
  private calculateAverageSessionDuration(sessions: AgentSessionContext[]): number {
    if (sessions.length === 0) return 0
    const total = sessions.reduce((sum, s) => sum + s.resourceUsage.sessionDurationMs, 0)
    return total / sessions.length
  }

  private calculateAverageResponseTime(sessions: AgentSessionContext[]): number {
    if (sessions.length === 0) return 0
    const total = sessions.reduce((sum, s) => sum + s.performanceMetrics.averageResponseTimeMs, 0)
    return total / sessions.length
  }

  private calculateErrorRate(sessions: AgentSessionContext[]): number {
    if (sessions.length === 0) return 0
    const total = sessions.reduce((sum, s) => sum + s.performanceMetrics.errorRate, 0)
    return total / sessions.length
  }

  private calculateResourceUtilization(sessions: AgentSessionContext[]) {
    const active = sessions.filter(s => s.state === 'active')

    return {
      activeSessionsCount: active.length,
      totalMemoryUsageMB: active.reduce((sum, s) => sum + s.resourceUsage.memoryUsageMB, 0),
      averageCpuUsage: active.length > 0 ?
        active.reduce((sum, s) => sum + s.resourceUsage.cpuUsagePercent, 0) / active.length : 0,
      totalTokensConsumed: sessions.reduce((sum, s) => sum + s.resourceUsage.tokensConsumed, 0)
    }
  }
}

// Export singleton instance
export const agentSessionManager = new AgentSessionManager()