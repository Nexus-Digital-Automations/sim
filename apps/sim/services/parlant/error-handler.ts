/**
 * Parlant Error Handling and Logging
 *
 * This module provides comprehensive error handling, logging, and monitoring
 * for the Parlant integration layer, including custom error types and recovery strategies.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ParlantApiErrorDetails, ValidationError, RateLimitInfo } from './types'

const logger = createLogger('ParlantErrorHandler')

/**
 * Base class for all Parlant integration errors
 */
export class ParlantError extends Error {
  public readonly code: string
  public readonly details?: Record<string, any>
  public readonly requestId?: string
  public readonly timestamp: string
  public readonly retryable: boolean

  constructor(
    code: string,
    message: string,
    retryable = false,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super(message)
    this.name = 'ParlantError'
    this.code = code
    this.details = details
    this.requestId = requestId
    this.timestamp = new Date().toISOString()
    this.retryable = retryable
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      requestId: this.requestId,
      timestamp: this.timestamp,
      retryable: this.retryable,
      stack: this.stack
    }
  }
}

/**
 * Network-related errors (connection, timeout, etc.)
 */
export class ParlantNetworkError extends ParlantError {
  constructor(
    message: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super('NETWORK_ERROR', message, true, details, requestId)
    this.name = 'ParlantNetworkError'
  }
}

/**
 * Authentication and authorization errors
 */
export class ParlantAuthError extends ParlantError {
  constructor(
    message: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super('AUTH_ERROR', message, false, details, requestId)
    this.name = 'ParlantAuthError'
  }
}

/**
 * Validation errors for request data
 */
export class ParlantValidationError extends ParlantError {
  public readonly validationErrors: ValidationError[]

  constructor(
    message: string,
    validationErrors: ValidationError[] = [],
    details?: Record<string, any>,
    requestId?: string
  ) {
    super('VALIDATION_ERROR', message, false, details, requestId)
    this.name = 'ParlantValidationError'
    this.validationErrors = validationErrors
  }

  toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors
    }
  }
}

/**
 * Rate limiting errors
 */
export class ParlantRateLimitError extends ParlantError {
  public readonly rateLimitInfo: RateLimitInfo

  constructor(
    message: string,
    rateLimitInfo: RateLimitInfo,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super('RATE_LIMIT_ERROR', message, true, details, requestId)
    this.name = 'ParlantRateLimitError'
    this.rateLimitInfo = rateLimitInfo
  }

  toJSON() {
    return {
      ...super.toJSON(),
      rateLimitInfo: this.rateLimitInfo
    }
  }
}

/**
 * Server errors from the Parlant API
 */
export class ParlantServerError extends ParlantError {
  public readonly statusCode: number

  constructor(
    statusCode: number,
    message: string,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super('SERVER_ERROR', message, statusCode >= 500, details, requestId)
    this.name = 'ParlantServerError'
    this.statusCode = statusCode
  }

  toJSON() {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode
    }
  }
}

/**
 * Configuration errors
 */
export class ParlantConfigError extends ParlantError {
  constructor(
    message: string,
    details?: Record<string, any>
  ) {
    super('CONFIG_ERROR', message, false, details)
    this.name = 'ParlantConfigError'
  }
}

/**
 * Timeout errors
 */
export class ParlantTimeoutError extends ParlantError {
  public readonly timeoutMs: number

  constructor(
    message: string,
    timeoutMs: number,
    details?: Record<string, any>,
    requestId?: string
  ) {
    super('TIMEOUT_ERROR', message, true, details, requestId)
    this.name = 'ParlantTimeoutError'
    this.timeoutMs = timeoutMs
  }

  toJSON() {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs
    }
  }
}

/**
 * Error handler class for processing and categorizing errors
 */
export class ParlantErrorHandler {
  private static instance: ParlantErrorHandler

  static getInstance(): ParlantErrorHandler {
    if (!ParlantErrorHandler.instance) {
      ParlantErrorHandler.instance = new ParlantErrorHandler()
    }
    return ParlantErrorHandler.instance
  }

  /**
   * Convert HTTP response errors to appropriate ParlantError types
   */
  handleHttpError(
    response: Response,
    responseBody?: any,
    requestId?: string
  ): ParlantError {
    const { status, statusText } = response

    // Extract error details from response body
    let errorDetails: ParlantApiErrorDetails | undefined
    let validationErrors: ValidationError[] = []

    if (responseBody) {
      if (responseBody.code && responseBody.message) {
        errorDetails = responseBody as ParlantApiErrorDetails
      }

      if (responseBody.validation_errors) {
        validationErrors = responseBody.validation_errors
      }
    }

    // Rate limit errors
    if (status === 429) {
      const rateLimitInfo: RateLimitInfo = {
        limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
        remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
        reset_at: response.headers.get('X-RateLimit-Reset') || new Date().toISOString(),
        retry_after: parseInt(response.headers.get('Retry-After') || '0')
      }

      return new ParlantRateLimitError(
        errorDetails?.message || 'Rate limit exceeded',
        rateLimitInfo,
        errorDetails?.details,
        requestId || errorDetails?.request_id
      )
    }

    // Authentication errors
    if (status === 401) {
      return new ParlantAuthError(
        errorDetails?.message || 'Authentication failed',
        errorDetails?.details,
        requestId || errorDetails?.request_id
      )
    }

    // Authorization errors
    if (status === 403) {
      return new ParlantAuthError(
        errorDetails?.message || 'Authorization failed',
        errorDetails?.details,
        requestId || errorDetails?.request_id
      )
    }

    // Validation errors
    if (status === 400 || status === 422) {
      return new ParlantValidationError(
        errorDetails?.message || 'Validation failed',
        validationErrors,
        errorDetails?.details,
        requestId || errorDetails?.request_id
      )
    }

    // Server errors
    if (status >= 500) {
      return new ParlantServerError(
        status,
        errorDetails?.message || statusText || 'Internal server error',
        errorDetails?.details,
        requestId || errorDetails?.request_id
      )
    }

    // Client errors
    return new ParlantError(
      'CLIENT_ERROR',
      errorDetails?.message || statusText || `HTTP ${status}`,
      status === 408, // Timeout is retryable
      errorDetails?.details,
      requestId || errorDetails?.request_id
    )
  }

  /**
   * Handle network and fetch errors
   */
  handleNetworkError(error: any, requestId?: string): ParlantError {
    // Timeout errors
    if (error.name === 'AbortError') {
      return new ParlantTimeoutError(
        'Request timeout',
        30000, // Default timeout
        { originalError: error.message },
        requestId
      )
    }

    // Connection errors
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.message?.includes('fetch failed')
    ) {
      return new ParlantNetworkError(
        'Cannot connect to Parlant server',
        { originalError: error.message, code: error.code },
        requestId
      )
    }

    // Other network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new ParlantNetworkError(
        'Network error occurred',
        { originalError: error.message },
        requestId
      )
    }

    // Unknown errors
    return new ParlantError(
      'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      false,
      { originalError: error },
      requestId
    )
  }

  /**
   * Log error with appropriate level and context
   */
  logError(error: ParlantError, context?: Record<string, any>): void {
    const logContext = {
      errorCode: error.code,
      errorMessage: error.message,
      requestId: error.requestId,
      retryable: error.retryable,
      timestamp: error.timestamp,
      ...error.details,
      ...context
    }

    // Use different log levels based on error severity
    if (error instanceof ParlantServerError && error.statusCode >= 500) {
      logger.error('Server error occurred', logContext)
    } else if (error instanceof ParlantNetworkError) {
      logger.warn('Network error occurred', logContext)
    } else if (error instanceof ParlantRateLimitError) {
      logger.warn('Rate limit exceeded', {
        ...logContext,
        rateLimitInfo: error.rateLimitInfo
      })
    } else if (error instanceof ParlantValidationError) {
      logger.info('Validation error occurred', {
        ...logContext,
        validationErrors: error.validationErrors
      })
    } else if (error instanceof ParlantAuthError) {
      logger.warn('Authentication error occurred', logContext)
    } else {
      logger.error('Unknown error occurred', logContext)
    }
  }

  /**
   * Determine if an error should be retried
   */
  shouldRetry(error: ParlantError, attemptNumber: number, maxAttempts: number): boolean {
    // Don't retry if we've exceeded max attempts
    if (attemptNumber >= maxAttempts) {
      return false
    }

    // Don't retry non-retryable errors
    if (!error.retryable) {
      return false
    }

    // Special handling for rate limits
    if (error instanceof ParlantRateLimitError) {
      // Only retry if we have retry_after info
      return !!error.rateLimitInfo.retry_after
    }

    // Retry network and server errors
    return error instanceof ParlantNetworkError ||
           error instanceof ParlantServerError ||
           error instanceof ParlantTimeoutError
  }

  /**
   * Calculate retry delay based on error type and attempt number
   */
  getRetryDelay(error: ParlantError, attemptNumber: number, baseDelay = 1000): number {
    // Rate limit errors use the retry_after value
    if (error instanceof ParlantRateLimitError && error.rateLimitInfo.retry_after) {
      return error.rateLimitInfo.retry_after * 1000 // Convert to milliseconds
    }

    // Exponential backoff for other retryable errors
    return Math.min(baseDelay * Math.pow(2, attemptNumber - 1), 30000) // Max 30 seconds
  }

  /**
   * Create error response in API format
   */
  createErrorResponse(error: ParlantError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      requestId: error.requestId,
      timestamp: error.timestamp
    }
  }
}

/**
 * Utility functions for error handling
 */
export const errorHandler = ParlantErrorHandler.getInstance()

/**
 * Type guard to check if an error is a ParlantError
 */
export function isParlantError(error: any): error is ParlantError {
  return error instanceof ParlantError
}

/**
 * Type guard to check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  return isParlantError(error) && error.retryable
}

/**
 * Extract request ID from error
 */
export function getRequestId(error: any): string | undefined {
  if (isParlantError(error)) {
    return error.requestId
  }
  return undefined
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: ParlantError): string {
  if (error instanceof ParlantValidationError) {
    const fieldErrors = error.validationErrors
      .map(ve => `${ve.field}: ${ve.message}`)
      .join(', ')
    return fieldErrors || error.message
  }

  if (error instanceof ParlantRateLimitError) {
    const retryAfter = error.rateLimitInfo.retry_after
    const retryMessage = retryAfter ? ` Try again in ${retryAfter} seconds.` : ''
    return `${error.message}${retryMessage}`
  }

  if (error instanceof ParlantNetworkError) {
    return 'Unable to connect to the server. Please check your connection and try again.'
  }

  if (error instanceof ParlantAuthError) {
    return 'Authentication failed. Please check your credentials.'
  }

  return error.message
}