/**
 * Type definitions for Sim-Parlant Integration Bridge
 * =================================================
 *
 * Comprehensive type definitions covering:
 * - Agent data models and API request/response types
 * - Session and event management structures
 * - Configuration and health monitoring
 * - Error handling interfaces
 *
 * These types ensure type safety across the integration layer
 * and provide clear contracts for API consumers.
 */

// Core Agent Types
export interface Agent {
  id: string
  Name: string
  description?: string
  workspace_id: string
  user_id: string
  guidelines?: Guideline[]
  journeys?: Journey[]
  created_at: string
  updated_at: string
  status: 'active' | 'inactive' | 'training'
  config?: AgentConfig
}

export interface AgentConfig {
  max_turns?: number
  temperature?: number
  model?: string
  system_prompt?: string
  tool_choice?: 'auto' | 'none' | string[]
}

export interface Guideline {
  id: string
  agent_id: string
  condition: string
  action: string
  priority?: number
  created_at: string
  updated_at: string
}

export interface Journey {
  id: string
  agent_id: string
  title: string
  description?: string
  conditions: string[]
  steps?: JourneyStep[]
  created_at: string
  updated_at: string
}

export interface JourneyStep {
  id: string
  journey_id: string
  order: number
  title: string
  description?: string
  conditions?: string[]
  actions?: string[]
}

// Agent API Request Types
export interface AgentCreateRequest {
  Name: string
  description?: string
  workspace_id: string
  guidelines?: Omit<Guideline, 'id' | 'agent_id' | 'created_at' | 'updated_at'>[]
  config?: AgentConfig
}

export interface AgentUpdateRequest {
  Name?: string
  description?: string
  guidelines?: Omit<Guideline, 'id' | 'agent_id' | 'created_at' | 'updated_at'>[]
  config?: AgentConfig
  status?: 'active' | 'inactive' | 'training'
}

export interface AgentListQuery {
  workspace_id?: string
  status?: 'active' | 'inactive' | 'training'
  limit?: number
  offset?: number
  search?: string
}

// Session Types
export interface Session {
  id: string
  agent_id: string
  user_id: string
  workspace_id: string
  customer_id?: string
  status: 'active' | 'ended' | 'paused'
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  last_event_at?: string
}

export interface SessionCreateRequest {
  agent_id: string
  user_id?: string
  workspace_id: string
  customer_id?: string
  metadata?: Record<string, any>
}

export interface SessionListQuery {
  agent_id?: string
  user_id?: string
  workspace_id?: string
  status?: 'active' | 'ended' | 'paused'
  limit?: number
  offset?: number
}

// Event Types
export interface Event {
  id: string
  session_id: string
  type: EventType
  content: string | Record<string, any>
  offset: number
  source: 'customer' | 'agent' | 'system'
  metadata?: Record<string, any>
  created_at: string
}

export type EventType =
  | 'customer_message'
  | 'agent_message'
  | 'system_message'
  | 'action_executed'
  | 'guideline_triggered'
  | 'session_started'
  | 'session_ended'
  | 'session_paused'
  | 'error'

export interface EventCreateRequest {
  type: EventType
  content: string | Record<string, any>
  source?: 'customer' | 'agent' | 'system'
  metadata?: Record<string, any>
}

export interface EventListQuery {
  session_id: string
  type?: EventType
  source?: 'customer' | 'agent' | 'system'
  offset?: number
  limit?: number
  wait_for_data?: boolean
  timeout?: number
}

// HTTP Client Configuration
export interface ParlantClientConfig {
  baseUrl: string
  timeout?: number
  retries?: number
  retryDelay?: number
  authToken?: string
  userAgent?: string
  enableCompression?: boolean
  maxRetries?: number
  headers?: Record<string, string>
}

// Health Monitoring
export interface ParlantHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version?: string
  checks: {
    server: HealthCheck
    database: HealthCheck
    ai_providers: {
      openai: 'configured' | 'not_configured' | 'error'
      anthropic: 'configured' | 'not_configured' | 'error'
    }
  }
  latency?: {
    average_ms: number
    p95_ms: number
    p99_ms: number
  }
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  message?: string
  details?: Record<string, any>
}

// API Response Wrappers
export interface ApiResponse<T = any> {
  data: T
  success: boolean
  timestamp: string
  request_id?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

// Error Types
export interface ParlantApiErrorDetails {
  code: string
  message: string
  details?: Record<string, any>
  request_id?: string
  timestamp: string
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

// Rate Limiting
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset_at: string
  retry_after?: number
}

// Workspace Integration
export interface WorkspaceContext {
  workspace_id: string
  user_id: string
  permissions?: string[]
  rate_limits?: RateLimitInfo
}

// Authentication Context
export interface AuthContext {
  user_id: string
  workspace_id?: string
  key_type: 'personal' | 'workspace'
  permissions?: string[]
}

// Long Polling Support
export interface LongPollingOptions {
  wait_for_data?: boolean
  timeout?: number
  last_event_id?: string
}

// Streaming Response Support
export interface StreamingEvent {
  event: string
  data: string
  id?: string
  retry?: number
}

// Tool Integration Types (for future extension)
export interface Tool {
  id: string
  Name: string
  description: string
  parameters: Record<string, any>
  handler?: string
}

export interface ToolExecution {
  id: string
  tool_id: string
  session_id: string
  parameters: Record<string, any>
  result?: any
  error?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
}
