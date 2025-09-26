/**
 * Advanced Connection Pooling System for Tool Adapters
 *
 * Provides intelligent connection management for external APIs with:
 * - Multiple connection pool strategies (round-robin, least-connections, weighted)
 * - Health monitoring and automatic failover
 * - Circuit breaker pattern implementation
 * - Connection lifecycle management
 * - Resource optimization and metrics
 *
 * @author Performance & Monitoring Agent
 * @version 2.0.0
 */

import { EventEmitter } from 'events'
import { createLogger } from '../utils/logger'

const logger = createLogger('ConnectionPoolSystem')

export interface ConnectionPoolConfig {
  poolName: string
  minConnections: number
  maxConnections: number
  acquireTimeoutMs: number
  idleTimeoutMs: number
  maxLifetimeMs: number
  strategy: 'round-robin' | 'least-connections' | 'random' | 'weighted'
  healthCheck: {
    enabled: boolean
    intervalMs: number
    timeoutMs: number
    maxFailures: number
  }
  circuitBreaker: {
    enabled: boolean
    failureThreshold: number
    recoveryTimeoutMs: number
    halfOpenMaxRequests: number
  }
  retry: {
    enabled: boolean
    maxAttempts: number
    backoffMs: number
    jitter: boolean
  }
  metrics: {
    enabled: boolean
    historySize: number
  }
}

export interface ConnectionMetrics {
  poolName: string
  totalConnections: number
  activeConnections: number
  idleConnections: number
  pendingRequests: number
  totalAcquired: number
  totalReleased: number
  totalCreated: number
  totalDestroyed: number
  averageAcquireTimeMs: number
  averageConnectionLifetimeMs: number
  errorCount: number
  circuitBreakerState: 'closed' | 'open' | 'half-open'
  healthScore: number
}

export interface Connection {
  id: string
  created: Date
  lastUsed: Date
  usageCount: number
  isHealthy: boolean
  metadata: Record<string, any>
  execute<T>(operation: (conn: Connection) => Promise<T>): Promise<T>
  close(): Promise<void>
}

export class AdvancedConnectionPool extends EventEmitter {
  private connections = new Set<PooledConnection>()
  private availableConnections: PooledConnection[] = []
  private pendingAcquisitions: Array<{
    resolve: (conn: PooledConnection) => void
    reject: (error: Error) => void
    timestamp: number
  }> = []

  private circuitBreaker: CircuitBreaker
  private healthChecker: HealthChecker
  private metricsCollector: MetricsCollector
  private cleanupInterval: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null

  private isShuttingDown = false
  private creationInProgress = 0

  constructor(
    private config: ConnectionPoolConfig,
    private connectionFactory: ConnectionFactory
  ) {
    super()

    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker, this)
    this.healthChecker = new HealthChecker(config.healthCheck, this)
    this.metricsCollector = new MetricsCollector(config.metrics, config.poolName)

    this.initialize()
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<PooledConnection> {
    if (this.isShuttingDown) {
      throw new Error(`Pool ${this.config.poolName} is shutting down`)
    }

    // Check circuit breaker
    if (!this.circuitBreaker.allowRequest()) {
      throw new Error(`Circuit breaker is open for pool ${this.config.poolName}`)
    }

    const startTime = Date.now()

    try {
      const connection = await this.acquireConnection()

      const acquireTime = Date.now() - startTime
      this.metricsCollector.recordAcquisition(acquireTime, true)
      this.circuitBreaker.onSuccess()

      logger.debug('Connection acquired successfully', {
        poolName: this.config.poolName,
        connectionId: connection.id,
        acquireTimeMs: acquireTime,
        totalConnections: this.connections.size,
        availableConnections: this.availableConnections.length,
      })

      return connection
    } catch (error) {
      const acquireTime = Date.now() - startTime
      this.metricsCollector.recordAcquisition(acquireTime, false)
      this.circuitBreaker.onFailure()

      logger.error('Failed to acquire connection', {
        poolName: this.config.poolName,
        error: error instanceof Error ? error.message : String(error),
        acquireTimeMs: acquireTime,
      })

      throw error
    }
  }

  /**
   * Release a connection back to the pool
   */
  async release(connection: PooledConnection): Promise<void> {
    if (!this.connections.has(connection)) {
      logger.warn('Attempted to release unknown connection', {
        poolName: this.config.poolName,
        connectionId: connection.id,
      })
      return
    }

    try {
      connection.lastUsed = new Date()
      connection.isActive = false

      // Check if connection is still healthy
      if (connection.isHealthy && !this.shouldDestroyConnection(connection)) {
        this.availableConnections.push(connection)
        this.processPendingAcquisitions()

        logger.debug('Connection released to pool', {
          poolName: this.config.poolName,
          connectionId: connection.id,
          availableConnections: this.availableConnections.length,
        })
      } else {
        await this.destroyConnection(connection)
        this.maintainMinConnections()
      }

      this.metricsCollector.recordRelease()
    } catch (error) {
      logger.error('Error releasing connection', {
        poolName: this.config.poolName,
        connectionId: connection.id,
        error: error instanceof Error ? error.message : String(error),
      })

      await this.destroyConnection(connection)
    }
  }

  /**
   * Get current pool metrics
   */
  getMetrics(): ConnectionMetrics {
    const baseMetrics = this.metricsCollector.getMetrics()

    return {
      ...baseMetrics,
      totalConnections: this.connections.size,
      activeConnections: this.getActiveConnectionCount(),
      idleConnections: this.availableConnections.length,
      pendingRequests: this.pendingAcquisitions.length,
      circuitBreakerState: this.circuitBreaker.getState(),
      healthScore: this.calculateHealthScore(),
    }
  }

  /**
   * Get pool statistics for monitoring
   */
  getStatistics() {
    const metrics = this.getMetrics()

    return {
      poolName: this.config.poolName,
      utilization: {
        connectionUtilization: (metrics.activeConnections / metrics.totalConnections) * 100,
        poolCapacityUtilization: (metrics.totalConnections / this.config.maxConnections) * 100,
      },
      performance: {
        averageAcquireTimeMs: metrics.averageAcquireTimeMs,
        averageConnectionLifetimeMs: metrics.averageConnectionLifetimeMs,
        throughput: this.calculateThroughput(),
      },
      health: {
        score: metrics.healthScore,
        circuitBreakerState: metrics.circuitBreakerState,
        errorRate: this.calculateErrorRate(),
      },
      capacity: {
        total: metrics.totalConnections,
        active: metrics.activeConnections,
        idle: metrics.idleConnections,
        pending: metrics.pendingRequests,
        max: this.config.maxConnections,
      },
    }
  }

  /**
   * Force health check on all connections
   */
  async healthCheck(): Promise<void> {
    logger.info('Starting manual health check', { poolName: this.config.poolName })
    await this.healthChecker.checkAllConnections([...this.connections])
  }

  /**
   * Resize the pool (add/remove connections)
   */
  async resize(newMinConnections: number, newMaxConnections: number): Promise<void> {
    logger.info('Resizing connection pool', {
      poolName: this.config.poolName,
      currentMin: this.config.minConnections,
      currentMax: this.config.maxConnections,
      newMin: newMinConnections,
      newMax: newMaxConnections,
    })

    this.config.minConnections = newMinConnections
    this.config.maxConnections = newMaxConnections

    // Add connections if needed
    if (this.connections.size < newMinConnections) {
      await this.maintainMinConnections()
    }

    // Remove excess connections if needed
    if (this.connections.size > newMaxConnections) {
      await this.removeExcessConnections(this.connections.size - newMaxConnections)
    }
  }

  /**
   * Shutdown the pool gracefully
   */
  async shutdown(timeoutMs = 30000): Promise<void> {
    logger.info('Shutting down connection pool', {
      poolName: this.config.poolName,
      timeoutMs,
    })

    this.isShuttingDown = true

    // Stop intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // Reject pending acquisitions
    for (const pending of this.pendingAcquisitions) {
      pending.reject(new Error('Pool is shutting down'))
    }
    this.pendingAcquisitions.length = 0

    // Wait for active connections to finish or timeout
    const shutdownPromise = this.waitForActiveConnections()
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout')), timeoutMs)
    })

    try {
      await Promise.race([shutdownPromise, timeoutPromise])
    } catch (error) {
      logger.warn('Shutdown timeout reached, forcing closure', {
        poolName: this.config.poolName,
      })
    }

    // Force close all connections
    await Promise.all([...this.connections].map((conn) => this.destroyConnection(conn)))

    this.emit('shutdown')
    logger.info('Connection pool shutdown complete', { poolName: this.config.poolName })
  }

  /**
   * Private implementation methods
   */

  private async initialize(): Promise<void> {
    logger.info('Initializing connection pool', {
      poolName: this.config.poolName,
      minConnections: this.config.minConnections,
      maxConnections: this.config.maxConnections,
    })

    // Create minimum connections
    await this.maintainMinConnections()

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 30000) // Every 30 seconds

    // Start health check interval
    if (this.config.healthCheck.enabled) {
      this.healthCheckInterval = setInterval(() => {
        this.healthChecker.checkAllConnections([...this.connections])
      }, this.config.healthCheck.intervalMs)
    }

    this.emit('initialized')
  }

  private async acquireConnection(): Promise<PooledConnection> {
    // Try to get available connection first
    let connection = this.selectAvailableConnection()

    if (connection) {
      this.prepareConnectionForUse(connection)
      return connection
    }

    // Create new connection if under limit
    if (this.connections.size + this.creationInProgress < this.config.maxConnections) {
      connection = await this.createConnection()
      this.prepareConnectionForUse(connection)
      return connection
    }

    // Wait for available connection
    return this.waitForAvailableConnection()
  }

  private selectAvailableConnection(): PooledConnection | null {
    if (this.availableConnections.length === 0) {
      return null
    }

    switch (this.config.strategy) {
      case 'round-robin':
        return this.availableConnections.shift()!

      case 'least-connections':
        return this.availableConnections.sort((a, b) => a.usageCount - b.usageCount)[0] || null

      case 'random': {
        const randomIndex = Math.floor(Math.random() * this.availableConnections.length)
        return this.availableConnections.splice(randomIndex, 1)[0] || null
      }

      case 'weighted': {
        // Simple weighted selection based on inverse usage count
        const weights = this.availableConnections.map((conn) => 1 / (conn.usageCount + 1))
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
        const random = Math.random() * totalWeight

        let weightSum = 0
        for (let i = 0; i < this.availableConnections.length; i++) {
          weightSum += weights[i]
          if (random <= weightSum) {
            return this.availableConnections.splice(i, 1)[0] || null
          }
        }

        return this.availableConnections.shift()!
      }

      default:
        return this.availableConnections.shift()!
    }
  }

  private prepareConnectionForUse(connection: PooledConnection): void {
    connection.isActive = true
    connection.lastUsed = new Date()
    connection.usageCount++
  }

  private async waitForAvailableConnection(): Promise<PooledConnection> {
    return new Promise<PooledConnection>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pendingAcquisitions.findIndex((p) => p.resolve === resolve)
        if (index >= 0) {
          this.pendingAcquisitions.splice(index, 1)
        }
        reject(new Error(`Connection acquisition timeout after ${this.config.acquireTimeoutMs}ms`))
      }, this.config.acquireTimeoutMs)

      this.pendingAcquisitions.push({
        resolve: (conn) => {
          clearTimeout(timeout)
          resolve(conn)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        },
        timestamp: Date.now(),
      })
    })
  }

  private processPendingAcquisitions(): void {
    while (this.pendingAcquisitions.length > 0 && this.availableConnections.length > 0) {
      const pending = this.pendingAcquisitions.shift()!
      const connection = this.selectAvailableConnection()!

      this.prepareConnectionForUse(connection)
      pending.resolve(connection)
    }
  }

  private async createConnection(): Promise<PooledConnection> {
    this.creationInProgress++

    try {
      const baseConnection = await this.connectionFactory.create()
      const pooledConnection = new PooledConnection(baseConnection, this.config.poolName)

      this.connections.add(pooledConnection)
      this.metricsCollector.recordCreation()

      logger.debug('New connection created', {
        poolName: this.config.poolName,
        connectionId: pooledConnection.id,
        totalConnections: this.connections.size,
      })

      return pooledConnection
    } finally {
      this.creationInProgress--
    }
  }

  private async destroyConnection(connection: PooledConnection): Promise<void> {
    try {
      this.connections.delete(connection)

      // Remove from available connections if present
      const availableIndex = this.availableConnections.indexOf(connection)
      if (availableIndex >= 0) {
        this.availableConnections.splice(availableIndex, 1)
      }

      await connection.close()
      this.metricsCollector.recordDestruction()

      logger.debug('Connection destroyed', {
        poolName: this.config.poolName,
        connectionId: connection.id,
        totalConnections: this.connections.size,
      })
    } catch (error) {
      logger.error('Error destroying connection', {
        poolName: this.config.poolName,
        connectionId: connection.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private shouldDestroyConnection(connection: PooledConnection): boolean {
    const now = Date.now()
    const age = now - connection.created.getTime()
    const idleTime = now - connection.lastUsed.getTime()

    return (
      !connection.isHealthy ||
      age > this.config.maxLifetimeMs ||
      idleTime > this.config.idleTimeoutMs
    )
  }

  private async maintainMinConnections(): Promise<void> {
    const needed = this.config.minConnections - this.connections.size - this.creationInProgress

    if (needed > 0) {
      const creationPromises = Array.from({ length: needed }, () => this.createConnection())

      try {
        const connections = await Promise.all(creationPromises)
        this.availableConnections.push(...connections)
      } catch (error) {
        logger.error('Failed to maintain minimum connections', {
          poolName: this.config.poolName,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  private async removeExcessConnections(count: number): Promise<void> {
    const toRemove = this.availableConnections.splice(
      0,
      Math.min(count, this.availableConnections.length)
    )

    await Promise.all(toRemove.map((conn) => this.destroyConnection(conn)))
  }

  private cleanup(): void {
    const now = Date.now()
    const connectionsToDestroy: PooledConnection[] = []

    // Find connections that should be destroyed
    for (const connection of this.connections) {
      if (!connection.isActive && this.shouldDestroyConnection(connection)) {
        connectionsToDestroy.push(connection)
      }
    }

    // Destroy them
    for (const connection of connectionsToDestroy) {
      this.destroyConnection(connection)
    }

    // Clean up timed out pending acquisitions
    this.pendingAcquisitions = this.pendingAcquisitions.filter((pending) => {
      const timedOut = now - pending.timestamp > this.config.acquireTimeoutMs
      if (timedOut) {
        pending.reject(new Error('Acquisition timeout during cleanup'))
      }
      return !timedOut
    })

    // Maintain minimum connections
    this.maintainMinConnections()
  }

  private getActiveConnectionCount(): number {
    return [...this.connections].filter((conn) => conn.isActive).length
  }

  private calculateHealthScore(): number {
    if (this.connections.size === 0) return 100

    const healthyConnections = [...this.connections].filter((conn) => conn.isHealthy).length
    return (healthyConnections / this.connections.size) * 100
  }

  private calculateThroughput(): number {
    // Calculate requests per second over the last minute
    return this.metricsCollector.calculateThroughput()
  }

  private calculateErrorRate(): number {
    const metrics = this.metricsCollector.getMetrics()
    const totalRequests = metrics.totalAcquired ?? 0
    const errorCount = metrics.errorCount ?? 0
    return totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0
  }

  private async waitForActiveConnections(): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkActive = () => {
        if (this.getActiveConnectionCount() === 0) {
          resolve()
        } else {
          setTimeout(checkActive, 100)
        }
      }
      checkActive()
    })
  }
}

/**
 * Pooled connection wrapper
 */
class PooledConnection implements Connection {
  public isActive = false
  public isHealthy = true
  public usageCount = 0
  public lastUsed = new Date()

  constructor(
    private baseConnection: Connection,
    private poolName: string
  ) {}

  get id(): string {
    return this.baseConnection.id
  }

  get created(): Date {
    return this.baseConnection.created
  }

  get metadata(): Record<string, any> {
    return this.baseConnection.metadata
  }

  async execute<T>(operation: (conn: Connection) => Promise<T>): Promise<T> {
    if (!this.isHealthy) {
      throw new Error(`Connection ${this.id} is not healthy`)
    }

    try {
      const result = await this.baseConnection.execute(operation)
      this.lastUsed = new Date()
      return result
    } catch (error) {
      logger.error('Connection execution failed', {
        poolName: this.poolName,
        connectionId: this.id,
        error: error instanceof Error ? error.message : String(error),
      })
      this.isHealthy = false
      throw error
    }
  }

  async close(): Promise<void> {
    this.isHealthy = false
    await this.baseConnection.close()
  }
}

/**
 * Circuit breaker implementation
 */
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failures = 0
  private lastFailureTime = 0
  private nextAttemptTime = 0
  private halfOpenRequests = 0

  constructor(
    private config: ConnectionPoolConfig['circuitBreaker'],
    private pool: AdvancedConnectionPool
  ) {}

  allowRequest(): boolean {
    if (!this.config.enabled) return true

    const now = Date.now()

    switch (this.state) {
      case 'closed':
        return true

      case 'open':
        if (now >= this.nextAttemptTime) {
          this.state = 'half-open'
          this.halfOpenRequests = 0
          logger.info('Circuit breaker transitioning to half-open')
          return true
        }
        return false

      case 'half-open':
        return this.halfOpenRequests < this.config.halfOpenMaxRequests
    }
  }

  onSuccess(): void {
    if (!this.config.enabled) return

    if (this.state === 'half-open') {
      this.halfOpenRequests++
      if (this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
        this.state = 'closed'
        this.failures = 0
        logger.info('Circuit breaker closed after successful half-open requests')
      }
    } else {
      this.failures = 0
    }
  }

  onFailure(): void {
    if (!this.config.enabled) return

    this.failures++
    this.lastFailureTime = Date.now()

    if (this.state === 'half-open') {
      this.state = 'open'
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeoutMs
      logger.warn('Circuit breaker opened due to failure in half-open state')
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = 'open'
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeoutMs
      logger.warn('Circuit breaker opened due to failure threshold exceeded', {
        failures: this.failures,
        threshold: this.config.failureThreshold,
      })
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state
  }
}

/**
 * Health checker implementation
 */
class HealthChecker {
  constructor(
    private config: ConnectionPoolConfig['healthCheck'],
    private pool: AdvancedConnectionPool
  ) {}

  async checkAllConnections(connections: PooledConnection[]): Promise<void> {
    if (!this.config.enabled) return

    const healthChecks = connections.map((conn) => this.checkConnection(conn))
    await Promise.allSettled(healthChecks)
  }

  private async checkConnection(connection: PooledConnection): Promise<void> {
    if (connection.isActive) {
      return // Don't check active connections
    }

    try {
      // Simple health check - try to execute a no-op operation with timeout
      await Promise.race([
        connection.execute(async () => 'health-check'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), this.config.timeoutMs)
        ),
      ])

      // Reset failure count on successful health check
      connection.metadata.healthFailures = 0
      connection.isHealthy = true
    } catch (error) {
      const failures = (connection.metadata.healthFailures || 0) + 1
      connection.metadata.healthFailures = failures

      if (failures >= this.config.maxFailures) {
        connection.isHealthy = false
        logger.warn('Connection marked unhealthy after failed health checks', {
          connectionId: connection.id,
          failures,
          maxFailures: this.config.maxFailures,
        })
      }
    }
  }
}

/**
 * Metrics collector implementation
 */
class MetricsCollector {
  private totalAcquired = 0
  private totalReleased = 0
  private totalCreated = 0
  private totalDestroyed = 0
  private errorCount = 0
  private acquisitionTimes: number[] = []
  private connectionLifetimes: number[] = []
  private lastThroughputCheck = Date.now()
  private requestsInLastMinute = 0

  constructor(
    private config: ConnectionPoolConfig['metrics'],
    private poolName: string
  ) {}

  recordAcquisition(timeMs: number, success: boolean): void {
    if (!this.config.enabled) return

    this.totalAcquired++

    if (success) {
      this.acquisitionTimes.push(timeMs)
      if (this.acquisitionTimes.length > this.config.historySize) {
        this.acquisitionTimes.shift()
      }
    } else {
      this.errorCount++
    }
  }

  recordRelease(): void {
    if (!this.config.enabled) return
    this.totalReleased++
  }

  recordCreation(): void {
    if (!this.config.enabled) return
    this.totalCreated++
  }

  recordDestruction(): void {
    if (!this.config.enabled) return
    this.totalDestroyed++
  }

  getMetrics(): Pick<
    ConnectionMetrics,
    | 'poolName'
    | 'totalAcquired'
    | 'totalReleased'
    | 'totalCreated'
    | 'totalDestroyed'
    | 'errorCount'
    | 'averageAcquireTimeMs'
    | 'averageConnectionLifetimeMs'
  > {
    return {
      poolName: this.poolName,
      totalAcquired: this.totalAcquired,
      totalReleased: this.totalReleased,
      totalCreated: this.totalCreated,
      totalDestroyed: this.totalDestroyed,
      errorCount: this.errorCount,
      averageAcquireTimeMs: this.calculateAverageAcquisitionTime(),
      averageConnectionLifetimeMs: this.calculateAverageConnectionLifetime(),
    }
  }

  calculateThroughput(): number {
    const now = Date.now()
    const timeSinceLastCheck = now - this.lastThroughputCheck

    if (timeSinceLastCheck >= 60000) {
      // 1 minute
      this.requestsInLastMinute = this.totalAcquired
      this.lastThroughputCheck = now
    }

    return this.requestsInLastMinute / 60 // requests per second
  }

  private calculateAverageAcquisitionTime(): number {
    if (this.acquisitionTimes.length === 0) return 0
    return this.acquisitionTimes.reduce((sum, time) => sum + time, 0) / this.acquisitionTimes.length
  }

  private calculateAverageConnectionLifetime(): number {
    if (this.connectionLifetimes.length === 0) return 0
    return (
      this.connectionLifetimes.reduce((sum, time) => sum + time, 0) /
      this.connectionLifetimes.length
    )
  }
}

/**
 * Connection factory interface
 */
export interface ConnectionFactory {
  create(): Promise<Connection>
}

// Default configuration
export const DEFAULT_CONNECTION_POOL_CONFIG: ConnectionPoolConfig = {
  poolName: 'default',
  minConnections: 2,
  maxConnections: 10,
  acquireTimeoutMs: 10000,
  idleTimeoutMs: 300000, // 5 minutes
  maxLifetimeMs: 1800000, // 30 minutes
  strategy: 'round-robin',
  healthCheck: {
    enabled: true,
    intervalMs: 60000, // 1 minute
    timeoutMs: 5000,
    maxFailures: 3,
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    recoveryTimeoutMs: 60000, // 1 minute
    halfOpenMaxRequests: 3,
  },
  retry: {
    enabled: true,
    maxAttempts: 3,
    backoffMs: 1000,
    jitter: true,
  },
  metrics: {
    enabled: true,
    historySize: 1000,
  },
}
