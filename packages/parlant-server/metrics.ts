/**
 * Parlant Agent Performance Metrics Collection
 *
 * This module provides comprehensive metrics collection for Parlant agents,
 * including performance tracking, usage analytics, and behavioral insights.
 */

import { sql } from 'drizzle-orm'
import { db } from '../db'
import { createParlantLogger } from './logging'

const logger = createParlantLogger('Metrics')

/**
 * Agent performance metrics interface
 */
export interface AgentMetrics {
  agentId: string
  workspaceId: string
  timeWindow: {
    start: string
    end: string
    duration: number // in milliseconds
  }
  performance: {
    totalSessions: number
    totalMessages: number
    averageResponseTime: number // in milliseconds
    p95ResponseTime: number
    p99ResponseTime: number
    successRate: number // percentage
    errorCount: number
    timeoutCount: number
  }
  usage: {
    totalTokens: number
    averageTokensPerMessage: number
    totalToolCalls: number
    uniqueToolsUsed: number
    mostUsedTools: Array<{
      tool: string
      count: number
      successRate: number
    }>
  }
  quality: {
    userSatisfactionScore?: number // if available from feedback
    conversationCompletionRate: number
    averageConversationLength: number
    escalationRate: number // rate of human handoffs
  }
  behavioral: {
    peakUsageHours: Array<{
      hour: number
      sessionCount: number
    }>
    commonIntents: Array<{
      intent: string
      count: number
    }>
    averageSessionDuration: number
  }
}

/**
 * System-wide metrics aggregation
 */
export interface SystemMetrics {
  timestamp: string
  agents: {
    total: number
    active: number
    idle: number
    error: number
  }
  sessions: {
    total: number
    active: number
    completed: number
    failed: number
    averageDuration: number
  }
  performance: {
    averageResponseTime: number
    systemThroughput: number // messages per minute
    resourceUtilization: {
      cpu: number
      memory: number
      database: {
        connections: number
        queryTime: number
      }
    }
  }
  reliability: {
    uptime: number
    errorRate: number
    serviceAvailability: number
  }
}

/**
 * Workspace-level metrics
 */
export interface WorkspaceMetrics {
  workspaceId: string
  timeWindow: {
    start: string
    end: string
  }
  usage: {
    totalAgents: number
    activeUsers: number
    totalSessions: number
    totalMessages: number
    totalCost?: number // if cost tracking is available
  }
  performance: {
    averageResponseTime: number
    successRate: number
    errorRate: number
  }
  trends: {
    sessionGrowth: number // percentage change
    userEngagement: number
    agentEfficiency: number
  }
}

/**
 * Real-time metrics tracking for individual agents
 */
export class AgentMetricsTracker {
  private agentId: string
  private workspaceId: string
  private sessionMetrics: Map<
    string,
    {
      startTime: number
      messageCount: number
      toolCalls: number
      tokenCount: number
      responseTimes: number[]
      errors: number
      status: 'active' | 'completed' | 'failed'
    }
  > = new Map()

  constructor(agentId: string, workspaceId: string) {
    this.agentId = agentId
    this.workspaceId = workspaceId
  }

  /**
   * Start tracking a new session
   */
  startSession(sessionId: string): void {
    logger.debug('Starting session tracking', {
      agentId: this.agentId,
      sessionId,
      operation: 'session_start',
    })

    this.sessionMetrics.set(sessionId, {
      startTime: Date.now(),
      messageCount: 0,
      toolCalls: 0,
      tokenCount: 0,
      responseTimes: [],
      errors: 0,
      status: 'active',
    })
  }

  /**
   * Record a message interaction
   */
  recordMessage(
    sessionId: string,
    responseTime: number,
    tokenCount = 0,
    toolCalls = 0,
    hasError = false
  ): void {
    const session = this.sessionMetrics.get(sessionId)
    if (!session) {
      logger.warn('Attempted to record message for unknown session', {
        agentId: this.agentId,
        sessionId,
        operation: 'message_process',
      })
      return
    }

    session.messageCount++
    session.tokenCount += tokenCount
    session.toolCalls += toolCalls
    session.responseTimes.push(responseTime)

    if (hasError) {
      session.errors++
    }

    logger.debug('Message recorded', {
      agentId: this.agentId,
      sessionId,
      responseTime,
      tokenCount,
      toolCalls,
      hasError,
      operation: 'message_process',
      duration: responseTime,
    })
  }

  /**
   * Record tool execution
   */
  recordToolExecution(
    sessionId: string,
    toolName: string,
    executionTime: number,
    success: boolean
  ): void {
    logger.debug('Tool execution recorded', {
      agentId: this.agentId,
      sessionId,
      operation: 'tool_execute',
      duration: executionTime,
      metadata: {
        tool: toolName,
        success,
      },
    })

    const session = this.sessionMetrics.get(sessionId)
    if (session && !success) {
      session.errors++
    }
  }

  /**
   * End session tracking
   */
  endSession(sessionId: string, status: 'completed' | 'failed' = 'completed'): void {
    const session = this.sessionMetrics.get(sessionId)
    if (!session) {
      logger.warn('Attempted to end unknown session', {
        agentId: this.agentId,
        sessionId,
        operation: 'session_end',
      })
      return
    }

    session.status = status
    const duration = Date.now() - session.startTime

    logger.info('Session completed', {
      agentId: this.agentId,
      sessionId,
      operation: 'session_end',
      duration,
      messageCount: session.messageCount,
      tokenCount: session.tokenCount,
      toolCalls: session.toolCalls,
      errorCount: session.errors,
      status,
    })

    // Clean up old session data (keep only last 100 sessions)
    if (this.sessionMetrics.size > 100) {
      const oldestSession = Array.from(this.sessionMetrics.keys())[0]
      this.sessionMetrics.delete(oldestSession)
    }
  }

  /**
   * Get current performance metrics for this agent
   */
  getMetrics(timeWindowHours = 24): Partial<AgentMetrics> {
    const windowStart = Date.now() - timeWindowHours * 60 * 60 * 1000
    const relevantSessions = Array.from(this.sessionMetrics.entries()).filter(
      ([_, session]) => session.startTime >= windowStart
    )

    if (relevantSessions.length === 0) {
      return {
        agentId: this.agentId,
        workspaceId: this.workspaceId,
        performance: {
          totalSessions: 0,
          totalMessages: 0,
          averageResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          successRate: 100,
          errorCount: 0,
          timeoutCount: 0,
        },
      }
    }

    const totalSessions = relevantSessions.length
    const totalMessages = relevantSessions.reduce(
      (sum, [_, session]) => sum + session.messageCount,
      0
    )
    const totalErrors = relevantSessions.reduce((sum, [_, session]) => sum + session.errors, 0)
    const totalTokens = relevantSessions.reduce((sum, [_, session]) => sum + session.tokenCount, 0)
    const totalToolCalls = relevantSessions.reduce(
      (sum, [_, session]) => sum + session.toolCalls,
      0
    )

    // Calculate response time statistics
    const allResponseTimes = relevantSessions.flatMap(([_, session]) => session.responseTimes)
    allResponseTimes.sort((a, b) => a - b)

    const averageResponseTime =
      allResponseTimes.length > 0
        ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length
        : 0

    const p95Index = Math.floor(allResponseTimes.length * 0.95)
    const p99Index = Math.floor(allResponseTimes.length * 0.99)
    const p95ResponseTime = allResponseTimes[p95Index] || 0
    const p99ResponseTime = allResponseTimes[p99Index] || 0

    const completedSessions = relevantSessions.filter(
      ([_, session]) => session.status === 'completed'
    ).length
    const successRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 100

    return {
      agentId: this.agentId,
      workspaceId: this.workspaceId,
      timeWindow: {
        start: new Date(windowStart).toISOString(),
        end: new Date().toISOString(),
        duration: timeWindowHours * 60 * 60 * 1000,
      },
      performance: {
        totalSessions,
        totalMessages,
        averageResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        successRate,
        errorCount: totalErrors,
        timeoutCount: 0, // TODO: Track timeouts separately
      },
      usage: {
        totalTokens,
        averageTokensPerMessage: totalMessages > 0 ? totalTokens / totalMessages : 0,
        totalToolCalls,
        uniqueToolsUsed: 0, // TODO: Track unique tools
        mostUsedTools: [], // TODO: Track tool usage
      },
    }
  }
}

/**
 * System-wide metrics collector
 */
export class SystemMetricsCollector {
  private agentTrackers: Map<string, AgentMetricsTracker> = new Map()

  /**
   * Get or create agent tracker
   */
  getAgentTracker(agentId: string, workspaceId: string): AgentMetricsTracker {
    const key = `${agentId}:${workspaceId}`
    if (!this.agentTrackers.has(key)) {
      this.agentTrackers.set(key, new AgentMetricsTracker(agentId, workspaceId))
    }
    return this.agentTrackers.get(key)!
  }

  /**
   * Collect system-wide metrics
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const startTime = performance.now()

    try {
      logger.debug('Collecting system metrics')

      // Get database connection info
      const [dbStats] = await Promise.allSettled([
        db.execute(sql`
          SELECT
            count(*) as total_connections,
            count(*) filter (where state = 'active') as active_connections
          FROM pg_stat_activity
          WHERE datname = current_database()
        `),
      ])

      // Aggregate metrics from all agent trackers
      const agentMetrics = Array.from(this.agentTrackers.values()).map((tracker) =>
        tracker.getMetrics(1)
      ) // Last hour

      const totalAgents = this.agentTrackers.size
      const activeAgents = agentMetrics.filter(
        (m) => (m.performance?.totalSessions || 0) > 0
      ).length

      const totalSessions = agentMetrics.reduce(
        (sum, m) => sum + (m.performance?.totalSessions || 0),
        0
      )
      const totalMessages = agentMetrics.reduce(
        (sum, m) => sum + (m.performance?.totalMessages || 0),
        0
      )
      const totalErrors = agentMetrics.reduce((sum, m) => sum + (m.performance?.errorCount || 0), 0)

      const avgResponseTime =
        agentMetrics.length > 0
          ? agentMetrics.reduce((sum, m) => sum + (m.performance?.averageResponseTime || 0), 0) /
            agentMetrics.length
          : 0

      const memoryUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()

      const result: SystemMetrics = {
        timestamp: new Date().toISOString(),
        agents: {
          total: totalAgents,
          active: activeAgents,
          idle: totalAgents - activeAgents,
          error: 0, // TODO: Track agents in error state
        },
        sessions: {
          total: totalSessions,
          active: 0, // TODO: Track active sessions
          completed: 0, // TODO: Track completed sessions
          failed: 0, // TODO: Track failed sessions
          averageDuration: 0, // TODO: Calculate average session duration
        },
        performance: {
          averageResponseTime: avgResponseTime,
          systemThroughput: totalMessages, // messages in last hour
          resourceUtilization: {
            cpu: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
            memory: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
            database: {
              connections:
                dbStats.status === 'fulfilled'
                  ? Number.parseInt((dbStats.value[0] as any)?.total_connections || '0', 10)
                  : 0,
              queryTime: 0, // TODO: Get from monitoring system
            },
          },
        },
        reliability: {
          uptime: process.uptime(),
          errorRate: totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0,
          serviceAvailability: 100, // TODO: Calculate based on actual availability
        },
      }

      logger.debug('System metrics collected', {
        duration: performance.now() - startTime,
        totalAgents,
        activeAgents,
        totalSessions,
        operation: 'system_metrics',
      })

      return result
    } catch (error) {
      logger.error('Failed to collect system metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime,
        operation: 'system_metrics',
      })
      throw error
    }
  }

  /**
   * Get workspace metrics
   */
  async getWorkspaceMetrics(workspaceId: string, timeWindowHours = 24): Promise<WorkspaceMetrics> {
    const windowStart = Date.now() - timeWindowHours * 60 * 60 * 1000

    // Filter agent trackers for this workspace
    const workspaceTrackers = Array.from(this.agentTrackers.entries())
      .filter(([key, _]) => key.endsWith(`:${workspaceId}`))
      .map(([_, tracker]) => tracker.getMetrics(timeWindowHours))

    const totalAgents = workspaceTrackers.length
    const totalSessions = workspaceTrackers.reduce(
      (sum, m) => sum + (m.performance?.totalSessions || 0),
      0
    )
    const totalMessages = workspaceTrackers.reduce(
      (sum, m) => sum + (m.performance?.totalMessages || 0),
      0
    )
    const totalErrors = workspaceTrackers.reduce(
      (sum, m) => sum + (m.performance?.errorCount || 0),
      0
    )

    const avgResponseTime =
      workspaceTrackers.length > 0
        ? workspaceTrackers.reduce((sum, m) => sum + (m.performance?.averageResponseTime || 0), 0) /
          workspaceTrackers.length
        : 0

    return {
      workspaceId,
      timeWindow: {
        start: new Date(windowStart).toISOString(),
        end: new Date().toISOString(),
      },
      usage: {
        totalAgents,
        activeUsers: 0, // TODO: Track unique active users
        totalSessions,
        totalMessages,
        totalCost: 0, // TODO: Calculate costs if available
      },
      performance: {
        averageResponseTime: avgResponseTime,
        successRate:
          totalMessages > 0 ? ((totalMessages - totalErrors) / totalMessages) * 100 : 100,
        errorRate: totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0,
      },
      trends: {
        sessionGrowth: 0, // TODO: Calculate growth trends
        userEngagement: 0, // TODO: Calculate engagement metrics
        agentEfficiency: 0, // TODO: Calculate efficiency metrics
      },
    }
  }

  /**
   * Generate metrics dashboard data
   */
  async generateMetricsDashboard(): Promise<{
    systemMetrics: SystemMetrics
    topPerformingAgents: Array<{
      agentId: string
      workspaceId: string
      successRate: number
      responseTime: number
      messageCount: number
    }>
    recentAlerts: Array<{
      type: string
      message: string
      timestamp: string
      severity: 'low' | 'medium' | 'high'
    }>
  }> {
    const systemMetrics = await this.collectSystemMetrics()

    // Get top performing agents
    const agentMetrics = Array.from(this.agentTrackers.values())
      .map((tracker) => tracker.getMetrics(24))
      .filter((m) => (m.performance?.totalMessages || 0) > 0)
      .sort((a, b) => (b.performance?.successRate || 0) - (a.performance?.successRate || 0))
      .slice(0, 10)

    const topPerformingAgents = agentMetrics.map((m) => ({
      agentId: m.agentId || '',
      workspaceId: m.workspaceId || '',
      successRate: m.performance?.successRate || 0,
      responseTime: m.performance?.averageResponseTime || 0,
      messageCount: m.performance?.totalMessages || 0,
    }))

    // Generate alerts based on metrics (placeholder implementation)
    const recentAlerts: any[] = []
    if (systemMetrics.performance.averageResponseTime > 5000) {
      recentAlerts.push({
        type: 'performance',
        message: 'High average response time detected',
        timestamp: new Date().toISOString(),
        severity: 'medium' as const,
      })
    }

    return {
      systemMetrics,
      topPerformingAgents,
      recentAlerts,
    }
  }
}

/**
 * Global metrics collector instance
 */
export const systemMetrics = new SystemMetricsCollector()

/**
 * Utility functions for metrics collection
 */
export const metricsUtils = {
  /**
   * Start tracking an agent session
   */
  startSession: (agentId: string, workspaceId: string, sessionId: string) => {
    systemMetrics.getAgentTracker(agentId, workspaceId).startSession(sessionId)
  },

  /**
   * Record message interaction
   */
  recordMessage: (
    agentId: string,
    workspaceId: string,
    sessionId: string,
    responseTime: number,
    tokenCount?: number,
    toolCalls?: number,
    hasError?: boolean
  ) => {
    systemMetrics
      .getAgentTracker(agentId, workspaceId)
      .recordMessage(sessionId, responseTime, tokenCount, toolCalls, hasError)
  },

  /**
   * End session tracking
   */
  endSession: (
    agentId: string,
    workspaceId: string,
    sessionId: string,
    status?: 'completed' | 'failed'
  ) => {
    systemMetrics.getAgentTracker(agentId, workspaceId).endSession(sessionId, status)
  },

  /**
   * Get agent metrics
   */
  getAgentMetrics: (agentId: string, workspaceId: string, timeWindowHours?: number) => {
    return systemMetrics.getAgentTracker(agentId, workspaceId).getMetrics(timeWindowHours)
  },
}
