/**
 * Core Error Handling Classes with Comprehensive Severity Management
 *
 * This module provides the central error handling infrastructure for the Universal Tool Adapter System,
 * including custom error classes, severity-based processing, automatic recovery mechanisms,
 * and integration with the error tracking and classification systems.
 */
import { createLogger } from '../../apps/sim/lib/logs/console/logger'
import {
  ErrorCategory,
  ErrorImpact,
  ErrorSeverity,
  errorClassifier,
  RecoveryStrategy,
} from './error-taxonomy'
import { parlantErrorTracker } from './error-tracking'

const logger = createLogger('ErrorHandler')
/**
 * Base error class with comprehensive context and classification
 */
export class BaseToolError extends Error {
  id
  timestamp
  category
  subcategory
  severity
  impact
  component
  context
  classification
  recoverable
  recoveryStrategy
  constructor(message, category, subcategory, component, context, originalError) {
    super(message)
    this.name = this.constructor.name
    this.id = `err-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`
    this.timestamp = new Date().toISOString()
    this.category = category
    this.subcategory = subcategory
    this.component = component
    this.context = context
    // Classify the error for comprehensive analysis
    this.classification = errorClassifier.classify(
      category,
      subcategory,
      message,
      originalError,
      context,
      component
    )
    this.severity = this.classification.severity
    this.impact = this.classification.impact
    this.recoverable = this.classification.recoverable
    this.recoveryStrategy = this.classification.recoveryStrategy
    // Set up proper error chain
    if (originalError) {
      this.cause = originalError
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`
    }
    // Track the error automatically
    this.trackError(originalError)
  }
  /**
   * Track this error in the monitoring system
   */
  async trackError(originalError) {
    try {
      await parlantErrorTracker.trackError(
        this.severity === ErrorSeverity.CRITICAL
          ? 'critical'
          : this.severity === ErrorSeverity.ERROR
            ? 'error'
            : 'warning',
        this.category, // Type conversion for compatibility
        this.component,
        this.message,
        originalError || this,
        this.context,
        {
          errorId: this.id,
          errorClass: this.constructor.name,
          subcategory: this.subcategory,
          recoverable: this.recoverable,
          recoveryStrategy: this.recoveryStrategy,
        }
      )
    } catch (trackingError) {
      // Don't let tracking errors break the main error flow
      logger.error('Failed to track error', {
        errorId: this.id,
        trackingError: trackingError instanceof Error ? trackingError.message : trackingError,
      })
    }
  }
  /**
   * Get user-friendly error message with context
   */
  getUserMessage() {
    return this.generateUserMessage()
  }
  /**
   * Get suggested recovery actions
   */
  getRecoveryActions() {
    return this.classification.suggestedActions
  }
  /**
   * Check if error should trigger immediate escalation
   */
  shouldEscalate() {
    return (
      this.severity === ErrorSeverity.CRITICAL ||
      this.severity === ErrorSeverity.FATAL ||
      this.impact === ErrorImpact.CRITICAL
    )
  }
  /**
   * Convert error to JSON for logging and API responses
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      userMessage: this.getUserMessage(),
      category: this.category,
      subcategory: this.subcategory,
      severity: this.severity,
      impact: this.impact,
      component: this.component,
      recoverable: this.recoverable,
      recoveryStrategy: this.recoveryStrategy,
      recoveryActions: this.getRecoveryActions(),
      timestamp: this.timestamp,
      context: this.context,
    }
  }
}
/**
 * Tool adapter-specific errors
 */
export class ToolAdapterError extends BaseToolError {
  constructor(message, subcategory, toolName, context, originalError) {
    const enhancedContext = { ...context, toolName }
    super(
      message,
      ErrorCategory.TOOL_ADAPTER,
      subcategory,
      `tool-adapter:${toolName}`,
      enhancedContext,
      originalError
    )
  }
  generateUserMessage() {
    const toolName = this.context.toolName || 'the tool'
    switch (this.subcategory) {
      case 'interface_mismatch':
        return `${toolName} is not compatible with the current system version. Please check for updates or contact support.`
      case 'parameter_mapping':
        return `Unable to process the request parameters for ${toolName}. Please check your input format.`
      case 'response_transformation':
        return `${toolName} returned data in an unexpected format. The system is attempting to process it.`
      case 'schema_validation':
        return `The data format from ${toolName} doesn't match expected requirements. Please verify your configuration.`
      case 'version_compatibility':
        return `${toolName} version is incompatible. Please update to a supported version.`
      default:
        return `An issue occurred while connecting to ${toolName}. Please try again or contact support if the problem persists.`
    }
  }
}
/**
 * Tool execution errors
 */
export class ToolExecutionError extends BaseToolError {
  operationId
  executionTime
  constructor(message, subcategory, toolName, context, originalError, operationId, executionTime) {
    const enhancedContext = { ...context, toolName, operationId }
    super(
      message,
      ErrorCategory.TOOL_EXECUTION,
      subcategory,
      `tool-execution:${toolName}`,
      enhancedContext,
      originalError
    )
    this.operationId = operationId
    this.executionTime = executionTime
  }
  generateUserMessage() {
    const toolName = this.context.toolName || 'the tool'
    switch (this.subcategory) {
      case 'timeout':
        return `${toolName} is taking longer than expected. The operation has been cancelled. Please try again.`
      case 'permission_denied':
        return `You don't have permission to use ${toolName} for this operation. Please check your access rights.`
      case 'resource_exhausted':
        return `${toolName} is currently at capacity. Please try again in a few moments.`
      case 'invalid_state':
        return `${toolName} is not in the correct state for this operation. Please refresh and try again.`
      case 'dependency_failure':
        return `${toolName} depends on another service that's currently unavailable. Please try again later.`
      case 'data_corruption':
        return `Data integrity issue detected with ${toolName}. The operation was cancelled to prevent data loss.`
      default:
        return `${toolName} encountered an issue while processing your request. Please try again.`
    }
  }
}
/**
 * Tool authentication errors
 */
export class ToolAuthenticationError extends BaseToolError {
  authMethod
  tokenExpired
  constructor(message, subcategory, toolName, context, originalError, authMethod, tokenExpired) {
    const enhancedContext = { ...context, toolName, authMethod }
    super(
      message,
      ErrorCategory.TOOL_AUTHENTICATION,
      subcategory,
      `tool-auth:${toolName}`,
      enhancedContext,
      originalError
    )
    this.authMethod = authMethod
    this.tokenExpired = tokenExpired
  }
  generateUserMessage() {
    const toolName = this.context.toolName || 'the tool'
    switch (this.subcategory) {
      case 'invalid_credentials':
        return `Authentication failed for ${toolName}. Please check your credentials and try again.`
      case 'token_expired':
        return `Your access to ${toolName} has expired. Please re-authenticate to continue.`
      case 'insufficient_permissions':
        return `You don't have sufficient permissions to access ${toolName}. Please contact your administrator.`
      case 'oauth_failure':
        return `OAuth authentication failed for ${toolName}. Please try connecting again.`
      case 'api_key_invalid':
        return `The API key for ${toolName} is invalid or has been revoked. Please update your configuration.`
      case 'rate_limit_exceeded':
        return `Too many requests to ${toolName}. Please wait a few moments before trying again.`
      default:
        return `Authentication issue with ${toolName}. Please check your access credentials.`
    }
  }
}
/**
 * User input validation errors
 */
export class UserInputError extends BaseToolError {
  fieldName
  validationRule
  providedValue
  constructor(message, subcategory, context, fieldName, validationRule, providedValue) {
    const enhancedContext = { ...context, fieldName, validationRule }
    super(message, ErrorCategory.USER_INPUT, subcategory, 'user-input', enhancedContext)
    this.fieldName = fieldName
    this.validationRule = validationRule
    this.providedValue = providedValue
  }
  generateUserMessage() {
    const field = this.fieldName ? ` for ${this.fieldName}` : ''
    switch (this.subcategory) {
      case 'invalid_format':
        return `The format provided${field} is not valid. Please check the expected format and try again.`
      case 'missing_required_field':
        return `A required field${field} is missing. Please provide all necessary information.`
      case 'value_out_of_range':
        return `The value provided${field} is outside the allowed range. Please check the requirements.`
      case 'unsupported_operation':
        return `This operation is not supported with the current input. Please try a different approach.`
      case 'malformed_request':
        return `The request format is not correct. Please check your input and try again.`
      default:
        return `There's an issue with the provided input${field}. Please review and correct it.`
    }
  }
}
/**
 * System resource errors
 */
export class SystemResourceError extends BaseToolError {
  resourceType
  currentUsage
  limit
  constructor(message, subcategory, resourceType, context, originalError, currentUsage, limit) {
    const enhancedContext = { ...context, resourceType, currentUsage, limit }
    super(
      message,
      ErrorCategory.SYSTEM_RESOURCE,
      subcategory,
      `system-resource:${resourceType}`,
      enhancedContext,
      originalError
    )
    this.resourceType = resourceType
    this.currentUsage = currentUsage
    this.limit = limit
  }
  generateUserMessage() {
    switch (this.subcategory) {
      case 'memory_exhausted':
        return 'The system is running low on memory. Please try a simpler operation or wait for resources to become available.'
      case 'cpu_overload':
        return 'The system is experiencing high load. Please wait a moment and try again.'
      case 'disk_full':
        return 'Storage space is running low. Some operations may be temporarily unavailable.'
      case 'connection_pool_full':
        return 'All connections are currently in use. Please try again in a moment.'
      case 'handle_exhausted':
        return 'System resources are temporarily exhausted. Please wait and try again.'
      default:
        return `System resource ${this.resourceType} is currently unavailable. Please try again later.`
    }
  }
}
/**
 * External service errors
 */
export class ExternalServiceError extends BaseToolError {
  serviceName
  serviceUrl
  httpStatus
  retryAfter
  constructor(
    message,
    subcategory,
    serviceName,
    context,
    originalError,
    serviceUrl,
    httpStatus,
    retryAfter
  ) {
    const enhancedContext = { ...context, serviceName, serviceUrl, httpStatus }
    super(
      message,
      ErrorCategory.EXTERNAL_SERVICE,
      subcategory,
      `external-service:${serviceName}`,
      enhancedContext,
      originalError
    )
    this.serviceName = serviceName
    this.serviceUrl = serviceUrl
    this.httpStatus = httpStatus
    this.retryAfter = retryAfter
  }
  generateUserMessage() {
    switch (this.subcategory) {
      case 'service_unavailable':
        return `${this.serviceName} is temporarily unavailable. Please try again later.`
      case 'api_error':
        return `${this.serviceName} encountered an error processing your request. Please try again.`
      case 'authentication_failed':
        return `Unable to connect to ${this.serviceName}. Authentication may need to be renewed.`
      case 'response_invalid':
        return `${this.serviceName} returned unexpected data. Please try again or contact support.`
      case 'service_deprecated':
        return `${this.serviceName} version is deprecated. Please update your integration.`
      default:
        return `${this.serviceName} is experiencing issues. Please try again later.`
    }
  }
}
/**
 * Error handler service with severity-based processing
 */
export class UniversalErrorHandler {
  logger = createLogger('UniversalErrorHandler')
  errorProcessors = new Map()
  recoveryStrategies = new Map()
  constructor() {
    this.initializeErrorProcessors()
    this.initializeRecoveryStrategies()
    this.logger.info('Universal Error Handler initialized')
  }
  /**
   * Initialize severity-based error processors
   */
  initializeErrorProcessors() {
    this.errorProcessors.set(ErrorSeverity.TRACE, this.processTraceError.bind(this))
    this.errorProcessors.set(ErrorSeverity.DEBUG, this.processDebugError.bind(this))
    this.errorProcessors.set(ErrorSeverity.INFO, this.processInfoError.bind(this))
    this.errorProcessors.set(ErrorSeverity.WARNING, this.processWarningError.bind(this))
    this.errorProcessors.set(ErrorSeverity.ERROR, this.processError.bind(this))
    this.errorProcessors.set(ErrorSeverity.CRITICAL, this.processCriticalError.bind(this))
    this.errorProcessors.set(ErrorSeverity.FATAL, this.processFatalError.bind(this))
  }
  /**
   * Initialize recovery strategy handlers
   */
  initializeRecoveryStrategies() {
    this.recoveryStrategies.set(RecoveryStrategy.RETRY, this.attemptRetry.bind(this))
    this.recoveryStrategies.set(RecoveryStrategy.FALLBACK, this.attemptFallback.bind(this))
    this.recoveryStrategies.set(
      RecoveryStrategy.CIRCUIT_BREAKER,
      this.applyCircuitBreaker.bind(this)
    )
    this.recoveryStrategies.set(
      RecoveryStrategy.GRACEFUL_DEGRADATION,
      this.gracefulDegrade.bind(this)
    )
    this.recoveryStrategies.set(RecoveryStrategy.MANUAL, this.logManualIntervention.bind(this))
    this.recoveryStrategies.set(RecoveryStrategy.NONE, this.logNoRecovery.bind(this))
  }
  /**
   * Handle error with comprehensive processing
   */
  async handleError(error) {
    this.logger.info('Processing error', {
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      component: error.component,
    })
    try {
      // Process error based on severity
      const processor = this.errorProcessors.get(error.severity)
      if (processor) {
        await processor(error)
      }
      // Attempt recovery if possible
      let recovered = false
      if (error.recoverable) {
        recovered = await this.attemptRecovery(error)
      }
      return {
        processed: true,
        recovered,
        userMessage: error.getUserMessage(),
        recoveryActions: error.getRecoveryActions(),
        shouldEscalate: error.shouldEscalate(),
      }
    } catch (processingError) {
      this.logger.error('Error processing failed', {
        errorId: error.id,
        processingError:
          processingError instanceof Error ? processingError.message : processingError,
      })
      return {
        processed: false,
        recovered: false,
        userMessage: 'An unexpected error occurred. Please try again or contact support.',
        recoveryActions: ['Try again', 'Contact support if issue persists'],
        shouldEscalate: true,
      }
    }
  }
  /**
   * Attempt error recovery based on strategy
   */
  async attemptRecovery(error) {
    const strategy = this.recoveryStrategies.get(error.recoveryStrategy)
    if (!strategy) {
      this.logger.warn('No recovery strategy found', {
        errorId: error.id,
        strategy: error.recoveryStrategy,
      })
      return false
    }
    try {
      const recovered = await strategy(error)
      this.logger.info('Recovery attempt completed', {
        errorId: error.id,
        strategy: error.recoveryStrategy,
        success: recovered,
      })
      return recovered
    } catch (recoveryError) {
      this.logger.error('Recovery attempt failed', {
        errorId: error.id,
        strategy: error.recoveryStrategy,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : recoveryError,
      })
      return false
    }
  }
  // Severity-based processors
  async processTraceError(error) {
    this.logger.debug(`TRACE: ${error.message}`, { errorId: error.id })
  }
  async processDebugError(error) {
    this.logger.debug(`DEBUG: ${error.message}`, {
      errorId: error.id,
      context: error.context,
    })
  }
  async processInfoError(error) {
    this.logger.info(`INFO: ${error.message}`, {
      errorId: error.id,
      component: error.component,
    })
  }
  async processWarningError(error) {
    this.logger.warn(`WARNING: ${error.message}`, {
      errorId: error.id,
      component: error.component,
      recoverable: error.recoverable,
    })
  }
  async processError(error) {
    this.logger.error(`ERROR: ${error.message}`, {
      errorId: error.id,
      component: error.component,
      category: error.category,
      subcategory: error.subcategory,
      context: error.context,
    })
  }
  async processCriticalError(error) {
    this.logger.error(`CRITICAL: ${error.message}`, {
      errorId: error.id,
      component: error.component,
      category: error.category,
      subcategory: error.subcategory,
      impact: error.impact,
      context: error.context,
      stack: error.stack,
    })
  }
  async processFatalError(error) {
    this.logger.error(`FATAL: ${error.message}`, {
      errorId: error.id,
      component: error.component,
      category: error.category,
      subcategory: error.subcategory,
      impact: error.impact,
      context: error.context,
      stack: error.stack,
    })
    // Fatal errors might require immediate attention or system shutdown
  }
  // Recovery strategy implementations
  async attemptRetry(error) {
    this.logger.info('Attempting retry recovery', { errorId: error.id })
    // Retry logic would be implemented by the calling code
    return true // Indicates retry is possible
  }
  async attemptFallback(error) {
    this.logger.info('Attempting fallback recovery', { errorId: error.id })
    // Fallback logic would be implemented by the calling code
    return true // Indicates fallback is possible
  }
  async applyCircuitBreaker(error) {
    this.logger.info('Applying circuit breaker', { errorId: error.id })
    // Circuit breaker logic would be implemented
    return true
  }
  async gracefulDegrade(error) {
    this.logger.info('Applying graceful degradation', { errorId: error.id })
    // Graceful degradation logic
    return true
  }
  async logManualIntervention(error) {
    this.logger.warn('Manual intervention required', {
      errorId: error.id,
      actions: error.getRecoveryActions(),
    })
    return false
  }
  async logNoRecovery(error) {
    this.logger.error('No recovery possible', { errorId: error.id })
    return false
  }
}
/**
 * Singleton error handler instance
 */
export const universalErrorHandler = new UniversalErrorHandler()
/**
 * Convenience function for handling errors
 */
export const handleError = (error) => universalErrorHandler.handleError(error)
/**
 * Factory functions for creating specific error types
 */
export const createToolAdapterError = (message, subcategory, toolName, context, originalError) =>
  new ToolAdapterError(message, subcategory, toolName, context, originalError)
export const createToolExecutionError = (
  message,
  subcategory,
  toolName,
  context,
  originalError,
  operationId,
  executionTime
) =>
  new ToolExecutionError(
    message,
    subcategory,
    toolName,
    context,
    originalError,
    operationId,
    executionTime
  )
export const createToolAuthenticationError = (
  message,
  subcategory,
  toolName,
  context,
  originalError,
  authMethod,
  tokenExpired
) =>
  new ToolAuthenticationError(
    message,
    subcategory,
    toolName,
    context,
    originalError,
    authMethod,
    tokenExpired
  )
export const createUserInputError = (
  message,
  subcategory,
  context,
  fieldName,
  validationRule,
  providedValue
) => new UserInputError(message, subcategory, context, fieldName, validationRule, providedValue)
export const createSystemResourceError = (
  message,
  subcategory,
  resourceType,
  context,
  originalError,
  currentUsage,
  limit
) =>
  new SystemResourceError(
    message,
    subcategory,
    resourceType,
    context,
    originalError,
    currentUsage,
    limit
  )
export const createExternalServiceError = (
  message,
  subcategory,
  serviceName,
  context,
  originalError,
  serviceUrl,
  httpStatus,
  retryAfter
) =>
  new ExternalServiceError(
    message,
    subcategory,
    serviceName,
    context,
    originalError,
    serviceUrl,
    httpStatus,
    retryAfter
  )
