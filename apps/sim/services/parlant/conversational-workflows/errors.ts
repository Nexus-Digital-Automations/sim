/**
 * Conversational Workflow Error Types
 * ==================================
 *
 * Custom error classes for conversational workflow system
 */

/**
 * Base error class for conversational workflow errors
 */
export class ConversationalWorkflowError extends Error {
  public readonly errorCode: string
  public readonly context: Record<string, any>
  public readonly retryable: boolean
  public readonly timestamp: Date

  constructor(
    message: string,
    errorCode: string,
    context: Record<string, any> = {},
    retryable = false
  ) {
    super(message)
    this.name = 'ConversationalWorkflowError'
    this.errorCode = errorCode
    this.context = context
    this.retryable = retryable
    this.timestamp = new Date()

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConversationalWorkflowError)
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      context: this.context,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    }
  }
}

/**
 * Error for workflow mapping issues
 */
export class WorkflowMappingError extends ConversationalWorkflowError {
  constructor(
    message: string,
    errorCode: string,
    context: Record<string, any> = {},
    retryable = false
  ) {
    super(message, errorCode, context, retryable)
    this.name = 'WorkflowMappingError'
  }
}

/**
 * Error for natural language processing issues
 */
export class NLPProcessingError extends ConversationalWorkflowError {
  public readonly originalInput: string
  public readonly processingStage: string

  constructor(
    message: string,
    errorCode: string,
    originalInput: string,
    processingStage: string,
    context: Record<string, any> = {},
    retryable = true
  ) {
    super(message, errorCode, context, retryable)
    this.name = 'NLPProcessingError'
    this.originalInput = originalInput
    this.processingStage = processingStage
  }

  toJSON() {
    return {
      ...super.toJSON(),
      originalInput: this.originalInput,
      processingStage: this.processingStage,
    }
  }
}

/**
 * Error for command processing issues
 */
export class CommandProcessingError extends ConversationalWorkflowError {
  public readonly userFriendlyMessage: string

  constructor(
    message: string,
    errorCode: string,
    context: Record<string, any> = {},
    retryable = true,
    userFriendlyMessage?: string
  ) {
    super(message, errorCode, context, retryable)
    this.name = 'CommandProcessingError'
    this.userFriendlyMessage = userFriendlyMessage || message
  }

  toJSON() {
    return {
      ...super.toJSON(),
      userFriendlyMessage: this.userFriendlyMessage,
    }
  }
}

/**
 * Error for session management issues
 */
export class SessionManagementError extends ConversationalWorkflowError {
  public readonly sessionId: string

  constructor(
    message: string,
    errorCode: string,
    sessionId: string,
    context: Record<string, any> = {},
    retryable = false
  ) {
    super(message, errorCode, context, retryable)
    this.name = 'SessionManagementError'
    this.sessionId = sessionId
  }

  toJSON() {
    return {
      ...super.toJSON(),
      sessionId: this.sessionId,
    }
  }
}

/**
 * Error for real-time communication issues
 */
export class RealtimeCommunicationError extends ConversationalWorkflowError {
  public readonly communicationType: 'socket' | 'webhook' | 'poll'

  constructor(
    message: string,
    errorCode: string,
    communicationType: 'socket' | 'webhook' | 'poll',
    context: Record<string, any> = {},
    retryable = true
  ) {
    super(message, errorCode, context, retryable)
    this.name = 'RealtimeCommunicationError'
    this.communicationType = communicationType
  }

  toJSON() {
    return {
      ...super.toJSON(),
      communicationType: this.communicationType,
    }
  }
}
