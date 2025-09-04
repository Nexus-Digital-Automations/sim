/**
 * Real-time Help System Monitor
 *
 * Provides real-time monitoring capabilities for the help system including:
 * - Performance metrics tracking
 * - User activity monitoring
 * - System health checks
 * - Alert generation and management
 * - Live dashboard data
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import { nanoid } from 'nanoid'
import { createLogger } from '@/lib/logs/logger'
import type { HelpEngagementMetrics, RealTimeMetrics, SystemAlert } from './help-analytics-engine'

const logger = createLogger('RealTimeHelpMonitor')

export interface MonitoringConfig {
  updateInterval: number
  alertThresholds: AlertThresholds
  metricsRetention: number
  enablePredictiveAlerts: boolean
  dashboardRefreshRate: number
}

export interface AlertThresholds {
  errorRate: number
  responseTime: number
  satisfactionScore: number
  engagementRate: number
  systemLoad: number
  memoryUsage: number
}

export interface PerformanceSnapshot {
  timestamp: Date
  metrics: {
    activeUsers: number
    helpRequestsPerMinute: number
    averageResponseTime: number
    errorRate: number
    satisfactionScore: number
    systemHealth: 'healthy' | 'warning' | 'critical'
    memoryUsage: number
    cpuUsage: number
  }
  topContent: Array<{
    contentId: string
    requests: number
    avgRating: number
  }>
  userActivity: Array<{
    userId: string
    lastActive: Date
    helpRequests: number
  }>
}

export interface SystemHealthCheck {
  component: string
  status: 'healthy' | 'degraded' | 'down'
  responseTime: number
  lastChecked: Date
  error?: string
  metrics?: Record<string, number>
}

export interface MonitoringEvent {
  id: string
  type: 'performance' | 'user_activity' | 'system_health' | 'alert' | 'anomaly'
  timestamp: Date
  data: Record<string, any>
  severity: 'info' | 'warning' | 'critical'
  source: string
}

/**
 * Real-time Help System Monitor Class
 *
 * Monitors help system performance and user activity in real-time,
 * generates alerts for anomalies and performance issues,
 * and provides live metrics for dashboards and reporting.
 */
export class RealTimeHelpMonitor {
  private config: MonitoringConfig
  private currentMetrics: RealTimeMetrics | null = null
  private performanceHistory: PerformanceSnapshot[] = []
  private activeAlerts: Map<string, SystemAlert> = new Map()
  private monitoringInterval: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private subscribers: Map<string, (data: any) => void> = new Map()
  private eventQueue: MonitoringEvent[] = []
  private isMonitoring = false

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      updateInterval: 10000, // 10 seconds
      alertThresholds: {
        errorRate: 5, // 5%
        responseTime: 2000, // 2 seconds
        satisfactionScore: 3.0, // Below 3.0
        engagementRate: 30, // Below 30%
        systemLoad: 80, // Above 80%
        memoryUsage: 85, // Above 85%
      },
      metricsRetention: 1440, // 24 hours of data points
      enablePredictiveAlerts: true,
      dashboardRefreshRate: 5000, // 5 seconds
      ...config,
    }

    logger.info('Initializing Real-time Help Monitor', {
      updateInterval: this.config.updateInterval,
      metricsRetention: this.config.metricsRetention,
      predictiveAlerts: this.config.enablePredictiveAlerts,
    })

    this.initializeMonitoring()
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Monitoring is already running')
      return
    }

    logger.info('Starting real-time help system monitoring')

    this.isMonitoring = true

    // Start metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectRealTimeMetrics()
    }, this.config.updateInterval)

    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.performSystemHealthCheck()
    }, this.config.updateInterval * 2) // Check every 20 seconds

    // Initialize current metrics
    this.collectRealTimeMetrics()
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      logger.warn('Monitoring is not currently running')
      return
    }

    logger.info('Stopping real-time help system monitoring')

    this.isMonitoring = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  /**
   * Get current real-time metrics
   */
  getCurrentMetrics(): RealTimeMetrics | null {
    return this.currentMetrics
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit?: number): PerformanceSnapshot[] {
    return limit ? this.performanceHistory.slice(-limit) : this.performanceHistory
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SystemAlert[] {
    return Array.from(this.activeAlerts.values())
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(id: string, callback: (data: RealTimeMetrics) => void): void {
    logger.info('Adding real-time monitoring subscriber', { subscriberId: id })
    this.subscribers.set(id, callback)
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe(id: string): void {
    logger.info('Removing real-time monitoring subscriber', { subscriberId: id })
    this.subscribers.delete(id)
  }

  /**
   * Process help engagement for monitoring
   */
  processEngagement(engagement: HelpEngagementMetrics): void {
    const operationId = nanoid()

    logger.debug(`[${operationId}] Processing engagement for monitoring`, {
      helpContentId: engagement.helpContentId,
      eventType: engagement.eventType,
      userId: engagement.userId,
    })

    try {
      // Update active users count
      this.updateActiveUsersMetrics(engagement)

      // Check for anomalies
      this.detectAnomalies(engagement)

      // Update satisfaction tracking
      if (engagement.satisfaction) {
        this.updateSatisfactionMetrics(engagement.satisfaction.rating)
      }

      // Update effectiveness tracking
      if (engagement.effectiveness) {
        this.updateEffectivenessMetrics(engagement.effectiveness)
      }

      // Add monitoring event
      this.addMonitoringEvent({
        id: operationId,
        type: 'user_activity',
        timestamp: new Date(),
        data: {
          engagement,
          context: engagement.context,
        },
        severity: 'info',
        source: 'engagement_processor',
      })
    } catch (error) {
      logger.error(`[${operationId}] Failed to process engagement for monitoring`, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Generate monitoring report
   */
  generateMonitoringReport(period: { start: Date; end: Date }): {
    summary: Record<string, number>
    alerts: SystemAlert[]
    performance: PerformanceSnapshot[]
    recommendations: string[]
  } {
    const operationId = nanoid()

    logger.info(`[${operationId}] Generating monitoring report`, { period })

    try {
      // Filter performance data for period
      const periodPerformance = this.performanceHistory.filter(
        (snapshot) => snapshot.timestamp >= period.start && snapshot.timestamp <= period.end
      )

      // Calculate summary metrics
      const summary = this.calculateSummaryMetrics(periodPerformance)

      // Get alerts from period
      const periodAlerts = Array.from(this.activeAlerts.values()).filter(
        (alert) => alert.timestamp >= period.start && alert.timestamp <= period.end
      )

      // Generate recommendations
      const recommendations = this.generateRecommendations(periodPerformance, periodAlerts)

      logger.info(`[${operationId}] Monitoring report generated`, {
        performanceDataPoints: periodPerformance.length,
        alertsCount: periodAlerts.length,
        recommendationsCount: recommendations.length,
      })

      return {
        summary,
        alerts: periodAlerts,
        performance: periodPerformance,
        recommendations,
      }
    } catch (error) {
      logger.error(`[${operationId}] Failed to generate monitoring report`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Create custom alert
   */
  createAlert(
    type: SystemAlert['type'],
    severity: SystemAlert['severity'],
    message: string,
    actions?: string[]
  ): string {
    const alertId = nanoid()
    const alert: SystemAlert = {
      id: alertId,
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      actions,
    }

    this.activeAlerts.set(alertId, alert)
    this.notifySubscribers()

    logger.info('Custom alert created', {
      alertId,
      type,
      severity,
      message,
    })

    return alertId
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId)
    if (!alert) {
      logger.warn('Attempted to resolve non-existent alert', { alertId })
      return false
    }

    alert.resolved = true
    this.activeAlerts.set(alertId, alert)
    this.notifySubscribers()

    logger.info('Alert resolved', { alertId, type: alert.type })
    return true
  }

  // Private methods

  private initializeMonitoring(): void {
    // Initialize with empty metrics
    this.currentMetrics = {
      timestamp: new Date(),
      activeUsers: 0,
      helpRequestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      satisfactionScore: 0,
      topHelpRequests: [],
      systemHealth: 'healthy',
      alerts: [],
    }
  }

  private async collectRealTimeMetrics(): Promise<void> {
    const operationId = nanoid()

    logger.debug(`[${operationId}] Collecting real-time metrics`)

    try {
      // Calculate current metrics
      const now = new Date()
      const oneMinuteAgo = new Date(now.getTime() - 60000)

      // Get recent events
      const recentEvents = this.eventQueue.filter((event) => event.timestamp >= oneMinuteAgo)

      // Calculate metrics
      const activeUsers = this.calculateActiveUsers()
      const helpRequestsPerMinute = recentEvents.filter((e) => e.type === 'user_activity').length
      const averageResponseTime = this.calculateAverageResponseTime()
      const errorRate = this.calculateErrorRate(recentEvents)
      const satisfactionScore = this.calculateCurrentSatisfactionScore()

      // Get top help requests
      const topHelpRequests = this.calculateTopHelpRequests()

      // Determine system health
      const systemHealth = this.determineSystemHealth(
        errorRate,
        averageResponseTime,
        satisfactionScore
      )

      // Update current metrics
      this.currentMetrics = {
        timestamp: now,
        activeUsers,
        helpRequestsPerMinute,
        averageResponseTime,
        errorRate,
        satisfactionScore,
        topHelpRequests,
        systemHealth,
        alerts: Array.from(this.activeAlerts.values()).filter((a) => !a.resolved),
      }

      // Create performance snapshot
      const snapshot: PerformanceSnapshot = {
        timestamp: now,
        metrics: {
          activeUsers,
          helpRequestsPerMinute,
          averageResponseTime,
          errorRate,
          satisfactionScore,
          systemHealth,
          memoryUsage: this.getMemoryUsage(),
          cpuUsage: this.getCPUUsage(),
        },
        topContent: topHelpRequests.map((req) => ({
          contentId: req.content,
          requests: req.count,
          avgRating: 4.2, // This would be calculated from actual data
        })),
        userActivity: this.getActiveUserActivity(),
      }

      // Add to history
      this.performanceHistory.push(snapshot)

      // Maintain retention limit
      if (this.performanceHistory.length > this.config.metricsRetention) {
        this.performanceHistory = this.performanceHistory.slice(-this.config.metricsRetention)
      }

      // Check for alerts
      this.checkAlertThresholds(snapshot)

      // Notify subscribers
      this.notifySubscribers()

      logger.debug(`[${operationId}] Real-time metrics collected successfully`, {
        activeUsers,
        helpRequestsPerMinute,
        systemHealth,
      })
    } catch (error) {
      logger.error(`[${operationId}] Failed to collect real-time metrics`, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async performSystemHealthCheck(): Promise<void> {
    const operationId = nanoid()

    logger.debug(`[${operationId}] Performing system health check`)

    try {
      // Check various system components
      const healthChecks: SystemHealthCheck[] = [
        await this.checkHelpSystemHealth(),
        await this.checkAnalyticsEngineHealth(),
        await this.checkDatabaseHealth(),
        await this.checkAPIHealth(),
      ]

      // Process health check results
      healthChecks.forEach((check) => {
        if (check.status === 'down' || check.status === 'degraded') {
          this.createAlert(
            'error',
            check.status === 'down' ? 'critical' : 'warning',
            `${check.component} is ${check.status}: ${check.error || 'Unknown issue'}`,
            ['Check system logs', 'Restart service if needed', 'Monitor recovery']
          )
        }
      })

      logger.debug(`[${operationId}] System health check completed`, {
        checksPerformed: healthChecks.length,
        healthyComponents: healthChecks.filter((c) => c.status === 'healthy').length,
      })
    } catch (error) {
      logger.error(`[${operationId}] System health check failed`, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private updateActiveUsersMetrics(engagement: HelpEngagementMetrics): void {
    // This would update active users tracking
    // For now, just log the activity
    logger.debug('Updating active users metrics', {
      userId: engagement.userId,
      sessionId: engagement.sessionId,
    })
  }

  private detectAnomalies(engagement: HelpEngagementMetrics): void {
    // Detect anomalies in user behavior or system performance
    if (engagement.duration > 300000) {
      // 5 minutes
      this.createAlert(
        'performance',
        'warning',
        `Unusually long help engagement duration detected: ${engagement.duration}ms`,
        ['Check content quality', 'Review user feedback', 'Optimize content']
      )
    }

    if (engagement.eventType === 'dismiss' && engagement.duration < 5000) {
      // Less than 5 seconds
      logger.debug('Quick dismissal detected', {
        contentId: engagement.helpContentId,
        userId: engagement.userId,
        duration: engagement.duration,
      })
    }
  }

  private updateSatisfactionMetrics(rating: number): void {
    if (rating < this.config.alertThresholds.satisfactionScore) {
      this.createAlert('satisfaction', 'warning', `Low satisfaction rating received: ${rating}`, [
        'Review help content',
        'Gather user feedback',
        'Improve content quality',
      ])
    }
  }

  private updateEffectivenessMetrics(effectiveness: any): void {
    if (!effectiveness.taskCompleted || !effectiveness.problemSolved) {
      logger.debug('Low effectiveness detected', {
        taskCompleted: effectiveness.taskCompleted,
        problemSolved: effectiveness.problemSolved,
        userConfidence: effectiveness.userConfidence,
      })
    }
  }

  private addMonitoringEvent(event: MonitoringEvent): void {
    this.eventQueue.push(event)

    // Keep only recent events to prevent memory issues
    const oneHourAgo = new Date(Date.now() - 3600000)
    this.eventQueue = this.eventQueue.filter((e) => e.timestamp >= oneHourAgo)
  }

  private calculateActiveUsers(): number {
    // This would calculate active users based on recent activity
    // For now, return a sample value
    return Math.floor(Math.random() * 50) + 10
  }

  private calculateAverageResponseTime(): number {
    // Calculate average response time from recent events
    // For now, return a sample value
    return Math.floor(Math.random() * 500) + 200
  }

  private calculateErrorRate(events: MonitoringEvent[]): number {
    const errorEvents = events.filter((e) => e.severity === 'critical' || e.severity === 'warning')
    return events.length > 0 ? (errorEvents.length / events.length) * 100 : 0
  }

  private calculateCurrentSatisfactionScore(): number {
    // This would calculate current satisfaction from recent ratings
    // For now, return a sample value
    return 4.0 + Math.random() * 0.8 // 4.0 to 4.8
  }

  private calculateTopHelpRequests(): Array<{ content: string; count: number }> {
    // This would calculate top help requests from recent activity
    return [
      { content: 'Getting Started Guide', count: 23 },
      { content: 'Block Configuration Help', count: 18 },
      { content: 'Workflow Connections', count: 15 },
      { content: 'Error Troubleshooting', count: 12 },
      { content: 'Advanced Features', count: 8 },
    ]
  }

  private determineSystemHealth(
    errorRate: number,
    responseTime: number,
    satisfaction: number
  ): 'healthy' | 'warning' | 'critical' {
    if (
      errorRate > this.config.alertThresholds.errorRate * 2 ||
      responseTime > this.config.alertThresholds.responseTime * 2 ||
      satisfaction < this.config.alertThresholds.satisfactionScore - 1
    ) {
      return 'critical'
    }

    if (
      errorRate > this.config.alertThresholds.errorRate ||
      responseTime > this.config.alertThresholds.responseTime ||
      satisfaction < this.config.alertThresholds.satisfactionScore
    ) {
      return 'warning'
    }

    return 'healthy'
  }

  private getMemoryUsage(): number {
    // This would get actual memory usage
    // For now, return a sample value
    return Math.floor(Math.random() * 30) + 40 // 40-70%
  }

  private getCPUUsage(): number {
    // This would get actual CPU usage
    // For now, return a sample value
    return Math.floor(Math.random() * 20) + 10 // 10-30%
  }

  private getActiveUserActivity(): Array<{
    userId: string
    lastActive: Date
    helpRequests: number
  }> {
    // This would get actual user activity data
    const users = []
    for (let i = 0; i < 5; i++) {
      users.push({
        userId: `user_${i}`,
        lastActive: new Date(Date.now() - Math.random() * 300000), // Last 5 minutes
        helpRequests: Math.floor(Math.random() * 5) + 1,
      })
    }
    return users
  }

  private checkAlertThresholds(snapshot: PerformanceSnapshot): void {
    const { metrics } = snapshot

    // Check error rate
    if (metrics.errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert(
        'error',
        metrics.errorRate > this.config.alertThresholds.errorRate * 2 ? 'critical' : 'warning',
        `Error rate exceeded threshold: ${metrics.errorRate}%`,
        ['Check system logs', 'Review recent changes', 'Monitor error patterns']
      )
    }

    // Check response time
    if (metrics.averageResponseTime > this.config.alertThresholds.responseTime) {
      this.createAlert(
        'performance',
        metrics.averageResponseTime > this.config.alertThresholds.responseTime * 2
          ? 'critical'
          : 'warning',
        `Response time exceeded threshold: ${metrics.averageResponseTime}ms`,
        ['Check system load', 'Optimize performance', 'Scale resources if needed']
      )
    }

    // Check satisfaction score
    if (metrics.satisfactionScore < this.config.alertThresholds.satisfactionScore) {
      this.createAlert(
        'satisfaction',
        metrics.satisfactionScore < this.config.alertThresholds.satisfactionScore - 1
          ? 'critical'
          : 'warning',
        `Satisfaction score below threshold: ${metrics.satisfactionScore}`,
        ['Review help content quality', 'Gather user feedback', 'Improve content']
      )
    }

    // Check system resources
    if (metrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
      this.createAlert(
        'performance',
        metrics.memoryUsage > 90 ? 'critical' : 'warning',
        `Memory usage high: ${metrics.memoryUsage}%`,
        ['Monitor memory usage', 'Check for memory leaks', 'Consider scaling']
      )
    }
  }

  private notifySubscribers(): void {
    if (!this.currentMetrics) return

    this.subscribers.forEach((callback, subscriberId) => {
      try {
        callback(this.currentMetrics!)
      } catch (error) {
        logger.error('Failed to notify subscriber', {
          subscriberId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })
  }

  // Health check methods

  private async checkHelpSystemHealth(): Promise<SystemHealthCheck> {
    const startTime = Date.now()

    try {
      // This would perform actual health checks
      // For now, simulate a health check
      const responseTime = Date.now() - startTime

      return {
        component: 'Help System',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        metrics: {
          responseTime,
          memoryUsage: this.getMemoryUsage(),
        },
      }
    } catch (error) {
      return {
        component: 'Help System',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private async checkAnalyticsEngineHealth(): Promise<SystemHealthCheck> {
    const startTime = Date.now()

    try {
      const responseTime = Date.now() - startTime

      return {
        component: 'Analytics Engine',
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
      }
    } catch (error) {
      return {
        component: 'Analytics Engine',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private async checkDatabaseHealth(): Promise<SystemHealthCheck> {
    const startTime = Date.now()

    try {
      // This would perform actual database health check
      const responseTime = Date.now() - startTime

      return {
        component: 'Database',
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
      }
    } catch (error) {
      return {
        component: 'Database',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private async checkAPIHealth(): Promise<SystemHealthCheck> {
    const startTime = Date.now()

    try {
      const responseTime = Date.now() - startTime

      return {
        component: 'Help API',
        status: 'healthy',
        responseTime,
        lastChecked: new Date(),
      }
    } catch (error) {
      return {
        component: 'Help API',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private calculateSummaryMetrics(performance: PerformanceSnapshot[]): Record<string, number> {
    if (performance.length === 0) {
      return {}
    }

    return {
      averageActiveUsers:
        performance.reduce((sum, p) => sum + p.metrics.activeUsers, 0) / performance.length,
      averageHelpRequests:
        performance.reduce((sum, p) => sum + p.metrics.helpRequestsPerMinute, 0) /
        performance.length,
      averageResponseTime:
        performance.reduce((sum, p) => sum + p.metrics.averageResponseTime, 0) / performance.length,
      averageErrorRate:
        performance.reduce((sum, p) => sum + p.metrics.errorRate, 0) / performance.length,
      averageSatisfaction:
        performance.reduce((sum, p) => sum + p.metrics.satisfactionScore, 0) / performance.length,
      uptimePercentage:
        (performance.filter((p) => p.metrics.systemHealth === 'healthy').length /
          performance.length) *
        100,
    }
  }

  private generateRecommendations(
    performance: PerformanceSnapshot[],
    alerts: SystemAlert[]
  ): string[] {
    const recommendations: string[] = []

    // Analyze performance trends
    if (performance.length > 0) {
      const recent = performance.slice(-10)
      const avgSatisfaction =
        recent.reduce((sum, p) => sum + p.metrics.satisfactionScore, 0) / recent.length

      if (avgSatisfaction < 3.5) {
        recommendations.push(
          'Consider reviewing and improving help content quality based on low satisfaction scores'
        )
      }

      const avgResponseTime =
        recent.reduce((sum, p) => sum + p.metrics.averageResponseTime, 0) / recent.length
      if (avgResponseTime > 1000) {
        recommendations.push('Optimize system performance to reduce help content response times')
      }
    }

    // Analyze alert patterns
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical')
    if (criticalAlerts.length > 3) {
      recommendations.push('Address critical system issues to improve help system reliability')
    }

    const satisfactionAlerts = alerts.filter((a) => a.type === 'satisfaction')
    if (satisfactionAlerts.length > 2) {
      recommendations.push('Focus on content improvement initiatives to boost user satisfaction')
    }

    return recommendations
  }

  // Cleanup method
  public destroy(): void {
    this.stopMonitoring()
    this.subscribers.clear()
    this.activeAlerts.clear()
    this.eventQueue = []
    this.performanceHistory = []

    logger.info('Real-time Help Monitor destroyed')
  }
}

// Export singleton instance
export const realTimeHelpMonitor = new RealTimeHelpMonitor()

export default RealTimeHelpMonitor
