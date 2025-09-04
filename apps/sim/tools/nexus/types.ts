/**
 * Nexus Tools Type Definitions
 * Shared types and interfaces for advanced workflow execution and monitoring
 *
 * @author Claude Code
 * @version 1.0.0
 */

// Core type definitions for workflow execution

/**
 * Execution environment interface
 * Contains context information for workflow execution
 */
export interface ExecutionEnvironment {
  variables: Record<string, unknown>
  workflowId: string
  executionId: string
  userId: string
  workspaceId: string
  [key: string]: unknown
}

/**
 * Execution trigger interface
 * Contains information about what triggered the workflow
 */
export interface ExecutionTrigger {
  type: 'manual' | 'api' | 'schedule' | 'webhook' | 'nexus'
  source: string
  data?: Record<string, unknown>
  timestamp: string
  [key: string]: unknown
}

/**
 * Trace span interface for execution tracking
 * Represents a single operation during workflow execution
 */
export interface TraceSpan {
  id: string
  name: string
  type: string
  duration: number
  startTime: string
  endTime: string
  blockId: string
  status: 'success' | 'error' | 'warning'
  input: Record<string, unknown>
  output: Record<string, unknown>
  error?: string
  metadata?: Record<string, unknown>
}

/**
 * Tool response interface
 * Standard response structure for all tools
 */
export interface ToolResponse {
  status: 'success' | 'error'
  message?: string
  error?: string
  data?: unknown
  [key: string]: unknown
}

/**
 * Workflow execution log interface
 * Database record structure for execution logs
 */
export interface WorkflowExecutionLog {
  id: string
  workflowId: string
  executionId: string
  stateSnapshotId: string
  level: 'info' | 'error' | 'warning'
  trigger: string
  startedAt: string
  endedAt: string
  totalDurationMs: number
  executionData: {
    environment?: ExecutionEnvironment
    trigger?: ExecutionTrigger
    traceSpans?: TraceSpan[]
    errorDetails?: ErrorDetails
    [key: string]: unknown
  }
  files?: unknown
  cost?: unknown
  createdAt: Date
}

/**
 * Workflow state interface
 * Represents the complete structure of a workflow
 */
export interface WorkflowState {
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: Record<string, unknown>
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
  }>
  [key: string]: unknown
}

/**
 * Workflow execution request parameters
 */
export interface ExecuteWorkflowParams {
  workflowId: string
  executionMode?: 'async' | 'sync' | 'debug'
  inputs?: Record<string, unknown>
  triggerSource?: 'manual' | 'api' | 'schedule' | 'webhook' | 'nexus'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  timeout?: number
  enableDebug?: boolean
}

/**
 * Workflow execution response structure
 */
export interface ExecuteWorkflowResponse extends ToolResponse {
  output: {
    status: 'success' | 'error'
    execution?: {
      id: string
      workflowId: string
      workflowName: string
      status: 'running' | 'completed' | 'failed' | 'cancelled'
      executionMode: 'async' | 'sync' | 'debug'
      outputs?: Record<string, unknown>
      error?: string
      executionTimeMs?: number
      startedAt: string
      completedAt?: string
      cost?: ExecutionCostSummary
      traceSpans?: TraceSpan[]
      message?: string
    }
    polling?: {
      statusUrl: string
      pollIntervalMs: number
      timeoutMs: number
    }
    message?: string
    error?: string
    operationId: string
    executionId?: string
  }
}

/**
 * Workflow monitoring request parameters
 */
export interface MonitorWorkflowsParams {
  action:
    | 'getExecution'
    | 'listExecutions'
    | 'getMetrics'
    | 'getLogs'
    | 'getPerformanceAnalytics'
    | 'getExecutionDetail'
    | 'getRealtimeStatus'
    | 'getErrorAnalysis'
  workflowId?: string
  executionId?: string
  status?: 'running' | 'completed' | 'failed' | 'cancelled'
  trigger?: 'manual' | 'api' | 'schedule' | 'webhook' | 'nexus'
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
  includeTraceSpans?: boolean
  includeErrorDetails?: boolean
}

/**
 * Workflow monitoring response structure
 */
export interface MonitorWorkflowsResponse extends ToolResponse {
  output: {
    status: 'success' | 'error'
    action: string
    message?: string
    error?: string
    operationId: string
    // Execution details
    execution?: ExecutionDetail
    // Execution list
    executions?: ExecutionSummary[]
    pagination?: PaginationInfo
    filters?: FilterInfo
    // Metrics
    workflowId?: string
    dateRange?: DateRange
    metrics?: ExecutionMetrics
    // Logs
    executionId?: string
    logs?: ExecutionLogEntry[]
    count?: number
    // Analytics
    analytics?: PerformanceAnalytics | { message: string; placeholder: boolean }
    // Real-time status
    runningExecutions?: RunningExecution[]
    totalRunning?: number
    // Error analysis
    analysis?: ErrorAnalysis
  }
}

/**
 * Execution detail information
 */
export interface ExecutionDetail {
  id: string
  workflowId: string
  workflowName: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  trigger: string
  startedAt: string
  completedAt: string
  executionTimeMs: number
  cost?: ExecutionCostSummary
  files?: FileInfo[]
  environment: ExecutionEnvironment
  triggerData: ExecutionTrigger
  errorDetails?: ErrorDetails
  traceSpans?: TraceSpan[]
}

/**
 * Execution summary for listings
 */
export interface ExecutionSummary {
  id: string
  workflowId: string
  workflowName: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  trigger: string
  startedAt: string
  completedAt: string
  executionTimeMs: number
  cost?: ExecutionCostSummary
  errorDetails?: ErrorDetails
  traceSpans?: TraceSpan[]
}

/**
 * Running execution information
 */
export interface RunningExecution {
  id: string
  workflowId: string
  workflowName: string
  status: 'running'
  startedAt: string
  runtimeMs: number
  trigger: string
}

/**
 * Execution log entry
 */
export interface ExecutionLogEntry {
  id: string
  level: 'info' | 'error'
  timestamp: string
  startedAt: string
  endedAt: string | null
  durationMs: number | null
  trigger: string
  cost: ExecutionCostSummary | null
  files: FileInfo[] | null
  traceSpans: TraceSpan[]
  errorDetails?: ErrorDetails
  environment: ExecutionEnvironment
  triggerData: ExecutionTrigger
}

/**
 * Execution cost summary
 */
export interface ExecutionCostSummary {
  total?: number
  input?: number
  output?: number
  tokens?: {
    prompt?: number
    completion?: number
    total?: number
  }
  models?: Record<
    string,
    {
      input?: number
      output?: number
      total?: number
      tokens?: {
        prompt?: number
        completion?: number
        total?: number
      }
    }
  >
}

/**
 * File information for execution files
 */
export interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  url: string
  key: string
  uploadedAt: string
  expiresAt: string
  storageProvider?: 's3' | 'blob' | 'local'
  bucketName?: string
}

/**
 * Error details structure
 */
export interface ErrorDetails {
  blockId: string
  blockName: string
  error: string
  stackTrace?: string
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  offset: number
  limit: number
  total: number
  hasMore: boolean
}

/**
 * Filter information
 */
export interface FilterInfo {
  workflowId?: string
  status?: string
  trigger?: string
  startDate?: string
  endDate?: string
}

/**
 * Date range specification
 */
export interface DateRange {
  start: string
  end: string
}

/**
 * Execution metrics and analytics
 */
export interface ExecutionMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  runningExecutions: number
  cancelledExecutions: number
  successRate: number
  failureRate: number
  averageExecutionTime: number
  maxExecutionTime: number
  minExecutionTime: number
  totalCost: number
  averageCost: number
  costByModel?: Record<string, number>
  executionsByTrigger: Record<string, number>
  executionsByHour: Array<{ hour: string; count: number }>
  recentErrorRate: number
}

/**
 * Performance analytics (placeholder for advanced features)
 */
export interface PerformanceAnalytics {
  executionTrends: {
    daily: Array<{ date: string; executions: number; successRate: number; avgDuration: number }>
    hourly: Array<{ hour: number; executions: number; avgDuration: number }>
  }
  bottlenecks: Array<{
    blockId: string
    blockName: string
    blockType: string
    averageDuration: number
    executionCount: number
    errorRate: number
  }>
  costAnalysis: {
    totalCost: number
    costTrends: Array<{ date: string; cost: number }>
    costByModel: Record<string, { totalCost: number; executionCount: number; avgCost: number }>
  }
  resourceUtilization: {
    peakHours: Array<{ hour: number; executionCount: number }>
    averageLoad: number
    concurrentExecutions: number
  }
}

/**
 * Error analysis results
 */
export interface ErrorAnalysis {
  totalFailedExecutions: number
  uniqueErrors: number
  topErrors: Array<{
    error: string
    count: number
    blockId?: string
    blockName?: string
    lastSeen: string
  }>
  topFailingBlocks: Array<{
    blockId: string
    errorCount: number
  }>
  errorTrends: Array<{ date: string; errorCount: number; errorRate: number }>
  recommendations: string[]
}

/**
 * Enhanced workflow execution record interface
 * Extends the existing execution tracking with additional metadata
 */
export interface WorkflowExecution {
  id: string
  workflowId: string
  workspaceId?: string
  triggeredBy: string
  triggerSource: 'manual' | 'api' | 'schedule' | 'webhook' | 'nexus'
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  inputs: Record<string, unknown>
  outputs?: Record<string, unknown>
  error?: string
  startedAt: Date
  completedAt?: Date
  executionTimeMs?: number
  executionMode: 'async' | 'sync' | 'debug'
  timeout: number
  enableDebug: boolean
  version?: number
}

/**
 * Execution result structure for internal processing
 */
export interface ExecutionResult {
  success: boolean
  outputs?: Record<string, unknown>
  error?: string
  errorBlockId?: string
  errorBlockName?: string
  executionTimeMs: number
  traceSpans: TraceSpan[]
  costSummary?: ExecutionCostSummary
}

/**
 * Execution context for node processing
 */
export interface ExecutionContext {
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  variables: Record<string, unknown>
  nodeResults: Map<string, unknown>
  environment: ExecutionEnvironment
  trigger: ExecutionTrigger
}

/**
 * Node execution result with proper type definitions
 */
export interface NodeExecutionResult {
  value: unknown
  success: boolean
  error?: string
  warning?: string
  metadata?: Record<string, unknown>
  // Additional properties for specific node types
  [key: string]: unknown
}

/**
 * Workflow execution statistics
 */
export interface ExecutionStats {
  totalNodes: number
  executedNodes: number
  failedNodes: number
  skippedNodes: number
  executionTime: number
  memoryUsage?: number
  cpuTime?: number
}

/**
 * Execution monitoring configuration
 */
export interface MonitoringConfig {
  enableRealTimeUpdates: boolean
  enablePerformanceMetrics: boolean
  enableCostTracking: boolean
  enableDebugLogging: boolean
  retentionDays: number
  alertThresholds: {
    executionTime: number
    errorRate: number
    costLimit: number
  }
}
