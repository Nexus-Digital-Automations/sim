/**
 * Adapter Quality Assurance and Monitoring System
 * ==============================================
 *
 * Comprehensive monitoring, logging, and error recovery system for tool adapters
 * Provides real-time insights, health monitoring, and automated recovery mechanisms
 */

import type { AdapterExecutionResult, ToolExecutionContext } from '../adapter-framework'

// ================================
// Logging and Monitoring Types
// ================================

/**
 * Log level enumeration
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

/**
 * Structured log entry for adapter operations
 */
export interface AdapterLogEntry {
  /** Unique log entry ID */
  id: string
  /** Log timestamp */
  timestamp: string
  /** Log level */
  level: LogLevel
  /** Adapter that generated the log */
  adapterId: string
  /** Operation or event being logged */
  operation: string
  /** Log message */
  message: string
  /** Structured log data */
  data?: Record<string, any>
  /** Execution context */
  context?: ToolExecutionContext
  /** Error information if applicable */
  error?: {
    message: string
    stack?: string
    code?: string
  }
  /** Performance metrics */
  performance?: {
    duration: number
    memoryUsage?: number
    cpuUsage?: number
  }
  /** Request/response metadata */
  metadata?: {
    requestId?: string
    correlationId?: string
    userId?: string
    workspaceId?: string
  }
}

/**
 * Health check result for adapters
 */
export interface AdapterHealthCheck {
  /** Adapter identifier */
  adapterId: string
  /** Health status */
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  /** Check timestamp */
  timestamp: string
  /** Health score (0-100) */
  score: number
  /** Individual health metrics */
  metrics: {
    availability: number // Percentage uptime
    latency: number // Average response time
    errorRate: number // Error percentage
    throughput: number // Requests per minute
    memory: number // Memory usage percentage
    cpu: number // CPU usage percentage
  }
  /** Health check details */
  checks: HealthCheckDetail[]
  /** Recommendations for improvement */
  recommendations: string[]
}

/**
 * Individual health check detail
 */
export interface HealthCheckDetail {
  /** Check name */
  name: string
  /** Check status */
  status: 'pass' | 'warn' | 'fail'
  /** Check message */
  message: string
  /** Measured value */
  value?: any
  /** Acceptable threshold */
  threshold?: any
  /** Check duration */
  duration: number
}

/**
 * Monitoring alert configuration
 */
export interface AlertConfig {
  /** Alert name */
  name: string
  /** Adapter ID to monitor (* for all) */
  adapterId: string
  /** Alert condition */
  condition: {
    metric: 'error_rate' | 'latency' | 'throughput' | 'availability' | 'memory' | 'cpu'
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
    threshold: number
    duration: number // Duration in seconds that condition must be true
  }
  /** Alert severity */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** Alert actions */
  actions: AlertAction[]
  /** Alert enabled status */
  enabled: boolean
}

/**
 * Alert action definition
 */
export interface AlertAction {
  /** Action type */
  type: 'log' | 'email' | 'webhook' | 'slack' | 'auto_recover'
  /** Action configuration */
  config: Record<string, any>
}

/**
 * Performance metrics aggregation
 */
export interface AdapterMetrics {
  /** Adapter identifier */
  adapterId: string
  /** Metrics time window */
  timeWindow: {
    start: string
    end: string
    duration: number // Duration in seconds
  }
  /** Request statistics */
  requests: {
    total: number
    successful: number
    failed: number
    successRate: number
    errorRate: number
  }
  /** Performance statistics */
  performance: {
    averageLatency: number
    medianLatency: number
    p95Latency: number
    p99Latency: number
    minLatency: number
    maxLatency: number
  }
  /** Resource utilization */
  resources: {
    averageMemory: number
    peakMemory: number
    averageCpu: number
    peakCpu: number
  }
  /** Error analysis */
  errors: {
    byType: Record<string, number>
    topErrors: Array<{
      message: string
      count: number
      lastOccurred: string
    }>
  }
  /** Usage patterns */
  usage: {
    requestsPerMinute: number
    peakRpm: number
    activeUsers: number
    topUsers: Array<{
      userId: string
      requestCount: number
    }>
  }
}

// ================================
// Core Monitoring System
// ================================

/**
 * Comprehensive monitoring and quality assurance system for adapters
 */
export class AdapterMonitoringSystem {
  private logs: AdapterLogEntry[] = []
  private metrics = new Map<string, AdapterMetrics>()
  private alerts = new Map<string, AlertConfig>()
  private healthChecks = new Map<string, AdapterHealthCheck>()
  private alertStates = new Map<string, any>()

  private maxLogEntries = 10000
  private metricsRetentionDays = 30
  private healthCheckIntervalMs = 60000 // 1 minute
  private alertEvaluationIntervalMs = 30000 // 30 seconds

  private healthCheckTimer?: NodeJS.Timer
  private alertEvaluationTimer?: NodeJS.Timer

  constructor(
    config: {
      maxLogEntries?: number
      metricsRetentionDays?: number
      healthCheckInterval?: number
      alertEvaluationInterval?: number
    } = {}
  ) {
    this.maxLogEntries = config.maxLogEntries || 10000
    this.metricsRetentionDays = config.metricsRetentionDays || 30
    this.healthCheckIntervalMs = (config.healthCheckInterval || 60) * 1000
    this.alertEvaluationIntervalMs = (config.alertEvaluationInterval || 30) * 1000

    this.startBackgroundTasks()
  }

  // ================================
  // Logging System
  // ================================

  /**
   * Log adapter operation with structured data
   */
  log(
    level: LogLevel,
    adapterId: string,
    operation: string,
    message: string,
    data?: Record<string, any>,
    context?: ToolExecutionContext,
    error?: Error
  ): void {
    const logEntry: AdapterLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      adapterId,
      operation,
      message,
      data,
      context,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            code: error.name,
          }
        : undefined,
      metadata: context
        ? {
            userId: context.userId,
            workspaceId: context.workspaceId,
            correlationId: context.sessionId,
          }
        : undefined,
    }

    this.logs.push(logEntry)

    // Maintain log size limit
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries)
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] [${adapterId}] ${operation}: ${message}`, data)
    }

    // Update metrics
    this.updateMetricsFromLog(logEntry)
  }

  /**
   * Log adapter execution result
   */
  logExecution(
    adapterId: string,
    operation: string,
    result: AdapterExecutionResult,
    context: ToolExecutionContext
  ): void {
    const level: LogLevel = result.success ? 'info' : 'error'
    const message = result.success
      ? `Adapter execution completed successfully`
      : `Adapter execution failed: ${result.error}`

    this.log(
      level,
      adapterId,
      operation,
      message,
      {
        success: result.success,
        duration: result.timing.duration,
        usage: result.usage,
        errorDetails: result.errorDetails,
      },
      context,
      result.error ? new Error(result.error) : undefined
    )
  }

  /**
   * Search logs with filters
   */
  searchLogs(
    filters: {
      adapterId?: string
      level?: LogLevel
      operation?: string
      startTime?: string
      endTime?: string
      limit?: number
    } = {}
  ): AdapterLogEntry[] {
    let filteredLogs = [...this.logs]

    if (filters.adapterId) {
      filteredLogs = filteredLogs.filter((log) => log.adapterId === filters.adapterId)
    }

    if (filters.level) {
      filteredLogs = filteredLogs.filter((log) => log.level === filters.level)
    }

    if (filters.operation) {
      filteredLogs = filteredLogs.filter((log) =>
        log.operation.toLowerCase().includes(filters.operation!.toLowerCase())
      )
    }

    if (filters.startTime) {
      filteredLogs = filteredLogs.filter((log) => log.timestamp >= filters.startTime!)
    }

    if (filters.endTime) {
      filteredLogs = filteredLogs.filter((log) => log.timestamp <= filters.endTime!)
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply limit
    if (filters.limit && filters.limit > 0) {
      filteredLogs = filteredLogs.slice(0, filters.limit)
    }

    return filteredLogs
  }

  // ================================
  // Health Monitoring
  // ================================

  /**
   * Perform health check on an adapter
   */
  async performHealthCheck(adapterId: string): Promise<AdapterHealthCheck> {
    const timestamp = new Date().toISOString()
    const checks: HealthCheckDetail[] = []

    // Get recent metrics for health evaluation
    const recentMetrics = this.getRecentMetrics(adapterId, 300) // Last 5 minutes

    // Availability check
    const availabilityCheck = this.checkAvailability(adapterId, recentMetrics)
    checks.push(availabilityCheck)

    // Latency check
    const latencyCheck = this.checkLatency(adapterId, recentMetrics)
    checks.push(latencyCheck)

    // Error rate check
    const errorRateCheck = this.checkErrorRate(adapterId, recentMetrics)
    checks.push(errorRateCheck)

    // Memory usage check
    const memoryCheck = this.checkMemoryUsage(adapterId, recentMetrics)
    checks.push(memoryCheck)

    // Calculate overall health score
    const score = this.calculateHealthScore(checks)
    const status = this.determineHealthStatus(score)

    // Generate recommendations
    const recommendations = this.generateHealthRecommendations(checks, recentMetrics)

    const healthCheck: AdapterHealthCheck = {
      adapterId,
      status,
      timestamp,
      score,
      metrics: {
        availability: availabilityCheck.value || 0,
        latency: latencyCheck.value || 0,
        errorRate: errorRateCheck.value || 0,
        throughput: recentMetrics?.usage.requestsPerMinute || 0,
        memory: memoryCheck.value || 0,
        cpu: 0, // Would be implemented with actual system metrics
      },
      checks,
      recommendations,
    }

    this.healthChecks.set(adapterId, healthCheck)
    this.log(
      'info',
      adapterId,
      'health_check',
      `Health check completed: ${status} (${score}/100)`,
      {
        score,
        status,
        checksCount: checks.length,
      }
    )

    return healthCheck
  }

  /**
   * Get current health status for an adapter
   */
  getHealthStatus(adapterId: string): AdapterHealthCheck | undefined {
    return this.healthChecks.get(adapterId)
  }

  /**
   * Get health status for all adapters
   */
  getAllHealthStatus(): AdapterHealthCheck[] {
    return Array.from(this.healthChecks.values())
  }

  // ================================
  // Metrics and Analytics
  // ================================

  /**
   * Get metrics for an adapter within a time window
   */
  getMetrics(adapterId: string, startTime?: string, endTime?: string): AdapterMetrics | undefined {
    // For simplicity, return the most recent metrics
    return this.metrics.get(adapterId)
  }

  /**
   * Get aggregated metrics across all adapters
   */
  getAggregatedMetrics(
    startTime?: string,
    endTime?: string
  ): {
    totalRequests: number
    averageSuccessRate: number
    averageLatency: number
    totalErrors: number
    activeAdapters: number
  } {
    const allMetrics = Array.from(this.metrics.values())

    const totalRequests = allMetrics.reduce((sum, m) => sum + m.requests.total, 0)
    const averageSuccessRate =
      allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.requests.successRate, 0) / allMetrics.length
        : 0
    const averageLatency =
      allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.performance.averageLatency, 0) / allMetrics.length
        : 0
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.requests.failed, 0)

    return {
      totalRequests,
      averageSuccessRate,
      averageLatency,
      totalErrors,
      activeAdapters: allMetrics.length,
    }
  }

  // ================================
  // Alert Management
  // ================================

  /**
   * Register an alert configuration
   */
  registerAlert(alertConfig: AlertConfig): void {
    this.alerts.set(alertConfig.name, alertConfig)
    this.log(
      'info',
      alertConfig.adapterId,
      'alert_registered',
      `Alert '${alertConfig.name}' registered`,
      {
        condition: alertConfig.condition,
        severity: alertConfig.severity,
      }
    )
  }

  /**
   * Evaluate all alerts and trigger actions if needed
   */
  private evaluateAlerts(): void {
    for (const [alertName, alertConfig] of this.alerts.entries()) {
      if (!alertConfig.enabled) continue

      const shouldTrigger = this.evaluateAlertCondition(alertConfig)
      const currentState = this.alertStates.get(alertName) || { triggered: false, since: null }

      if (shouldTrigger && !currentState.triggered) {
        // Alert triggered
        this.triggerAlert(alertConfig)
        this.alertStates.set(alertName, { triggered: true, since: new Date().toISOString() })
      } else if (!shouldTrigger && currentState.triggered) {
        // Alert resolved
        this.resolveAlert(alertConfig)
        this.alertStates.set(alertName, { triggered: false, since: null })
      }
    }
  }

  /**
   * Trigger alert actions
   */
  private async triggerAlert(alertConfig: AlertConfig): Promise<void> {
    this.log(
      'warn',
      alertConfig.adapterId,
      'alert_triggered',
      `Alert '${alertConfig.name}' triggered`,
      {
        condition: alertConfig.condition,
        severity: alertConfig.severity,
      }
    )

    for (const action of alertConfig.actions) {
      try {
        await this.executeAlertAction(action, alertConfig, 'triggered')
      } catch (error) {
        this.log(
          'error',
          alertConfig.adapterId,
          'alert_action_failed',
          `Alert action '${action.type}' failed`,
          { error: error.message }
        )
      }
    }
  }

  /**
   * Resolve alert
   */
  private async resolveAlert(alertConfig: AlertConfig): Promise<void> {
    this.log(
      'info',
      alertConfig.adapterId,
      'alert_resolved',
      `Alert '${alertConfig.name}' resolved`
    )

    for (const action of alertConfig.actions) {
      try {
        await this.executeAlertAction(action, alertConfig, 'resolved')
      } catch (error) {
        this.log(
          'error',
          alertConfig.adapterId,
          'alert_action_failed',
          `Alert resolution action '${action.type}' failed`,
          { error: error.message }
        )
      }
    }
  }

  // ================================
  // Error Recovery
  // ================================

  /**
   * Attempt automatic recovery for an adapter
   */
  async attemptAutoRecovery(adapterId: string, error: Error): Promise<boolean> {
    this.log('warn', adapterId, 'auto_recovery_attempt', `Attempting auto-recovery for adapter`, {
      error: error.message,
    })

    // Circuit breaker pattern
    const recentErrors = this.getRecentErrors(adapterId, 300) // Last 5 minutes
    if (recentErrors.length > 10) {
      this.log(
        'error',
        adapterId,
        'circuit_breaker',
        'Circuit breaker activated - too many recent errors'
      )
      return false
    }

    // Exponential backoff
    const backoffMs = Math.min(1000 * 2 ** recentErrors.length, 30000)
    await this.sleep(backoffMs)

    // Recovery strategies based on error type
    if (error.message.includes('timeout')) {
      return await this.recoverFromTimeout(adapterId)
    }

    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return await this.recoverFromAuthError(adapterId)
    }

    if (error.message.includes('rate limit')) {
      return await this.recoverFromRateLimit(adapterId)
    }

    // Generic recovery
    return await this.genericRecovery(adapterId)
  }

  // ================================
  // Private Helper Methods
  // ================================

  private startBackgroundTasks(): void {
    // Start health check timer
    this.healthCheckTimer = setInterval(() => {
      // Health checks would be performed here for all registered adapters
      // This would be implemented based on the registry of active adapters
    }, this.healthCheckIntervalMs)

    // Start alert evaluation timer
    this.alertEvaluationTimer = setInterval(() => {
      this.evaluateAlerts()
    }, this.alertEvaluationIntervalMs)
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private updateMetricsFromLog(logEntry: AdapterLogEntry): void {
    // Update adapter metrics based on log entry
    // This would aggregate performance data, error rates, etc.
    const existing = this.metrics.get(logEntry.adapterId)
    // Implementation would update metrics based on log data
  }

  private getRecentMetrics(adapterId: string, seconds: number): AdapterMetrics | undefined {
    return this.metrics.get(adapterId)
  }

  private checkAvailability(adapterId: string, metrics?: AdapterMetrics): HealthCheckDetail {
    const availability = metrics
      ? (metrics.requests.successful / metrics.requests.total) * 100
      : 100
    return {
      name: 'availability',
      status: availability > 95 ? 'pass' : availability > 90 ? 'warn' : 'fail',
      message: `Availability: ${availability.toFixed(1)}%`,
      value: availability,
      threshold: 95,
      duration: 0,
    }
  }

  private checkLatency(adapterId: string, metrics?: AdapterMetrics): HealthCheckDetail {
    const latency = metrics?.performance.averageLatency || 0
    return {
      name: 'latency',
      status: latency < 1000 ? 'pass' : latency < 5000 ? 'warn' : 'fail',
      message: `Average latency: ${latency.toFixed(0)}ms`,
      value: latency,
      threshold: 1000,
      duration: 0,
    }
  }

  private checkErrorRate(adapterId: string, metrics?: AdapterMetrics): HealthCheckDetail {
    const errorRate = metrics?.requests.errorRate || 0
    return {
      name: 'error_rate',
      status: errorRate < 0.05 ? 'pass' : errorRate < 0.1 ? 'warn' : 'fail',
      message: `Error rate: ${(errorRate * 100).toFixed(1)}%`,
      value: errorRate,
      threshold: 0.05,
      duration: 0,
    }
  }

  private checkMemoryUsage(adapterId: string, metrics?: AdapterMetrics): HealthCheckDetail {
    const memory = metrics?.resources.averageMemory || 0
    return {
      name: 'memory',
      status: memory < 80 ? 'pass' : memory < 90 ? 'warn' : 'fail',
      message: `Memory usage: ${memory.toFixed(1)}%`,
      value: memory,
      threshold: 80,
      duration: 0,
    }
  }

  private calculateHealthScore(checks: HealthCheckDetail[]): number {
    const weights = { pass: 100, warn: 60, fail: 0 }
    const totalWeight = checks.reduce((sum, check) => sum + weights[check.status], 0)
    return checks.length > 0 ? Math.round(totalWeight / checks.length) : 100
  }

  private determineHealthStatus(score: number): AdapterHealthCheck['status'] {
    if (score >= 90) return 'healthy'
    if (score >= 70) return 'warning'
    if (score >= 0) return 'critical'
    return 'unknown'
  }

  private generateHealthRecommendations(
    checks: HealthCheckDetail[],
    metrics?: AdapterMetrics
  ): string[] {
    const recommendations: string[] = []

    checks.forEach((check) => {
      if (check.status === 'fail' || check.status === 'warn') {
        switch (check.name) {
          case 'availability':
            recommendations.push('Consider implementing retry logic and circuit breaker patterns')
            break
          case 'latency':
            recommendations.push('Optimize API calls and consider caching frequently accessed data')
            break
          case 'error_rate':
            recommendations.push('Review error logs and implement better error handling')
            break
          case 'memory':
            recommendations.push('Monitor memory leaks and optimize data structures')
            break
        }
      }
    })

    return recommendations
  }

  private evaluateAlertCondition(alertConfig: AlertConfig): boolean {
    const metrics = this.getRecentMetrics(alertConfig.adapterId, alertConfig.condition.duration)
    if (!metrics) return false

    let value: number
    switch (alertConfig.condition.metric) {
      case 'error_rate':
        value = metrics.requests.errorRate
        break
      case 'latency':
        value = metrics.performance.averageLatency
        break
      case 'throughput':
        value = metrics.usage.requestsPerMinute
        break
      default:
        return false
    }

    switch (alertConfig.condition.operator) {
      case 'gt':
        return value > alertConfig.condition.threshold
      case 'lt':
        return value < alertConfig.condition.threshold
      case 'gte':
        return value >= alertConfig.condition.threshold
      case 'lte':
        return value <= alertConfig.condition.threshold
      case 'eq':
        return value === alertConfig.condition.threshold
      default:
        return false
    }
  }

  private async executeAlertAction(
    action: AlertAction,
    alertConfig: AlertConfig,
    state: 'triggered' | 'resolved'
  ): Promise<void> {
    switch (action.type) {
      case 'log':
        this.log(
          'warn',
          alertConfig.adapterId,
          'alert_action',
          `Alert ${alertConfig.name} ${state}`,
          { alertConfig, action }
        )
        break
      case 'auto_recover':
        if (state === 'triggered') {
          await this.attemptAutoRecovery(alertConfig.adapterId, new Error('Alert triggered'))
        }
        break
      // Other action types would be implemented here
    }
  }

  private getRecentErrors(adapterId: string, seconds: number): AdapterLogEntry[] {
    const cutoff = new Date(Date.now() - seconds * 1000).toISOString()
    return this.logs.filter(
      (log) => log.adapterId === adapterId && log.level === 'error' && log.timestamp >= cutoff
    )
  }

  private async recoverFromTimeout(adapterId: string): Promise<boolean> {
    // Implementation would attempt timeout recovery
    return true
  }

  private async recoverFromAuthError(adapterId: string): Promise<boolean> {
    // Implementation would attempt auth recovery (token refresh, etc.)
    return true
  }

  private async recoverFromRateLimit(adapterId: string): Promise<boolean> {
    // Implementation would wait for rate limit reset
    await this.sleep(60000) // Wait 1 minute
    return true
  }

  private async genericRecovery(adapterId: string): Promise<boolean> {
    // Generic recovery strategies
    return true
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer)
    if (this.alertEvaluationTimer) clearInterval(this.alertEvaluationTimer)
  }
}

// ================================
// Global Monitoring Instance
// ================================

export const globalAdapterMonitoring = new AdapterMonitoringSystem({
  maxLogEntries: 50000,
  metricsRetentionDays: 7,
  healthCheckInterval: 60,
  alertEvaluationInterval: 30,
})
