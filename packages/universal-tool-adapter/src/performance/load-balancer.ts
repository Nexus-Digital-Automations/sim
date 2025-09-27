/**
 * Advanced Load Balancing System for Tool Adapters
 *
 * Provides intelligent load distribution with:
 * - Multiple load balancing algorithms (round-robin, least-connections, weighted, geographic)
 * - Dynamic weight adjustment based on performance metrics
 * - Health-aware routing with automatic failover
 * - Session affinity and sticky sessions
 * - Real-time performance monitoring and adjustment
 * - Geographic distribution and latency optimization
 * - Circuit breaker integration for failing instances
 *
 * @author Performance & Monitoring Agent
 * @version 2.0.0
 */

import { EventEmitter } from 'events'
import { createLogger } from '../utils/logger'

const logger = createLogger('LoadBalancer')

export interface LoadBalancerConfig {
  // Load balancing strategy
  strategy: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash' | 'geographic' | 'custom'

  // Health checking
  healthCheck: {
    enabled: boolean
    intervalMs: number
    timeoutMs: number
    failureThreshold: number
    recoveryThreshold: number
    endpoint?: string
  }

  // Session affinity
  sessionAffinity: {
    enabled: boolean
    strategy: 'cookie' | 'ip-hash' | 'header'
    ttlSeconds: number
    cookieName?: string
    headerName?: string
  }

  // Performance monitoring
  monitoring: {
    enabled: boolean
    metricsIntervalMs: number
    performanceWeightingEnabled: boolean
    latencyWeightFactor: number
    throughputWeightFactor: number
    errorRateWeightFactor: number
  }

  // Circuit breaker integration
  circuitBreaker: {
    enabled: boolean
    failureThreshold: number
    recoveryTimeoutMs: number
    halfOpenMaxRequests: number
  }

  // Geographic distribution
  geographic: {
    enabled: boolean
    regions: string[]
    latencyThresholdMs: number
    preferLocalRegion: boolean
  }

  // Connection management
  connections: {
    maxConnectionsPerInstance: number
    connectionTimeoutMs: number
    keepAliveEnabled: boolean
    retryAttempts: number
    retryDelayMs: number
  }
}

export interface LoadBalancerInstance {
  id: string
  endpoint: string
  weight: number
  region?: string

  // Current state
  healthy: boolean
  available: boolean
  activeConnections: number

  // Performance metrics
  metrics: InstanceMetrics

  // Circuit breaker state
  circuitBreaker?: CircuitBreakerState

  // Geographic info
  geographic?: {
    region: string
    latitude: number
    longitude: number
    timezone: string
  }

  // Metadata
  metadata: Record<string, any>
}

export interface InstanceMetrics {
  // Request statistics
  totalRequests: number
  successfulRequests: number
  failedRequests: number

  // Performance metrics
  averageLatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number

  // Throughput metrics
  requestsPerSecond: number
  bytesPerSecond: number

  // Error metrics
  errorRate: number
  timeoutRate: number

  // Resource metrics
  cpuUsage?: number
  memoryUsage?: number

  // Timestamp of last update
  lastUpdated: Date
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open'
  failures: number
  lastFailureTime?: Date
  nextAttemptTime?: Date
  halfOpenRequests: number
}

export interface LoadBalancingDecision {
  instance: LoadBalancerInstance
  reason: string
  alternatives: LoadBalancerInstance[]
  sessionId?: string
  metrics: {
    selectionTimeMs: number
    totalInstances: number
    healthyInstances: number
    weight: number
  }
}

export interface LoadBalancerMetrics {
  // Overall statistics
  totalRequests: number
  totalFailures: number
  averageSelectionTimeMs: number

  // Instance distribution
  requestDistribution: Record<string, number>
  latencyDistribution: Record<string, number>

  // Health statistics
  healthyInstances: number
  totalInstances: number

  // Session statistics
  activeSessions: number
  sessionAffinityHitRate: number

  // Performance metrics
  overallLatency: number
  overallThroughput: number
  overallErrorRate: number
}

export class AdvancedLoadBalancer extends EventEmitter {
  private instances = new Map<string, LoadBalancerInstance>()
  private sessionMap = new Map<string, string>() // sessionId -> instanceId
  private customStrategy?: LoadBalancingStrategy

  private metricsCollector: MetricsCollector
  private healthChecker: HealthChecker
  private performanceWeightCalculator: PerformanceWeightCalculator

  private metricsInterval: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private cleanupInterval: NodeJS.Timeout | null = null
  private roundRobinIndex = 0
  private requestCounter: number = 0 // TODO: Track total requests processed

  constructor(private config: LoadBalancerConfig) {
    super()

    this.metricsCollector = new MetricsCollector()
    this.healthChecker = new HealthChecker(config.healthCheck)
    this.performanceWeightCalculator = new PerformanceWeightCalculator(config.monitoring)

    this.initialize()
  }

  /**
   * Register a new instance with the load balancer
   */
  registerInstance(
    instance: Omit<LoadBalancerInstance, 'healthy' | 'available' | 'activeConnections' | 'metrics'>
  ): void {
    const fullInstance: LoadBalancerInstance = {
      ...instance,
      healthy: true,
      available: true,
      activeConnections: 0,
      metrics: this.createInitialMetrics(),
    }

    // Initialize circuit breaker if enabled
    if (this.config.circuitBreaker.enabled) {
      fullInstance.circuitBreaker = {
        state: 'closed',
        failures: 0,
        halfOpenRequests: 0,
      }
    }

    this.instances.set(instance.id, fullInstance)

    logger.info('Instance registered', {
      instanceId: instance.id,
      endpoint: instance.endpoint,
      weight: instance.weight,
      region: instance.region,
    })

    this.emit('instanceRegistered', fullInstance)
  }

  /**
   * Unregister an instance from the load balancer
   */
  unregisterInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      return false
    }

    // Remove session mappings for this instance
    for (const [sessionId, mappedInstanceId] of this.sessionMap.entries()) {
      if (mappedInstanceId === instanceId) {
        this.sessionMap.delete(sessionId)
      }
    }

    this.instances.delete(instanceId)

    logger.info('Instance unregistered', { instanceId })
    this.emit('instanceUnregistered', { instanceId, instance })

    return true
  }

  /**
   * Select the best instance for a request
   */
  async selectInstance(requestContext: RequestContext = {}): Promise<LoadBalancingDecision> {
    const startTime = Date.now()

    try {
      // Get available instances
      const availableInstances = this.getAvailableInstances()

      if (availableInstances.length === 0) {
        throw new Error('No healthy instances available')
      }

      // Check for session affinity
      if (this.config.sessionAffinity.enabled && requestContext.sessionId) {
        const sessionInstance = this.getSessionAffinityInstance(
          requestContext.sessionId,
          availableInstances
        )

        if (sessionInstance) {
          const decision = this.createDecision(
            sessionInstance,
            'session-affinity',
            availableInstances,
            startTime,
            requestContext.sessionId
          )

          this.recordSelection(decision)
          return decision
        }
      }

      // Apply load balancing strategy
      const selectedInstance = await this.applyLoadBalancingStrategy(
        availableInstances,
        requestContext
      )

      // Update session mapping if session affinity is enabled
      if (this.config.sessionAffinity.enabled && requestContext.sessionId) {
        this.updateSessionMapping(requestContext.sessionId, selectedInstance.id)
      }

      const decision = this.createDecision(
        selectedInstance,
        this.config.strategy,
        availableInstances,
        startTime,
        requestContext.sessionId
      )

      this.recordSelection(decision)
      return decision
    } catch (error) {
      logger.error('Instance selection failed', {
        error: error instanceof Error ? error.message : String(error),
        availableInstances: this.getAvailableInstances().length,
        totalInstances: this.instances.size,
      })

      throw error
    }
  }

  /**
   * Update instance metrics
   */
  updateInstanceMetrics(instanceId: string, metrics: Partial<InstanceMetrics>): void {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      logger.warn('Cannot update metrics for unknown instance', { instanceId })
      return
    }

    // Merge metrics
    instance.metrics = {
      ...instance.metrics,
      ...metrics,
      lastUpdated: new Date(),
    }

    // Update performance-based weights if enabled
    if (this.config.monitoring.performanceWeightingEnabled) {
      const newWeight = this.performanceWeightCalculator.calculateWeight(instance.metrics)
      instance.weight = newWeight
    }

    // Update circuit breaker state
    if (instance.circuitBreaker) {
      this.updateCircuitBreaker(instance, metrics)
    }

    this.emit('metricsUpdated', { instanceId, metrics: instance.metrics })
  }

  /**
   * Get current load balancer metrics
   */
  getMetrics(): LoadBalancerMetrics {
    return this.metricsCollector.getMetrics(this.instances, this.sessionMap)
  }

  /**
   * Get instance status
   */
  getInstanceStatus(instanceId?: string): LoadBalancerInstance[] {
    if (instanceId) {
      const instance = this.instances.get(instanceId)
      return instance ? [instance] : []
    }

    return Array.from(this.instances.values())
  }

  /**
   * Force instance health state
   */
  setInstanceHealth(instanceId: string, healthy: boolean, reason?: string): boolean {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      return false
    }

    const previousHealth = instance.healthy
    instance.healthy = healthy
    instance.available = healthy

    if (previousHealth !== healthy) {
      logger.info('Instance health changed', {
        instanceId,
        healthy,
        reason,
        endpoint: instance.endpoint,
      })

      this.emit('instanceHealthChanged', {
        instanceId,
        healthy,
        reason,
        instance,
      })
    }

    return true
  }

  /**
   * Set custom load balancing strategy
   */
  setCustomStrategy(strategy: LoadBalancingStrategy): void {
    this.customStrategy = strategy
    logger.info('Custom load balancing strategy set')
  }

  /**
   * Get session affinity information
   */
  getSessionInfo(sessionId: string): { instanceId?: string; ttl?: number } | null {
    const instanceId = this.sessionMap.get(sessionId)
    if (!instanceId) {
      return null
    }

    // Calculate TTL (simplified - in practice would track session creation time)
    const ttl = this.config.sessionAffinity.ttlSeconds * 1000

    return { instanceId, ttl }
  }

  /**
   * Shutdown the load balancer
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down load balancer')

    // Stop intervals
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    // Wait for any ongoing operations to complete
    await new Promise((resolve) => setTimeout(resolve, 1000))

    this.emit('shutdown')
    logger.info('Load balancer shutdown complete')
  }

  /**
   * Private implementation methods
   */

  private initialize(): void {
    logger.info('Initializing load balancer', {
      strategy: this.config.strategy,
      sessionAffinity: this.config.sessionAffinity.enabled,
      healthCheck: this.config.healthCheck.enabled,
      performanceWeighting: this.config.monitoring.performanceWeightingEnabled,
    })

    // Start health checking if enabled
    if (this.config.healthCheck.enabled) {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthChecks()
      }, this.config.healthCheck.intervalMs)
    }

    // Start metrics collection if enabled
    if (this.config.monitoring.enabled) {
      this.metricsInterval = setInterval(() => {
        this.collectMetrics()
      }, this.config.monitoring.metricsIntervalMs)
    }

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 300000) // Every 5 minutes

    this.emit('initialized')
  }

  private getAvailableInstances(): LoadBalancerInstance[] {
    return Array.from(this.instances.values())
      .filter((instance) => instance.healthy && instance.available)
      .filter((instance) => {
        // Check circuit breaker state
        if (instance.circuitBreaker) {
          return this.isCircuitBreakerAllowingRequests(instance.circuitBreaker)
        }
        return true
      })
      .filter((instance) => {
        // Check connection limits
        return instance.activeConnections < this.config.connections.maxConnectionsPerInstance
      })
  }

  private async applyLoadBalancingStrategy(
    instances: LoadBalancerInstance[],
    requestContext: RequestContext
  ): Promise<LoadBalancerInstance> {
    switch (this.config.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(instances)

      case 'least-connections':
        return this.selectLeastConnections(instances)

      case 'weighted':
        return this.selectWeighted(instances)

      case 'ip-hash':
        return this.selectIpHash(instances, requestContext.clientIp || '')

      case 'geographic':
        return this.selectGeographic(instances, requestContext)

      case 'custom':
        if (!this.customStrategy) {
          throw new Error('Custom strategy not configured')
        }
        return this.customStrategy.selectInstance(instances, requestContext)

      default:
        throw new Error(`Unknown load balancing strategy: ${this.config.strategy}`)
    }
  }

  private selectRoundRobin(instances: LoadBalancerInstance[]): LoadBalancerInstance {
    const instance = instances[this.roundRobinIndex % instances.length]
    this.roundRobinIndex = (this.roundRobinIndex + 1) % instances.length
    return instance
  }

  private selectLeastConnections(instances: LoadBalancerInstance[]): LoadBalancerInstance {
    return instances.reduce((selected, current) =>
      current.activeConnections < selected.activeConnections ? current : selected
    )
  }

  private selectWeighted(instances: LoadBalancerInstance[]): LoadBalancerInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0)

    if (totalWeight === 0) {
      return this.selectRoundRobin(instances)
    }

    let random = Math.random() * totalWeight

    for (const instance of instances) {
      random -= instance.weight
      if (random <= 0) {
        return instance
      }
    }

    return instances[instances.length - 1]
  }

  private selectIpHash(instances: LoadBalancerInstance[], clientIp: string): LoadBalancerInstance {
    if (!clientIp) {
      return this.selectRoundRobin(instances)
    }

    // Simple hash function
    let hash = 0
    for (let i = 0; i < clientIp.length; i++) {
      hash = ((hash << 5) - hash + clientIp.charCodeAt(i)) & 0xffffffff
    }

    const index = Math.abs(hash) % instances.length
    return instances[index]
  }

  private selectGeographic(
    instances: LoadBalancerInstance[],
    requestContext: RequestContext
  ): LoadBalancerInstance {
    if (!this.config.geographic.enabled || !requestContext.region) {
      return this.selectWeighted(instances)
    }

    // Prefer instances in the same region
    const sameRegionInstances = instances.filter(
      (instance) => instance.region === requestContext.region
    )

    if (sameRegionInstances.length > 0) {
      return this.selectWeighted(sameRegionInstances)
    }

    // Fall back to latency-based selection if geographic data is available
    if (requestContext.latitude && requestContext.longitude) {
      const sortedByDistance = instances
        .filter((instance) => instance.geographic)
        .sort((a, b) => {
          const distanceA = this.calculateDistance(
            requestContext.latitude!,
            requestContext.longitude!,
            a.geographic!.latitude,
            a.geographic!.longitude
          )
          const distanceB = this.calculateDistance(
            requestContext.latitude!,
            requestContext.longitude!,
            b.geographic!.latitude,
            b.geographic!.longitude
          )
          return distanceA - distanceB
        })

      if (sortedByDistance.length > 0) {
        return sortedByDistance[0]
      }
    }

    return this.selectWeighted(instances)
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  private getSessionAffinityInstance(
    sessionId: string,
    availableInstances: LoadBalancerInstance[]
  ): LoadBalancerInstance | null {
    const instanceId = this.sessionMap.get(sessionId)
    if (!instanceId) {
      return null
    }

    const instance = availableInstances.find((inst) => inst.id === instanceId)
    return instance || null
  }

  private updateSessionMapping(sessionId: string, instanceId: string): void {
    this.sessionMap.set(sessionId, instanceId)

    // Set TTL cleanup (simplified)
    setTimeout(() => {
      if (this.sessionMap.get(sessionId) === instanceId) {
        this.sessionMap.delete(sessionId)
      }
    }, this.config.sessionAffinity.ttlSeconds * 1000)
  }

  private createDecision(
    instance: LoadBalancerInstance,
    reason: string,
    alternatives: LoadBalancerInstance[],
    startTime: number,
    sessionId?: string
  ): LoadBalancingDecision {
    return {
      instance,
      reason,
      alternatives: alternatives.filter((alt) => alt.id !== instance.id),
      sessionId,
      metrics: {
        selectionTimeMs: Date.now() - startTime,
        totalInstances: this.instances.size,
        healthyInstances: alternatives.length,
        weight: instance.weight,
      },
    }
  }

  private recordSelection(decision: LoadBalancingDecision): void {
    this.requestCounter++

    // Update instance connection count
    decision.instance.activeConnections++

    // Record metrics
    this.metricsCollector.recordSelection(decision)

    this.emit('instanceSelected', decision)
  }

  private updateCircuitBreaker(
    instance: LoadBalancerInstance,
    metrics: Partial<InstanceMetrics>
  ): void {
    if (!instance.circuitBreaker) return

    const breaker = instance.circuitBreaker
    const errorRate = metrics.errorRate || instance.metrics.errorRate

    // Check for failures
    if (errorRate > 0.1) {
      // 10% error rate threshold
      breaker.failures++
      breaker.lastFailureTime = new Date()

      if (
        breaker.state === 'closed' &&
        breaker.failures >= this.config.circuitBreaker.failureThreshold
      ) {
        breaker.state = 'open'
        breaker.nextAttemptTime = new Date(
          Date.now() + this.config.circuitBreaker.recoveryTimeoutMs
        )

        logger.warn('Circuit breaker opened', {
          instanceId: instance.id,
          failures: breaker.failures,
        })

        this.emit('circuitBreakerOpened', { instanceId: instance.id, instance })
      }
    } else {
      // Reset failures on success
      if (breaker.state === 'half-open') {
        breaker.halfOpenRequests++

        if (breaker.halfOpenRequests >= this.config.circuitBreaker.halfOpenMaxRequests) {
          breaker.state = 'closed'
          breaker.failures = 0
          breaker.halfOpenRequests = 0

          logger.info('Circuit breaker closed', { instanceId: instance.id })
          this.emit('circuitBreakerClosed', { instanceId: instance.id, instance })
        }
      } else {
        breaker.failures = Math.max(0, breaker.failures - 1)
      }
    }
  }

  private isCircuitBreakerAllowingRequests(breaker: CircuitBreakerState): boolean {
    const now = Date.now()

    switch (breaker.state) {
      case 'closed':
        return true

      case 'open':
        if (breaker.nextAttemptTime && now >= breaker.nextAttemptTime.getTime()) {
          breaker.state = 'half-open'
          breaker.halfOpenRequests = 0
          return true
        }
        return false

      case 'half-open':
        return breaker.halfOpenRequests < this.config.circuitBreaker.halfOpenMaxRequests

      default:
        return false
    }
  }

  private async performHealthChecks(): Promise<void> {
    const instances = Array.from(this.instances.values())

    const healthCheckPromises = instances.map(async (instance) => {
      try {
        const isHealthy = await this.healthChecker.checkInstance(instance)

        if (instance.healthy !== isHealthy) {
          this.setInstanceHealth(instance.id, isHealthy, 'health-check')
        }
      } catch (error) {
        logger.error('Health check failed', {
          instanceId: instance.id,
          error: error instanceof Error ? error.message : String(error),
        })

        this.setInstanceHealth(
          instance.id,
          false,
          `health-check-error: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    })

    await Promise.allSettled(healthCheckPromises)
  }

  private collectMetrics(): void {
    // Update overall metrics
    const metrics = this.getMetrics()

    this.emit('metricsCollected', {
      timestamp: new Date(),
      metrics,
    })
  }

  private cleanup(): void {
    // Clean up old session mappings
    const now = Date.now()
    const sessionTtlMs = this.config.sessionAffinity.ttlSeconds * 1000

    // Note: In a real implementation, we'd track session creation times
    // This is a simplified cleanup

    logger.debug('Cleanup completed', {
      totalInstances: this.instances.size,
      activeSessions: this.sessionMap.size,
    })
  }

  private createInitialMetrics(): InstanceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      requestsPerSecond: 0,
      bytesPerSecond: 0,
      errorRate: 0,
      timeoutRate: 0,
      lastUpdated: new Date(),
    }
  }
}

/**
 * Request context interface
 */
export interface RequestContext {
  sessionId?: string
  clientIp?: string
  userAgent?: string
  region?: string
  latitude?: number
  longitude?: number
  priority?: number
  metadata?: Record<string, any>
}

/**
 * Custom load balancing strategy interface
 */
export interface LoadBalancingStrategy {
  selectInstance(
    instances: LoadBalancerInstance[],
    requestContext: RequestContext
  ): Promise<LoadBalancerInstance>
}

/**
 * Metrics collector for load balancer
 */
class MetricsCollector {
  private totalSelections = 0
  private totalFailures = 0
  private selectionTimes: number[] = []
  private requestDistribution = new Map<string, number>()
  private lastMetricsReset: number = Date.now() // TODO: Track last metrics reset timestamp

  recordSelection(decision: LoadBalancingDecision): void {
    this.totalSelections++

    // Record selection time
    this.selectionTimes.push(decision.metrics.selectionTimeMs)
    if (this.selectionTimes.length > 1000) {
      this.selectionTimes.shift()
    }

    // Record request distribution
    const instanceId = decision.instance.id
    this.requestDistribution.set(instanceId, (this.requestDistribution.get(instanceId) || 0) + 1)
  }

  recordFailure(): void {
    this.totalFailures++
  }

  getMetrics(
    instances: Map<string, LoadBalancerInstance>,
    sessionMap: Map<string, string>
  ): LoadBalancerMetrics {
    const healthyInstances = Array.from(instances.values()).filter((inst) => inst.healthy).length

    const averageSelectionTime =
      this.selectionTimes.length > 0
        ? this.selectionTimes.reduce((sum, time) => sum + time, 0) / this.selectionTimes.length
        : 0

    const requestDistribution: Record<string, number> = {}
    for (const [instanceId, count] of this.requestDistribution.entries()) {
      requestDistribution[instanceId] = count
    }

    // Calculate session affinity hit rate
    const totalSessions = sessionMap.size
    const sessionAffinityHitRate = totalSessions > 0 ? totalSessions / this.totalSelections : 0

    // Calculate overall performance metrics
    const allInstances = Array.from(instances.values())
    const overallLatency =
      allInstances.length > 0
        ? allInstances.reduce((sum, inst) => sum + inst.metrics.averageLatencyMs, 0) /
          allInstances.length
        : 0

    const overallThroughput = allInstances.reduce(
      (sum, inst) => sum + inst.metrics.requestsPerSecond,
      0
    )
    const overallErrorRate =
      allInstances.length > 0
        ? allInstances.reduce((sum, inst) => sum + inst.metrics.errorRate, 0) / allInstances.length
        : 0

    return {
      totalRequests: this.totalSelections,
      totalFailures: this.totalFailures,
      averageSelectionTimeMs: averageSelectionTime,
      requestDistribution,
      latencyDistribution: {},
      healthyInstances,
      totalInstances: instances.size,
      activeSessions: sessionMap.size,
      sessionAffinityHitRate,
      overallLatency,
      overallThroughput,
      overallErrorRate,
    }
  }

  reset(): void {
    this.totalSelections = 0
    this.totalFailures = 0
    this.selectionTimes = []
    this.requestDistribution.clear()
    this.lastMetricsReset = Date.now()
  }
}

/**
 * Health checker for instances
 */
class HealthChecker {
  constructor(private config: LoadBalancerConfig['healthCheck']) {}

  async checkInstance(instance: LoadBalancerInstance): Promise<boolean> {
    if (!this.config.enabled) {
      return true
    }

    try {
      // Simple health check - could be enhanced with actual HTTP requests
      const response = await this.performHealthCheck(instance.endpoint)
      return response.status === 'healthy'
    } catch (error) {
      logger.debug('Health check failed', {
        instanceId: instance.id,
        endpoint: instance.endpoint,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  private async performHealthCheck(endpoint: string): Promise<{ status: string }> {
    // Mock health check - in real implementation would make HTTP request
    const mockSuccess = Math.random() > 0.1 // 90% success rate

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (mockSuccess) {
          resolve({ status: 'healthy' })
        } else {
          reject(new Error('Health check failed'))
        }
      }, Math.random() * 100) // Random latency up to 100ms
    })
  }
}

/**
 * Performance-based weight calculator
 */
class PerformanceWeightCalculator {
  constructor(private config: LoadBalancerConfig['monitoring']) {}

  calculateWeight(metrics: InstanceMetrics): number {
    if (!this.config.performanceWeightingEnabled) {
      return 1
    }

    let weight = 1

    // Adjust based on latency (lower latency = higher weight)
    const latencyFactor = this.config.latencyWeightFactor
    if (metrics.averageLatencyMs > 0) {
      weight *= Math.max(0.1, 1 - (metrics.averageLatencyMs / 1000) * latencyFactor)
    }

    // Adjust based on throughput (higher throughput = higher weight)
    const throughputFactor = this.config.throughputWeightFactor
    if (metrics.requestsPerSecond > 0) {
      weight *= 1 + (metrics.requestsPerSecond / 100) * throughputFactor
    }

    // Adjust based on error rate (lower error rate = higher weight)
    const errorFactor = this.config.errorRateWeightFactor
    weight *= Math.max(0.1, 1 - metrics.errorRate * errorFactor)

    return Math.max(0.1, Math.min(10, weight)) // Clamp between 0.1 and 10
  }
}

// Default configuration
export const DEFAULT_LOAD_BALANCER_CONFIG: LoadBalancerConfig = {
  strategy: 'round-robin',

  healthCheck: {
    enabled: true,
    intervalMs: 30000, // 30 seconds
    timeoutMs: 5000, // 5 seconds
    failureThreshold: 3,
    recoveryThreshold: 2,
    endpoint: '/health',
  },

  sessionAffinity: {
    enabled: false,
    strategy: 'cookie',
    ttlSeconds: 3600, // 1 hour
    cookieName: 'lb-session',
  },

  monitoring: {
    enabled: true,
    metricsIntervalMs: 60000, // 1 minute
    performanceWeightingEnabled: true,
    latencyWeightFactor: 0.5,
    throughputWeightFactor: 0.3,
    errorRateWeightFactor: 2.0,
  },

  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    recoveryTimeoutMs: 60000, // 1 minute
    halfOpenMaxRequests: 3,
  },

  geographic: {
    enabled: false,
    regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
    latencyThresholdMs: 100,
    preferLocalRegion: true,
  },

  connections: {
    maxConnectionsPerInstance: 1000,
    connectionTimeoutMs: 30000, // 30 seconds
    keepAliveEnabled: true,
    retryAttempts: 3,
    retryDelayMs: 1000,
  },
}
