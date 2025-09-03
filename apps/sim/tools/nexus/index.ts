/**
 * Nexus Tools - Advanced Workflow Execution and Management
 * 
 * This module provides enterprise-grade workflow execution and monitoring capabilities
 * for the Sim workflow automation platform. These tools enable comprehensive workflow
 * orchestration with real-time monitoring, performance analytics, and error handling.
 * 
 * FEATURES:
 * - Advanced workflow execution engine with sync/async/debug modes
 * - Real-time execution monitoring and status tracking
 * - Comprehensive performance metrics and analytics
 * - Error analysis and debugging capabilities
 * - Cost tracking and resource utilization monitoring
 * - Detailed execution logging and audit trails
 * 
 * ARCHITECTURE:
 * - Built on top of existing workflow infrastructure
 * - Integrates with workflowExecutionLogs and workflowExecutionSnapshots tables
 * - Uses advanced querying and analytics for performance insights
 * - Provides both programmatic API and monitoring interfaces
 * 
 * USAGE:
 * These tools are designed for advanced workflow management scenarios where
 * detailed execution control, monitoring, and analytics are required.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

export { executeWorkflow } from './execute-workflow'
export { monitorWorkflows } from './monitor-workflows'

export type {
  ExecuteWorkflowParams,
  ExecuteWorkflowResponse,
  MonitorWorkflowsParams,
  MonitorWorkflowsResponse,
  ExecutionDetail,
  ExecutionSummary,
  RunningExecution,
  ExecutionLogEntry,
  ExecutionCostSummary,
  FileInfo,
  ErrorDetails,
  PaginationInfo,
  FilterInfo,
  DateRange,
  ExecutionMetrics,
  PerformanceAnalytics,
  ErrorAnalysis,
  WorkflowExecution,
  ExecutionResult,
  ExecutionContext,
  NodeExecutionResult,
  ExecutionStats,
  MonitoringConfig
} from './types'

/**
 * Nexus Tools Registry
 * 
 * This constant provides a registry of all available Nexus tools
 * for use in dynamic tool loading and discovery systems.
 */
export const NEXUS_TOOLS = {
  executeWorkflow: {
    id: 'nexus_execute_workflow',
    name: 'Nexus Workflow Execution',
    description: 'Advanced workflow execution with real-time monitoring and comprehensive result tracking',
    category: 'workflow-execution',
    version: '1.0.0',
    capabilities: [
      'sync-execution',
      'async-execution', 
      'debug-mode',
      'real-time-monitoring',
      'parameter-injection',
      'error-handling',
      'performance-tracking',
      'cost-analysis'
    ]
  },
  monitorWorkflows: {
    id: 'nexus_monitor_workflows',
    name: 'Nexus Workflow Monitoring',
    description: 'Real-time monitoring, execution history, and performance analytics for workflows',
    category: 'workflow-monitoring',
    version: '1.0.0',
    capabilities: [
      'execution-tracking',
      'performance-analytics',
      'error-analysis',
      'real-time-status',
      'historical-metrics',
      'cost-tracking',
      'log-analysis',
      'bottleneck-identification'
    ]
  }
} as const

/**
 * Tool capability constants for feature checking
 */
export const NEXUS_CAPABILITIES = {
  SYNC_EXECUTION: 'sync-execution',
  ASYNC_EXECUTION: 'async-execution', 
  DEBUG_MODE: 'debug-mode',
  REAL_TIME_MONITORING: 'real-time-monitoring',
  PARAMETER_INJECTION: 'parameter-injection',
  ERROR_HANDLING: 'error-handling',
  PERFORMANCE_TRACKING: 'performance-tracking',
  COST_ANALYSIS: 'cost-analysis',
  EXECUTION_TRACKING: 'execution-tracking',
  PERFORMANCE_ANALYTICS: 'performance-analytics',
  ERROR_ANALYSIS: 'error-analysis',
  REAL_TIME_STATUS: 'real-time-status',
  HISTORICAL_METRICS: 'historical-metrics',
  COST_TRACKING: 'cost-tracking',
  LOG_ANALYSIS: 'log-analysis',
  BOTTLENECK_IDENTIFICATION: 'bottleneck-identification'
} as const

/**
 * Default configuration values for Nexus tools
 */
export const NEXUS_DEFAULTS = {
  EXECUTION_TIMEOUT: 300, // 5 minutes
  DEBUG_MODE: false,
  EXECUTION_MODE: 'async' as const,
  PRIORITY: 'normal' as const,
  TRIGGER_SOURCE: 'nexus' as const,
  PAGINATION_LIMIT: 20,
  PAGINATION_OFFSET: 0,
  METRICS_RETENTION_DAYS: 30,
  LOG_RETENTION_DAYS: 90,
  REALTIME_POLL_INTERVAL: 1000, // 1 second
  MAX_TRACE_SPANS: 1000,
  MAX_LOG_ENTRIES: 1000
} as const

/**
 * Error codes for Nexus tools
 */
export const NEXUS_ERROR_CODES = {
  AUTHENTICATION_REQUIRED: 'NEXUS_AUTH_REQUIRED',
  WORKFLOW_NOT_FOUND: 'NEXUS_WORKFLOW_NOT_FOUND',
  WORKFLOW_NOT_DEPLOYED: 'NEXUS_WORKFLOW_NOT_DEPLOYED',
  EXECUTION_NOT_FOUND: 'NEXUS_EXECUTION_NOT_FOUND',
  EXECUTION_TIMEOUT: 'NEXUS_EXECUTION_TIMEOUT',
  EXECUTION_FAILED: 'NEXUS_EXECUTION_FAILED',
  PERMISSION_DENIED: 'NEXUS_PERMISSION_DENIED',
  INVALID_PARAMETERS: 'NEXUS_INVALID_PARAMETERS',
  SYSTEM_ERROR: 'NEXUS_SYSTEM_ERROR',
  DATABASE_ERROR: 'NEXUS_DATABASE_ERROR',
  MONITORING_ERROR: 'NEXUS_MONITORING_ERROR'
} as const

/**
 * Success status codes for consistent response handling
 */
export const NEXUS_STATUS_CODES = {
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const

/**
 * Helper function to check if a tool has a specific capability
 */
export function hasCapability(toolId: keyof typeof NEXUS_TOOLS, capability: string): boolean {
  const tool = NEXUS_TOOLS[toolId]
  return tool?.capabilities.includes(capability) ?? false
}

/**
 * Helper function to get all available capabilities
 */
export function getAllCapabilities(): string[] {
  return Object.values(NEXUS_CAPABILITIES)
}

/**
 * Helper function to validate execution parameters
 */
export function validateExecutionParams(params: Partial<ExecuteWorkflowParams>): string[] {
  const errors: string[] = []
  
  if (!params.workflowId) {
    errors.push('workflowId is required')
  }
  
  if (params.timeout && (params.timeout < 1 || params.timeout > 3600)) {
    errors.push('timeout must be between 1 and 3600 seconds')
  }
  
  if (params.executionMode && !['async', 'sync', 'debug'].includes(params.executionMode)) {
    errors.push('executionMode must be async, sync, or debug')
  }
  
  if (params.priority && !['low', 'normal', 'high', 'urgent'].includes(params.priority)) {
    errors.push('priority must be low, normal, high, or urgent')
  }
  
  if (params.triggerSource && !['manual', 'api', 'schedule', 'webhook', 'nexus'].includes(params.triggerSource)) {
    errors.push('triggerSource must be manual, api, schedule, webhook, or nexus')
  }
  
  return errors
}

/**
 * Helper function to validate monitoring parameters
 */
export function validateMonitoringParams(params: Partial<MonitorWorkflowsParams>): string[] {
  const errors: string[] = []
  
  if (!params.action) {
    errors.push('action is required')
  }
  
  if (params.limit && (params.limit < 1 || params.limit > 100)) {
    errors.push('limit must be between 1 and 100')
  }
  
  if (params.offset && params.offset < 0) {
    errors.push('offset must be non-negative')
  }
  
  if (params.status && !['running', 'completed', 'failed', 'cancelled'].includes(params.status)) {
    errors.push('status must be running, completed, failed, or cancelled')
  }
  
  if (params.trigger && !['manual', 'api', 'schedule', 'webhook', 'nexus'].includes(params.trigger)) {
    errors.push('trigger must be manual, api, schedule, webhook, or nexus')
  }
  
  return errors
}

/**
 * Utility function to format execution duration
 */
export function formatExecutionDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`
  } else if (durationMs < 60000) {
    return `${Math.round(durationMs / 1000)}s`
  } else if (durationMs < 3600000) {
    return `${Math.round(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`
  } else {
    const hours = Math.floor(durationMs / 3600000)
    const minutes = Math.floor((durationMs % 3600000) / 60000)
    return `${hours}h ${minutes}m`
  }
}

/**
 * Utility function to format cost values
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00'
  if (cost < 0.01) return '<$0.01'
  return `$${cost.toFixed(2)}`
}

/**
 * Utility function to calculate success rate
 */
export function calculateSuccessRate(successful: number, total: number): number {
  if (total === 0) return 0
  return Math.round((successful / total) * 100)
}

/**
 * Utility function to generate operation IDs
 */
export function generateOperationId(prefix: string = 'nexus'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}