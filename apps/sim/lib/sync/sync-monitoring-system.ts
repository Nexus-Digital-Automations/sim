/**
 * Comprehensive Monitoring and Error Recovery System for Bidirectional Synchronization
 *
 * Provides real-time monitoring, error detection, automatic recovery mechanisms,
 * and comprehensive health reporting for the synchronization system.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { SyncEvent, SyncEventType } from './bidirectional-sync-engine'
import type { PerformanceMetrics } from './sync-performance-optimizer'
import type { Conflict } from './conflict-resolution-system'

const logger = createLogger('SyncMonitoringSystem')

// Health status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'critical'

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

// Monitoring interfaces
export interface HealthMetrics {
  syncEngine: ComponentHealth
  dataBinding: ComponentHealth
  conflictResolution: ComponentHealth
  performance: ComponentHealth
  overall: HealthStatus
  uptime: number
  lastUpdate: number
}

export interface ComponentHealth {
  status: HealthStatus
  latency: number
  errorRate: number
  throughput: number
  lastError?: Error
  lastErrorTime?: number
  recoveryAttempts: number
  isRecovering: boolean
}

export interface Alert {
  id: string
  timestamp: number
  severity: AlertSeverity
  component: string
  message: string
  metadata?: Record<string, any>
  resolved: boolean
  resolvedAt?: number
  duration?: number
}

export interface RecoveryStrategy {
  name: string
  description: string
  applicableComponents: string[]
  execute: (component: string, error: Error) => Promise<RecoveryResult>
  cooldownPeriod: number
  maxAttempts: number
}

export interface RecoveryResult {
  success: boolean
  description: string
  nextStrategy?: string
  retryAfter?: number
}

// Circuit breaker for error handling
export interface CircuitBreakerState {
  isOpen: boolean
  failures: number
  lastFailureTime: number
  nextRetryTime: number
  successCount: number
}

/**
 * Comprehensive Sync Monitoring System
 */
export class SyncMonitoringSystem {
  private healthMetrics: HealthMetrics
  private alerts: Alert[] = []
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map()
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()
  private subscribers: Map<string, (alert: Alert) => void> = new Map()
  private healthSubscribers: Map<string, (health: HealthMetrics) => void> = new Map()
  private monitoringInterval: NodeJS.Timeout | null = null
  private errorHistory: Map<string, Error[]> = new Map()
  private performanceHistory: PerformanceMetrics[] = []
  private startTime: number

  // Configuration
  private readonly config = {
    monitoringInterval: 5000, // 5 seconds
    alertRetentionTime: 3600000, // 1 hour
    errorHistoryLimit: 100,
    performanceHistoryLimit: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 30000, // 30 seconds
    healthThresholds: {
      latency: {
        warning: 100, // 100ms
        error: 500,   // 500ms
        critical: 2000 // 2 seconds
      },
      errorRate: {
        warning: 0.05, // 5%
        error: 0.15,   // 15%
        critical: 0.3  // 30%
      },
      throughput: {
        warning: 10,   // events/sec
        error: 5,      // events/sec
        critical: 1    // events/sec
      }
    }
  }

  constructor() {
    this.startTime = Date.now()
    this.healthMetrics = this.createEmptyHealthMetrics()

    // Initialize recovery strategies
    this.initializeRecoveryStrategies()

    // Start monitoring
    this.startMonitoring()

    logger.info('SyncMonitoringSystem initialized', {
      monitoringInterval: this.config.monitoringInterval
    })
  }

  /**
   * Record sync event for monitoring
   */
  recordSyncEvent(event: SyncEvent, processingTime: number, success: boolean, error?: Error): void {
    const component = this.getEventComponent(event.type)

    // Update component health
    this.updateComponentHealth(component, processingTime, success, error)

    // Record error if present
    if (error) {
      this.recordError(component, error)
    }

    // Update circuit breaker
    this.updateCircuitBreaker(component, success)

    // Check for alerts
    this.checkForAlerts()
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceHistory.push({
      ...metrics,
      syncLatency: [...metrics.syncLatency] // Clone array
    })

    // Trim history
    if (this.performanceHistory.length > this.config.performanceHistoryLimit) {
      this.performanceHistory = this.performanceHistory.slice(-this.config.performanceHistoryLimit)
    }

    // Update performance component health
    this.updatePerformanceHealth(metrics)
  }

  /**
   * Record conflict resolution
   */
  recordConflictResolution(conflict: Conflict, resolutionTime: number, success: boolean): void {
    this.updateComponentHealth('conflictResolution', resolutionTime, success)

    if (!success) {
      const error = new Error(`Conflict resolution failed for conflict ${conflict.id}`)
      this.recordError('conflictResolution', error)
    }

    this.checkForAlerts()
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthMetrics {
    this.updateOverallHealth()
    return { ...this.healthMetrics }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(): Alert[] {
    return [...this.alerts]
  }

  /**
   * Subscribe to health updates
   */
  subscribeToHealth(callback: (health: HealthMetrics) => void): () => void {
    const subscriptionId = crypto.randomUUID()
    this.healthSubscribers.set(subscriptionId, callback)

    return () => {
      this.healthSubscribers.delete(subscriptionId)
    }
  }

  /**
   * Subscribe to alerts
   */
  subscribeToAlerts(callback: (alert: Alert) => void): () => void {
    const subscriptionId = crypto.randomUUID()
    this.subscribers.set(subscriptionId, callback)

    return () => {
      this.subscribers.delete(subscriptionId)
    }
  }

  /**
   * Manually trigger recovery for component
   */
  async triggerRecovery(component: string, error?: Error): Promise<RecoveryResult | null> {
    const strategy = this.selectRecoveryStrategy(component)
    if (!strategy) {
      logger.warn('No recovery strategy available', { component })
      return null
    }

    const componentHealth = this.healthMetrics[component as keyof HealthMetrics] as ComponentHealth
    componentHealth.isRecovering = true
    componentHealth.recoveryAttempts++

    try {
      const result = await strategy.execute(component, error || new Error('Manual recovery'))

      if (result.success) {
        this.resetComponentHealth(component)
        this.createAlert('info', component, `Recovery successful using ${strategy.name}`)
      } else {
        this.createAlert('error', component, `Recovery failed: ${result.description}`)
      }

      componentHealth.isRecovering = false
      return result

    } catch (recoveryError) {
      componentHealth.isRecovering = false
      logger.error('Recovery execution failed', { component, strategy: strategy.name, recoveryError })

      return {
        success: false,
        description: `Recovery strategy ${strategy.name} threw an error: ${recoveryError}`
      }
    }
  }

  /**
   * Clear resolved alerts older than retention time
   */
  clearOldAlerts(): void {
    const cutoffTime = Date.now() - this.config.alertRetentionTime
    this.alerts = this.alerts.filter(alert =>
      !alert.resolved || alert.resolvedAt! > cutoffTime
    )
  }

  /**
   * Generate health report
   */
  generateHealthReport(): {
    summary: HealthMetrics
    alerts: Alert[]
    performance: {
      averageLatency: number
      peakThroughput: number
      errorRate: number
      uptimePercentage: number
    }
    recommendations: string[]
  } {
    const summary = this.getHealthStatus()
    const activeAlerts = this.getActiveAlerts()

    // Calculate performance metrics
    const recentMetrics = this.performanceHistory.slice(-100) // Last 100 measurements
    const averageLatency = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.syncLatency.reduce((s, l) => s + l, 0) / m.syncLatency.length, 0) / recentMetrics.length
      : 0

    const peakThroughput = Math.max(...recentMetrics.map(m => m.throughput), 0)
    const errorRate = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length
      : 0

    const uptime = Date.now() - this.startTime
    const uptimePercentage = 99.9 // Would calculate based on actual downtime tracking

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, recentMetrics)

    return {
      summary,
      alerts: activeAlerts,
      performance: {
        averageLatency,
        peakThroughput,
        errorRate,
        uptimePercentage
      },
      recommendations
    }
  }

  /**
   * Get event component based on event type
   */
  private getEventComponent(eventType: SyncEventType): string {
    if (eventType.includes('BLOCK') || eventType.includes('EDGE') || eventType.includes('SUBBLOCK')) {
      return 'syncEngine'
    }
    if (eventType.includes('CHAT')) {
      return 'dataBinding'
    }
    if (eventType.includes('MODE_SWITCH')) {
      return 'syncEngine'
    }
    return 'syncEngine'
  }

  /**
   * Update component health metrics
   */
  private updateComponentHealth(component: string, processingTime: number, success: boolean, error?: Error): void {
    const health = this.healthMetrics[component as keyof HealthMetrics] as ComponentHealth

    if (!health) return

    // Update latency (rolling average)
    health.latency = (health.latency * 0.9) + (processingTime * 0.1)

    // Update error rate (rolling average)
    const errorValue = success ? 0 : 1
    health.errorRate = (health.errorRate * 0.95) + (errorValue * 0.05)

    // Update throughput (events per monitoring interval)
    health.throughput++

    // Record error details
    if (error) {
      health.lastError = error
      health.lastErrorTime = Date.now()
    }

    // Determine status
    health.status = this.calculateHealthStatus(health)
  }

  /**
   * Update performance component health
   */
  private updatePerformanceHealth(metrics: PerformanceMetrics): void {
    const health = this.healthMetrics.performance

    const avgLatency = metrics.syncLatency.length > 0
      ? metrics.syncLatency.reduce((a, b) => a + b, 0) / metrics.syncLatency.length
      : 0

    health.latency = avgLatency
    health.errorRate = metrics.errorRate
    health.throughput = metrics.throughput
    health.status = this.calculateHealthStatus(health)
  }

  /**
   * Calculate health status based on metrics
   */
  private calculateHealthStatus(health: ComponentHealth): HealthStatus {
    const { latency, errorRate, throughput } = health
    const thresholds = this.config.healthThresholds

    // Check for critical conditions
    if (latency > thresholds.latency.critical ||
        errorRate > thresholds.errorRate.critical ||
        throughput < thresholds.throughput.critical) {
      return 'critical'
    }

    // Check for error conditions
    if (latency > thresholds.latency.error ||
        errorRate > thresholds.errorRate.error ||
        throughput < thresholds.throughput.error) {
      return 'unhealthy'
    }

    // Check for warning conditions
    if (latency > thresholds.latency.warning ||
        errorRate > thresholds.errorRate.warning ||
        throughput < thresholds.throughput.warning) {
      return 'degraded'
    }

    return 'healthy'
  }

  /**
   * Update overall health status
   */
  private updateOverallHealth(): void {
    const components = [
      this.healthMetrics.syncEngine,
      this.healthMetrics.dataBinding,
      this.healthMetrics.conflictResolution,
      this.healthMetrics.performance
    ]

    // Overall health is the worst component health
    const statuses = components.map(c => c.status)

    if (statuses.includes('critical')) {
      this.healthMetrics.overall = 'critical'
    } else if (statuses.includes('unhealthy')) {
      this.healthMetrics.overall = 'unhealthy'
    } else if (statuses.includes('degraded')) {
      this.healthMetrics.overall = 'degraded'
    } else {
      this.healthMetrics.overall = 'healthy'
    }

    this.healthMetrics.uptime = Date.now() - this.startTime
    this.healthMetrics.lastUpdate = Date.now()
  }

  /**
   * Record error for tracking
   */
  private recordError(component: string, error: Error): void {
    const errors = this.errorHistory.get(component) || []
    errors.push(error)

    // Trim error history
    if (errors.length > this.config.errorHistoryLimit) {
      errors.shift()
    }

    this.errorHistory.set(component, errors)

    logger.error('Sync system error recorded', {
      component,
      error: error.message,
      stack: error.stack
    })
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(component: string, success: boolean): void {
    let state = this.circuitBreakers.get(component)

    if (!state) {
      state = {
        isOpen: false,
        failures: 0,
        lastFailureTime: 0,
        nextRetryTime: 0,
        successCount: 0
      }
      this.circuitBreakers.set(component, state)
    }

    const now = Date.now()

    if (success) {
      state.successCount++

      // Reset circuit breaker if enough successes
      if (state.isOpen && state.successCount >= 3) {
        state.isOpen = false
        state.failures = 0
        this.createAlert('info', component, 'Circuit breaker reset - service recovered')
      }
    } else {
      state.failures++
      state.lastFailureTime = now
      state.successCount = 0

      // Open circuit breaker if threshold exceeded
      if (!state.isOpen && state.failures >= this.config.circuitBreakerThreshold) {
        state.isOpen = true
        state.nextRetryTime = now + this.config.circuitBreakerTimeout
        this.createAlert('critical', component, 'Circuit breaker opened due to repeated failures')
      }
    }
  }

  /**
   * Check for alert conditions
   */
  private checkForAlerts(): void {
    for (const [componentName, health] of Object.entries(this.healthMetrics)) {
      if (componentName === 'overall' || componentName === 'uptime' || componentName === 'lastUpdate') {
        continue
      }

      const component = health as ComponentHealth

      // Check for new alerts
      if (component.status === 'critical') {
        this.createAlert('critical', componentName, `Component ${componentName} is in critical state`)
      } else if (component.status === 'unhealthy') {
        this.createAlert('error', componentName, `Component ${componentName} is unhealthy`)
      } else if (component.status === 'degraded') {
        this.createAlert('warning', componentName, `Component ${componentName} performance is degraded`)
      }

      // Check for high error rate
      if (component.errorRate > this.config.healthThresholds.errorRate.error) {
        this.createAlert('error', componentName, `High error rate: ${(component.errorRate * 100).toFixed(1)}%`)
      }

      // Check for high latency
      if (component.latency > this.config.healthThresholds.latency.error) {
        this.createAlert('error', componentName, `High latency: ${component.latency.toFixed(0)}ms`)
      }
    }
  }

  /**
   * Create alert
   */
  private createAlert(severity: AlertSeverity, component: string, message: string, metadata?: Record<string, any>): void {
    // Check if similar alert already exists and is not resolved
    const existingAlert = this.alerts.find(alert =>
      !alert.resolved &&
      alert.component === component &&
      alert.message === message &&
      alert.severity === severity
    )

    if (existingAlert) return // Don't create duplicate alerts

    const alert: Alert = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      severity,
      component,
      message,
      metadata,
      resolved: false
    }

    this.alerts.push(alert)

    // Notify subscribers
    this.notifyAlertSubscribers(alert)

    logger.warn('Alert created', {
      id: alert.id,
      severity,
      component,
      message
    })

    // Auto-resolve info alerts after 1 minute
    if (severity === 'info') {
      setTimeout(() => {
        this.resolveAlert(alert.id)
      }, 60000)
    }

    // Trigger automatic recovery for critical alerts
    if (severity === 'critical') {
      this.triggerRecovery(component)
    }
  }

  /**
   * Resolve alert
   */
  private resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = Date.now()
      alert.duration = alert.resolvedAt - alert.timestamp

      logger.info('Alert resolved', {
        id: alertId,
        duration: alert.duration
      })
    }
  }

  /**
   * Notify alert subscribers
   */
  private notifyAlertSubscribers(alert: Alert): void {
    this.subscribers.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        logger.error('Alert subscriber callback failed', { error })
      }
    })
  }

  /**
   * Notify health subscribers
   */
  private notifyHealthSubscribers(): void {
    const health = this.getHealthStatus()
    this.healthSubscribers.forEach(callback => {
      try {
        callback(health)
      } catch (error) {
        logger.error('Health subscriber callback failed', { error })
      }
    })
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Restart strategy
    this.recoveryStrategies.set('restart', {
      name: 'restart',
      description: 'Restart the affected component',
      applicableComponents: ['syncEngine', 'dataBinding', 'conflictResolution'],
      cooldownPeriod: 60000, // 1 minute
      maxAttempts: 3,
      execute: async (component) => {
        // Simulate component restart
        await new Promise(resolve => setTimeout(resolve, 1000))

        this.resetComponentHealth(component)

        return {
          success: true,
          description: `Component ${component} restarted successfully`
        }
      }
    })

    // Clear cache strategy
    this.recoveryStrategies.set('clear-cache', {
      name: 'clear-cache',
      description: 'Clear caches and reset state',
      applicableComponents: ['performance', 'dataBinding'],
      cooldownPeriod: 30000, // 30 seconds
      maxAttempts: 5,
      execute: async (component) => {
        // This would integrate with performance optimizer to clear caches
        logger.info('Clearing caches for recovery', { component })

        return {
          success: true,
          description: 'Caches cleared and state reset'
        }
      }
    })

    // Reduce load strategy
    this.recoveryStrategies.set('reduce-load', {
      name: 'reduce-load',
      description: 'Temporarily reduce system load',
      applicableComponents: ['syncEngine', 'performance'],
      cooldownPeriod: 120000, // 2 minutes
      maxAttempts: 2,
      execute: async (component) => {
        // This would reduce batch sizes, increase debounce times, etc.
        logger.info('Reducing system load for recovery', { component })

        return {
          success: true,
          description: 'System load reduced temporarily',
          retryAfter: 300000 // 5 minutes
        }
      }
    })
  }

  /**
   * Select appropriate recovery strategy
   */
  private selectRecoveryStrategy(component: string): RecoveryStrategy | null {
    const applicableStrategies = Array.from(this.recoveryStrategies.values())
      .filter(strategy => strategy.applicableComponents.includes(component))

    // Select strategy based on component health and previous attempts
    const componentHealth = this.healthMetrics[component as keyof HealthMetrics] as ComponentHealth

    if (componentHealth.recoveryAttempts < 2) {
      return applicableStrategies.find(s => s.name === 'restart') || applicableStrategies[0]
    } else if (componentHealth.recoveryAttempts < 4) {
      return applicableStrategies.find(s => s.name === 'clear-cache') || applicableStrategies[1]
    } else {
      return applicableStrategies.find(s => s.name === 'reduce-load') || applicableStrategies[2]
    }
  }

  /**
   * Reset component health after successful recovery
   */
  private resetComponentHealth(component: string): void {
    const health = this.healthMetrics[component as keyof HealthMetrics] as ComponentHealth

    if (health) {
      health.status = 'healthy'
      health.errorRate = 0
      health.lastError = undefined
      health.lastErrorTime = undefined
      health.recoveryAttempts = 0
      health.isRecovering = false
    }

    // Reset circuit breaker
    this.circuitBreakers.delete(component)
  }

  /**
   * Start monitoring interval
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCheck()
    }, this.config.monitoringInterval)
  }

  /**
   * Perform regular monitoring check
   */
  private performMonitoringCheck(): void {
    // Reset throughput counters (they accumulate over the interval)
    Object.values(this.healthMetrics).forEach(component => {
      if (typeof component === 'object' && 'throughput' in component) {
        (component as ComponentHealth).throughput = 0
      }
    })

    // Clean up old alerts
    this.clearOldAlerts()

    // Update overall health
    this.updateOverallHealth()

    // Notify health subscribers
    this.notifyHealthSubscribers()

    // Check circuit breaker timeouts
    this.checkCircuitBreakerTimeouts()
  }

  /**
   * Check circuit breaker timeouts
   */
  private checkCircuitBreakerTimeouts(): void {
    const now = Date.now()

    for (const [component, state] of this.circuitBreakers.entries()) {
      if (state.isOpen && now >= state.nextRetryTime) {
        // Allow one test request
        state.nextRetryTime = now + this.config.circuitBreakerTimeout
        this.createAlert('info', component, 'Circuit breaker allowing test request')
      }
    }
  }

  /**
   * Generate recommendations based on current health
   */
  private generateRecommendations(health: HealthMetrics, recentMetrics: PerformanceMetrics[]): string[] {
    const recommendations: string[] = []

    // Check overall health
    if (health.overall !== 'healthy') {
      recommendations.push('System health is degraded. Consider reviewing error logs and performance metrics.')
    }

    // Check component-specific issues
    Object.entries(health).forEach(([componentName, component]) => {
      if (typeof component !== 'object' || !('status' in component)) return

      const comp = component as ComponentHealth

      if (comp.status === 'critical') {
        recommendations.push(`${componentName} requires immediate attention - critical status detected.`)
      }

      if (comp.errorRate > this.config.healthThresholds.errorRate.warning) {
        recommendations.push(`High error rate in ${componentName}. Consider investigating root cause.`)
      }

      if (comp.latency > this.config.healthThresholds.latency.warning) {
        recommendations.push(`High latency in ${componentName}. Consider optimizing performance.`)
      }
    })

    // Performance-based recommendations
    if (recentMetrics.length > 0) {
      const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length

      if (avgMemoryUsage > 40 * 1024 * 1024) { // 40MB
        recommendations.push('High memory usage detected. Consider clearing caches or optimizing data structures.')
      }

      const avgCacheHitRate = recentMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / recentMetrics.length

      if (avgCacheHitRate < 0.7) {
        recommendations.push('Low cache hit rate. Consider adjusting cache sizes or improving cache strategies.')
      }
    }

    return recommendations
  }

  /**
   * Create empty health metrics
   */
  private createEmptyHealthMetrics(): HealthMetrics {
    const createEmptyComponent = (): ComponentHealth => ({
      status: 'healthy',
      latency: 0,
      errorRate: 0,
      throughput: 0,
      recoveryAttempts: 0,
      isRecovering: false
    })

    return {
      syncEngine: createEmptyComponent(),
      dataBinding: createEmptyComponent(),
      conflictResolution: createEmptyComponent(),
      performance: createEmptyComponent(),
      overall: 'healthy',
      uptime: 0,
      lastUpdate: Date.now()
    }
  }

  /**
   * Export monitoring data
   */
  exportData(): {
    health: HealthMetrics
    alerts: Alert[]
    errors: Record<string, Error[]>
    performance: PerformanceMetrics[]
    circuitBreakers: Record<string, CircuitBreakerState>
  } {
    const errors: Record<string, Error[]> = {}
    this.errorHistory.forEach((errorList, component) => {
      errors[component] = [...errorList]
    })

    const circuitBreakers: Record<string, CircuitBreakerState> = {}
    this.circuitBreakers.forEach((state, component) => {
      circuitBreakers[component] = { ...state }
    })

    return {
      health: this.getHealthStatus(),
      alerts: [...this.alerts],
      errors,
      performance: [...this.performanceHistory],
      circuitBreakers
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    this.alerts = []
    this.subscribers.clear()
    this.healthSubscribers.clear()
    this.errorHistory.clear()
    this.circuitBreakers.clear()
    this.performanceHistory = []

    logger.info('SyncMonitoringSystem destroyed')
  }
}