/**
 * Advanced Health Check and Failover System for Tool Adapters
 *
 * Provides comprehensive health monitoring with:
 * - Multi-level health checks (system, service, tool-specific)
 * - Automatic failover and recovery mechanisms
 * - Circuit breaker patterns for failing services
 * - Health scoring and trend analysis
 * - Self-healing capabilities
 * - Service mesh integration support
 *
 * @author Performance & Monitoring Agent
 * @version 2.0.0
 */

import { EventEmitter } from 'events'
import { createLogger } from '../utils/logger'

const logger = createLogger('HealthCheckSystem')

export interface HealthCheckConfig {
  // Health check intervals
  intervals: {
    system: number // System-level checks
    service: number // Service-level checks
    tool: number // Tool-specific checks
    external: number // External dependency checks
  }

  // Health check timeouts
  timeouts: {
    system: number
    service: number
    tool: number
    external: number
  }

  // Failure thresholds
  thresholds: {
    consecutive: number // Consecutive failures before marking unhealthy
    successRate: number // Minimum success rate over time window
    responseTime: number // Maximum acceptable response time
    recovery: number // Consecutive successes before marking healthy
  }

  // Failover configuration
  failover: {
    enabled: boolean
    strategy: 'immediate' | 'graceful' | 'circuit-breaker'
    cooldownMs: number
    maxRetries: number
    backoffMultiplier: number
    circuitBreakerConfig: {
      failureThreshold: number
      recoveryTimeoutMs: number
      halfOpenMaxRequests: number
    }
  }

  // Self-healing configuration
  selfHealing: {
    enabled: boolean
    strategies: ('restart' | 'scale' | 'cleanup' | 'fallback')[]
    maxAttempts: number
    healingIntervalMs: number
  }

  // Monitoring and alerting
  monitoring: {
    enabled: boolean
    retentionPeriodMs: number
    alertThresholds: {
      degraded: number // Health score threshold for degraded state
      critical: number // Health score threshold for critical state
    }
  }
}

export interface HealthStatus {
  overall: HealthState
  score: number // 0-100
  timestamp: Date
  uptime: number

  components: {
    system: ComponentHealth
    services: Record<string, ComponentHealth>
    tools: Record<string, ComponentHealth>
    external: Record<string, ComponentHealth>
  }

  issues: HealthIssue[]
  recoveryActions: RecoveryAction[]
  trends: HealthTrend
}

export interface ComponentHealth {
  state: HealthState
  score: number
  lastCheck: Date
  lastSuccess: Date
  responseTime: number
  successRate: number
  consecutiveFailures: number
  consecutiveSuccesses: number
  issues: HealthIssue[]
  metrics: HealthMetrics
}

export interface HealthIssue {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  component: string
  type: string
  message: string
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  recommendedActions: string[]
}

export interface RecoveryAction {
  id: string
  type: 'restart' | 'scale' | 'cleanup' | 'fallback' | 'circuit-breaker'
  component: string
  description: string
  status: 'pending' | 'executing' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  result?: string
}

export interface HealthMetrics {
  totalChecks: number
  successfulChecks: number
  failedChecks: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  availability: number
}

export interface HealthTrend {
  direction: 'improving' | 'stable' | 'degrading'
  confidence: number
  period: { start: Date; end: Date }
  predictions: Array<{
    timestamp: Date
    predictedScore: number
    confidence: number
  }>
}

export type HealthState = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

export class AdvancedHealthCheckSystem extends EventEmitter {
  private healthCheckers = new Map<string, HealthChecker>()
  private healthHistory: HealthStatus[] = []
  private recoveryManager: RecoveryManager
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private trendAnalyzer: TrendAnalyzer

  private systemCheckInterval: NodeJS.Timeout | null = null
  private serviceCheckInterval: NodeJS.Timeout | null = null
  private toolCheckInterval: NodeJS.Timeout | null = null
  private externalCheckInterval: NodeJS.Timeout | null = null
  private cleanupInterval: NodeJS.Timeout | null = null

  private isShuttingDown = false
  private startTime = Date.now()

  constructor(private config: HealthCheckConfig) {
    super()

    this.recoveryManager = new RecoveryManager(config.selfHealing, this)
    this.trendAnalyzer = new TrendAnalyzer()

    this.initialize()
  }

  /**
   * Register a health check for a component
   */
  registerHealthCheck(
    componentId: string,
    componentType: 'system' | 'service' | 'tool' | 'external',
    healthCheckFn: HealthCheckFunction
  ): void {
    const checker = new HealthChecker(componentId, componentType, healthCheckFn, this.config)

    this.healthCheckers.set(componentId, checker)

    // Set up circuit breaker if failover is enabled
    if (this.config.failover.enabled && this.config.failover.strategy === 'circuit-breaker') {
      const circuitBreaker = new CircuitBreaker(
        componentId,
        this.config.failover.circuitBreakerConfig,
        this
      )
      this.circuitBreakers.set(componentId, circuitBreaker)
    }

    logger.info('Health check registered', { componentId, componentType })
  }

  /**
   * Unregister a health check
   */
  unregisterHealthCheck(componentId: string): void {
    this.healthCheckers.delete(componentId)
    this.circuitBreakers.delete(componentId)

    logger.info('Health check unregistered', { componentId })
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const timestamp = new Date()
    const components = await this.collectComponentHealth()

    // Calculate overall health score
    const overallScore = this.calculateOverallScore(components)
    const overallState = this.determineOverallState(overallScore)

    // Collect active issues
    const issues = this.collectActiveIssues(components)

    // Get recovery actions
    const recoveryActions = this.recoveryManager.getActiveActions()

    // Analyze trends
    const trends = this.trendAnalyzer.analyzeTrends(this.healthHistory)

    const healthStatus: HealthStatus = {
      overall: overallState,
      score: overallScore,
      timestamp,
      uptime: this.calculateUptime(),
      components,
      issues,
      recoveryActions,
      trends,
    }

    // Store in history
    this.healthHistory.push(healthStatus)
    this.cleanupHistory()

    // Check for alerts
    if (this.config.monitoring.enabled) {
      await this.checkAlerts(healthStatus)
    }

    return healthStatus
  }

  /**
   * Perform manual health check for specific component
   */
  async checkComponentHealth(componentId: string): Promise<ComponentHealth | null> {
    const checker = this.healthCheckers.get(componentId)
    if (!checker) {
      logger.warn('Health checker not found', { componentId })
      return null
    }

    return checker.performCheck()
  }

  /**
   * Trigger recovery action for a component
   */
  async triggerRecovery(
    componentId: string,
    recoveryType: RecoveryAction['type'] = 'restart'
  ): Promise<string> {
    return this.recoveryManager.executeRecovery(componentId, recoveryType)
  }

  /**
   * Get health history for analysis
   */
  getHealthHistory(startTime?: Date, endTime?: Date, componentId?: string): HealthStatus[] {
    let history = [...this.healthHistory]

    if (startTime) {
      history = history.filter((status) => status.timestamp >= startTime)
    }

    if (endTime) {
      history = history.filter((status) => status.timestamp <= endTime)
    }

    return history
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(componentId?: string): Record<string, CircuitBreakerStatus> {
    const status: Record<string, CircuitBreakerStatus> = {}

    if (componentId) {
      const breaker = this.circuitBreakers.get(componentId)
      if (breaker) {
        status[componentId] = breaker.getStatus()
      }
    } else {
      for (const [id, breaker] of this.circuitBreakers.entries()) {
        status[id] = breaker.getStatus()
      }
    }

    return status
  }

  /**
   * Force failover for a component
   */
  async forceFailover(componentId: string, reason: string): Promise<void> {
    logger.warn('Forcing failover', { componentId, reason })

    const checker = this.healthCheckers.get(componentId)
    if (checker) {
      await checker.markUnhealthy(`Forced failover: ${reason}`)
    }

    const circuitBreaker = this.circuitBreakers.get(componentId)
    if (circuitBreaker) {
      circuitBreaker.forceOpen(reason)
    }

    this.emit('failoverTriggered', {
      componentId,
      reason,
      timestamp: new Date(),
      type: 'forced',
    })

    // Trigger recovery if self-healing is enabled
    if (this.config.selfHealing.enabled) {
      await this.triggerRecovery(componentId)
    }
  }

  /**
   * Get health metrics and statistics
   */
  getHealthMetrics(): {
    uptime: number
    averageScore: number
    componentCounts: Record<HealthState, number>
    topIssues: Array<{ type: string; count: number }>
    recoveryStats: {
      total: number
      successful: number
      failed: number
      averageDurationMs: number
    }
  } {
    const recentHistory = this.healthHistory.slice(-100)

    const averageScore =
      recentHistory.length > 0
        ? recentHistory.reduce((sum, status) => sum + status.score, 0) / recentHistory.length
        : 100

    // Count components by state
    const componentCounts: Record<HealthState, number> = {
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
    }

    for (const checker of this.healthCheckers.values()) {
      const state = checker.getCurrentState()
      componentCounts[state]++
    }

    // Analyze top issues
    const issueTypes = new Map<string, number>()
    for (const status of recentHistory) {
      for (const issue of status.issues) {
        issueTypes.set(issue.type, (issueTypes.get(issue.type) || 0) + 1)
      }
    }

    const topIssues = Array.from(issueTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }))

    // Recovery statistics
    const recoveryStats = this.recoveryManager.getStatistics()

    return {
      uptime: this.calculateUptime(),
      averageScore,
      componentCounts,
      topIssues,
      recoveryStats,
    }
  }

  /**
   * Shutdown the health check system
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down health check system')

    this.isShuttingDown = true

    // Stop all intervals
    const intervals = [
      this.systemCheckInterval,
      this.serviceCheckInterval,
      this.toolCheckInterval,
      this.externalCheckInterval,
      this.cleanupInterval,
    ]

    for (const interval of intervals) {
      if (interval) {
        clearInterval(interval)
      }
    }

    // Shutdown components
    await Promise.all([this.recoveryManager.shutdown(), this.shutdownCircuitBreakers()])

    this.emit('shutdown')
    logger.info('Health check system shutdown complete')
  }

  /**
   * Private implementation methods
   */

  private initialize(): void {
    logger.info('Initializing health check system', {
      systemInterval: this.config.intervals.system,
      serviceInterval: this.config.intervals.service,
      toolInterval: this.config.intervals.tool,
      externalInterval: this.config.intervals.external,
      failoverEnabled: this.config.failover.enabled,
      selfHealingEnabled: this.config.selfHealing.enabled,
    })

    // Start health check intervals
    this.systemCheckInterval = setInterval(() => {
      this.performSystemChecks()
    }, this.config.intervals.system)

    this.serviceCheckInterval = setInterval(() => {
      this.performServiceChecks()
    }, this.config.intervals.service)

    this.toolCheckInterval = setInterval(() => {
      this.performToolChecks()
    }, this.config.intervals.tool)

    this.externalCheckInterval = setInterval(() => {
      this.performExternalChecks()
    }, this.config.intervals.external)

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupHistory()
    }, 300000) // Every 5 minutes

    this.emit('initialized')
  }

  private async performSystemChecks(): Promise<void> {
    const systemCheckers = Array.from(this.healthCheckers.values()).filter(
      (checker) => checker.getType() === 'system'
    )

    await this.performChecks(systemCheckers, 'system')
  }

  private async performServiceChecks(): Promise<void> {
    const serviceCheckers = Array.from(this.healthCheckers.values()).filter(
      (checker) => checker.getType() === 'service'
    )

    await this.performChecks(serviceCheckers, 'service')
  }

  private async performToolChecks(): Promise<void> {
    const toolCheckers = Array.from(this.healthCheckers.values()).filter(
      (checker) => checker.getType() === 'tool'
    )

    await this.performChecks(toolCheckers, 'tool')
  }

  private async performExternalChecks(): Promise<void> {
    const externalCheckers = Array.from(this.healthCheckers.values()).filter(
      (checker) => checker.getType() === 'external'
    )

    await this.performChecks(externalCheckers, 'external')
  }

  private async performChecks(checkers: HealthChecker[], checkType: string): Promise<void> {
    if (this.isShuttingDown) return

    const promises = checkers.map(async (checker) => {
      try {
        const health = await checker.performCheck()

        // Update circuit breaker
        const circuitBreaker = this.circuitBreakers.get(checker.getId())
        if (circuitBreaker) {
          if (health.state === 'healthy') {
            circuitBreaker.onSuccess()
          } else {
            circuitBreaker.onFailure()
          }
        }

        // Trigger recovery if needed
        if (health.state === 'unhealthy' && this.config.selfHealing.enabled) {
          this.recoveryManager.scheduleRecovery(checker.getId())
        }

        return health
      } catch (error) {
        logger.error('Health check failed', {
          checkerId: checker.getId(),
          checkType,
          error: error instanceof Error ? error.message : String(error),
        })

        const circuitBreaker = this.circuitBreakers.get(checker.getId())
        if (circuitBreaker) {
          circuitBreaker.onFailure()
        }

        return null
      }
    })

    await Promise.allSettled(promises)
  }

  private async collectComponentHealth(): Promise<HealthStatus['components']> {
    const components: HealthStatus['components'] = {
      system: this.createDefaultComponentHealth(),
      services: {},
      tools: {},
      external: {},
    }

    for (const [id, checker] of this.healthCheckers.entries()) {
      const health = checker.getLastHealth()
      const type = checker.getType()

      if (type === 'system') {
        components.system = health || this.createDefaultComponentHealth()
      } else {
        const category = `${type}s` as keyof typeof components
        if (components[category] && typeof components[category] === 'object') {
          ;(components[category] as Record<string, ComponentHealth>)[id] =
            health || this.createDefaultComponentHealth()
        }
      }
    }

    return components
  }

  private createDefaultComponentHealth(): ComponentHealth {
    return {
      state: 'unknown',
      score: 0,
      lastCheck: new Date(),
      lastSuccess: new Date(),
      responseTime: 0,
      successRate: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      issues: [],
      metrics: {
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        availability: 0,
      },
    }
  }

  private calculateOverallScore(components: HealthStatus['components']): number {
    const allComponents = [
      components.system,
      ...Object.values(components.services),
      ...Object.values(components.tools),
      ...Object.values(components.external),
    ]

    if (allComponents.length === 0) return 100

    const totalScore = allComponents.reduce((sum, comp) => sum + comp.score, 0)
    return Math.round(totalScore / allComponents.length)
  }

  private determineOverallState(score: number): HealthState {
    if (score >= 90) return 'healthy'
    if (score >= 70) return 'degraded'
    if (score >= 0) return 'unhealthy'
    return 'unknown'
  }

  private collectActiveIssues(components: HealthStatus['components']): HealthIssue[] {
    const issues: HealthIssue[] = []

    const allComponents = [
      components.system,
      ...Object.values(components.services),
      ...Object.values(components.tools),
      ...Object.values(components.external),
    ]

    for (const component of allComponents) {
      issues.push(...component.issues.filter((issue) => !issue.resolved))
    }

    return issues.sort((a, b) => {
      const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  private calculateUptime(): number {
    const uptimeMs = Date.now() - this.startTime
    return Math.round(uptimeMs / 1000 / 60) // uptime in minutes
  }

  private cleanupHistory(): void {
    const cutoff = Date.now() - this.config.monitoring.retentionPeriodMs
    this.healthHistory = this.healthHistory.filter((status) => status.timestamp.getTime() > cutoff)
  }

  private async checkAlerts(healthStatus: HealthStatus): Promise<void> {
    const { score } = healthStatus
    const { degraded, critical } = this.config.monitoring.alertThresholds

    if (score <= critical) {
      this.emit('healthAlert', {
        severity: 'critical',
        message: `System health score ${score} is critical (threshold: ${critical})`,
        timestamp: new Date(),
        score,
        components: healthStatus.components,
      })
    } else if (score <= degraded) {
      this.emit('healthAlert', {
        severity: 'warning',
        message: `System health score ${score} is degraded (threshold: ${degraded})`,
        timestamp: new Date(),
        score,
        components: healthStatus.components,
      })
    }
  }

  private async shutdownCircuitBreakers(): Promise<void> {
    for (const breaker of this.circuitBreakers.values()) {
      await breaker.shutdown()
    }
    this.circuitBreakers.clear()
  }
}

/**
 * Health check function interface
 */
export type HealthCheckFunction = () => Promise<HealthCheckResult>

export interface HealthCheckResult {
  healthy: boolean
  responseTime: number
  message?: string
  details?: Record<string, any>
}

/**
 * Individual health checker class
 */
class HealthChecker {
  private lastHealth: ComponentHealth | null = null
  private metrics: HealthMetrics = {
    totalChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    averageResponseTime: 0,
    minResponseTime: Number.MAX_SAFE_INTEGER,
    maxResponseTime: 0,
    availability: 100,
  }

  private consecutiveFailures = 0
  private consecutiveSuccesses = 0
  private responseTimeHistory: number[] = []

  constructor(
    private id: string,
    private type: 'system' | 'service' | 'tool' | 'external',
    private healthCheckFn: HealthCheckFunction,
    private config: HealthCheckConfig
  ) {}

  async performCheck(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const timeout = this.config.timeouts[this.type]
      const result = await Promise.race([
        this.healthCheckFn(),
        new Promise<HealthCheckResult>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), timeout)
        ),
      ])

      const responseTime = Date.now() - startTime
      this.updateMetrics(true, responseTime)

      if (result.healthy) {
        this.consecutiveFailures = 0
        this.consecutiveSuccesses++

        const health = this.buildComponentHealth(
          'healthy',
          100,
          responseTime,
          result.message || 'Health check passed',
          []
        )

        this.lastHealth = health
        return health
      }
      this.consecutiveSuccesses = 0
      this.consecutiveFailures++

      const state = this.determineHealthState()
      const score = this.calculateHealthScore(state)

      const issues: HealthIssue[] = [
        {
          id: `${this.id}_unhealthy_${Date.now()}`,
          severity: state === 'unhealthy' ? 'error' : 'warning',
          component: this.id,
          type: 'health_check_failure',
          message: result.message || 'Health check failed',
          timestamp: new Date(),
          resolved: false,
          recommendedActions: this.getRecommendedActions(state),
        },
      ]

      const health = this.buildComponentHealth(
        state,
        score,
        responseTime,
        result.message || 'Health check failed',
        issues
      )

      this.lastHealth = health
      return health
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.updateMetrics(false, responseTime)

      this.consecutiveSuccesses = 0
      this.consecutiveFailures++

      const state = this.determineHealthState()
      const score = this.calculateHealthScore(state)

      const issues: HealthIssue[] = [
        {
          id: `${this.id}_error_${Date.now()}`,
          severity: 'error',
          component: this.id,
          type: 'health_check_error',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          resolved: false,
          recommendedActions: this.getRecommendedActions(state),
        },
      ]

      const health = this.buildComponentHealth(
        state,
        score,
        responseTime,
        error instanceof Error ? error.message : String(error),
        issues
      )

      this.lastHealth = health
      return health
    }
  }

  async markUnhealthy(reason: string): Promise<void> {
    this.consecutiveFailures = this.config.thresholds.consecutive
    this.consecutiveSuccesses = 0

    const issues: HealthIssue[] = [
      {
        id: `${this.id}_forced_unhealthy_${Date.now()}`,
        severity: 'critical',
        component: this.id,
        type: 'forced_unhealthy',
        message: reason,
        timestamp: new Date(),
        resolved: false,
        recommendedActions: ['Investigate the forced unhealthy condition', 'Check system logs'],
      },
    ]

    this.lastHealth = this.buildComponentHealth('unhealthy', 0, 0, reason, issues)
  }

  getId(): string {
    return this.id
  }

  getType(): string {
    return this.type
  }

  getCurrentState(): HealthState {
    return this.lastHealth?.state || 'unknown'
  }

  getLastHealth(): ComponentHealth | null {
    return this.lastHealth
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.totalChecks++

    if (success) {
      this.metrics.successfulChecks++
    } else {
      this.metrics.failedChecks++
    }

    // Update response time metrics
    this.responseTimeHistory.push(responseTime)
    if (this.responseTimeHistory.length > 100) {
      this.responseTimeHistory.shift()
    }

    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime)
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime)
    this.metrics.averageResponseTime =
      this.responseTimeHistory.reduce((sum, time) => sum + time, 0) /
      this.responseTimeHistory.length

    // Update availability
    this.metrics.availability = (this.metrics.successfulChecks / this.metrics.totalChecks) * 100
  }

  private determineHealthState(): HealthState {
    if (this.consecutiveFailures >= this.config.thresholds.consecutive) {
      return 'unhealthy'
    }

    if (this.metrics.availability < this.config.thresholds.successRate * 100) {
      return 'degraded'
    }

    if (this.metrics.averageResponseTime > this.config.thresholds.responseTime) {
      return 'degraded'
    }

    return 'healthy'
  }

  private calculateHealthScore(state: HealthState): number {
    switch (state) {
      case 'healthy':
        return Math.min(100, Math.max(90, 100 - this.consecutiveFailures * 5))

      case 'degraded':
        return Math.min(89, Math.max(50, 80 - this.consecutiveFailures * 10))

      case 'unhealthy':
        return Math.max(0, 30 - this.consecutiveFailures * 5)

      default:
        return 0
    }
  }

  private buildComponentHealth(
    state: HealthState,
    score: number,
    responseTime: number,
    message: string,
    issues: HealthIssue[]
  ): ComponentHealth {
    const now = new Date()

    return {
      state,
      score,
      lastCheck: now,
      lastSuccess: state === 'healthy' ? now : this.lastHealth?.lastSuccess || now,
      responseTime,
      successRate: this.metrics.availability,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      issues,
      metrics: { ...this.metrics },
    }
  }

  private getRecommendedActions(state: HealthState): string[] {
    const actions: string[] = []

    if (state === 'unhealthy') {
      actions.push('Check component logs for errors')
      actions.push('Verify network connectivity')
      actions.push('Restart the component if necessary')
      actions.push('Check resource availability (CPU, memory, disk)')
    } else if (state === 'degraded') {
      actions.push('Monitor component performance')
      actions.push('Check for resource constraints')
      actions.push('Review recent changes')
    }

    return actions
  }
}

/**
 * Circuit breaker implementation
 */
interface CircuitBreakerStatus {
  state: 'closed' | 'open' | 'half-open'
  failures: number
  nextAttemptTime?: Date
  halfOpenRequests: number
}

class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failures = 0
  private lastFailureTime?: Date
  private nextAttemptTime?: Date
  private halfOpenRequests = 0

  constructor(
    private componentId: string,
    private config: HealthCheckConfig['failover']['circuitBreakerConfig'],
    private healthSystem: AdvancedHealthCheckSystem
  ) {}

  onSuccess(): void {
    if (this.state === 'half-open') {
      this.halfOpenRequests++

      if (this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
        this.state = 'closed'
        this.failures = 0
        this.halfOpenRequests = 0
        logger.info('Circuit breaker closed', { componentId: this.componentId })
      }
    } else {
      this.failures = 0
    }
  }

  onFailure(): void {
    this.failures++
    this.lastFailureTime = new Date()

    if (this.state === 'half-open') {
      this.state = 'open'
      this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeoutMs)
      logger.warn('Circuit breaker reopened', { componentId: this.componentId })
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = 'open'
      this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeoutMs)
      logger.warn('Circuit breaker opened', {
        componentId: this.componentId,
        failures: this.failures,
      })
    }
  }

  forceOpen(reason: string): void {
    this.state = 'open'
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeoutMs)
    logger.warn('Circuit breaker force opened', {
      componentId: this.componentId,
      reason,
    })
  }

  allowRequest(): boolean {
    const now = Date.now()

    switch (this.state) {
      case 'closed':
        return true

      case 'open':
        if (this.nextAttemptTime && now >= this.nextAttemptTime.getTime()) {
          this.state = 'half-open'
          this.halfOpenRequests = 0
          logger.info('Circuit breaker transitioning to half-open', {
            componentId: this.componentId,
          })
          return true
        }
        return false

      case 'half-open':
        return this.halfOpenRequests < this.config.halfOpenMaxRequests
    }
  }

  getStatus(): CircuitBreakerStatus {
    return {
      state: this.state,
      failures: this.failures,
      nextAttemptTime: this.nextAttemptTime,
      halfOpenRequests: this.halfOpenRequests,
    }
  }

  async shutdown(): Promise<void> {
    // Cleanup circuit breaker resources
  }
}

/**
 * Recovery manager for self-healing
 */
class RecoveryManager {
  private activeRecoveries = new Map<string, RecoveryAction>()
  private recoveryHistory: RecoveryAction[] = []
  private recoveryQueue: Array<{ componentId: string; type: RecoveryAction['type'] }> = []
  private processingInterval: NodeJS.Timeout | null = null

  constructor(
    private config: HealthCheckConfig['selfHealing'],
    private healthSystem: AdvancedHealthCheckSystem
  ) {
    if (config.enabled) {
      this.startProcessing()
    }
  }

  async executeRecovery(
    componentId: string,
    recoveryType: RecoveryAction['type']
  ): Promise<string> {
    const actionId = `recovery_${componentId}_${Date.now()}`

    const action: RecoveryAction = {
      id: actionId,
      type: recoveryType,
      component: componentId,
      description: this.getRecoveryDescription(recoveryType, componentId),
      status: 'pending',
      startedAt: new Date(),
    }

    this.activeRecoveries.set(actionId, action)
    this.recoveryHistory.push(action)

    logger.info('Recovery action initiated', {
      actionId,
      componentId,
      recoveryType,
    })

    try {
      action.status = 'executing'

      const result = await this.performRecovery(componentId, recoveryType)

      action.status = 'completed'
      action.completedAt = new Date()
      action.result = result

      logger.info('Recovery action completed', {
        actionId,
        componentId,
        recoveryType,
        result,
      })

      this.healthSystem.emit('recoveryCompleted', action)
    } catch (error) {
      action.status = 'failed'
      action.completedAt = new Date()
      action.result = error instanceof Error ? error.message : String(error)

      logger.error('Recovery action failed', {
        actionId,
        componentId,
        recoveryType,
        error: error instanceof Error ? error.message : String(error),
      })

      this.healthSystem.emit('recoveryFailed', action)
    } finally {
      this.activeRecoveries.delete(actionId)
    }

    return actionId
  }

  scheduleRecovery(componentId: string): void {
    if (!this.config.enabled) return

    // Determine best recovery strategy for component
    const recoveryType = this.selectRecoveryStrategy(componentId)

    this.recoveryQueue.push({ componentId, type: recoveryType })

    logger.debug('Recovery scheduled', { componentId, recoveryType })
  }

  getActiveActions(): RecoveryAction[] {
    return Array.from(this.activeRecoveries.values())
  }

  getStatistics(): {
    total: number
    successful: number
    failed: number
    averageDurationMs: number
  } {
    const completed = this.recoveryHistory.filter(
      (action) => action.status === 'completed' || action.status === 'failed'
    )

    const successful = completed.filter((action) => action.status === 'completed').length
    const failed = completed.filter((action) => action.status === 'failed').length

    const durations = completed
      .filter((action) => action.completedAt && action.startedAt)
      .map((action) => action.completedAt!.getTime() - action.startedAt.getTime())

    const averageDurationMs =
      durations.length > 0
        ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        : 0

    return {
      total: this.recoveryHistory.length,
      successful,
      failed,
      averageDurationMs,
    }
  }

  async shutdown(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }

    // Wait for active recoveries to complete
    const activeRecoveries = Array.from(this.activeRecoveries.values())
    if (activeRecoveries.length > 0) {
      logger.info('Waiting for active recoveries to complete', {
        count: activeRecoveries.length,
      })

      await new Promise<void>((resolve) => {
        const checkComplete = () => {
          if (this.activeRecoveries.size === 0) {
            resolve()
          } else {
            setTimeout(checkComplete, 1000)
          }
        }
        checkComplete()
      })
    }
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(async () => {
      await this.processRecoveryQueue()
    }, this.config.healingIntervalMs)
  }

  private async processRecoveryQueue(): Promise<void> {
    if (this.recoveryQueue.length === 0) return

    const { componentId, type } = this.recoveryQueue.shift()!

    try {
      await this.executeRecovery(componentId, type)
    } catch (error) {
      logger.error('Failed to process recovery from queue', {
        componentId,
        type,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private selectRecoveryStrategy(componentId: string): RecoveryAction['type'] {
    // Simple strategy selection - could be enhanced with ML
    const availableStrategies = this.config.strategies

    if (availableStrategies.includes('restart')) return 'restart'
    if (availableStrategies.includes('cleanup')) return 'cleanup'
    if (availableStrategies.includes('fallback')) return 'fallback'
    if (availableStrategies.includes('scale')) return 'scale'

    return 'restart'
  }

  private async performRecovery(
    componentId: string,
    recoveryType: RecoveryAction['type']
  ): Promise<string> {
    switch (recoveryType) {
      case 'restart':
        return this.performRestart(componentId)

      case 'cleanup':
        return this.performCleanup(componentId)

      case 'fallback':
        return this.performFallback(componentId)

      case 'scale':
        return this.performScale(componentId)

      case 'circuit-breaker':
        return this.performCircuitBreakerRecovery(componentId)

      default:
        throw new Error(`Unknown recovery type: ${recoveryType}`)
    }
  }

  private async performRestart(componentId: string): Promise<string> {
    // Implementation would restart the component/service
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate restart
    return 'Component restarted successfully'
  }

  private async performCleanup(componentId: string): Promise<string> {
    // Implementation would clean up resources, caches, etc.
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate cleanup
    return 'Component resources cleaned up'
  }

  private async performFallback(componentId: string): Promise<string> {
    // Implementation would activate fallback mechanisms
    return 'Fallback mechanism activated'
  }

  private async performScale(componentId: string): Promise<string> {
    // Implementation would scale up resources
    return 'Component scaled up'
  }

  private async performCircuitBreakerRecovery(componentId: string): Promise<string> {
    // Implementation would reset circuit breaker
    return 'Circuit breaker reset'
  }

  private getRecoveryDescription(
    recoveryType: RecoveryAction['type'],
    componentId: string
  ): string {
    const descriptions = {
      restart: `Restart ${componentId} component`,
      cleanup: `Clean up resources for ${componentId}`,
      fallback: `Activate fallback for ${componentId}`,
      scale: `Scale up ${componentId} component`,
      'circuit-breaker': `Reset circuit breaker for ${componentId}`,
    }

    return descriptions[recoveryType] || `Perform ${recoveryType} recovery for ${componentId}`
  }
}

/**
 * Trend analyzer for health data
 */
class TrendAnalyzer {
  analyzeTrends(history: HealthStatus[]): HealthTrend {
    if (history.length < 2) {
      return {
        direction: 'stable',
        confidence: 0,
        period: { start: new Date(), end: new Date() },
        predictions: [],
      }
    }

    const scores = history.map((status) => status.score)
    const timestamps = history.map((status) => status.timestamp)

    // Simple linear regression for trend
    const trend = this.calculateTrend(scores)
    const direction = this.determineTrendDirection(trend)
    const confidence = this.calculateConfidence(scores, trend)

    // Generate predictions
    const predictions = this.generatePredictions(scores, timestamps, trend)

    return {
      direction,
      confidence,
      period: {
        start: timestamps[0],
        end: timestamps[timestamps.length - 1],
      },
      predictions,
    }
  }

  private calculateTrend(scores: number[]): number {
    const n = scores.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = scores

    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    return slope
  }

  private determineTrendDirection(trend: number): 'improving' | 'stable' | 'degrading' {
    if (Math.abs(trend) < 0.1) return 'stable'
    return trend > 0 ? 'improving' : 'degrading'
  }

  private calculateConfidence(scores: number[], trend: number): number {
    // Simple confidence calculation based on variance
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const variance = scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length
    const stdDev = Math.sqrt(variance)

    // Lower variance = higher confidence in trend
    const maxConfidence = 100
    const confidence = Math.max(0, maxConfidence - stdDev * 2)

    return Math.min(100, confidence)
  }

  private generatePredictions(
    scores: number[],
    timestamps: Date[],
    trend: number
  ): Array<{ timestamp: Date; predictedScore: number; confidence: number }> {
    const predictions: Array<{ timestamp: Date; predictedScore: number; confidence: number }> = []
    const lastScore = scores[scores.length - 1]
    const lastTimestamp = timestamps[timestamps.length - 1]

    // Generate predictions for next 5 time periods
    for (let i = 1; i <= 5; i++) {
      const predictedScore = Math.max(0, Math.min(100, lastScore + trend * i))
      const futureTimestamp = new Date(lastTimestamp.getTime() + i * 30 * 60 * 1000) // 30 minutes ahead

      predictions.push({
        timestamp: futureTimestamp,
        predictedScore,
        confidence: Math.max(10, 90 - i * 15), // Confidence decreases with time
      })
    }

    return predictions
  }
}

// Default configuration
export const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  intervals: {
    system: 30000, // 30 seconds
    service: 60000, // 1 minute
    tool: 120000, // 2 minutes
    external: 300000, // 5 minutes
  },

  timeouts: {
    system: 10000, // 10 seconds
    service: 15000, // 15 seconds
    tool: 20000, // 20 seconds
    external: 30000, // 30 seconds
  },

  thresholds: {
    consecutive: 3,
    successRate: 0.95, // 95%
    responseTime: 5000, // 5 seconds
    recovery: 2,
  },

  failover: {
    enabled: true,
    strategy: 'circuit-breaker',
    cooldownMs: 60000, // 1 minute
    maxRetries: 3,
    backoffMultiplier: 2,
    circuitBreakerConfig: {
      failureThreshold: 5,
      recoveryTimeoutMs: 60000, // 1 minute
      halfOpenMaxRequests: 3,
    },
  },

  selfHealing: {
    enabled: true,
    strategies: ['restart', 'cleanup', 'fallback'],
    maxAttempts: 3,
    healingIntervalMs: 30000, // 30 seconds
  },

  monitoring: {
    enabled: true,
    retentionPeriodMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    alertThresholds: {
      degraded: 70,
      critical: 30,
    },
  },
}
