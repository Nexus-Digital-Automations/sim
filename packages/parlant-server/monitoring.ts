/**
 * Parlant Server Monitoring and Metrics Collection
 *
 * This module provides comprehensive monitoring capabilities for Parlant server
 * operations, including performance metrics, usage statistics, and operational insights.
 */

import { sql } from 'drizzle-orm'
import { createLogger } from '../../apps/sim/lib/logs/console/logger'
import { db } from '../db'

const logger = createLogger('ParlantMonitoring')

export interface AgentPerformanceMetrics {
  agentId: string
  agentName?: string
  workspaceId?: string
  metrics: {
    totalSessions: number
    totalMessages: number
    averageResponseTime: number
    successRate: number
    errorCount: number
    lastActiveAt: string
  }
  timeWindow: {
    start: string
    end: string
    duration: string
  }
}

export interface SystemMetrics {
  timestamp: string
  database: {
    connectionCount: number
    queryTime: {
      average: number
      p95: number
      p99: number
    }
    activeQueries: number
    slowQueries: number
  }
  memory: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  cpu: {
    user: number
    system: number
  }
  uptime: number
}

export interface UsageMetrics {
  period: {
    start: string
    end: string
  }
  agents: {
    total: number
    active: number
    created: number
  }
  sessions: {
    total: number
    active: number
    completed: number
    failed: number
  }
  messages: {
    total: number
    user: number
    agent: number
    system: number
  }
  tools: {
    totalCalls: number
    uniqueTools: number
    successRate: number
    mostUsed: Array<{
      tool: string
      count: number
    }>
  }
}

export interface AlertThresholds {
  database: {
    connectionCount: number
    queryTimeP95: number
    queryTimeP99: number
    errorRate: number
  }
  memory: {
    heapUsagePercent: number
    rssUsagePercent: number
  }
  agent: {
    errorRate: number
    responseTime: number
    sessionFailureRate: number
  }
}

/**
 * Default alert thresholds for Parlant server monitoring
 */
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  database: {
    connectionCount: 50, // Alert when 50+ connections active
    queryTimeP95: 1000, // Alert when P95 query time > 1s
    queryTimeP99: 5000, // Alert when P99 query time > 5s
    errorRate: 5, // Alert when error rate > 5%
  },
  memory: {
    heapUsagePercent: 80, // Alert when heap usage > 80%
    rssUsagePercent: 90, // Alert when RSS usage > 90%
  },
  agent: {
    errorRate: 10, // Alert when agent error rate > 10%
    responseTime: 30000, // Alert when response time > 30s
    sessionFailureRate: 15, // Alert when session failure rate > 15%
  },
}

/**
 * Parlant Server Monitoring Service
 */
export class ParlantMonitoringService {
  private queryTimes: number[] = []
  private maxQueryTimeHistory = 1000
  private alertThresholds: AlertThresholds

  constructor(alertThresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS) {
    this.alertThresholds = alertThresholds
  }

  /**
   * Record database query performance
   */
  recordQueryTime(duration: number): void {
    this.queryTimes.push(duration)
    if (this.queryTimes.length > this.maxQueryTimeHistory) {
      this.queryTimes.shift()
    }
  }

  /**
   * Get system performance metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const startTime = performance.now()

    try {
      // Get database connection info
      const [connectionResult] = await Promise.allSettled([
        db.execute(sql`
          SELECT
            count(*) as total_connections,
            count(*) filter (where state = 'active') as active_connections,
            count(*) filter (where state = 'idle') as idle_connections
          FROM pg_stat_activity
          WHERE datname = current_database()
        `),
      ])

      // Get slow query count
      const [slowQueryResult] = await Promise.allSettled([
        db.execute(sql`
          SELECT count(*) as slow_queries
          FROM pg_stat_statements
          WHERE mean_exec_time > 1000
          AND calls > 10
        `),
      ])

      // Record this query time
      const queryTime = performance.now() - startTime
      this.recordQueryTime(queryTime)

      // Calculate query time statistics
      const sortedTimes = [...this.queryTimes].sort((a, b) => a - b)
      const p95Index = Math.floor(sortedTimes.length * 0.95)
      const p99Index = Math.floor(sortedTimes.length * 0.99)

      const memoryUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()

      return {
        timestamp: new Date().toISOString(),
        database: {
          connectionCount:
            connectionResult.status === 'fulfilled'
              ? Number.parseInt((connectionResult.value[0] as any)?.total_connections || '0', 10)
              : 0,
          queryTime: {
            average:
              sortedTimes.length > 0
                ? sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length
                : 0,
            p95: sortedTimes[p95Index] || 0,
            p99: sortedTimes[p99Index] || 0,
          },
          activeQueries:
            connectionResult.status === 'fulfilled'
              ? Number.parseInt((connectionResult.value[0] as any)?.active_connections || '0', 10)
              : 0,
          slowQueries:
            slowQueryResult.status === 'fulfilled'
              ? Number.parseInt((slowQueryResult.value[0] as any)?.slow_queries || '0', 10)
              : 0,
        },
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        uptime: process.uptime(),
      }
    } catch (error) {
      logger.error('Failed to collect system metrics', { error })
      throw error
    }
  }

  /**
   * Get agent performance metrics for a specific time window
   */
  async getAgentPerformanceMetrics(
    timeWindowMinutes = 60,
    agentId?: string
  ): Promise<AgentPerformanceMetrics[]> {
    try {
      logger.debug('Collecting agent performance metrics', {
        timeWindowMinutes,
        agentId,
      })

      const windowStart = new Date(Date.now() - timeWindowMinutes * 60 * 1000)
      const windowEnd = new Date()

      // For now, return placeholder data since Parlant tables don't exist yet
      // This will be replaced with actual queries once the Parlant schema is implemented
      const placeholderMetrics: AgentPerformanceMetrics[] = []

      if (agentId) {
        placeholderMetrics.push({
          agentId,
          agentName: `Agent ${agentId}`,
          workspaceId: 'placeholder-workspace',
          metrics: {
            totalSessions: 0,
            totalMessages: 0,
            averageResponseTime: 0,
            successRate: 100,
            errorCount: 0,
            lastActiveAt: new Date().toISOString(),
          },
          timeWindow: {
            start: windowStart.toISOString(),
            end: windowEnd.toISOString(),
            duration: `${timeWindowMinutes} minutes`,
          },
        })
      }

      logger.debug('Agent performance metrics collected', {
        agentCount: placeholderMetrics.length,
        timeWindow: { start: windowStart, end: windowEnd },
      })

      return placeholderMetrics
    } catch (error) {
      logger.error('Failed to collect agent performance metrics', { error })
      throw error
    }
  }

  /**
   * Get usage statistics for a time period
   */
  async getUsageMetrics(periodHours = 24): Promise<UsageMetrics> {
    try {
      const periodStart = new Date(Date.now() - periodHours * 60 * 60 * 1000)
      const periodEnd = new Date()

      logger.debug('Collecting usage metrics', { periodHours })

      // Placeholder implementation - will be replaced with actual Parlant data queries
      return {
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        agents: {
          total: 0,
          active: 0,
          created: 0,
        },
        sessions: {
          total: 0,
          active: 0,
          completed: 0,
          failed: 0,
        },
        messages: {
          total: 0,
          user: 0,
          agent: 0,
          system: 0,
        },
        tools: {
          totalCalls: 0,
          uniqueTools: 0,
          successRate: 100,
          mostUsed: [],
        },
      }
    } catch (error) {
      logger.error('Failed to collect usage metrics', { error })
      throw error
    }
  }

  /**
   * Check if any metrics exceed alert thresholds
   */
  async checkAlertConditions(): Promise<{
    alerts: Array<{
      severity: 'warning' | 'critical'
      category: string
      message: string
      value: number
      threshold: number
      timestamp: string
    }>
    systemHealth: 'healthy' | 'degraded' | 'critical'
  }> {
    try {
      const alerts: any[] = []
      const metrics = await this.getSystemMetrics()

      // Database alerts
      if (metrics.database.connectionCount > this.alertThresholds.database.connectionCount) {
        alerts.push({
          severity: 'warning' as const,
          category: 'database',
          message: 'High database connection count',
          value: metrics.database.connectionCount,
          threshold: this.alertThresholds.database.connectionCount,
          timestamp: metrics.timestamp,
        })
      }

      if (metrics.database.queryTime.p95 > this.alertThresholds.database.queryTimeP95) {
        alerts.push({
          severity: 'warning' as const,
          category: 'database',
          message: 'High P95 query response time',
          value: metrics.database.queryTime.p95,
          threshold: this.alertThresholds.database.queryTimeP95,
          timestamp: metrics.timestamp,
        })
      }

      if (metrics.database.queryTime.p99 > this.alertThresholds.database.queryTimeP99) {
        alerts.push({
          severity: 'critical' as const,
          category: 'database',
          message: 'Critical P99 query response time',
          value: metrics.database.queryTime.p99,
          threshold: this.alertThresholds.database.queryTimeP99,
          timestamp: metrics.timestamp,
        })
      }

      // Memory alerts
      const heapUsagePercent = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100
      if (heapUsagePercent > this.alertThresholds.memory.heapUsagePercent) {
        alerts.push({
          severity: heapUsagePercent > 90 ? ('critical' as const) : ('warning' as const),
          category: 'memory',
          message: 'High heap memory usage',
          value: heapUsagePercent,
          threshold: this.alertThresholds.memory.heapUsagePercent,
          timestamp: metrics.timestamp,
        })
      }

      // Determine overall system health
      let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy'
      if (alerts.some((alert) => alert.severity === 'critical')) {
        systemHealth = 'critical'
      } else if (alerts.length > 0) {
        systemHealth = 'degraded'
      }

      if (alerts.length > 0) {
        logger.warn('Alert conditions detected', {
          alertCount: alerts.length,
          systemHealth,
        })
      }

      return { alerts, systemHealth }
    } catch (error) {
      logger.error('Failed to check alert conditions', { error })
      return {
        alerts: [],
        systemHealth: 'healthy',
      }
    }
  }

  /**
   * Generate monitoring dashboard data
   */
  async generateDashboardData(): Promise<{
    summary: {
      status: 'healthy' | 'degraded' | 'critical'
      uptime: number
      lastUpdated: string
    }
    metrics: SystemMetrics
    usage: UsageMetrics
    alerts: any[]
  }> {
    try {
      const [systemMetrics, usageMetrics, alertCheck] = await Promise.all([
        this.getSystemMetrics(),
        this.getUsageMetrics(24), // Last 24 hours
        this.checkAlertConditions(),
      ])

      return {
        summary: {
          status: alertCheck.systemHealth,
          uptime: systemMetrics.uptime,
          lastUpdated: systemMetrics.timestamp,
        },
        metrics: systemMetrics,
        usage: usageMetrics,
        alerts: alertCheck.alerts,
      }
    } catch (error) {
      logger.error('Failed to generate dashboard data', { error })
      throw error
    }
  }
}

/**
 * Singleton monitoring service instance
 */
export const parlantMonitoring = new ParlantMonitoringService()

/**
 * Export monitoring utilities
 */
export const monitoring = {
  system: () => parlantMonitoring.getSystemMetrics(),
  agents: (timeWindow?: number, agentId?: string) =>
    parlantMonitoring.getAgentPerformanceMetrics(timeWindow, agentId),
  usage: (periodHours?: number) => parlantMonitoring.getUsageMetrics(periodHours),
  alerts: () => parlantMonitoring.checkAlertConditions(),
  dashboard: () => parlantMonitoring.generateDashboardData(),
  recordQuery: (duration: number) => parlantMonitoring.recordQueryTime(duration),
}
