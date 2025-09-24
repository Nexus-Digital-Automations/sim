/**
 * Type definitions for the Universal Tool Adapter System
 */

import type { ClientToolDefinition, ToolExecutionContext } from '@/lib/copilot/tools/client/types'
import type { BaseServerTool } from '@/lib/copilot/tools/server/base-tool'

export interface ParlantToolSchema {
  /** Tool identifier that matches Parlant's naming conventions */
  name: string
  /** Human-readable description for AI agents */
  description: string
  /** Detailed natural language explanation of when and how to use this tool */
  usage_guidelines: string
  /** Input parameter schema in JSON Schema format */
  parameters: Record<string, any>
  /** Expected output schema */
  returns?: Record<string, any>
  /** Tool category for organization */
  category: ToolCategory
  /** Required permission level */
  permission_level: PermissionLevel
  /** Performance characteristics */
  performance: PerformanceMetadata
}

export type ToolCategory =
  | 'workflow-management'
  | 'data-retrieval'
  | 'external-integration'
  | 'user-management'
  | 'file-operations'
  | 'communication'
  | 'analysis'
  | 'automation'

export type PermissionLevel = 'public' | 'workspace' | 'admin'

export interface PerformanceMetadata {
  /** Estimated execution time in milliseconds */
  estimated_duration_ms: number
  /** Whether tool supports caching */
  cacheable: boolean
  /** Rate limiting configuration */
  rate_limit?: {
    max_requests_per_minute: number
    max_concurrent: number
  }
  /** Resource requirements */
  resource_usage: 'low' | 'medium' | 'high'
}

export interface AdapterContext {
  /** Current user context */
  user_id: string
  /** Current workspace */
  workspace_id: string
  /** Session identifier */
  session_id?: string
  /** Agent identifier making the request */
  agent_id?: string
  /** Additional metadata */
  metadata?: Record<string, any>
}

export interface AdapterResult {
  /** Success status */
  success: boolean
  /** Result data */
  data?: any
  /** Human-readable message */
  message?: string
  /** Error details if failed */
  error?: AdapterError
  /** Execution metadata */
  metadata?: {
    execution_time_ms: number
    cached: boolean
    resources_used?: Record<string, any>
  }
}

export interface AdapterError {
  /** Error code */
  code: string
  /** Technical error message */
  message: string
  /** User-friendly explanation */
  user_message: string
  /** Suggested remediation steps */
  suggestions?: string[]
  /** Whether error is retryable */
  retryable: boolean
}

export interface ToolAdapter {
  /** Parlant schema for this tool */
  schema: ParlantToolSchema
  /** Execute the tool with given arguments */
  execute: (args: any, context: AdapterContext) => Promise<AdapterResult>
  /** Validate arguments before execution */
  validate?: (args: any) => ValidationResult
  /** Get contextual recommendations */
  getRecommendations?: (context: AdapterContext) => Promise<ToolRecommendation[]>
  /** Cleanup resources */
  cleanup?: () => Promise<void>
}

export interface ValidationResult {
  valid: boolean
  errors?: string[]
  warnings?: string[]
}

export interface ToolRecommendation {
  /** Recommendation text */
  message: string
  /** Confidence score 0-1 */
  confidence: number
  /** Context that triggered this recommendation */
  context?: string
}

export interface AdapterConfiguration {
  /** Tool-specific settings */
  tools: Record<string, ToolConfig>
  /** Global adapter settings */
  global: GlobalAdapterConfig
}

export interface ToolConfig {
  /** Whether tool is enabled */
  enabled: boolean
  /** Custom configuration */
  config?: Record<string, any>
  /** Override default performance settings */
  performance_overrides?: Partial<PerformanceMetadata>
  /** Custom natural language descriptions */
  custom_descriptions?: {
    description?: string
    usage_guidelines?: string
  }
}

export interface GlobalAdapterConfig {
  /** Default permission level for new tools */
  default_permission_level: PermissionLevel
  /** Enable performance monitoring */
  performance_monitoring: boolean
  /** Cache configuration */
  caching: {
    enabled: boolean
    default_ttl_seconds: number
    max_cache_size_mb: number
  }
  /** Rate limiting configuration */
  rate_limiting: {
    enabled: boolean
    default_requests_per_minute: number
    default_concurrent_limit: number
  }
  /** Error handling configuration */
  error_handling: {
    retry_attempts: number
    retry_backoff_ms: number
    include_stack_traces: boolean
  }
}

// Re-export types from existing tool system for compatibility
export type { ClientToolDefinition, ToolExecutionContext }
export type SimServerTool = BaseServerTool<any, any>
