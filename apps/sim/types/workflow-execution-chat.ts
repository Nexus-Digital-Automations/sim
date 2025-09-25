/**
 * Workflow Execution Chat Types
 * =============================
 *
 * Type definitions for the real-time workflow execution chat interface.
 * Provides comprehensive typing for execution streaming, chat messages,
 * and UI state management.
 */

import type { ParlantJourney } from '@/services/parlant/workflow-converter/types'
import type { ParlantSocketClient } from '@/app/chat/workspace/[workspaceId]/agent/[agentId]/components/socket-client'

// ========================================
// EXECUTION CHAT CORE TYPES
// ========================================

/**
 * Workflow execution event from the journey engine
 */
export interface WorkflowExecutionEvent {
  type: 'step_started' | 'step_completed' | 'step_failed' | 'workflow_completed' | 'workflow_failed' | 'workflow_paused' | 'workflow_resumed' | 'workflow_stopped'
  journeyId: string
  stepId: string
  stepName: string
  timestamp: string
  data?: any
  error?: string
  progress: ExecutionProgress
  estimatedTimeRemaining?: number
  metadata?: ExecutionEventMetadata
}

/**
 * Progress information for workflow execution
 */
export interface ExecutionProgress {
  currentStep: number
  totalSteps: number
  percentComplete: number
  stepsCompleted: number
  stepsFailed: number
  stepsSkipped: number
}

/**
 * Additional metadata for execution events
 */
export interface ExecutionEventMetadata {
  toolsUsed?: string[]
  executionTime?: number
  memoryUsage?: number
  cpuUsage?: number
  dataTransformed?: boolean
  userActionRequired?: boolean
  retryCount?: number
  maxRetries?: number
}

/**
 * Conversational message in the execution chat
 */
export interface ConversationalMessage {
  id: string
  type: 'system' | 'progress' | 'result' | 'error' | 'warning' | 'info' | 'debug'
  content: string
  timestamp: string
  metadata: ConversationalMessageMetadata
  reactions?: MessageReaction[]
  isCollapsible?: boolean
  isCollapsed?: boolean
}

/**
 * Metadata for conversational messages
 */
export interface ConversationalMessageMetadata {
  stepId: string
  stepName?: string
  executionTime?: number
  toolsUsed?: string[]
  dataTransformed?: boolean
  userActionRequired?: boolean
  canRetry?: boolean
  canSkip?: boolean
  canDebug?: boolean
  progressData?: ExecutionProgress
  errorCode?: string
  warningLevel?: 'low' | 'medium' | 'high'
}

/**
 * User reactions to messages (like/dislike, etc.)
 */
export interface MessageReaction {
  type: 'like' | 'dislike' | 'helpful' | 'unclear'
  userId: string
  timestamp: string
}

/**
 * Workflow execution status
 */
export type WorkflowExecutionStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'stopped'
  | 'error'

/**
 * Complete workflow execution context
 */
export interface WorkflowExecution {
  id: string
  journeyId: string
  workspaceId: string
  userId: string
  journey: ParlantJourney
  startTime: number
  endTime?: number
  currentStep: number
  status: WorkflowExecutionStatus
  messages: ConversationalMessage[]
  lastStepStart?: number
  totalExecutionTime?: number
  estimatedTimeRemaining?: number
  performanceMetrics: ExecutionPerformanceMetrics
}

/**
 * Performance metrics for workflow execution
 */
export interface ExecutionPerformanceMetrics {
  averageStepTime: number
  totalSteps: number
  completedSteps: number
  failedSteps: number
  skippedSteps: number
  memoryUsage: MemoryUsage
  networkUsage: NetworkUsage
}

/**
 * Memory usage tracking
 */
export interface MemoryUsage {
  current: number
  peak: number
  average: number
  unit: 'MB' | 'GB'
}

/**
 * Network usage tracking
 */
export interface NetworkUsage {
  requestCount: number
  totalDataTransferred: number
  averageResponseTime: number
  unit: 'MB' | 'GB'
}

// ========================================
// CHAT INTERFACE STATE TYPES
// ========================================

/**
 * UI state for the execution chat component
 */
export interface ExecutionChatState {
  isExpanded: boolean
  showDebugInfo: boolean
  showPerformanceMetrics: boolean
  autoScroll: boolean
  filterLevel: MessageFilterLevel
  selectedMessage: string | null
  isConnected: boolean
  connectionError: string | null
  retryCount: number
}

/**
 * Message filtering levels
 */
export type MessageFilterLevel = 'all' | 'important' | 'errors-only' | 'progress-only'

/**
 * Chat command for interactive workflow control
 */
export interface ChatCommand {
  command: string
  parameters?: Record<string, any>
  timestamp: string
  userId: string
}

/**
 * Available chat commands
 */
export type WorkflowChatCommand =
  | 'pause'
  | 'resume'
  | 'stop'
  | 'status'
  | 'debug'
  | 'skip'
  | 'retry'
  | 'explain'
  | 'export'
  | 'help'

// ========================================
// COMPONENT PROPS TYPES
// ========================================

/**
 * Props for WorkflowExecutionChat component
 */
export interface WorkflowExecutionChatProps {
  /** Journey/workflow being executed */
  journey: ParlantJourney

  /** Workspace context */
  workspaceId: string

  /** User context */
  userId: string

  /** Socket client for real-time communication */
  socketClient?: ParlantSocketClient

  /** Initial execution state */
  initialStatus?: WorkflowExecutionStatus

  /** Callback when execution completes */
  onExecutionComplete?: (result: ExecutionResult) => void

  /** Callback when execution fails */
  onExecutionError?: (error: ExecutionError) => void

  /** Callback when user sends chat command */
  onChatCommand?: (command: ChatCommand) => void

  /** Custom styling */
  className?: string

  /** Show/hide debug information */
  showDebugInfo?: boolean

  /** Enable/disable interactive commands */
  enableCommands?: boolean

  /** Maximum number of messages to display */
  maxMessages?: number

  /** Auto-start execution on mount */
  autoStart?: boolean
}

/**
 * Execution completion result
 */
export interface ExecutionResult {
  success: boolean
  journey: ParlantJourney
  executionTime: number
  stepsCompleted: number
  stepsFailed: number
  finalData?: any
  summary: string
  performanceMetrics: ExecutionPerformanceMetrics
}

/**
 * Execution error information
 */
export interface ExecutionError {
  code: string
  message: string
  stepId?: string
  stepName?: string
  timestamp: string
  stack?: string
  recoverable: boolean
  suggestions: string[]
}

// ========================================
// HOOK TYPES
// ========================================

/**
 * Return type for useWorkflowExecutionChat hook
 */
export interface UseWorkflowExecutionChatReturn {
  /** Current execution state */
  execution: WorkflowExecution | null

  /** Chat UI state */
  chatState: ExecutionChatState

  /** All conversational messages */
  messages: ConversationalMessage[]

  /** Start workflow execution */
  startExecution: (journey: ParlantJourney) => Promise<void>

  /** Stop workflow execution */
  stopExecution: () => Promise<void>

  /** Pause workflow execution */
  pauseExecution: () => Promise<void>

  /** Resume workflow execution */
  resumeExecution: () => Promise<void>

  /** Send chat command */
  sendCommand: (command: WorkflowChatCommand, parameters?: any) => Promise<void>

  /** Clear all messages */
  clearMessages: () => void

  /** Update chat UI state */
  updateChatState: (updates: Partial<ExecutionChatState>) => void

  /** Get current execution status */
  getExecutionStatus: () => WorkflowExecutionStatus

  /** Check if execution is active */
  isExecutionActive: () => boolean

  /** Export execution log */
  exportLog: (format: 'json' | 'csv' | 'txt') => string
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Message formatting options
 */
export interface MessageFormattingOptions {
  showTimestamps: boolean
  showMetadata: boolean
  showProgressBars: boolean
  useMarkdown: boolean
  highlightErrors: boolean
  collapsibleSections: boolean
}

/**
 * Export options for execution logs
 */
export interface ExportOptions {
  format: 'json' | 'csv' | 'txt' | 'html'
  includeMetadata: boolean
  includeDebugInfo: boolean
  includePerformanceMetrics: boolean
  timeRange?: {
    start: string
    end: string
  }
  messageTypes?: ConversationalMessage['type'][]
}

/**
 * Streaming configuration
 */
export interface StreamingConfig {
  bufferSize: number
  flushInterval: number
  reconnectAttempts: number
  reconnectDelay: number
  heartbeatInterval: number
}

// ========================================
// ERROR TYPES
// ========================================

/**
 * Chat-specific error types
 */
export type ExecutionChatError =
  | 'connection_failed'
  | 'execution_timeout'
  | 'invalid_command'
  | 'permission_denied'
  | 'journey_not_found'
  | 'step_validation_failed'
  | 'resource_exhausted'
  | 'internal_error'

/**
 * Detailed error information
 */
export interface DetailedExecutionError extends Error {
  code: ExecutionChatError
  stepId?: string
  journeyId?: string
  userId?: string
  workspaceId?: string
  timestamp: string
  context?: Record<string, any>
  recoverable: boolean
  retryable: boolean
}