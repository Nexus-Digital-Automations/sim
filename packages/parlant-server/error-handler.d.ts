/**
 * Core Error Handling Classes with Comprehensive Severity Management
 *
 * This module provides the central error handling infrastructure for the Universal Tool Adapter System,
 * including custom error classes, severity-based processing, automatic recovery mechanisms,
 * and integration with the error tracking and classification systems.
 */
import {
  ErrorCategory,
  type ErrorClassification,
  ErrorImpact,
  ErrorSeverity,
  RecoveryStrategy,
} from './error-taxonomy'
import type { ParlantLogContext } from './logging'
/**
 * Base error class with comprehensive context and classification
 */
export declare abstract class BaseToolError extends Error {
  readonly id: string
  readonly timestamp: string
  readonly category: ErrorCategory
  readonly subcategory: string
  readonly severity: ErrorSeverity
  readonly impact: ErrorImpact
  readonly component: string
  readonly context: ParlantLogContext
  readonly classification: ErrorClassification
  readonly recoverable: boolean
  readonly recoveryStrategy: RecoveryStrategy
  constructor(
    message: string,
    category: ErrorCategory,
    subcategory: string,
    component: string,
    context?: ParlantLogContext,
    originalError?: Error
  )
  /**
   * Track this error in the monitoring system
   */
  private trackError
  /**
   * Get user-friendly error message with context
   */
  getUserMessage(): string
  /**
   * Get suggested recovery actions
   */
  getRecoveryActions(): string[]
  /**
   * Check if error should trigger immediate escalation
   */
  shouldEscalate(): boolean
  /**
   * Generate user-friendly error message (to be overridden by subclasses)
   */
  protected abstract generateUserMessage(): string
  /**
   * Convert error to JSON for logging and API responses
   */
  toJSON(): object
}
/**
 * Tool adapter-specific errors
 */
export declare class ToolAdapterError extends BaseToolError {
  constructor(
    message: string,
    subcategory: string,
    toolName: string,
    context?: ParlantLogContext,
    originalError?: Error
  )
  protected generateUserMessage(): string
}
/**
 * Tool execution errors
 */
export declare class ToolExecutionError extends BaseToolError {
  readonly operationId?: string
  readonly executionTime?: number
  constructor(
    message: string,
    subcategory: string,
    toolName: string,
    context?: ParlantLogContext,
    originalError?: Error,
    operationId?: string,
    executionTime?: number
  )
  protected generateUserMessage(): string
}
/**
 * Tool authentication errors
 */
export declare class ToolAuthenticationError extends BaseToolError {
  readonly authMethod?: string
  readonly tokenExpired?: boolean
  constructor(
    message: string,
    subcategory: string,
    toolName: string,
    context?: ParlantLogContext,
    originalError?: Error,
    authMethod?: string,
    tokenExpired?: boolean
  )
  protected generateUserMessage(): string
}
/**
 * User input validation errors
 */
export declare class UserInputError extends BaseToolError {
  readonly fieldName?: string
  readonly validationRule?: string
  readonly providedValue?: any
  constructor(
    message: string,
    subcategory: string,
    context?: ParlantLogContext,
    fieldName?: string,
    validationRule?: string,
    providedValue?: any
  )
  protected generateUserMessage(): string
}
/**
 * System resource errors
 */
export declare class SystemResourceError extends BaseToolError {
  readonly resourceType: string
  readonly currentUsage?: number
  readonly limit?: number
  constructor(
    message: string,
    subcategory: string,
    resourceType: string,
    context?: ParlantLogContext,
    originalError?: Error,
    currentUsage?: number,
    limit?: number
  )
  protected generateUserMessage(): string
}
/**
 * External service errors
 */
export declare class ExternalServiceError extends BaseToolError {
  readonly serviceName: string
  readonly serviceUrl?: string
  readonly httpStatus?: number
  readonly retryAfter?: number
  constructor(
    message: string,
    subcategory: string,
    serviceName: string,
    context?: ParlantLogContext,
    originalError?: Error,
    serviceUrl?: string,
    httpStatus?: number,
    retryAfter?: number
  )
  protected generateUserMessage(): string
}
/**
 * Error handler service with severity-based processing
 */
export declare class UniversalErrorHandler {
  private readonly logger
  private errorProcessors
  private recoveryStrategies
  constructor()
  /**
   * Initialize severity-based error processors
   */
  private initializeErrorProcessors
  /**
   * Initialize recovery strategy handlers
   */
  private initializeRecoveryStrategies
  /**
   * Handle error with comprehensive processing
   */
  handleError(error: BaseToolError): Promise<{
    processed: boolean
    recovered: boolean
    userMessage: string
    recoveryActions: string[]
    shouldEscalate: boolean
  }>
  /**
   * Attempt error recovery based on strategy
   */
  private attemptRecovery
  private processTraceError
  private processDebugError
  private processInfoError
  private processWarningError
  private processError
  private processCriticalError
  private processFatalError
  private attemptRetry
  private attemptFallback
  private applyCircuitBreaker
  private gracefulDegrade
  private logManualIntervention
  private logNoRecovery
}
/**
 * Singleton error handler instance
 */
export declare const universalErrorHandler: UniversalErrorHandler
/**
 * Convenience function for handling errors
 */
export declare const handleError: (error: BaseToolError) => Promise<{
  processed: boolean
  recovered: boolean
  userMessage: string
  recoveryActions: string[]
  shouldEscalate: boolean
}>
/**
 * Factory functions for creating specific error types
 */
export declare const createToolAdapterError: (
  message: string,
  subcategory: string,
  toolName: string,
  context?: ParlantLogContext,
  originalError?: Error
) => ToolAdapterError
export declare const createToolExecutionError: (
  message: string,
  subcategory: string,
  toolName: string,
  context?: ParlantLogContext,
  originalError?: Error,
  operationId?: string,
  executionTime?: number
) => ToolExecutionError
export declare const createToolAuthenticationError: (
  message: string,
  subcategory: string,
  toolName: string,
  context?: ParlantLogContext,
  originalError?: Error,
  authMethod?: string,
  tokenExpired?: boolean
) => ToolAuthenticationError
export declare const createUserInputError: (
  message: string,
  subcategory: string,
  context?: ParlantLogContext,
  fieldName?: string,
  validationRule?: string,
  providedValue?: any
) => UserInputError
export declare const createSystemResourceError: (
  message: string,
  subcategory: string,
  resourceType: string,
  context?: ParlantLogContext,
  originalError?: Error,
  currentUsage?: number,
  limit?: number
) => SystemResourceError
export declare const createExternalServiceError: (
  message: string,
  subcategory: string,
  serviceName: string,
  context?: ParlantLogContext,
  originalError?: Error,
  serviceUrl?: string,
  httpStatus?: number,
  retryAfter?: number
) => ExternalServiceError
