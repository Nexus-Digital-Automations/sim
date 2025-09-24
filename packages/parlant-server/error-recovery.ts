/**
 * Intelligent Retry and Recovery Mechanisms
 *
 * This module provides comprehensive retry logic, circuit breakers, and adaptive recovery
 * strategies for the Universal Tool Adapter System. It includes exponential backoff,
 * jitter, failure pattern analysis, and automatic fallback mechanisms.
 */

import { createLogger } from '../../apps/sim/lib/logs/console/logger'
import { type ParlantLogContext } from './logging'
import {
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  type ErrorClassification
} from './error-taxonomy'
import { type BaseToolError } from './error-handler'
import { parlantErrorTracker } from './error-tracking'

const logger = createLogger('ErrorRecovery')

/**
 * Retry configuration for different scenarios
 */
export interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterFactor: number
  retryableErrors: ErrorCategory[]
  retryableSubcategories: string[]
  circuitBreakerThreshold: number
  circuitBreakerWindowMs: number
  adaptiveAdjustment: boolean
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing fast
  HALF_OPEN = 'half_open' // Testing recovery
}

/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  state: CircuitBreakerState
  failureCount: number
  failureThreshold: number
  lastFailureTime?: number
  nextRetryTime?: number
  successCount: number
  halfOpenMaxAttempts: number
}

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attemptNumber: number
  startTime: number
  endTime?: number
  delayMs: number
  success: boolean
  error?: Error
  recoveryStrategy?: RecoveryStrategy
}

/**
 * Recovery operation result
 */
export interface RecoveryResult {
  success: boolean
  attempts: RetryAttempt[]
  totalTime: number
  finalStrategy: RecoveryStrategy
  circuitBreakerTriggered: boolean
  fallbackUsed: boolean
  adaptiveAdjustments: AdaptiveAdjustment[]
}

/**
 * Adaptive adjustment information
 */
export interface AdaptiveAdjustment {
  type: 'timeout_increase' | 'retry_count_adjust' | 'backoff_adjust' | 'strategy_change'
  oldValue: any
  newValue: any
  reason: string
  timestamp: number
}

/**
 * Default retry configurations for different error categories
 */
export const DEFAULT_RETRY_CONFIGS: Record<string, RetryConfig> = {
  tool_execution_timeout: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    retryableErrors: [ErrorCategory.TOOL_EXECUTION, ErrorCategory.EXTERNAL_TIMEOUT],
    retryableSubcategories: ['timeout', 'connection_failed', 'service_unavailable'],
    circuitBreakerThreshold: 5,
    circuitBreakerWindowMs: 300000, // 5 minutes
    adaptiveAdjustment: true
  },

  tool_authentication: {
    maxAttempts: 2,
    initialDelayMs: 2000,
    maxDelayMs: 10000,
    backoffMultiplier: 1.5,
    jitterFactor: 0.2,
    retryableErrors: [ErrorCategory.TOOL_AUTHENTICATION],
    retryableSubcategories: ['token_expired', 'rate_limit_exceeded'],
    circuitBreakerThreshold: 3,
    circuitBreakerWindowMs: 600000, // 10 minutes
    adaptiveAdjustment: false
  },

  external_service: {
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 60000,
    backoffMultiplier: 2.5,
    jitterFactor: 0.15,
    retryableErrors: [ErrorCategory.EXTERNAL_SERVICE, ErrorCategory.EXTERNAL_TIMEOUT],
    retryableSubcategories: ['service_unavailable', 'timeout', 'api_error'],
    circuitBreakerThreshold: 10,
    circuitBreakerWindowMs: 180000, // 3 minutes
    adaptiveAdjustment: true
  },

  system_resource: {
    maxAttempts: 2,
    initialDelayMs: 5000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.3,
    retryableErrors: [ErrorCategory.SYSTEM_RESOURCE],
    retryableSubcategories: ['connection_pool_full', 'cpu_overload'],
    circuitBreakerThreshold: 3,
    circuitBreakerWindowMs: 120000, // 2 minutes
    adaptiveAdjustment: true
  },

  default: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    retryableErrors: [],
    retryableSubcategories: [],
    circuitBreakerThreshold: 5,
    circuitBreakerWindowMs: 300000,
    adaptiveAdjustment: false
  }
}

/**
 * Intelligent retry and recovery service
 */
export class ErrorRecoveryService {
  private circuitBreakers = new Map<string, CircuitBreakerStatus>()
  private retryHistory = new Map<string, RetryAttempt[]>()
  private adaptiveConfigs = new Map<string, RetryConfig>()
  private fallbackStrategies = new Map<string, FallbackStrategy>()

  constructor() {
    this.initializeFallbackStrategies()
    logger.info('Error Recovery Service initialized')
  }

  /**
   * Execute operation with intelligent retry and recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: {
      operationId: string
      component: string
      category?: ErrorCategory
      subcategory?: string
      toolName?: string
      parlantContext?: ParlantLogContext
    },
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const operationId = context.operationId
    const startTime = Date.now()

    // Get retry configuration
    const config = this.getRetryConfig(context.category, context.subcategory, customConfig)

    // Check circuit breaker
    const circuitKey = `${context.component}:${context.toolName || 'default'}`
    if (this.isCircuitBreakerOpen(circuitKey)) {
      throw new Error(`Circuit breaker is open for ${circuitKey}`)
    }

    const attempts: RetryAttempt[] = []
    const adaptiveAdjustments: AdaptiveAdjustment[] = []
    let circuitBreakerTriggered = false
    let fallbackUsed = false

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      const attemptStart = Date.now()
      const delayMs = attempt === 1 ? 0 : this.calculateDelay(attempt - 1, config)

      if (delayMs > 0) {
        logger.debug('Retry delay', { operationId, attempt, delayMs })
        await this.sleep(delayMs)
      }

      const retryAttempt: RetryAttempt = {
        attemptNumber: attempt,
        startTime: attemptStart,
        delayMs,
        success: false
      }

      try {
        const result = await operation()

        // Success - record and return
        retryAttempt.success = true
        retryAttempt.endTime = Date.now()
        attempts.push(retryAttempt)

        this.recordSuccess(circuitKey, operationId)
        this.updateAdaptiveConfig(context, config, attempts, adaptiveAdjustments, true)

        logger.info('Operation succeeded', {
          operationId,
          attempt,
          totalTime: Date.now() - startTime
        })

        return result

      } catch (error) {
        retryAttempt.error = error as Error
        retryAttempt.endTime = Date.now()
        attempts.push(retryAttempt)

        const baseError = error as BaseToolError
        const shouldRetry = this.shouldRetry(baseError, attempt, config)
        const shouldCircuitBreak = this.shouldTriggerCircuitBreaker(circuitKey, error as Error)

        logger.warn('Operation attempt failed', {
          operationId,
          attempt,
          shouldRetry,
          shouldCircuitBreak,
          error: error instanceof Error ? error.message : String(error)
        })

        // Record failure
        this.recordFailure(circuitKey, operationId, error as Error)

        // Check circuit breaker
        if (shouldCircuitBreak) {
          this.openCircuitBreaker(circuitKey)
          circuitBreakerTriggered = true
          break
        }

        // If this is the last attempt or we shouldn't retry, try fallback
        if (!shouldRetry || attempt === config.maxAttempts) {
          const fallbackResult = await this.attemptFallback(
            context, error as Error, attempts, config
          )

          if (fallbackResult.success) {
            fallbackUsed = true
            this.updateAdaptiveConfig(context, config, attempts, adaptiveAdjustments, true)
            return fallbackResult.result as T
          }

          // Update adaptive configuration for failure
          this.updateAdaptiveConfig(context, config, attempts, adaptiveAdjustments, false)
          throw error
        }
      }
    }

    // All attempts failed
    const lastError = attempts[attempts.length - 1]?.error
    this.updateAdaptiveConfig(context, config, attempts, adaptiveAdjustments, false)

    throw lastError || new Error('All retry attempts failed')
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = Math.min(
      config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelayMs
    )

    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * config.jitterFactor * Math.random()
    const finalDelay = exponentialDelay + jitter

    return Math.round(finalDelay)
  }

  /**
   * Determine if operation should be retried
   */
  private shouldRetry(error: BaseToolError, attempt: number, config: RetryConfig): boolean {
    // Check if we've reached max attempts
    if (attempt >= config.maxAttempts) {
      return false
    }

    // Check if error category is retryable
    if (config.retryableErrors.length > 0 && !config.retryableErrors.includes(error.category)) {
      return false
    }

    // Check if error subcategory is retryable
    if (config.retryableSubcategories.length > 0 &&
        !config.retryableSubcategories.includes(error.subcategory)) {
      return false
    }

    // Check error severity - don't retry fatal errors
    if (error.severity === ErrorSeverity.FATAL) {
      return false
    }

    // Check recovery strategy
    return error.recoveryStrategy === RecoveryStrategy.RETRY ||
           error.recoveryStrategy === RecoveryStrategy.CIRCUIT_BREAKER
  }

  /**
   * Circuit breaker management
   */
  private isCircuitBreakerOpen(circuitKey: string): boolean {
    const breaker = this.circuitBreakers.get(circuitKey)
    if (!breaker) return false

    if (breaker.state === CircuitBreakerState.CLOSED) return false
    if (breaker.state === CircuitBreakerState.HALF_OPEN) return false

    // Check if circuit breaker should transition to half-open
    const now = Date.now()
    if (breaker.nextRetryTime && now >= breaker.nextRetryTime) {
      this.setCircuitBreakerHalfOpen(circuitKey)
      return false
    }

    return true
  }

  private shouldTriggerCircuitBreaker(circuitKey: string, error: Error): boolean {
    const breaker = this.getOrCreateCircuitBreaker(circuitKey)
    const config = this.getRetryConfig()

    // Only trigger on severe errors
    if (error instanceof BaseToolError) {
      if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.FATAL) {
        return breaker.failureCount >= Math.max(1, config.circuitBreakerThreshold / 2)
      }
    }

    return breaker.failureCount >= config.circuitBreakerThreshold
  }

  private openCircuitBreaker(circuitKey: string): void {
    const breaker = this.getOrCreateCircuitBreaker(circuitKey)
    const config = this.getRetryConfig()

    breaker.state = CircuitBreakerState.OPEN
    breaker.nextRetryTime = Date.now() + config.circuitBreakerWindowMs
    breaker.lastFailureTime = Date.now()

    logger.warn('Circuit breaker opened', {
      circuitKey,
      failureCount: breaker.failureCount,
      nextRetryTime: new Date(breaker.nextRetryTime).toISOString()
    })
  }

  private setCircuitBreakerHalfOpen(circuitKey: string): void {
    const breaker = this.getOrCreateCircuitBreaker(circuitKey)
    breaker.state = CircuitBreakerState.HALF_OPEN
    breaker.successCount = 0

    logger.info('Circuit breaker set to half-open', { circuitKey })
  }

  private recordSuccess(circuitKey: string, operationId: string): void {
    const breaker = this.getOrCreateCircuitBreaker(circuitKey)

    if (breaker.state === CircuitBreakerState.HALF_OPEN) {
      breaker.successCount++
      if (breaker.successCount >= breaker.halfOpenMaxAttempts) {
        breaker.state = CircuitBreakerState.CLOSED
        breaker.failureCount = 0
        logger.info('Circuit breaker closed', { circuitKey })
      }
    } else if (breaker.state === CircuitBreakerState.CLOSED) {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1)
    }
  }

  private recordFailure(circuitKey: string, operationId: string, error: Error): void {
    const breaker = this.getOrCreateCircuitBreaker(circuitKey)
    breaker.failureCount++
    breaker.lastFailureTime = Date.now()

    if (breaker.state === CircuitBreakerState.HALF_OPEN) {
      this.openCircuitBreaker(circuitKey)
    }
  }

  private getOrCreateCircuitBreaker(circuitKey: string): CircuitBreakerStatus {
    if (!this.circuitBreakers.has(circuitKey)) {
      this.circuitBreakers.set(circuitKey, {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        failureThreshold: 5,
        successCount: 0,
        halfOpenMaxAttempts: 3
      })
    }
    return this.circuitBreakers.get(circuitKey)!
  }

  /**
   * Fallback strategy execution
   */
  private async attemptFallback(
    context: any,
    error: Error,
    attempts: RetryAttempt[],
    config: RetryConfig
  ): Promise<{ success: boolean; result?: any }> {
    const fallbackKey = `${context.category}:${context.subcategory}`
    const fallbackStrategy = this.fallbackStrategies.get(fallbackKey) ||
                            this.fallbackStrategies.get('default')

    if (!fallbackStrategy) {
      logger.debug('No fallback strategy available', { context: fallbackKey })
      return { success: false }
    }

    try {
      logger.info('Attempting fallback strategy', {
        operationId: context.operationId,
        strategy: fallbackStrategy.name
      })

      const result = await fallbackStrategy.execute(context, error, attempts)

      logger.info('Fallback strategy succeeded', {
        operationId: context.operationId,
        strategy: fallbackStrategy.name
      })

      return { success: true, result }

    } catch (fallbackError) {
      logger.warn('Fallback strategy failed', {
        operationId: context.operationId,
        strategy: fallbackStrategy.name,
        error: fallbackError instanceof Error ? fallbackError.message : fallbackError
      })

      return { success: false }
    }
  }

  /**
   * Adaptive configuration management
   */
  private updateAdaptiveConfig(
    context: any,
    config: RetryConfig,
    attempts: RetryAttempt[],
    adjustments: AdaptiveAdjustment[],
    success: boolean
  ): void {
    if (!config.adaptiveAdjustment) return

    const configKey = `${context.component}:${context.category || 'default'}`
    const currentConfig = this.adaptiveConfigs.get(configKey) || { ...config }

    // Analyze attempt patterns
    const avgAttempts = attempts.length
    const totalTime = attempts.reduce((sum, attempt) =>
      sum + (attempt.endTime! - attempt.startTime), 0
    )

    // Adjust retry count based on success patterns
    if (success && avgAttempts > currentConfig.maxAttempts * 0.8) {
      // If we're consistently using most attempts, increase the limit
      const newMaxAttempts = Math.min(currentConfig.maxAttempts + 1, 10)
      if (newMaxAttempts !== currentConfig.maxAttempts) {
        adjustments.push({
          type: 'retry_count_adjust',
          oldValue: currentConfig.maxAttempts,
          newValue: newMaxAttempts,
          reason: 'Consistently high attempt usage',
          timestamp: Date.now()
        })
        currentConfig.maxAttempts = newMaxAttempts
      }
    }

    // Adjust timeout based on response times
    if (totalTime > 0) {
      const avgResponseTime = totalTime / attempts.length
      if (avgResponseTime > currentConfig.maxDelayMs * 0.7) {
        const newMaxDelay = Math.min(currentConfig.maxDelayMs * 1.5, 120000)
        if (newMaxDelay !== currentConfig.maxDelayMs) {
          adjustments.push({
            type: 'timeout_increase',
            oldValue: currentConfig.maxDelayMs,
            newValue: newMaxDelay,
            reason: 'High average response time',
            timestamp: Date.now()
          })
          currentConfig.maxDelayMs = newMaxDelay
        }
      }
    }

    this.adaptiveConfigs.set(configKey, currentConfig)

    if (adjustments.length > 0) {
      logger.info('Adaptive configuration updated', {
        configKey,
        adjustments: adjustments.length,
        success
      })
    }
  }

  /**
   * Get retry configuration for specific context
   */
  private getRetryConfig(
    category?: ErrorCategory,
    subcategory?: string,
    customConfig?: Partial<RetryConfig>
  ): RetryConfig {
    let baseConfig = DEFAULT_RETRY_CONFIGS.default

    // Try to find specific configuration
    if (category && subcategory) {
      const specificKey = `${category}_${subcategory}`
      baseConfig = DEFAULT_RETRY_CONFIGS[specificKey] || baseConfig
    } else if (category) {
      baseConfig = DEFAULT_RETRY_CONFIGS[category] || baseConfig
    }

    // Apply custom overrides
    if (customConfig) {
      baseConfig = { ...baseConfig, ...customConfig }
    }

    return baseConfig
  }

  /**
   * Initialize fallback strategies
   */
  private initializeFallbackStrategies(): void {
    // Cache fallback strategy
    this.fallbackStrategies.set('default', {
      name: 'cache_fallback',
      description: 'Use cached data if available',
      execute: async (context, error, attempts) => {
        // Implementation would check cache and return cached data
        throw new Error('No cached data available')
      }
    })

    // Simplified operation fallback
    this.fallbackStrategies.set('tool_execution:timeout', {
      name: 'simplified_operation',
      description: 'Retry with simplified parameters',
      execute: async (context, error, attempts) => {
        // Implementation would retry with reduced complexity
        logger.info('Attempting simplified operation fallback')
        throw new Error('Simplified operation not implemented')
      }
    })

    // Alternative tool fallback
    this.fallbackStrategies.set('tool_adapter:interface_mismatch', {
      name: 'alternative_tool',
      description: 'Switch to alternative tool',
      execute: async (context, error, attempts) => {
        // Implementation would switch to backup tool
        logger.info('Attempting alternative tool fallback')
        throw new Error('No alternative tool available')
      }
    })
  }

  /**
   * Utility methods
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(circuitKey?: string): Map<string, CircuitBreakerStatus> | CircuitBreakerStatus {
    if (circuitKey) {
      return this.circuitBreakers.get(circuitKey) || {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        failureThreshold: 5,
        successCount: 0,
        halfOpenMaxAttempts: 3
      }
    }
    return new Map(this.circuitBreakers)
  }

  /**
   * Reset circuit breaker (for manual intervention)
   */
  resetCircuitBreaker(circuitKey: string): boolean {
    const breaker = this.circuitBreakers.get(circuitKey)
    if (!breaker) return false

    breaker.state = CircuitBreakerState.CLOSED
    breaker.failureCount = 0
    breaker.successCount = 0
    delete breaker.lastFailureTime
    delete breaker.nextRetryTime

    logger.info('Circuit breaker manually reset', { circuitKey })
    return true
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStatistics(timeWindowMs: number = 3600000): {
    totalOperations: number
    successfulOperations: number
    retriedOperations: number
    circuitBreakerTrips: number
    avgAttemptsPerOperation: number
    adaptiveAdjustments: number
  } {
    const cutoff = Date.now() - timeWindowMs
    const operations = Array.from(this.retryHistory.values()).flat()
      .filter(attempt => attempt.startTime >= cutoff)

    const totalOps = new Set(operations.map(op => op.attemptNumber === 1)).size
    const retriedOps = operations.filter(op => op.attemptNumber > 1).length
    const successfulOps = operations.filter(op => op.success).length

    return {
      totalOperations: totalOps,
      successfulOperations: successfulOps,
      retriedOperations: retriedOps,
      circuitBreakerTrips: Array.from(this.circuitBreakers.values())
        .filter(cb => cb.lastFailureTime && cb.lastFailureTime >= cutoff).length,
      avgAttemptsPerOperation: operations.length / Math.max(totalOps, 1),
      adaptiveAdjustments: Array.from(this.adaptiveConfigs.values()).length
    }
  }
}

/**
 * Fallback strategy interface
 */
interface FallbackStrategy {
  name: string
  description: string
  execute: (context: any, error: Error, attempts: RetryAttempt[]) => Promise<any>
}

/**
 * Singleton error recovery service
 */
export const errorRecoveryService = new ErrorRecoveryService()

/**
 * Convenience function for executing operations with recovery
 */
export const executeWithRecovery = <T>(
  operation: () => Promise<T>,
  context: {
    operationId: string
    component: string
    category?: ErrorCategory
    subcategory?: string
    toolName?: string
    parlantContext?: ParlantLogContext
  },
  customConfig?: Partial<RetryConfig>
) => errorRecoveryService.executeWithRecovery(operation, context, customConfig)

/**
 * Decorator for automatic retry functionality
 */
export function WithRetry(
  component: string,
  category?: ErrorCategory,
  subcategory?: string,
  customConfig?: Partial<RetryConfig>
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const operationId = `${component}-${propertyName}-${Date.now()}`

      return executeWithRecovery(
        () => method.apply(this, args),
        {
          operationId,
          component,
          category,
          subcategory,
          toolName: component
        },
        customConfig
      )
    }

    return descriptor
  }
}