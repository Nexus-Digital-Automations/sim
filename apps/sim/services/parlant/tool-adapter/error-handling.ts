/**
 * Comprehensive Error Handling for Tool Adapters
 *
 * Provides structured error handling with:
 * - User-friendly error messages
 * - Retry logic with exponential backoff
 * - Error categorization and suggestion generation
 * - Circuit breaker pattern for external dependencies
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { AdapterError, AdapterResult } from './types'

const logger = createLogger('AdapterErrorHandler')

export class ErrorHandler {
  private circuitBreakers = new Map<string, CircuitBreaker>()

  /**
   * Handle and transform errors into user-friendly results
   */
  async handleError(
    error: any,
    context: ErrorContext,
    retryOptions?: RetryOptions
  ): Promise<AdapterResult> {
    const adapterError = this.categorizeError(error, context)

    // Log the error
    logger.error('Tool adapter error', {
      toolName: context.toolName,
      userId: context.userId,
      workspaceId: context.workspaceId,
      errorCode: adapterError.code,
      errorMessage: adapterError.message,
      retryable: adapterError.retryable,
    })

    // Handle circuit breaker if dealing with external service
    if (context.externalService) {
      this.updateCircuitBreaker(context.externalService, error)
    }

    // Attempt retry if appropriate
    if (adapterError.retryable && retryOptions && retryOptions.attempts > 0) {
      logger.info('Attempting retry', {
        toolName: context.toolName,
        attempt: retryOptions.maxAttempts - retryOptions.attempts + 1,
        maxAttempts: retryOptions.maxAttempts,
      })

      await this.delay(retryOptions.backoffMs)

      try {
        return await retryOptions.retryFunction()
      } catch (retryError: any) {
        return this.handleError(retryError, context, {
          ...retryOptions,
          attempts: retryOptions.attempts - 1,
        })
      }
    }

    return {
      success: false,
      error: adapterError,
      metadata: {
        execution_time_ms: 0,
        cached: false,
        error_context: {
          toolName: context.toolName,
          timestamp: new Date().toISOString(),
          retried: retryOptions ? retryOptions.maxAttempts - (retryOptions.attempts || 0) : 0,
        },
      },
    }
  }

  /**
   * Check if external service is available (circuit breaker)
   */
  isServiceAvailable(serviceName: string): boolean {
    const breaker = this.circuitBreakers.get(serviceName)
    return !breaker || breaker.isAvailable()
  }

  /**
   * Get service health status
   */
  getServiceStatus(serviceName: string): ServiceStatus {
    const breaker = this.circuitBreakers.get(serviceName)
    if (!breaker) {
      return {
        Name: serviceName,
        status: 'healthy',
        errorCount: 0,
        lastError: null,
      }
    }

    return {
      Name: serviceName,
      status: breaker.getStatus(),
      errorCount: breaker.getErrorCount(),
      lastError: breaker.getLastError(),
    }
  }

  /**
   * Reset circuit breaker for a service
   */
  resetCircuitBreaker(serviceName: string): void {
    const breaker = this.circuitBreakers.get(serviceName)
    if (breaker) {
      breaker.reset()
      logger.info('Circuit breaker reset', { serviceName })
    }
  }

  /**
   * Private helper methods
   */
  private categorizeError(error: any, context: ErrorContext): AdapterError {
    const errorMessage = error.message || 'Unknown error'
    const errorStack = error.stack || ''

    // Network/HTTP errors
    if (this.isNetworkError(error)) {
      return {
        code: 'NETWORK_ERROR',
        message: errorMessage,
        user_message: 'There was a problem connecting to the external service. Please try again.',
        suggestions: [
          'Check your internet connection',
          'Try again in a few moments',
          'Contact support if the problem persists',
        ],
        retryable: true,
      }
    }

    // Authentication errors
    if (this.isAuthenticationError(error)) {
      return {
        code: 'AUTHENTICATION_ERROR',
        message: errorMessage,
        user_message: 'Authentication failed. Please check your credentials.',
        suggestions: [
          'Verify your API keys and credentials',
          'Re-authenticate with the external service',
          'Contact your workspace administrator',
        ],
        retryable: false,
      }
    }

    // Permission/authorization errors
    if (this.isAuthorizationError(error)) {
      return {
        code: 'AUTHORIZATION_ERROR',
        message: errorMessage,
        user_message: "You don't have permission to perform this action.",
        suggestions: [
          'Contact your workspace administrator for access',
          'Verify you have the necessary permissions',
          'Try a different approach or tool',
        ],
        retryable: false,
      }
    }

    // Rate limiting errors
    if (this.isRateLimitError(error)) {
      return {
        code: 'RATE_LIMIT_ERROR',
        message: errorMessage,
        user_message: 'Too many requests. Please wait a moment before trying again.',
        suggestions: [
          'Wait a few minutes before retrying',
          'Consider using batch operations',
          'Contact support to increase rate limits',
        ],
        retryable: true,
      }
    }

    // Validation errors
    if (this.isValidationError(error)) {
      return {
        code: 'VALIDATION_ERROR',
        message: errorMessage,
        user_message: 'The provided input is invalid. Please check your parameters.',
        suggestions: [
          'Review the required parameters',
          'Check data formats and types',
          'Refer to the tool documentation',
        ],
        retryable: false,
      }
    }

    // External service errors
    if (this.isExternalServiceError(error)) {
      return {
        code: 'EXTERNAL_SERVICE_ERROR',
        message: errorMessage,
        user_message: 'The external service is currently unavailable. Please try again later.',
        suggestions: [
          'Try again in a few minutes',
          'Check the external service status',
          'Use an alternative tool if available',
        ],
        retryable: true,
      }
    }

    // Timeout errors
    if (this.isTimeoutError(error)) {
      return {
        code: 'TIMEOUT_ERROR',
        message: errorMessage,
        user_message: 'The operation took too long to complete. Please try again.',
        suggestions: [
          'Try with smaller data sets',
          'Break the task into smaller parts',
          'Try again when the system is less busy',
        ],
        retryable: true,
      }
    }

    // Default: unknown error
    return {
      code: 'UNKNOWN_ERROR',
      message: errorMessage,
      user_message: 'An unexpected error occurred. Please try again or contact support.',
      suggestions: [
        'Try the operation again',
        'Check if the problem persists',
        'Contact support with error details',
      ],
      retryable: true,
    }
  }

  private isNetworkError(error: any): boolean {
    return (
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET' ||
      (error.response && [502, 503, 504].includes(error.response.status))
    )
  }

  private isAuthenticationError(error: any): boolean {
    return (
      error.response?.status === 401 ||
      error.message?.toLowerCase().includes('authentication') ||
      error.message?.toLowerCase().includes('unauthorized')
    )
  }

  private isAuthorizationError(error: any): boolean {
    return (
      error.response?.status === 403 ||
      error.message?.toLowerCase().includes('forbidden') ||
      error.message?.toLowerCase().includes('permission')
    )
  }

  private isRateLimitError(error: any): boolean {
    return (
      error.response?.status === 429 ||
      error.message?.toLowerCase().includes('rate limit') ||
      error.message?.toLowerCase().includes('too many requests')
    )
  }

  private isValidationError(error: any): boolean {
    return (
      error.response?.status === 400 ||
      error.message?.toLowerCase().includes('validation') ||
      error.message?.toLowerCase().includes('invalid input')
    )
  }

  private isExternalServiceError(error: any): boolean {
    return (
      error.response?.status >= 500 || error.message?.toLowerCase().includes('service unavailable')
    )
  }

  private isTimeoutError(error: any): boolean {
    return error.code === 'ETIMEDOUT' || error.message?.toLowerCase().includes('timeout')
  }

  private updateCircuitBreaker(serviceName: string, error: any): void {
    let breaker = this.circuitBreakers.get(serviceName)
    if (!breaker) {
      breaker = new CircuitBreaker(serviceName)
      this.circuitBreakers.set(serviceName, breaker)
    }

    breaker.recordError(error)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export interface ErrorContext {
  toolName: string
  userId: string
  workspaceId: string
  externalService?: string
}

export interface RetryOptions {
  attempts: number
  maxAttempts: number
  backoffMs: number
  retryFunction: () => Promise<AdapterResult>
}

export interface ServiceStatus {
  Name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  errorCount: number
  lastError: Date | null
}

/**
 * Circuit Breaker implementation for external services
 */
class CircuitBreaker {
  private failures = 0
  private lastFailureTime: Date | null = null
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private serviceName: string,
    private failureThreshold = 5,
    private recoveryTimeoutMs = 30000
  ) {}

  isAvailable(): boolean {
    if (this.state === 'closed') {
      return true
    }

    if (this.state === 'open') {
      const now = Date.now()
      const lastFailure = this.lastFailureTime?.getTime() || 0

      if (now - lastFailure > this.recoveryTimeoutMs) {
        this.state = 'half-open'
        logger.info('Circuit breaker half-open', { serviceName: this.serviceName })
        return true
      }

      return false
    }

    // half-open: allow one request to test
    return true
  }

  recordError(error: any): void {
    this.failures++
    this.lastFailureTime = new Date()

    if (this.state === 'half-open') {
      this.state = 'open'
      logger.warn('Circuit breaker opened from half-open', {
        serviceName: this.serviceName,
        error: error.message,
      })
    } else if (this.failures >= this.failureThreshold && this.state === 'closed') {
      this.state = 'open'
      logger.warn('Circuit breaker opened', {
        serviceName: this.serviceName,
        failures: this.failures,
        error: error.message,
      })
    }
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.reset()
    }
  }

  reset(): void {
    this.failures = 0
    this.lastFailureTime = null
    this.state = 'closed'
    logger.info('Circuit breaker reset', { serviceName: this.serviceName })
  }

  getStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    switch (this.state) {
      case 'closed':
        return 'healthy'
      case 'half-open':
        return 'degraded'
      case 'open':
        return 'unhealthy'
    }
  }

  getErrorCount(): number {
    return this.failures
  }

  getLastError(): Date | null {
    return this.lastFailureTime
  }
}

// Utility functions for common error handling patterns
export function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { attempts = 3, backoffMs = 1000 } = options

  const executeWithRetry = async (): Promise<T> => {
    let lastError: any

    for (let i = 0; i < attempts; i++) {
      try {
        const result = await operation()
        return result
      } catch (error) {
        lastError = error

        if (i < attempts - 1) {
          const delay = backoffMs * 2 ** i // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }

  return executeWithRetry()
}

export function createSafeWrapper<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  defaultValue: R
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      logger.warn('Safe wrapper caught error', { error: error.message })
      return defaultValue
    }
  }
}

// Global error handler instance
export const globalErrorHandler = new ErrorHandler()
