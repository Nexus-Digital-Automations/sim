/**
 * Conversational Workflow System - Main Export
 * ============================================
 *
 * Main exports for the conversational workflow system that bridges
 * ReactFlow workflows with Parlant conversational agents.
 */

// Socket.io integration
export {
  broadcastToSessionRoom,
  setupConversationalWorkflowHandlers,
} from '../../../socket-server/handlers/conversational-workflows'
// API handlers
export {
  createConversationalWorkflowHandler,
  formatErrorResponse,
  getSessionMetricsHandler,
  getWorkflowStateHandler,
  processNaturalLanguageCommandHandler,
  terminateWorkflowSessionHandler,
} from './api'
// Core service and types
export {
  ConversationalWorkflowService,
  createConversationalWorkflowService,
  getConversationalWorkflowService,
} from './core'
// Error classes
export {
  CommandProcessingError,
  ConversationalWorkflowError,
  NLPProcessingError,
  RealtimeCommunicationError,
  SessionManagementError,
  WorkflowMappingError,
} from './errors'
export { WorkflowJourneyMapper } from './mapper'
export { NaturalLanguageProcessor } from './nlp'
export { RealtimeStateManager } from './state-manager'
// Type definitions
export type {
  AvailableAction,
  ContextualReference,
  ContextVariableMapping,
  ConversationalConfig,
  ConversationalTrigger,
  ConversationalWorkflowCommand,
  ConversationalWorkflowState,
  ConversationalWorkflowUpdate,
  ConversationTurn,
  // API types
  CreateConversationalWorkflowRequest,
  CreateConversationalWorkflowResponse,
  EdgeTransitionMapping,
  ExecutionTrigger,
  ExtractedEntity,
  GetWorkflowStateRequest,
  GetWorkflowStateResponse,
  // Helper types
  InputFieldRequirement,
  // NLP types
  NLPProcessingResult,
  NodeStateMapping,
  // Parlant integration types
  ParlantJourneyState,
  ParlantJourneyTransition,
  ProcessNaturalLanguageCommandRequest,
  ProcessNaturalLanguageCommandResponse,
  RetryPolicy,
  TransitionCondition,
  ValidationRule,
  WorkflowCommandType,
  // Configuration types
  WorkflowExecutionConfig,
  WorkflowExecutionError,
  // State management types
  WorkflowExecutionStatus,
  // Core workflow types
  WorkflowToJourneyMapping,
  WorkflowUpdateType,
} from './types'

/**
 * System constants
 */
export const CONVERSATIONAL_WORKFLOW_CONSTANTS = {
  // Version
  VERSION: '1.0.0',

  // Event NAMES for Socket.io
  SOCKET_EVENTS: {
    CREATE_WORKFLOW: 'create-conversational-workflow',
    PROCESS_COMMAND: 'process-nl-command',
    GET_STATE: 'get-workflow-state',
    TERMINATE_SESSION: 'terminate-workflow-session',
    GET_METRICS: 'get-session-metrics',
    JOIN_SESSION: 'join-workflow-session',
    LEAVE_SESSION: 'leave-workflow-session',

    // Broadcast events
    UPDATE: 'conversational-workflow-update',
    SESSION_STARTED: 'conversational-workflow-session-started',
    SESSION_TERMINATED: 'conversational-workflow-session-terminated',
    COMMAND_PROCESSED: 'conversational-workflow-command-processed',
    PARTICIPANT_JOINED: 'conversational-workflow-participant-joined',
    PARTICIPANT_LEFT: 'conversational-workflow-participant-left',
    PARTICIPANT_DISCONNECTED: 'conversational-workflow-participant-disconnected',
  },

  // Default configurations
  DEFAULT_EXECUTION_CONFIG: {
    mode: 'step-by-step' as const,
    pausePoints: [],
    autoApproval: false,
    timeoutMs: 300000, // 5 minutes
    retryPolicy: {
      maxAttempts: 3,
      backoffStrategy: 'exponential' as const,
      backoffMs: 1000,
      retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'TEMPORARY_FAILURE'],
    },
  },

  DEFAULT_CONVERSATIONAL_CONFIG: {
    personalityProfile: 'helpful-assistant',
    communicationStyle: 'friendly' as const,
    verbosityLevel: 'normal' as const,
    showProgress: true,
    explainSteps: true,
    askForConfirmation: true,
    provideSuggestions: true,
    gracefulDegradation: true,
    fallbackToVisual: true,
  },

  // Limits and thresholds
  LIMITS: {
    MAX_INPUT_LENGTH: 1000,
    MAX_SESSION_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours
    MAX_CONVERSATION_HISTORY: 50,
    SESSION_CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
    INACTIVE_SESSION_TIMEOUT_MS: 60 * 60 * 1000, // 1 hour
  },

  // Error codes
  ERROR_CODES: {
    CREATION_FAILED: 'CREATION_FAILED',
    MAPPING_FAILED: 'MAPPING_FAILED',
    COMMAND_PROCESSING_FAILED: 'COMMAND_PROCESSING_FAILED',
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    INVALID_REQUEST: 'INVALID_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    NLP_PROCESSING_FAILED: 'NLP_PROCESSING_FAILED',
    STATE_UPDATE_FAILED: 'STATE_UPDATE_FAILED',
    REALTIME_COMMUNICATION_FAILED: 'REALTIME_COMMUNICATION_FAILED',
  },
} as const

/**
 * Utility functions
 */
export const ConversationalWorkflowUtils = {
  /**
   * Generate session room Name for Socket.io
   */
  getSessionRoomName(sessionId: string): string {
    return `conversational-workflow:${sessionId}`
  },

  /**
   * Calculate progress percentage from state
   */
  calculateProgress(state: ConversationalWorkflowState): number {
    if (state.totalNodes === 0) return 0
    return Math.round((state.completedNodes.length / state.totalNodes) * 100)
  },

  /**
   * Check if session is active
   */
  isSessionActive(state: ConversationalWorkflowState): boolean {
    const activeStatuses: WorkflowExecutionStatus[] = ['running', 'paused', 'waiting-for-input']
    return activeStatuses.includes(state.executionStatus)
  },

  /**
   * Get user-friendly status message
   */
  getStatusMessage(state: ConversationalWorkflowState): string {
    const progress = this.calculateProgress(state)

    switch (state.executionStatus) {
      case 'not-started':
        return 'Ready to begin'
      case 'running':
        return `Running (${progress}% complete)`
      case 'paused':
        return `Paused at ${progress}%`
      case 'waiting-for-input':
        return `Waiting for input (${progress}% complete)`
      case 'completed':
        return 'Completed successfully'
      case 'failed':
        return `Failed at ${progress}%`
      case 'cancelled':
        return `Cancelled at ${progress}%`
      default:
        return 'Unknown status'
    }
  },

  /**
   * Validate session ID format
   */
  isValidSessionId(sessionId: string): boolean {
    return /^cw_session_\d+_[a-z0-9]{9}$/.test(sessionId)
  },

  /**
   * Extract command type from natural language
   */
  extractCommandHints(input: string): string[] {
    const hints: string[] = []
    const lowercaseInput = input.toLowerCase()

    if (lowercaseInput.includes('start') || lowercaseInput.includes('begin')) {
      hints.push('start-workflow')
    }
    if (lowercaseInput.includes('pause') || lowercaseInput.includes('stop')) {
      hints.push('pause-workflow')
    }
    if (lowercaseInput.includes('resume') || lowercaseInput.includes('continue')) {
      hints.push('resume-workflow')
    }
    if (lowercaseInput.includes('cancel') || lowercaseInput.includes('abort')) {
      hints.push('cancel-workflow')
    }
    if (lowercaseInput.includes('status') || lowercaseInput.includes('progress')) {
      hints.push('get-status')
    }
    if (lowercaseInput.includes('help') || lowercaseInput.includes('explain')) {
      hints.push('explain-step')
    }

    return hints
  },
}

/**
 * Development and testing utilities
 */
export const ConversationalWorkflowDev = {
  /**
   * Create a mock workflow state for testing
   */
  createMockWorkflowState(
    overrides: Partial<ConversationalWorkflowState> = {}
  ): ConversationalWorkflowState {
    return {
      workflowId: 'test-workflow',
      journeyId: 'test-journey',
      sessionId: 'cw_session_123456789_abcdefghi',
      currentNodeId: 'node1',
      currentStateId: 'state1',
      executionStatus: 'running',
      completedNodes: ['node0'],
      failedNodes: [],
      skippedNodes: [],
      totalNodes: 5,
      workflowContext: { testKey: 'testValue' },
      journeyContext: { journeyKey: 'journeyValue' },
      userInputs: {},
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
      awaitingUserInput: false,
      availableActions: [
        {
          actionId: 'continue',
          actionType: 'continue',
          displayName: 'Continue',
          description: 'Continue workflow execution',
          requiresInput: false,
        },
      ],
      errorCount: 0,
      ...overrides,
    }
  },

  /**
   * Create a mock NLP result for testing
   */
  createMockNLPResult(overrides: Partial<NLPProcessingResult> = {}): NLPProcessingResult {
    return {
      originalInput: 'start the workflow',
      processedAt: new Date(),
      detectedIntent: 'start-workflow',
      intentConfidence: 0.85,
      alternativeIntents: [],
      extractedEntities: [],
      mappedCommand: 'start-workflow',
      commandParameters: {},
      contextualReferences: [],
      conversationHistory: [],
      ...overrides,
    }
  },
}
