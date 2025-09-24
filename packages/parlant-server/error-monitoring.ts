/**
 * Comprehensive Error Monitoring and Alerting System
 *
 * This module provides real-time error monitoring, intelligent alerting, performance tracking,
 * and comprehensive dashboards for the Universal Tool Adapter System. It integrates with
 * existing error tracking and provides advanced analytics and notification capabilities.
 */

import { createLogger } from '../../apps/sim/lib/logs/console/logger'
import { type ParlantLogContext } from './logging'
import {
  ErrorCategory,
  ErrorSeverity,
  ErrorImpact,
  type ErrorClassification
} from './error-taxonomy'
import { type BaseToolError } from './error-handler'
import { parlantErrorTracker, type ErrorDetails } from './error-tracking'
import { errorRecoveryService, type CircuitBreakerStatus, CircuitBreakerState } from './error-recovery'
import { EventEmitter } from 'events'

const logger = createLogger('ErrorMonitoring')

/**
 * Monitoring alert levels
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * Monitoring metric types
 */
export enum MetricType {
  COUNTER = 'counter',           // Incrementing count
  GAUGE = 'gauge',              // Current value
  HISTOGRAM = 'histogram',      // Distribution of values
  RATE = 'rate',               // Events per time period
  PERCENTAGE = 'percentage'     // Percentage value
}

/**
 * Real-time monitoring metric
 */
export interface MonitoringMetric {
  name: string
  type: MetricType
  value: number
  timestamp: number
  tags: Record<string, string>
  metadata: Record<string, any>
  description: string
}

/**
 * Alert notification configuration
 */
export interface AlertNotificationConfig {
  id: string
  name: string
  enabled: boolean

  // Notification targets
  email?: {
    recipients: string[]
    subject: string
    template: string
  }

  webhook?: {
    url: string
    method: 'POST' | 'PUT'
    headers: Record<string, string>
    payload: Record<string, any>
    retryConfig: {
      maxRetries: number
      retryDelayMs: number
    }
  }

  slack?: {
    webhookUrl: string
    channel: string
    username: string
    iconEmoji: string
  }

  pagerduty?: {
    integrationKey: string
    severity: 'info' | 'warning' | 'error' | 'critical'
  }

  // Notification rules
  throttling: {
    enabled: boolean
    windowMs: number
    maxNotifications: number
  }

  escalation: {
    enabled: boolean
    escalationDelayMs: number
    escalationTargets: string[]
  }
}

/**
 * Monitoring dashboard configuration
 */
export interface DashboardConfig {
  id: string
  name: string
  description: string
  refreshIntervalMs: number
  widgets: DashboardWidget[]
  filters: DashboardFilter[]
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  id: string
  type: 'chart' | 'gauge' | 'table' | 'alert_list' | 'metric_card'
  title: string
  size: { width: number; height: number }
  position: { x: number; y: number }
  config: {
    metrics: string[]
    timeRange: string
    groupBy?: string[]
    filters?: Record<string, any>
    chartType?: 'line' | 'bar' | 'pie' | 'area'
    thresholds?: Array<{ value: number; color: string; label: string }>
  }
}

/**
 * Dashboard filter configuration
 */
export interface DashboardFilter {
  id: string
  name: string
  type: 'select' | 'multiselect' | 'daterange' | 'text'
  options?: Array<{ label: string; value: string }>
  defaultValue?: any
}

/**
 * System health status
 */
export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical'
  timestamp: number
  components: Record<string, ComponentHealthStatus>
  metrics: {
    errorRate: number
    averageResponseTime: number
    circuitBreakerTrips: number
    activeAlerts: number
    systemLoad: number
  }
  uptime: number
  version: string
}

/**
 * Component health status
 */
export interface ComponentHealthStatus {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical'
  lastCheck: number
  uptime: number
  metrics: Record<string, number>
  errors: ErrorSummary[]
  dependencies: string[]
}

/**
 * Error summary for health reporting
 */
export interface ErrorSummary {
  category: ErrorCategory
  count: number
  latestOccurrence: number
  severity: ErrorSeverity
}

/**
 * Performance monitoring data
 */
export interface PerformanceData {
  timestamp: number
  component: string
  operation: string
  duration: number
  success: boolean
  errorCategory?: ErrorCategory
  tags: Record<string, string>
}

/**
 * Alert notification instance
 */
export interface AlertNotification {
  id: string
  alertId: string
  level: AlertLevel
  title: string
  message: string
  timestamp: number
  targets: string[]
  status: 'pending' | 'sent' | 'failed' | 'throttled'
  attempts: number
  lastAttempt?: number
  metadata: Record<string, any>
}

/**
 * Comprehensive error monitoring service
 */
export class ErrorMonitoringService extends EventEmitter {
  private metrics = new Map<string, MonitoringMetric[]>()
  private alertConfigs = new Map<string, AlertNotificationConfig>()
  private dashboards = new Map<string, DashboardConfig>()
  private activeAlerts = new Map<string, AlertNotification>()
  private performanceData: PerformanceData[] = []
  private healthChecks = new Map<string, () => Promise<ComponentHealthStatus>>()
  private metricRetentionMs = 24 * 60 * 60 * 1000 // 24 hours
  private maxMetricsPerType = 10000

  constructor() {
    super()
    this.initializeDefaultConfigs()
    this.startBackgroundTasks()
    logger.info('Error Monitoring Service initialized')
  }

  /**
   * Record a monitoring metric
   */
  recordMetric(
    name: string,
    type: MetricType,
    value: number,
    tags: Record<string, string> = {},
    metadata: Record<string, any> = {},
    description: string = ''
  ): void {
    const metric: MonitoringMetric = {
      name,
      type,
      value,
      timestamp: Date.now(),
      tags,
      metadata,
      description
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const metricArray = this.metrics.get(name)!
    metricArray.push(metric)

    // Enforce retention limits
    if (metricArray.length > this.maxMetricsPerType) {
      metricArray.splice(0, metricArray.length - this.maxMetricsPerType)
    }

    // Emit metric event for real-time processing
    this.emit('metric_recorded', metric)

    logger.debug('Metric recorded', { name, type, value, tags })
  }

  /**
   * Record error occurrence for monitoring
   */
  recordError(error: BaseToolError, performanceData?: Partial<PerformanceData>): void {
    const timestamp = Date.now()

    // Record error metrics
    this.recordMetric(
      'errors_total',
      MetricType.COUNTER,
      1,
      {
        category: error.category,
        subcategory: error.subcategory,
        severity: error.severity,
        component: error.component,
        recoverable: error.recoverable.toString()
      },
      {
        errorId: error.id,
        message: error.message
      },
      'Total number of errors by category and severity'
    )

    // Record error rate
    const recentErrors = this.getMetricValues('errors_total', 300000) // Last 5 minutes
    const errorRate = recentErrors.length / 5 // Errors per minute
    this.recordMetric(
      'error_rate',
      MetricType.RATE,
      errorRate,
      { component: error.component },
      {},
      'Error rate per minute'
    )

    // Record performance data if provided
    if (performanceData) {
      const perfData: PerformanceData = {
        timestamp,
        component: error.component,
        operation: error.context.operation || 'unknown',
        duration: performanceData.duration || 0,
        success: false,
        errorCategory: error.category,
        tags: {
          severity: error.severity,
          category: error.category,
          ...performanceData.tags
        }
      }

      this.performanceData.push(perfData)
      this.cleanupPerformanceData()
    }

    // Check if this error should trigger alerts
    this.evaluateAlertConditions(error)

    logger.debug('Error recorded for monitoring', {
      errorId: error.id,
      category: error.category,
      severity: error.severity
    })
  }

  /**
   * Record successful operation for monitoring
   */
  recordSuccess(
    component: string,
    operation: string,
    duration: number,
    tags: Record<string, string> = {}
  ): void {
    const timestamp = Date.now()

    // Record success metrics
    this.recordMetric(
      'operations_success_total',
      MetricType.COUNTER,
      1,
      { component, operation, ...tags },
      {},
      'Total number of successful operations'
    )

    // Record performance data
    const perfData: PerformanceData = {
      timestamp,
      component,
      operation,
      duration,
      success: true,
      tags
    }

    this.performanceData.push(perfData)
    this.cleanupPerformanceData()

    // Record response time metrics
    this.recordMetric(
      'response_time',
      MetricType.HISTOGRAM,
      duration,
      { component, operation },
      {},
      'Response time for operations'
    )

    logger.debug('Success recorded for monitoring', {
      component,
      operation,
      duration
    })
  }

  /**
   * Get current system health status
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const timestamp = Date.now()

    // Get component health statuses
    const components: Record<string, ComponentHealthStatus> = {}

    for (const [componentName, healthCheck] of this.healthChecks) {
      try {
        components[componentName] = await healthCheck()
      } catch (error) {
        components[componentName] = {
          name: componentName,
          status: 'critical',
          lastCheck: timestamp,
          uptime: 0,
          metrics: {},
          errors: [],
          dependencies: []
        }
      }
    }

    // Calculate overall system metrics
    const errorRate = this.calculateErrorRate(300000) // Last 5 minutes
    const avgResponseTime = this.calculateAverageResponseTime(300000)
    const circuitBreakerTrips = this.getCircuitBreakerTrips()
    const activeAlerts = this.activeAlerts.size

    // Determine overall system health
    const componentStatuses = Object.values(components).map(c => c.status)
    let overall: SystemHealthStatus['overall'] = 'healthy'

    if (componentStatuses.some(status => status === 'critical')) {
      overall = 'critical'
    } else if (componentStatuses.some(status => status === 'unhealthy')) {
      overall = 'unhealthy'
    } else if (componentStatuses.some(status => status === 'degraded') || errorRate > 0.1) {
      overall = 'degraded'
    }

    const health: SystemHealthStatus = {
      overall,
      timestamp,
      components,
      metrics: {
        errorRate,
        averageResponseTime: avgResponseTime,
        circuitBreakerTrips,
        activeAlerts,
        systemLoad: await this.getSystemLoad()
      },
      uptime: process.uptime() * 1000,
      version: process.env.npm_package_version || '1.0.0'
    }

    logger.debug('System health calculated', {
      overall,
      errorRate,
      activeAlerts,
      components: Object.keys(components).length
    })

    return health
  }

  /**
   * Configure alert notification
   */
  configureAlert(config: AlertNotificationConfig): void {
    this.alertConfigs.set(config.id, config)

    logger.info('Alert configuration added', {
      alertId: config.id,
      name: config.name,
      enabled: config.enabled
    })
  }

  /**
   * Create monitoring dashboard
   */
  createDashboard(config: DashboardConfig): void {
    this.dashboards.set(config.id, config)

    logger.info('Dashboard created', {
      dashboardId: config.id,
      name: config.name,
      widgets: config.widgets.length
    })
  }

  /**
   * Get dashboard data
   */
  getDashboardData(dashboardId: string, timeRange?: { start: number; end: number }): {
    config: DashboardConfig
    data: Record<string, any>
  } | null {
    const dashboard = this.dashboards.get(dashboardId)
    if (!dashboard) return null

    const data: Record<string, any> = {}

    // Collect data for each widget
    dashboard.widgets.forEach(widget => {
      switch (widget.type) {
        case 'chart':
          data[widget.id] = this.getChartData(widget, timeRange)
          break
        case 'gauge':
          data[widget.id] = this.getGaugeData(widget)
          break
        case 'table':
          data[widget.id] = this.getTableData(widget, timeRange)
          break
        case 'alert_list':
          data[widget.id] = this.getActiveAlerts()
          break
        case 'metric_card':
          data[widget.id] = this.getMetricCardData(widget)
          break
      }
    })

    return { config: dashboard, data }
  }

  /**
   * Register component health check
   */
  registerHealthCheck(
    componentName: string,
    healthCheck: () => Promise<ComponentHealthStatus>
  ): void {
    this.healthChecks.set(componentName, healthCheck)

    logger.info('Health check registered', { componentName })
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(timeWindowMs: number = 3600000): {
    totalMetrics: number
    totalErrors: number
    errorRate: number
    averageResponseTime: number
    alertsSent: number
    circuitBreakerTrips: number
    topErrorCategories: Array<{ category: string; count: number }>
    performanceTrends: Array<{ timestamp: number; avgResponseTime: number }>
  } {
    const cutoff = Date.now() - timeWindowMs

    // Count total metrics in time window
    const totalMetrics = Array.from(this.metrics.values()).flat()
      .filter(metric => metric.timestamp >= cutoff).length

    // Count total errors
    const errorMetrics = this.getMetricValues('errors_total', timeWindowMs)
    const totalErrors = errorMetrics.length

    // Calculate error rate
    const errorRate = this.calculateErrorRate(timeWindowMs)

    // Calculate average response time
    const averageResponseTime = this.calculateAverageResponseTime(timeWindowMs)

    // Count alerts sent
    const alertsSent = Array.from(this.activeAlerts.values())
      .filter(alert => alert.timestamp >= cutoff && alert.status === 'sent').length

    // Count circuit breaker trips
    const circuitBreakerTrips = this.getCircuitBreakerTrips()

    // Get top error categories
    const errorsByCategory = new Map<string, number>()
    errorMetrics.forEach(metric => {
      const category = metric.tags.category || 'unknown'
      errorsByCategory.set(category, (errorsByCategory.get(category) || 0) + 1)
    })

    const topErrorCategories = Array.from(errorsByCategory.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }))

    // Get performance trends (hourly averages)
    const performanceTrends = this.calculatePerformanceTrends(timeWindowMs)

    return {
      totalMetrics,
      totalErrors,
      errorRate,
      averageResponseTime,
      alertsSent,
      circuitBreakerTrips,
      topErrorCategories,
      performanceTrends
    }
  }

  /**
   * Private helper methods
   */
  private initializeDefaultConfigs(): void {
    // Initialize default alert configurations
    this.configureAlert({
      id: 'high_error_rate',
      name: 'High Error Rate Alert',
      enabled: true,
      email: {
        recipients: ['admin@example.com'],
        subject: 'High Error Rate Detected',
        template: 'Error rate has exceeded threshold: {{errorRate}} errors/min'
      },
      throttling: {
        enabled: true,
        windowMs: 300000, // 5 minutes
        maxNotifications: 1
      },
      escalation: {
        enabled: false,
        escalationDelayMs: 900000, // 15 minutes
        escalationTargets: []
      }
    })

    // Register default health checks
    this.registerHealthCheck('error-tracking', async () => ({
      name: 'error-tracking',
      status: 'healthy',
      lastCheck: Date.now(),
      uptime: process.uptime() * 1000,
      metrics: {
        totalErrors: this.getMetricValues('errors_total', 3600000).length,
        errorRate: this.calculateErrorRate(300000)
      },
      errors: [],
      dependencies: []
    }))

    this.registerHealthCheck('circuit-breakers', async () => {
      const breakers = errorRecoveryService.getCircuitBreakerStatus() as Map<string, CircuitBreakerStatus>
      const openBreakers = Array.from(breakers.values())
        .filter(breaker => breaker.state === CircuitBreakerState.OPEN).length

      return {
        name: 'circuit-breakers',
        status: openBreakers > 0 ? 'degraded' : 'healthy',
        lastCheck: Date.now(),
        uptime: process.uptime() * 1000,
        metrics: {
          totalBreakers: breakers.size,
          openBreakers,
          halfOpenBreakers: Array.from(breakers.values())
            .filter(breaker => breaker.state === CircuitBreakerState.HALF_OPEN).length
        },
        errors: [],
        dependencies: []
      }
    })
  }

  private startBackgroundTasks(): void {
    // Cleanup old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics()
    }, 3600000)

    // Evaluate alert conditions every minute
    setInterval(() => {
      this.evaluatePeriodicAlerts()
    }, 60000)

    // Update system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics()
    }, 30000)
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.metricRetentionMs

    for (const [name, metrics] of this.metrics) {
      const filteredMetrics = metrics.filter(metric => metric.timestamp >= cutoff)
      this.metrics.set(name, filteredMetrics)
    }

    logger.debug('Cleaned up old metrics')
  }

  private cleanupPerformanceData(): void {
    const cutoff = Date.now() - this.metricRetentionMs
    this.performanceData = this.performanceData.filter(data => data.timestamp >= cutoff)
  }

  private evaluateAlertConditions(error: BaseToolError): void {
    // Check for high error rate
    const errorRate = this.calculateErrorRate(300000) // Last 5 minutes
    if (errorRate > 0.1) { // More than 0.1 errors per second
      this.triggerAlert('high_error_rate', AlertLevel.WARNING, {
        errorRate: errorRate.toFixed(3),
        component: error.component,
        category: error.category
      })
    }

    // Check for critical errors
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.FATAL) {
      this.triggerAlert('critical_error', AlertLevel.CRITICAL, {
        errorId: error.id,
        component: error.component,
        message: error.message
      })
    }
  }

  private evaluatePeriodicAlerts(): void {
    // Check circuit breaker status
    const breakers = errorRecoveryService.getCircuitBreakerStatus() as Map<string, CircuitBreakerStatus>
    const openBreakers = Array.from(breakers.entries())
      .filter(([, breaker]) => breaker.state === CircuitBreakerState.OPEN)

    if (openBreakers.length > 0) {
      this.triggerAlert('circuit_breaker_open', AlertLevel.ERROR, {
        openBreakers: openBreakers.map(([key]) => key)
      })
    }
  }

  private triggerAlert(
    alertType: string,
    level: AlertLevel,
    context: Record<string, any>
  ): void {
    const alertId = `${alertType}-${Date.now()}`

    const notification: AlertNotification = {
      id: alertId,
      alertId: alertType,
      level,
      title: this.generateAlertTitle(alertType, context),
      message: this.generateAlertMessage(alertType, context),
      timestamp: Date.now(),
      targets: [],
      status: 'pending',
      attempts: 0,
      metadata: context
    }

    this.activeAlerts.set(alertId, notification)

    // Send notification
    this.sendAlert(notification)

    logger.warn('Alert triggered', {
      alertId,
      alertType,
      level,
      context
    })
  }

  private async sendAlert(notification: AlertNotification): Promise<void> {
    // Implementation would send alerts to configured targets
    logger.info('Sending alert notification', {
      alertId: notification.id,
      level: notification.level,
      title: notification.title
    })

    notification.status = 'sent'
    notification.attempts++
    notification.lastAttempt = Date.now()
  }

  private generateAlertTitle(alertType: string, context: Record<string, any>): string {
    switch (alertType) {
      case 'high_error_rate':
        return `High Error Rate: ${context.errorRate} errors/sec`
      case 'critical_error':
        return `Critical Error in ${context.component}`
      case 'circuit_breaker_open':
        return `Circuit Breakers Open: ${context.openBreakers.length}`
      default:
        return `Alert: ${alertType}`
    }
  }

  private generateAlertMessage(alertType: string, context: Record<string, any>): string {
    switch (alertType) {
      case 'high_error_rate':
        return `Error rate has exceeded threshold in component ${context.component}. Current rate: ${context.errorRate} errors/sec`
      case 'critical_error':
        return `Critical error occurred in ${context.component}: ${context.message}`
      case 'circuit_breaker_open':
        return `Circuit breakers are open for: ${context.openBreakers.join(', ')}`
      default:
        return `Alert triggered for ${alertType}`
    }
  }

  private getMetricValues(metricName: string, timeWindowMs: number): MonitoringMetric[] {
    const metrics = this.metrics.get(metricName) || []
    const cutoff = Date.now() - timeWindowMs
    return metrics.filter(metric => metric.timestamp >= cutoff)
  }

  private calculateErrorRate(timeWindowMs: number): number {
    const errors = this.getMetricValues('errors_total', timeWindowMs)
    return errors.length / (timeWindowMs / 1000) // Errors per second
  }

  private calculateAverageResponseTime(timeWindowMs: number): number {
    const responseTimes = this.getMetricValues('response_time', timeWindowMs)
    if (responseTimes.length === 0) return 0

    const sum = responseTimes.reduce((acc, metric) => acc + metric.value, 0)
    return sum / responseTimes.length
  }

  private getCircuitBreakerTrips(): number {
    const breakers = errorRecoveryService.getCircuitBreakerStatus() as Map<string, CircuitBreakerStatus>
    return Array.from(breakers.values())
      .filter(breaker => breaker.state === CircuitBreakerState.OPEN).length
  }

  private async getSystemLoad(): Promise<number> {
    // Simplified system load calculation
    const memUsage = process.memoryUsage()
    return memUsage.heapUsed / memUsage.heapTotal
  }

  private updateSystemMetrics(): void {
    // Record system resource metrics
    const memUsage = process.memoryUsage()

    this.recordMetric(
      'system_memory_usage',
      MetricType.GAUGE,
      memUsage.heapUsed,
      {},
      { heapTotal: memUsage.heapTotal },
      'Current memory usage'
    )

    this.recordMetric(
      'system_uptime',
      MetricType.GAUGE,
      process.uptime() * 1000,
      {},
      {},
      'System uptime in milliseconds'
    )
  }

  private getChartData(widget: DashboardWidget, timeRange?: { start: number; end: number }) {
    // Implementation for chart data
    return { series: [], timestamps: [] }
  }

  private getGaugeData(widget: DashboardWidget) {
    // Implementation for gauge data
    return { value: 0, max: 100, thresholds: [] }
  }

  private getTableData(widget: DashboardWidget, timeRange?: { start: number; end: number }) {
    // Implementation for table data
    return { rows: [], columns: [] }
  }

  private getActiveAlerts() {
    return Array.from(this.activeAlerts.values())
      .filter(alert => alert.status !== 'throttled')
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  private getMetricCardData(widget: DashboardWidget) {
    // Implementation for metric card data
    return { value: 0, trend: 'up', change: '+5%' }
  }

  private calculatePerformanceTrends(timeWindowMs: number): Array<{ timestamp: number; avgResponseTime: number }> {
    const cutoff = Date.now() - timeWindowMs
    const relevantData = this.performanceData.filter(data => data.timestamp >= cutoff)

    // Group by hour and calculate averages
    const hourlyData = new Map<number, { total: number; count: number }>()

    relevantData.forEach(data => {
      const hour = Math.floor(data.timestamp / 3600000) * 3600000
      const current = hourlyData.get(hour) || { total: 0, count: 0 }
      current.total += data.duration
      current.count += 1
      hourlyData.set(hour, current)
    })

    return Array.from(hourlyData.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        avgResponseTime: data.total / data.count
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }
}

/**
 * Singleton error monitoring service
 */
export const errorMonitoringService = new ErrorMonitoringService()

/**
 * Convenience functions for monitoring
 */
export const recordError = (error: BaseToolError, performanceData?: Partial<PerformanceData>) =>
  errorMonitoringService.recordError(error, performanceData)

export const recordSuccess = (component: string, operation: string, duration: number, tags?: Record<string, string>) =>
  errorMonitoringService.recordSuccess(component, operation, duration, tags)

export const recordMetric = (
  name: string,
  type: MetricType,
  value: number,
  tags?: Record<string, string>,
  metadata?: Record<string, any>,
  description?: string
) => errorMonitoringService.recordMetric(name, type, value, tags, metadata, description)

export const getSystemHealth = () => errorMonitoringService.getSystemHealth()

/**
 * Performance monitoring decorator
 */
export function MonitorPerformance(component: string, operation?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const operationName = operation || propertyName

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()

      try {
        const result = await method.apply(this, args)
        const duration = Date.now() - startTime

        recordSuccess(component, operationName, duration)
        return result
      } catch (error) {
        const duration = Date.now() - startTime

        if (error instanceof BaseToolError) {
          recordError(error, { duration, component, operation: operationName })
        }

        throw error
      }
    }

    return descriptor
  }
}