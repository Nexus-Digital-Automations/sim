/**
 * Error handling for Sim-Parlant Integration Bridge
 * ================================================
 *
 * Comprehensive error handling system providing:
 * - Custom error classes for different error types
 * - Error classification and context management
 * - Integration with Sim's logging infrastructure
 * - Structured error reporting for debugging
 *
 * This module ensures consistent error handling across
 * all integration points with proper logging and context.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ParlantApiErrorDetails, ValidationError } from './types'

const logger = createLogger('ParlantService')

/**
 * Base error class for all Parlant integration errors
 */
export class ParlantError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details: Record<string, any>
  public readonly timestamp: Date
  public readonly requestId?: string

  constructor(
    message: string,
    code = 'PARLANT_ERROR',
    statusCode = 500,
    details: Record<string, any> = {},
    requestId?: string
  ) {
    super(message)
    this.name = 'ParlantError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date()
    this.requestId = requestId

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParlantError)
    }

    // Log the error with context
    logger.error(`Parlant error: ${message}`, {
      code,
      statusCode,
      details,
      requestId,
      stack: this.stack,
    })
  }

  /**
   * Convert error to API response format
   */
  toApiResponse(): ParlantApiErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      request_id: this.requestId,
      timestamp: this.timestamp.toISOString(),
    }
  }

  /**
   * Create error from HTTP response
   */
  static fromHttpResponse(response: any, requestId?: string): ParlantError {
    const status = response.status || 500
    const data = response.data || {}

    return new ParlantError(
      data.message || `HTTP ${status} error`,
      data.code || `HTTP_${status}`,
      status,
      data.details || { response: data },
      requestId
    )
  }
}

/**
 * API communication errors
 */
export class ParlantApiError extends ParlantError {
  constructor(
    message: string,
    statusCode = 500,
    details: Record<string, any> = {},
    requestId?: string
  ) {
    super(message, 'PARLANT_API_ERROR', statusCode, details, requestId)
    this.name = 'ParlantApiError'
  }
}

/**
 * Connection and network errors
 */
export class ParlantConnectionError extends ParlantError {
  public readonly isRetryable: boolean

  constructor(
    message: string,
    details: Record<string, any> = {},
    isRetryable = true,
    requestId?: string
  ) {
    super(message, 'PARLANT_CONNECTION_ERROR', 503, details, requestId)
    this.name = 'ParlantConnectionError'
    this.isRetryable = isRetryable
  }
}

/**
 * Authentication and authorization errors
 */
export class ParlantAuthError extends ParlantError {
  constructor(
    message = 'Authentication failed',
    details: Record<string, any> = {},
    requestId?: string
  ) {
    super(message, 'PARLANT_AUTH_ERROR', 401, details, requestId)
    this.name = 'ParlantAuthError'
  }
}

/**
 * Request validation errors
 */
export class ParlantValidationError extends ParlantError {
  public readonly validationErrors: ValidationError[]

  constructor(
    message = 'Validation failed',
    validationErrors: ValidationError[] = [],
    requestId?: string
  ) {
    super(
      message,
      'PARLANT_VALIDATION_ERROR',
      400,
      { validation_errors: validationErrors },
      requestId
    )
    this.name = 'ParlantValidationError'
    this.validationErrors = validationErrors
  }

  /**
   * Create validation error from field errors
   */
  static fromFieldErrors(
    fieldErrors: Record<string, string>,
    requestId?: string
  ): ParlantValidationError {
    const validationErrors: ValidationError[] = Object.entries(fieldErrors).map(
      ([field, message]) => ({
        field,
        message,
        code: 'INVALID_VALUE',
      })
    )

    return new ParlantValidationError('Request validation failed', validationErrors, requestId)
  }
}

/**
 * Rate limiting errors
 */
export class ParlantRateLimitError extends ParlantError {
  public readonly retryAfter: number
  public readonly limit: number
  public readonly resetAt: Date

  constructor(
    message: string,
    retryAfter: number,
    limit: number,
    resetAt: Date,
    requestId?: string
  ) {
    super(
      message,
      'PARLANT_RATE_LIMIT_ERROR',
      429,
      {
        retry_after: retryAfter,
        limit,
        reset_at: resetAt.toISOString(),
      },
      requestId
    )
    this.name = 'ParlantRateLimitError'
    this.retryAfter = retryAfter
    this.limit = limit
    this.resetAt = resetAt
  }
}

/**
 * Resource not found errors
 */
export class ParlantNotFoundError extends ParlantError {
  constructor(resource: string, id?: string, requestId?: string) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`

    super(message, 'PARLANT_NOT_FOUND_ERROR', 404, { resource, id }, requestId)
    this.name = 'ParlantNotFoundError'
  }
}

/**
 * Workspace access errors
 */
export class ParlantWorkspaceError extends ParlantError {
  constructor(message = 'Workspace access denied', workspaceId?: string, requestId?: string) {
    super(message, 'PARLANT_WORKSPACE_ERROR', 403, { workspace_id: workspaceId }, requestId)
    this.name = 'ParlantWorkspaceError'
  }
}

/**
 * Server health and availability errors
 */
export class ParlantHealthError extends ParlantError {
  public readonly healthStatus: any

  constructor(message = 'Parlant server unhealthy', healthStatus?: any, requestId?: string) {
    super(message, 'PARLANT_HEALTH_ERROR', 503, { health_status: healthStatus }, requestId)
    this.name = 'ParlantHealthError'
    this.healthStatus = healthStatus
  }
}

/**
 * Timeout errors
 */
export class ParlantTimeoutError extends ParlantConnectionError {
  constructor(operation: string, timeoutMs: number, requestId?: string) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      { operation, timeout_ms: timeoutMs },
      true,
      requestId
    )
    this.name = 'ParlantTimeoutError'
  }
}

/**
 * Configuration errors
 */
export class ParlantConfigError extends ParlantError {
  constructor(message: string, configKey?: string, requestId?: string) {
    super(message, 'PARLANT_CONFIG_ERROR', 500, { config_key: configKey }, requestId)
    this.name = 'ParlantConfigError'
  }
}

/**
 * Error handler utility functions
 */
export class ParlantErrorHandler {
  /**
   * Determine if error is retryable
   */
  static isRetryable(error: Error): boolean {
    if (error instanceof ParlantConnectionError) {
      return error.isRetryable
    }

    if (error instanceof ParlantApiError) {
      // Retry on server errors, but not client errors
      return error.statusCode >= 500
    }

    if (error instanceof ParlantRateLimitError) {
      return true
    }

    // Network errors are generally retryable
    if (error.name === 'AxiosError' || error.message.includes('ECONNREFUSED')) {
      return true
    }

    return false
  }

  /**
   * Get retry delay for error (exponential backoff)
   */
  static getRetryDelay(attempt: number, baseDelay = 1000): number {
    const exponentialDelay = Math.min(baseDelay * 2 ** attempt, 30000)
    const jitter = Math.random() * 1000 // Add jitter to prevent thundering herd
    return exponentialDelay + jitter
  }

  /**
   * Convert unknown error to ParlantError
   */
  static normalize(error: unknown, requestId?: string): ParlantError {
    if (error instanceof ParlantError) {
      return error
    }

    if (error instanceof Error) {
      return new ParlantError(
        error.message,
        'UNKNOWN_ERROR',
        500,
        { original_error: error.name },
        requestId
      )
    }

    return new ParlantError(
      String(error),
      'UNKNOWN_ERROR',
      500,
      { original_error: typeof error },
      requestId
    )
  }

  /**
   * Create error from HTTP response
   */
  static fromHttpResponse(response: any, requestId?: string): ParlantError {
    const status = response.status || 500
    const data = response.data || {}

    // Handle specific HTTP status codes
    switch (status) {
      case 400:
        if (data.validation_errors) {
          return new ParlantValidationError(
            data.message || 'Validation failed',
            data.validation_errors,
            requestId
          )
        }
        return new ParlantApiError(data.message || 'Bad request', 400, data, requestId)

      case 401:
        return new ParlantAuthError(data.message || 'Unauthorized', data, requestId)

      case 403:
        return new ParlantWorkspaceError(
          data.message || 'Access forbidden',
          data.workspace_id,
          requestId
        )

      case 404:
        return new ParlantNotFoundError(data.resource || 'Resource', data.id, requestId)

      case 429:
        return new ParlantRateLimitError(
          data.message || 'Rate limit exceeded',
          data.retry_after || 60,
          data.limit || 100,
          new Date(data.reset_at || Date.now() + 60000),
          requestId
        )

      case 503:
        return new ParlantConnectionError(
          data.message || 'Service unavailable',
          data,
          true,
          requestId
        )

      default:
        return new ParlantApiError(data.message || `HTTP ${status} error`, status, data, requestId)
    }
  }

  /**
   * Log error with appropriate level
   */
  static logError(error: ParlantError, context?: Record<string, any>): void {
    const logContext = {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      requestId: error.requestId,
      ...context,
    }

    if (error.statusCode >= 500) {
      logger.error(error.message, logContext)
    } else if (error.statusCode >= 400) {
      logger.warn(error.message, logContext)
    } else {
      logger.info(error.message, logContext)
    }
  }
}

/**
 * Type guard to check if error is a ParlantError
 */
export function isParlantError(error: unknown): error is ParlantError {
  return error instanceof ParlantError
}

/**
 * Extract request ID from various sources
 */
export function extractRequestId(context?: any): string | undefined {
  if (!context) return undefined

  return (
    context.request_id || context.requestId || context['x-request-id'] || context['X-Request-ID']
  )
}
