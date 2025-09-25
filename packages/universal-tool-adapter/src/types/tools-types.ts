/**
 * Tools Type Definitions for Universal Tool Adapter
 *
 * Type definitions for tools used by the Universal Tool Adapter system.
 * These types are derived from the main Sim application tool types.
 *
 * @version 1.0.0
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'

export interface OutputProperty {
  type: string
  description?: string
  optional?: boolean
  properties?: Record<string, OutputProperty>
  items?: {
    type: string
    description?: string
    properties?: Record<string, OutputProperty>
  }
}

export type ParameterVisibility =
  | 'user-or-llm' // User can provide OR LLM must generate
  | 'user-only' // Only user can provide (required/optional determined by required field)
  | 'llm-only' // Only LLM provides (computed values)
  | 'hidden' // Not shown to user or LLM

export interface ToolResponse {
  success: boolean // Whether the tool execution was successful
  output: Record<string, any> // The structured output from the tool
  error?: string // Error message if success is false
  timing?: {
    startTime: string // ISO timestamp when the tool execution started
    endTime: string // ISO timestamp when the tool execution ended
    duration: number // Duration in milliseconds
  }
}

export interface OAuthConfig {
  required: boolean // Whether this tool requires OAuth authentication
  provider: string // The service that needs to be authorized (simplified from OAuthService)
  additionalScopes?: string[] // Additional scopes required for the tool
}

export interface ToolConfig<P = any, R = any> {
  // Basic tool identification
  id: string
  name: string
  description: string
  version: string

  // Parameter schema - what this tool accepts
  params: Record<
    string,
    {
      type: string
      description: string
      required?: boolean
      visibility?: ParameterVisibility
      default?: any
      enum?: string[]
      validation?: {
        min?: number
        max?: number
        pattern?: string
        format?: string
      }
    }
  >

  // Output schema - what this tool returns
  output: Record<string, OutputProperty>

  // OAuth configuration if authentication is required
  oauth?: OAuthConfig

  // Tool metadata
  category?: string
  tags?: string[]
  deprecated?: boolean

  // Execution metadata
  timeout?: number // Maximum execution time in milliseconds
  retryable?: boolean // Whether this tool can be safely retried on failure

  // Implementation details (for internal use)
  handler?: (params: P) => Promise<R>
}

export interface ToolMetadata {
  id: string
  name: string
  description: string
  version: string
  category?: string
  tags?: string[]
  deprecated?: boolean
}

export interface ToolExecutionContext {
  toolId: string
  executionId: string
  userId?: string
  sessionId?: string
  timestamp: Date
  parameters: Record<string, any>
}

export interface ToolExecutionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    executionTime: number
    retryCount?: number
    warnings?: string[]
  }
}