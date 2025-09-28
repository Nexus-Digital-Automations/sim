/**
 * Journey Execution Type Definitions
 *
 * Comprehensive type definitions for the Parlant Journey Execution system,
 * supporting conversational workflow execution and state management.
 */

/**
 * Journey definition structure converted from ReactFlow workflows
 */
export interface JourneyDefinition {
  id: string
  title: string
  description: string
  conditions: string[]
  states: JourneyState[]
  transitions?: StateTransition[]
  metadata?: {
    originalWorkflowId?: string
    conversionTimestamp?: string
    preservedAttributes?: Record<string, any>
    version?: string
    author?: string
  }
}

/**
 * Individual journey state representing a workflow step
 */
export interface JourneyState {
  id: string
  type: StateType
  Name?: string
  description?: string
  config?: StateConfiguration
  position?: { x: number; y: number }
  originalNodeId?: string
  onEntry?: Action[]
  onExit?: Action[]
}

/**
 * Available state types in journey execution
 */
export type StateType =
  | 'initial' // Starting state
  | 'final' // Completion state
  | 'tool_state' // Tool execution
  | 'chat_state' // User interaction
  | 'conditional' // Conditional logic
  | 'parallel' // Parallel execution
  | 'loop' // Iterative execution
  | 'input_collection' // Data collection
  | 'merge' // Branch merging
  | 'delay' // Time-based delay

/**
 * State configuration containing execution parameters
 */
export interface StateConfiguration {
  toolId?: string
  parameters?: Record<string, any>
  condition?: string
  branches?: string[]
  timeout?: number
  retryConfig?: RetryConfiguration
  inputSchema?: InputSchema
  outputMapping?: OutputMapping
}

/**
 * Retry configuration for state execution
 */
export interface RetryConfiguration {
  maxAttempts: number
  backoffStrategy: 'linear' | 'exponential' | 'fixed'
  initialDelayMs: number
  maxDelayMs: number
  retryableErrorCodes?: string[]
}

/**
 * Input schema for user input collection states
 */
export interface InputSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array'
  properties?: Record<string, InputSchemaProperty>
  required?: string[]
  validation?: ValidationRule[]
}

export interface InputSchemaProperty {
  type: string
  description?: string
  enum?: any[]
  default?: any
  format?: string
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom'
  value?: any
  message?: string
}

/**
 * Output mapping for transforming state results
 */
export interface OutputMapping {
  [key: string]: string | OutputTransform
}

export interface OutputTransform {
  source: string
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'json_parse' | 'custom'
  customTransform?: string
}

/**
 * State transition definition
 */
export interface StateTransition {
  id: string
  from: string
  to: string
  condition?: string
  priority?: number
  metadata?: Record<string, any>
  originalEdgeId?: string
}

/**
 * Journey execution action
 */
export interface Action {
  type: ActionType
  parameters: Record<string, any>
}

export type ActionType =
  | 'set_variable'
  | 'send_message'
  | 'log_event'
  | 'update_progress'
  | 'trigger_webhook'

/**
 * Overall execution result for journey operations
 */
export interface ExecutionResult {
  success: boolean
  journeyId: string
  currentState: string
  progress: ProgressTracker
  response?: string
  userInputRequired?: boolean
  completed?: boolean
  error?: ExecutionError
  metadata?: ExecutionMetadata
}

/**
 * Execution error information
 */
export interface ExecutionError {
  code: string
  message: string
  recoverable: boolean
  fallbackStateId?: string
  details?: Record<string, any>
}

/**
 * Execution metadata for tracking and analytics
 */
export interface ExecutionMetadata {
  executionTime?: number
  statesExecuted?: number
  toolsUsed?: string[]
  userInteractions?: number
  timestamp?: Date
}

/**
 * Progress tracking interface
 */
export interface ProgressTracker {
  totalStates: number
  completedStates: number
  currentStateName: string
  estimatedTimeRemaining?: number
  completionPercentage: number
  milestones: ProgressMilestone[]
}

export interface ProgressMilestone {
  id: string
  Name: string
  description: string
  stateId: string
  completed: boolean
  timestamp?: Date
}

/**
 * Conversational interface for journey execution
 */
export interface ConversationalInterface {
  sendMessage(message: ConversationMessage): Promise<void>
  requestInput(prompt: string, schema?: InputSchema): Promise<string>
  showProgress(tracker: ProgressTracker): Promise<void>
  displayError(error: ExecutionError): Promise<void>
  notifyCompletion(result: ExecutionResult): Promise<void>
}

/**
 * Conversation message structure
 */
export interface ConversationMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    stateId?: string
    toolCall?: string
    progressUpdate?: boolean
    attachments?: MessageAttachment[]
  }
}

export interface MessageAttachment {
  type: 'image' | 'file' | 'data' | 'chart'
  Name: string
  url?: string
  data?: any
  mimeType?: string
}

/**
 * Workflow data structure for conversions
 */
export interface WorkflowData {
  id: string
  Name: string
  description: string
  version: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  metadata?: Record<string, any>
}

export interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: WorkflowNodeData
}

export interface WorkflowNodeData {
  label: string
  toolId?: string
  config?: Record<string, any>
  condition?: string
  errorHandling?: ErrorHandlingConfig
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  condition?: string
  metadata?: Record<string, any>
}

export interface ErrorHandlingConfig {
  retry?: number
  timeout?: number
  fallback?: string
  onError?: 'stop' | 'continue' | 'fallback'
}

/**
 * Conversion result from workflow to journey
 */
export interface ConversionResult {
  success: boolean
  journey?: JourneyDefinition
  error?: ConversionError
  metrics: ConversionMetrics
  validationReport?: ValidationReport
}

export interface ConversionError {
  code: string
  message: string
  details?: Record<string, any>
}

export interface ConversionMetrics {
  conversionTimeMs: number
  originalNodeCount: number
  originalEdgeCount: number
  resultingStateCount: number
  resultingTransitionCount: number
  preservationScore: number
}

export interface ValidationReport {
  isValid: boolean
  issues: string[]
  warnings: string[]
  score: number
}

/**
 * Tool execution result with journey context
 */
export interface ToolExecutionResult {
  id: string
  toolId: string
  stateId: string
  input: Record<string, any>
  output: any
  executionTime: number
  success: boolean
  error?: ToolExecutionError
  timestamp: Date
  metadata?: ToolExecutionMetadata
}

export interface ToolExecutionError {
  code: string
  message: string
  retryable: boolean
  category?: 'network' | 'authentication' | 'validation' | 'business_logic' | 'system'
}

export interface ToolExecutionMetadata {
  cached?: boolean
  cacheKey?: string
  apiCalls?: number
  dataTransferred?: number
  costCents?: number
}

/**
 * Agent communication protocol for journey execution
 */
export interface AgentCommunicationProtocol {
  startJourneySession(params: JourneyStartParams): Promise<JourneySession>
  sendMessage(sessionId: string, message: string): Promise<AgentResponse>
  getProgress(sessionId: string): Promise<ProgressTracker>
  pauseExecution(sessionId: string): Promise<void>
  resumeExecution(sessionId: string): Promise<void>
  terminateSession(sessionId: string): Promise<ExecutionSummary>
}

export interface JourneyStartParams {
  journeyId: string
  userId: string
  workspaceId: string
  initialData?: Record<string, any>
  preferences?: ExecutionPreferences
}

export interface JourneySession {
  sessionId: string
  journeyId: string
  status: SessionStatus
  startTime: Date
  estimatedDuration?: number
}

export type SessionStatus =
  | 'initializing'
  | 'active'
  | 'waiting_input'
  | 'paused'
  | 'completed'
  | 'error'

export interface AgentResponse {
  sessionId: string
  message: string
  requiresInput: boolean
  inputSchema?: InputSchema
  actions?: RecommendedAction[]
  progress?: ProgressTracker
}

export interface RecommendedAction {
  id: string
  label: string
  description: string
  type: 'continue' | 'restart' | 'skip' | 'modify' | 'cancel'
  parameters?: Record<string, any>
}

export interface ExecutionPreferences {
  verbosity: 'minimal' | 'standard' | 'detailed'
  autoConfirm?: boolean
  timeout?: number
  errorHandling?: 'strict' | 'permissive'
  notifications?: NotificationPreferences
}

export interface NotificationPreferences {
  progress?: boolean
  errors?: boolean
  completion?: boolean
  milestones?: boolean
}

export interface ExecutionSummary {
  journeyId: string
  sessionId: string
  status: 'completed' | 'terminated' | 'error'
  startTime: Date
  endTime: Date
  duration: number
  statesExecuted: number
  toolExecutions: number
  userInteractions: number
  results?: ExecutionResults
  errors?: ExecutionError[]
}

export interface ExecutionResults {
  outputs: Record<string, any>
  artifacts: ResultArtifact[]
  metrics: ExecutionMetrics
}

export interface ResultArtifact {
  id: string
  Name: string
  type: 'file' | 'data' | 'report' | 'visualization'
  url?: string
  data?: any
  metadata?: Record<string, any>
}

export interface ExecutionMetrics {
  totalExecutionTime: number
  averageStateTime: number
  toolExecutionTime: number
  userWaitTime: number
  errorCount: number
  retryCount: number
  cacheHitRate?: number
}

/**
 * Real-time update interface for live journey monitoring
 */
export interface RealTimeUpdateHandler {
  onStateChange(update: StateChangeUpdate): Promise<void>
  onProgressUpdate(update: ProgressUpdate): Promise<void>
  onError(update: ErrorUpdate): Promise<void>
  onCompletion(update: CompletionUpdate): Promise<void>
}

export interface StateChangeUpdate {
  journeyId: string
  sessionId: string
  previousState: string
  currentState: string
  stateName: string
  timestamp: Date
}

export interface ProgressUpdate {
  journeyId: string
  sessionId: string
  progress: ProgressTracker
  estimatedCompletion?: Date
  timestamp: Date
}

export interface ErrorUpdate {
  journeyId: string
  sessionId: string
  error: ExecutionError
  recoveryActions?: RecommendedAction[]
  timestamp: Date
}

export interface CompletionUpdate {
  journeyId: string
  sessionId: string
  summary: ExecutionSummary
  timestamp: Date
}

/**
 * Performance metrics for journey execution monitoring
 */
export interface PerformanceMetrics {
  testName: string
  conversionTime: number
  preservationScore: number
  complexity: number
  timestamp: string
}

/**
 * Journey execution statistics
 */
export interface ExecutionStatistics {
  totalJourneys: number
  activeJourneys: number
  completedJourneys: number
  averageExecutionTime: number
  successRate: number
  errorRate: number
  toolUsageStats: ToolUsageStats[]
  performanceTrends: PerformanceTrend[]
}

export interface ToolUsageStats {
  toolId: string
  usageCount: number
  averageExecutionTime: number
  successRate: number
  errorTypes: Record<string, number>
}

export interface PerformanceTrend {
  date: string
  executionCount: number
  averageTime: number
  successRate: number
  errorRate: number
}
