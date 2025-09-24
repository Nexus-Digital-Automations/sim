/**
 * Conversational Workflow System Types
 * ====================================
 *
 * Core type definitions for the conversational workflow interface
 * that bridges existing Sim ReactFlow workflows with Parlant agents.
 */

import type { Node, Edge } from 'reactflow'

/**
 * Workflow to Journey Mapping Configuration
 */
export interface WorkflowToJourneyMapping {
  workflowId: string
  journeyId: string
  mappingVersion: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean

  // Mapping configuration
  nodeStateMappings: NodeStateMapping[]
  edgeTransitionMappings: EdgeTransitionMapping[]
  contextVariableMappings: ContextVariableMapping[]

  // Execution configuration
  executionConfig: WorkflowExecutionConfig
  conversationalConfig: ConversationalConfig
}

/**
 * Node to Journey State Mapping
 */
export interface NodeStateMapping {
  nodeId: string
  nodeType: string
  journeyStateId: string

  // Mapping metadata
  displayName: string
  description: string
  isStartState: boolean
  isEndState: boolean

  // Conversational behavior
  conversationTemplate: string
  userPrompts: string[]
  agentResponses: string[]

  // Execution behavior
  executionTrigger: ExecutionTrigger
  validationRules: ValidationRule[]
}

/**
 * Edge to Journey Transition Mapping
 */
export interface EdgeTransitionMapping {
  edgeId: string
  sourceNodeId: string
  targetNodeId: string
  journeyTransitionId: string

  // Transition conditions
  conditions: TransitionCondition[]
  conversationalTriggers: ConversationalTrigger[]

  // User interaction
  requiresConfirmation: boolean
  confirmationMessage: string
}

/**
 * Context Variable Mapping between Workflow and Journey
 */
export interface ContextVariableMapping {
  workflowVariable: string
  journeyVariable: string
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array'
  transformFunction?: string
  defaultValue?: any
}

/**
 * Workflow Execution Configuration for Conversational Mode
 */
export interface WorkflowExecutionConfig {
  mode: 'step-by-step' | 'autonomous' | 'hybrid'
  pausePoints: string[] // Node IDs where execution should pause for user input
  autoApproval: boolean
  timeoutMs: number
  retryPolicy: RetryPolicy
}

/**
 * Conversational Configuration
 */
export interface ConversationalConfig {
  personalityProfile: string
  communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly'
  verbosityLevel: 'minimal' | 'normal' | 'detailed' | 'verbose'

  // User experience
  showProgress: boolean
  explainSteps: boolean
  askForConfirmation: boolean
  provideSuggestions: boolean

  // Error handling
  gracefulDegradation: boolean
  fallbackToVisual: boolean
}

/**
 * Execution Trigger Configuration
 */
export interface ExecutionTrigger {
  type: 'automatic' | 'user-confirmation' | 'user-input' | 'external-event'

  // User input requirements
  inputRequirements?: {
    fields: InputFieldRequirement[]
    validation: ValidationRule[]
  }

  // Confirmation requirements
  confirmationRequirements?: {
    message: string
    options: string[]
    defaultOption?: string
  }
}

/**
 * Input Field Requirements
 */
export interface InputFieldRequirement {
  fieldName: string
  displayName: string
  description: string
  dataType: string
  required: boolean
  defaultValue?: any
  validationPattern?: string
}

/**
 * Validation Rules
 */
export interface ValidationRule {
  type: 'required' | 'pattern' | 'range' | 'custom'
  configuration: Record<string, any>
  errorMessage: string
}

/**
 * Transition Conditions
 */
export interface TransitionCondition {
  type: 'value-based' | 'user-choice' | 'system-state' | 'custom'
  expression: string
  expectedValue?: any
}

/**
 * Conversational Triggers
 */
export interface ConversationalTrigger {
  type: 'user-command' | 'keyword-detection' | 'intent-recognition' | 'context-change'
  pattern: string
  confidence: number
  priority: number
}

/**
 * Retry Policy
 */
export interface RetryPolicy {
  maxAttempts: number
  backoffStrategy: 'linear' | 'exponential' | 'fixed'
  backoffMs: number
  retryableErrors: string[]
}

/**
 * Real-time Workflow State for Conversational Interface
 */
export interface ConversationalWorkflowState {
  workflowId: string
  journeyId: string
  sessionId: string

  // Current execution state
  currentNodeId: string | null
  currentStateId: string | null
  executionStatus: WorkflowExecutionStatus

  // Progress tracking
  completedNodes: string[]
  failedNodes: string[]
  skippedNodes: string[]
  totalNodes: number

  // Context and variables
  workflowContext: Record<string, any>
  journeyContext: Record<string, any>
  userInputs: Record<string, any>

  // Timing information
  startedAt: Date
  lastUpdatedAt: Date
  estimatedCompletionTime?: Date

  // User interaction state
  awaitingUserInput: boolean
  currentUserPrompt?: string
  availableActions: AvailableAction[]

  // Error state
  lastError?: WorkflowExecutionError
  errorCount: number
}

/**
 * Workflow Execution Status
 */
export type WorkflowExecutionStatus =
  | 'not-started'
  | 'running'
  | 'paused'
  | 'waiting-for-input'
  | 'completed'
  | 'failed'
  | 'cancelled'

/**
 * Available Actions for User
 */
export interface AvailableAction {
  actionId: string
  actionType: 'continue' | 'retry' | 'skip' | 'cancel' | 'modify' | 'custom'
  displayName: string
  description: string
  requiresInput: boolean
  inputSchema?: Record<string, any>
}

/**
 * Workflow Execution Error
 */
export interface WorkflowExecutionError {
  errorId: string
  nodeId: string
  errorType: string
  message: string
  details: Record<string, any>
  timestamp: Date
  retryable: boolean
  suggestedActions: string[]
}

/**
 * Conversational Workflow Command
 */
export interface ConversationalWorkflowCommand {
  commandId: string
  workflowId: string
  sessionId: string

  // Command details
  commandType: WorkflowCommandType
  naturalLanguageInput: string
  extractedParameters: Record<string, any>

  // Context
  userId: string
  workspaceId: string
  timestamp: Date

  // Execution preferences
  executionMode?: 'step-by-step' | 'autonomous'
  confirmationRequired?: boolean
  verboseOutput?: boolean
}

/**
 * Workflow Command Types
 */
export type WorkflowCommandType =
  | 'start-workflow'
  | 'pause-workflow'
  | 'resume-workflow'
  | 'cancel-workflow'
  | 'retry-step'
  | 'skip-step'
  | 'modify-input'
  | 'get-status'
  | 'explain-step'
  | 'show-progress'
  | 'list-options'

/**
 * Natural Language Processing Result
 */
export interface NLPProcessingResult {
  originalInput: string
  processedAt: Date

  // Intent recognition
  detectedIntent: string
  intentConfidence: number
  alternativeIntents: { intent: string; confidence: number }[]

  // Entity extraction
  extractedEntities: ExtractedEntity[]

  // Command mapping
  mappedCommand: WorkflowCommandType | null
  commandParameters: Record<string, any>

  // Context understanding
  contextualReferences: ContextualReference[]
  conversationHistory: ConversationTurn[]
}

/**
 * Extracted Entity from Natural Language Input
 */
export interface ExtractedEntity {
  entityType: string
  entityValue: string
  confidence: number
  startPosition: number
  endPosition: number
  canonicalValue?: any
}

/**
 * Contextual Reference
 */
export interface ContextualReference {
  referenceType: 'workflow' | 'step' | 'variable' | 'previous-action'
  referenceId: string
  referenceText: string
  confidence: number
}

/**
 * Conversation Turn for History
 */
export interface ConversationTurn {
  turnId: string
  timestamp: Date
  speaker: 'user' | 'agent'
  content: string
  intent?: string
  extractedEntities?: ExtractedEntity[]
  workflowAction?: string
}

/**
 * Real-time Update Message for Socket.io
 */
export interface ConversationalWorkflowUpdate {
  updateId: string
  workflowId: string
  sessionId: string
  updateType: WorkflowUpdateType
  timestamp: Date

  // Update payload
  data: Record<string, any>

  // Presentation
  userMessage?: string
  agentMessage?: string
  showNotification?: boolean
  requiresAcknowledgment?: boolean
}

/**
 * Workflow Update Types
 */
export type WorkflowUpdateType =
  | 'execution-started'
  | 'node-started'
  | 'node-completed'
  | 'node-failed'
  | 'input-required'
  | 'confirmation-required'
  | 'progress-update'
  | 'execution-completed'
  | 'execution-failed'
  | 'execution-cancelled'

/**
 * Journey State Configuration for Parlant Integration
 */
export interface ParlantJourneyState {
  stateId: string
  stateName: string
  description: string

  // State behavior
  stateType: 'input' | 'processing' | 'confirmation' | 'output' | 'decision'
  isStartState: boolean
  isEndState: boolean

  // Conversational templates
  entryMessage: string
  exitMessage?: string
  errorMessage?: string
  helpMessage?: string

  // Available transitions
  transitions: ParlantJourneyTransition[]

  // Tool integrations
  requiredTools: string[]
  toolParameters: Record<string, any>

  // User interaction
  allowedUserActions: string[]
  customInstructions?: string
}

/**
 * Journey Transition for Parlant Integration
 */
export interface ParlantJourneyTransition {
  transitionId: string
  targetStateId: string

  // Transition conditions
  triggerConditions: string[]
  userCommands: string[]
  systemEvents: string[]

  // Transition behavior
  requiresConfirmation: boolean
  confirmationMessage?: string
  autoTransition: boolean
  transitionDelay?: number
}

/**
 * API Request/Response Types
 */
export interface CreateConversationalWorkflowRequest {
  workflowId: string
  workspaceId: string
  userId: string

  // Configuration
  conversationalConfig: ConversationalConfig
  executionConfig: WorkflowExecutionConfig

  // Initial parameters
  initialInput?: Record<string, any>
  sessionMetadata?: Record<string, any>
}

export interface CreateConversationalWorkflowResponse {
  sessionId: string
  journeyId: string
  initialState: ConversationalWorkflowState
  welcomeMessage: string
  availableCommands: string[]
}

export interface ProcessNaturalLanguageCommandRequest {
  sessionId: string
  workflowId: string
  naturalLanguageInput: string
  userId: string
  workspaceId: string
}

export interface ProcessNaturalLanguageCommandResponse {
  commandProcessed: boolean
  workflowAction: string | null
  agentResponse: string
  updatedState: ConversationalWorkflowState
  suggestedActions: AvailableAction[]
}

export interface GetWorkflowStateRequest {
  sessionId: string
  workflowId: string
  userId: string
  workspaceId: string
}

export interface GetWorkflowStateResponse {
  currentState: ConversationalWorkflowState
  recentHistory: ConversationTurn[]
  availableActions: AvailableAction[]
  progressSummary: string
}