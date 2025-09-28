/**
 * Type definitions for Workflow to Journey Conversion System
 * =========================================================
 *
 * This module defines types for converting Sim ReactFlow workflows
 * into Parlant journey state machines with dynamic parameter support.
 */

import type { Journey, JourneyStep } from '@/services/parlant/types'
import type { WorkflowState } from '@/stores/workflows/workflow/types'

// Core conversion types
export interface WorkflowTemplate {
  id: string
  Name: string
  description?: string
  workspace_id: string
  version: string
  workflow_data: WorkflowState
  parameters: TemplateParameter[]
  created_at: string
  updated_at: string
  tags?: string[]
  usage_count: number
}

export interface TemplateParameter {
  id: string
  Name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'json'
  description: string
  default_value?: any
  required: boolean
  validation?: ParameterValidation
  display_order: number
}

export interface ParameterValidation {
  min?: number
  max?: number
  pattern?: string
  allowed_values?: any[]
  custom_validator?: string
}

// Conversion configuration
export interface ConversionConfig {
  preserve_block_names: boolean
  generate_descriptions: boolean
  enable_parameter_substitution: boolean
  include_error_handling: boolean
  optimization_level: 'basic' | 'standard' | 'advanced'
  cache_duration_ms: number
}

export interface ConversionContext {
  workflow_id: string
  workspace_id: string
  user_id: string
  parameters: Record<string, any>
  config: ConversionConfig
  template_version?: string
}

// Journey conversion result
export interface JourneyConversionResult {
  journey: Journey
  steps: JourneyStep[]
  metadata: ConversionMetadata
  warnings: ConversionWarning[]
  parameters_used: string[]
}

export interface ConversionMetadata {
  source_workflow_id: string
  conversion_timestamp: string
  conversion_duration_ms: number
  blocks_converted: number
  edges_converted: number
  parameters_applied: Record<string, any>
  optimization_applied: string[]
  cache_key?: string
}

export interface ConversionWarning {
  type: 'unsupported_block' | 'parameter_missing' | 'validation_failed' | 'optimization_skipped'
  message: string
  block_id?: string
  parameter_name?: string
  severity: 'low' | 'medium' | 'high'
}

// Block to journey step mapping
export interface BlockJourneyMapping {
  block_id: string
  block_type: string
  journey_step_id: string
  step_title: string
  step_description?: string
  conditions: string[]
  actions: string[]
  tool_calls?: ToolCall[]
  parameter_substitutions: Record<string, string>
}

export interface ToolCall {
  tool_id: string
  tool_name: string
  parameters: Record<string, any>
  output_mapping?: Record<string, string>
}

// Edge to journey flow mapping
export interface EdgeJourneyMapping {
  edge_id: string
  source_block_id: string
  target_block_id: string
  source_step_id: string
  target_step_id: string
  conditions: string[]
  transition_type: 'sequential' | 'conditional' | 'parallel' | 'loop'
}

// Template management
export interface TemplateCreateRequest {
  Name: string
  description?: string
  workflow_id: string
  workspace_id: string
  parameters: Omit<TemplateParameter, 'id'>[]
  tags?: string[]
}

export interface TemplateUpdateRequest {
  Name?: string
  description?: string
  parameters?: TemplateParameter[]
  tags?: string[]
}

export interface TemplateListQuery {
  workspace_id: string
  search?: string
  tags?: string[]
  limit?: number
  offset?: number
  sort_by?: 'Name' | 'created_at' | 'updated_at' | 'usage_count'
  sort_order?: 'asc' | 'desc'
}

// Dynamic journey creation
export interface JourneyCreateFromTemplateRequest {
  template_id: string
  agent_id: string
  workspace_id: string
  parameters: Record<string, any>
  journey_name?: string
  journey_description?: string
  config?: Partial<ConversionConfig>
}

export interface JourneyCreateFromWorkflowRequest {
  workflow_id: string
  agent_id: string
  workspace_id: string
  journey_name?: string
  journey_description?: string
  parameters?: Record<string, any>
  config?: Partial<ConversionConfig>
}

// Caching system
export interface ConversionCacheEntry {
  cache_key: string
  workflow_id: string
  template_id?: string
  parameters_hash: string
  result: JourneyConversionResult
  created_at: string
  expires_at: string
  hit_count: number
  last_accessed: string
}

export interface CacheStats {
  total_entries: number
  hit_rate: number
  miss_rate: number
  average_conversion_time_ms: number
  cache_size_mb: number
  oldest_entry: string
  newest_entry: string
}

// Error types
export interface ConversionError extends Error {
  type: 'validation' | 'conversion' | 'template' | 'parameter' | 'cache' | 'system'
  code: string
  details?: Record<string, any>
  block_id?: string
  parameter_name?: string
}

// Real-time conversion
export interface ConversionProgress {
  conversion_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress_percentage: number
  current_step: string
  blocks_processed: number
  total_blocks: number
  estimated_completion_ms?: number
  error?: ConversionError
}

export interface ConversionSubscription {
  conversion_id: string
  callback: (progress: ConversionProgress) => void
  workspace_id: string
  user_id: string
}

// Analytics and insights
export interface ConversionAnalytics {
  template_id?: string
  workflow_id: string
  conversion_count: number
  average_duration_ms: number
  success_rate: number
  most_used_parameters: Array<{
    parameter_name: string
    usage_count: number
    average_value: any
  }>
  error_patterns: Array<{
    error_type: string
    count: number
    example_message: string
  }>
  performance_trends: Array<{
    date: string
    conversion_count: number
    average_duration_ms: number
  }>
}

// Service interfaces
export interface TemplateService {
  createTemplate(request: TemplateCreateRequest): Promise<WorkflowTemplate>
  updateTemplate(templateId: string, request: TemplateUpdateRequest): Promise<WorkflowTemplate>
  getTemplate(templateId: string, workspaceId: string): Promise<WorkflowTemplate>
  listTemplates(query: TemplateListQuery): Promise<{
    templates: WorkflowTemplate[]
    total: number
    pagination: {
      limit: number
      offset: number
      has_more: boolean
    }
  }>
  deleteTemplate(templateId: string, workspaceId: string): Promise<void>
  validateParameters(
    templateId: string,
    parameters: Record<string, any>
  ): Promise<{
    valid: boolean
    errors: Array<{
      parameter: string
      message: string
    }>
  }>
}

export interface ConversionService {
  convertWorkflowToJourney(context: ConversionContext): Promise<JourneyConversionResult>
  convertTemplateToJourney(
    request: JourneyCreateFromTemplateRequest
  ): Promise<JourneyConversionResult>
  getConversionProgress(conversionId: string): Promise<ConversionProgress>
  subscribeToConversion(subscription: ConversionSubscription): void
  unsubscribeFromConversion(conversionId: string, userId: string): void
  getCacheStats(workspaceId: string): Promise<CacheStats>
  clearCache(workspaceId: string, templateId?: string): Promise<void>
}

export interface AnalyticsService {
  getConversionAnalytics(
    workspaceId: string,
    templateId?: string,
    timeRange?: {
      start: string
      end: string
    }
  ): Promise<ConversionAnalytics>
  trackConversion(metadata: ConversionMetadata): Promise<void>
  getPopularTemplates(
    workspaceId: string,
    limit?: number
  ): Promise<
    Array<{
      template: WorkflowTemplate
      usage_stats: {
        conversion_count: number
        success_rate: number
        average_duration_ms: number
      }
    }>
  >
}

// Export utility types
export type ConversionEventType =
  | 'template_created'
  | 'template_updated'
  | 'template_deleted'
  | 'conversion_started'
  | 'conversion_completed'
  | 'conversion_failed'
  | 'cache_hit'
  | 'cache_miss'
  | 'parameters_validated'

export interface ConversionEvent {
  type: ConversionEventType
  timestamp: string
  workspace_id: string
  user_id: string
  template_id?: string
  workflow_id?: string
  conversion_id?: string
  details?: Record<string, any>
}
