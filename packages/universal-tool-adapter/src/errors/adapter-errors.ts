/**
 * Universal Tool Adapter - Error Definitions
 *
 * Comprehensive error classes for the adapter system with detailed error
 * information, context, and recovery suggestions.
 *
 * @author Claude Code Adapter Pattern Design Agent
 * @version 1.0.0
 */

/**
 * Base adapter error class with enhanced context and recovery information
 */
export class AdapterError extends Error {
  public readonly code: string
  public readonly context: Record<string, any>
  public readonly timestamp: Date
  public readonly recoverable: boolean
  public readonly suggestedFix?: string
  public readonly originalError?: Error

  constructor(
    message: string,
    code = 'ADAPTER_ERROR',
    context: Record<string, any> = {},
    recoverable = false,
    suggestedFix?: string,
    originalError?: Error
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.context = context
    this.timestamp = new Date()
    this.recoverable = recoverable
    this.suggestedFix = suggestedFix
    this.originalError = originalError

    // Ensure stack trace points to the actual error location
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert error to serializable format
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      recoverable: this.recoverable,
      suggestedFix: this.suggestedFix,
      stack: this.stack,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : undefined,
    }
  }

  /**
   * Create user-friendly error message
   */
  toUserMessage(): string {
    if (this.suggestedFix) {
      return `${this.message}. ${this.suggestedFix}`
    }
    return this.message
  }
}

/**
 * Configuration and setup errors
 */
export class ConfigurationError extends AdapterError {
  constructor(
    message: string,
    context: Record<string, any> = {},
    suggestedFix?: string,
    originalError?: Error
  ) {
    super(
      message,
      'CONFIGURATION_ERROR',
      context,
      true, // Usually recoverable with config fixes
      suggestedFix || 'Please check your adapter configuration and try again.',
      originalError
    )
  }

  static invalidParameter(
    parameterName: string,
    expectedType: string,
    actualValue: any
  ): ConfigurationError {
    return new ConfigurationError(
      `Invalid configuration parameter: ${parameterName}`,
      {
        parameterName,
        expectedType,
        actualValue,
        actualType: typeof actualValue,
      },
      `The parameter '${parameterName}' should be of type '${expectedType}', but received '${typeof actualValue}'.`
    )
  }

  static missingRequired(requiredFields: string[]): ConfigurationError {
    return new ConfigurationError(
      'Missing required configuration fields',
      { requiredFields },
      `Please provide the following required fields: ${requiredFields.join(', ')}`
    )
  }

  static invalidFormat(
    fieldName: string,
    expectedFormat: string,
    actualValue: any
  ): ConfigurationError {
    return new ConfigurationError(
      `Invalid format for field: ${fieldName}`,
      { fieldName, expectedFormat, actualValue },
      `The field '${fieldName}' should match the format: ${expectedFormat}`
    )
  }
}

/**
 * Parameter validation and mapping errors
 */
export class ValidationError extends AdapterError {
  public readonly validationErrors: Array<{
    field: string
    message: string
    code: string
  }>

  constructor(
    message: string,
    validationErrors: Array<{ field: string; message: string; code: string }> = [],
    context: Record<string, any> = {},
    suggestedFix?: string
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      { ...context, validationErrors },
      true, // Usually recoverable with parameter fixes
      suggestedFix || 'Please check the provided parameters and try again.'
    )
    this.validationErrors = validationErrors
  }

  static requiredField(fieldName: string): ValidationError {
    return new ValidationError(
      `Required field missing: ${fieldName}`,
      [{ field: fieldName, message: 'This field is required', code: 'REQUIRED' }],
      { fieldName },
      `Please provide a value for the required field: ${fieldName}`
    )
  }

  static invalidType(fieldName: string, expectedType: string, actualType: string): ValidationError {
    return new ValidationError(
      `Invalid type for field: ${fieldName}`,
      [
        {
          field: fieldName,
          message: `Expected ${expectedType} but received ${actualType}`,
          code: 'INVALID_TYPE',
        },
      ],
      { fieldName, expectedType, actualType },
      `The field '${fieldName}' should be of type '${expectedType}'.`
    )
  }

  static rangeError(fieldName: string, value: number, min?: number, max?: number): ValidationError {
    const constraints = []
    if (min !== undefined) constraints.push(`minimum: ${min}`)
    if (max !== undefined) constraints.push(`maximum: ${max}`)

    return new ValidationError(
      `Value out of range for field: ${fieldName}`,
      [
        {
          field: fieldName,
          message: `Value ${value} is outside the allowed range (${constraints.join(', ')})`,
          code: 'OUT_OF_RANGE',
        },
      ],
      { fieldName, value, min, max },
      `Please provide a value for '${fieldName}' within the allowed range.`
    )
  }

  static patternMismatch(fieldName: string, value: string, pattern: string): ValidationError {
    return new ValidationError(
      `Pattern mismatch for field: ${fieldName}`,
      [
        {
          field: fieldName,
          message: `Value does not match the required pattern: ${pattern}`,
          code: 'PATTERN_MISMATCH',
        },
      ],
      { fieldName, value, pattern },
      `The field '${fieldName}' should match the pattern: ${pattern}`
    )
  }

  static customValidation(
    fieldName: string,
    message: string,
    code = 'CUSTOM_VALIDATION'
  ): ValidationError {
    return new ValidationError(
      `Custom validation failed for field: ${fieldName}`,
      [{ field: fieldName, message, code }],
      { fieldName },
      message
    )
  }
}

/**
 * Tool execution errors
 */
export class ExecutionError extends AdapterError {
  public readonly executionPhase:
    | 'initialization'
    | 'parameter_mapping'
    | 'validation'
    | 'execution'
    | 'result_formatting'
  public readonly toolName: string
  public readonly executionId?: string

  constructor(
    message: string,
    originalError: Error,
    executionPhase: ExecutionError['executionPhase'] = 'execution',
    toolName = 'unknown',
    executionId?: string,
    context: Record<string, any> = {}
  ) {
    const enhancedContext = {
      ...context,
      executionPhase,
      toolName,
      executionId,
      originalErrorType: originalError.name,
    }

    super(
      message,
      'EXECUTION_ERROR',
      enhancedContext,
      false, // Execution errors are typically not recoverable
      ExecutionError.getSuggestedFix(executionPhase, originalError),
      originalError
    )

    this.executionPhase = executionPhase
    this.toolName = toolName
    this.executionId = executionId
  }

  static getSuggestedFix(phase: ExecutionError['executionPhase'], originalError: Error): string {
    switch (phase) {
      case 'initialization':
        return 'Check tool configuration and ensure all required dependencies are available.'

      case 'parameter_mapping':
        return 'Verify parameter mapping configuration and ensure all required parameters are provided.'

      case 'validation':
        return 'Check parameter values and ensure they meet all validation requirements.'

      case 'execution':
        if (originalError.message.toLowerCase().includes('timeout')) {
          return 'The operation timed out. Try again or consider increasing the timeout limit.'
        }
        if (originalError.message.toLowerCase().includes('network')) {
          return 'Network error occurred. Check connectivity and try again.'
        }
        if (
          originalError.message.toLowerCase().includes('permission') ||
          originalError.message.toLowerCase().includes('unauthorized')
        ) {
          return 'Permission denied. Ensure you have the required permissions to perform this operation.'
        }
        return 'An error occurred during tool execution. Check the logs for more details.'

      case 'result_formatting':
        return 'Error occurred while formatting the result. The operation may have succeeded but the response could not be formatted properly.'

      default:
        return 'Please try again or contact support if the problem persists.'
    }
  }

  static timeout(toolName: string, timeoutMs: number, executionId?: string): ExecutionError {
    return new ExecutionError(
      `Tool execution timed out after ${timeoutMs}ms`,
      new Error('Execution timeout'),
      'execution',
      toolName,
      executionId,
      { timeoutMs }
    )
  }

  static networkError(
    toolName: string,
    originalError: Error,
    executionId?: string
  ): ExecutionError {
    return new ExecutionError(
      'Network error during tool execution',
      originalError,
      'execution',
      toolName,
      executionId,
      { errorType: 'network' }
    )
  }

  static permissionDenied(
    toolName: string,
    requiredPermission: string,
    executionId?: string
  ): ExecutionError {
    return new ExecutionError(
      `Permission denied: ${requiredPermission} required`,
      new Error('Permission denied'),
      'execution',
      toolName,
      executionId,
      { requiredPermission }
    )
  }
}

/**
 * Registry and tool management errors
 */
export class RegistryError extends AdapterError {
  public readonly operation: 'register' | 'unregister' | 'lookup' | 'discovery' | 'health_check'

  constructor(
    message: string,
    operation: RegistryError['operation'],
    context: Record<string, any> = {},
    recoverable = true,
    suggestedFix?: string
  ) {
    super(
      message,
      'REGISTRY_ERROR',
      { ...context, operation },
      recoverable,
      suggestedFix || 'Check the registry configuration and try again.'
    )
    this.operation = operation
  }

  static toolNotFound(toolId: string): RegistryError {
    return new RegistryError(
      `Tool not found: ${toolId}`,
      'lookup',
      { toolId },
      false,
      `The tool '${toolId}' is not registered. Check the tool ID and ensure it has been properly registered.`
    )
  }

  static duplicateRegistration(toolId: string): RegistryError {
    return new RegistryError(
      `Tool already registered: ${toolId}`,
      'register',
      { toolId },
      true,
      `A tool with ID '${toolId}' is already registered. Use a different ID or unregister the existing tool first.`
    )
  }

  static registrationFailed(toolId: string, reason: string, originalError?: Error): RegistryError {
    return new RegistryError(
      `Failed to register tool: ${toolId}`,
      'register',
      { toolId, reason },
      true,
      `Registration failed: ${reason}. Please fix the issues and try again.`
    )
  }

  static healthCheckFailed(toolId: string, issues: string[]): RegistryError {
    return new RegistryError(
      `Health check failed for tool: ${toolId}`,
      'health_check',
      { toolId, issues },
      false,
      `The tool '${toolId}' is unhealthy. Issues: ${issues.join(', ')}`
    )
  }
}

/**
 * Plugin system errors
 */
export class PluginError extends AdapterError {
  public readonly pluginName: string
  public readonly pluginVersion?: string

  constructor(
    message: string,
    pluginName: string,
    pluginVersion?: string,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(
      message,
      'PLUGIN_ERROR',
      { ...context, pluginName, pluginVersion },
      true, // Plugin errors are usually recoverable
      'Check the plugin configuration and ensure all dependencies are satisfied.',
      originalError
    )
    this.pluginName = pluginName
    this.pluginVersion = pluginVersion
  }

  static loadFailed(pluginName: string, reason: string, originalError?: Error): PluginError {
    return new PluginError(
      `Failed to load plugin: ${pluginName}`,
      pluginName,
      undefined,
      { reason },
      originalError
    )
  }

  static dependencyMissing(pluginName: string, missingDependencies: string[]): PluginError {
    return new PluginError(`Plugin dependencies missing: ${pluginName}`, pluginName, undefined, {
      missingDependencies,
    })
  }

  static initializationFailed(pluginName: string, originalError: Error): PluginError {
    return new PluginError(
      `Plugin initialization failed: ${pluginName}`,
      pluginName,
      undefined,
      {},
      originalError
    )
  }

  static incompatibleVersion(
    pluginName: string,
    requiredVersion: string,
    actualVersion: string
  ): PluginError {
    return new PluginError(
      `Plugin version incompatible: ${pluginName}`,
      pluginName,
      actualVersion,
      { requiredVersion, actualVersion }
    )
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthenticationError extends AdapterError {
  public readonly authProvider?: string
  public readonly userId?: string

  constructor(
    message: string,
    authProvider?: string,
    userId?: string,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(
      message,
      'AUTHENTICATION_ERROR',
      { ...context, authProvider, userId },
      true, // Auth errors are usually recoverable with re-authentication
      'Please check your authentication credentials and try again.',
      originalError
    )
    this.authProvider = authProvider
    this.userId = userId
  }

  static invalidCredentials(authProvider?: string): AuthenticationError {
    return new AuthenticationError(
      'Invalid authentication credentials',
      authProvider,
      undefined,
      {},
      undefined
    )
  }

  static tokenExpired(authProvider?: string, userId?: string): AuthenticationError {
    return new AuthenticationError(
      'Authentication token has expired',
      authProvider,
      userId,
      {},
      undefined
    )
  }

  static insufficientPermissions(
    requiredPermissions: string[],
    userId?: string
  ): AuthenticationError {
    return new AuthenticationError(
      'Insufficient permissions for this operation',
      undefined,
      userId,
      { requiredPermissions }
    )
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AdapterError {
  public readonly limitType: 'requests' | 'bandwidth' | 'concurrent' | 'quota'
  public readonly resetTime?: Date
  public readonly retryAfterMs?: number

  constructor(
    message: string,
    limitType: RateLimitError['limitType'],
    resetTime?: Date,
    retryAfterMs?: number,
    context: Record<string, any> = {}
  ) {
    super(
      message,
      'RATE_LIMIT_ERROR',
      { ...context, limitType, resetTime, retryAfterMs },
      true, // Rate limit errors are recoverable after waiting
      retryAfterMs
        ? `Please wait ${Math.ceil(retryAfterMs / 1000)} seconds before trying again.`
        : 'Please wait before making another request.'
    )
    this.limitType = limitType
    this.resetTime = resetTime
    this.retryAfterMs = retryAfterMs
  }

  static requestLimitExceeded(
    currentCount: number,
    limit: number,
    resetTime?: Date
  ): RateLimitError {
    return new RateLimitError(
      `Request limit exceeded: ${currentCount}/${limit}`,
      'requests',
      resetTime,
      resetTime ? resetTime.getTime() - Date.now() : undefined,
      { currentCount, limit }
    )
  }

  static concurrentLimitExceeded(currentCount: number, limit: number): RateLimitError {
    return new RateLimitError(
      `Concurrent request limit exceeded: ${currentCount}/${limit}`,
      'concurrent',
      undefined,
      5000, // Default 5 second retry
      { currentCount, limit }
    )
  }
}

/**
 * Data format and serialization errors
 */
export class SerializationError extends AdapterError {
  public readonly dataType: string
  public readonly operation: 'serialize' | 'deserialize' | 'transform'

  constructor(
    message: string,
    dataType: string,
    operation: SerializationError['operation'],
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(
      message,
      'SERIALIZATION_ERROR',
      { ...context, dataType, operation },
      true, // Usually recoverable with data fixes
      'Check the data format and ensure it matches the expected schema.',
      originalError
    )
    this.dataType = dataType
    this.operation = operation
  }

  static invalidJson(data: string): SerializationError {
    return new SerializationError(
      'Invalid JSON format',
      'json',
      'deserialize',
      { data: data.substring(0, 100) } // Truncate for logging
    )
  }

  static schemaValidationFailed(dataType: string, validationErrors: any[]): SerializationError {
    return new SerializationError('Schema validation failed', dataType, 'deserialize', {
      validationErrors,
    })
  }
}

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
  /**
   * Check if an error is recoverable
   */
  static isRecoverable(error: Error): boolean {
    if (error instanceof AdapterError) {
      return error.recoverable
    }

    // Default recovery logic for non-adapter errors
    const nonRecoverablePatterns = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'MODULE_NOT_FOUND']

    return !nonRecoverablePatterns.some((pattern) =>
      error instanceof Error
        ? error.message
        : String(error).includes(pattern) || error.name.includes(pattern)
    )
  }

  /**
   * Extract user-friendly message from any error
   */
  static getUserMessage(error: Error): string {
    if (error instanceof AdapterError) {
      return error.toUserMessage()
    }

    // Convert common error types to user-friendly messages
    if (error instanceof Error ? error.message : String(error).includes('ENOTFOUND')) {
      return 'Network connection failed. Please check your internet connection and try again.'
    }

    if (error instanceof Error ? error.message : String(error).includes('ETIMEDOUT')) {
      return 'The operation timed out. Please try again later.'
    }

    if (error instanceof Error ? error.message : String(error).includes('ECONNREFUSED')) {
      return 'Could not connect to the service. Please try again later.'
    }

    if (error instanceof Error ? error.message : String(error).includes('EACCES')) {
      return 'Permission denied. Please check your access rights.'
    }

    return error instanceof Error ? error.message : String(error) || 'An unexpected error occurred.'
  }

  /**
   * Get suggested recovery actions for an error
   */
  static getRecoveryActions(error: Error): string[] {
    const actions: string[] = []

    if (error instanceof ValidationError) {
      actions.push('Check parameter values')
      actions.push('Verify required fields are provided')
      actions.push('Ensure data types match requirements')
    } else if (error instanceof AuthenticationError) {
      actions.push('Verify authentication credentials')
      actions.push('Check token expiration')
      actions.push('Ensure required permissions')
    } else if (error instanceof RateLimitError) {
      actions.push('Wait before retrying')
      actions.push('Reduce request frequency')
      actions.push('Consider upgrading rate limits')
    } else if (error instanceof ExecutionError) {
      actions.push('Check tool configuration')
      actions.push('Verify input parameters')
      actions.push('Check service availability')
    } else {
      actions.push('Try again')
      actions.push('Check configuration')
      actions.push('Contact support if problem persists')
    }

    return actions
  }

  /**
   * Wrap a non-adapter error in an adapter error
   */
  static wrapError(
    originalError: Error,
    context: Record<string, any> = {},
    suggestedFix?: string
  ): AdapterError {
    return new AdapterError(
      originalError.message,
      'WRAPPED_ERROR',
      context,
      ErrorUtils.isRecoverable(originalError),
      suggestedFix,
      originalError
    )
  }

  /**
   * Create error from HTTP response
   */
  static fromHttpResponse(
    status: number,
    statusText: string,
    body?: any,
    context: Record<string, any> = {}
  ): AdapterError {
    let errorClass = AdapterError
    let message = `HTTP ${status}: ${statusText}`

    if (status === 400) {
      errorClass = ValidationError
      message = `Bad request: ${body?.message || statusText}`
    } else if (status === 401) {
      errorClass = AuthenticationError
      message = `Unauthorized: ${body?.message || statusText}`
    } else if (status === 403) {
      errorClass = AuthenticationError
      message = `Forbidden: ${body?.message || statusText}`
    } else if (status === 404) {
      errorClass = RegistryError
      message = `Not found: ${body?.message || statusText}`
    } else if (status === 429) {
      errorClass = RateLimitError
      message = `Rate limit exceeded: ${body?.message || statusText}`
    }

    return new errorClass(
      message,
      `HTTP_${status}`,
      { ...context, httpStatus: status, httpBody: body },
      status < 500, // Client errors (4xx) are usually recoverable
      ErrorUtils.getHttpSuggestedFix(status)
    )
  }

  /**
   * Get suggested fix for HTTP status codes
   */
  private static getHttpSuggestedFix(status: number): string {
    switch (status) {
      case 400:
        return 'Check the request parameters and ensure they are valid.'
      case 401:
        return 'Please authenticate and try again.'
      case 403:
        return 'You do not have permission to perform this action.'
      case 404:
        return 'The requested resource was not found. Check the URL or resource ID.'
      case 429:
        return 'Rate limit exceeded. Please wait before making another request.'
      case 500:
        return 'Server error occurred. Please try again later.'
      case 502:
        return 'Service temporarily unavailable. Please try again later.'
      case 503:
        return 'Service is currently unavailable. Please try again later.'
      default:
        return 'Please try again or contact support if the problem persists.'
    }
  }
}
