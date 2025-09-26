/**
 * Universal Tool Adapter - Core Interface Definitions
 *
 * Comprehensive type definitions for the adapter system including all
 * configuration, mapping, validation, and formatting interfaces.
 *
 * @author Claude Code Adapter Pattern Design Agent
 * @version 1.0.0
 */

import type { LucideIcon } from 'lucide-react'
import type { z } from 'zod'

// =============================================================================
// Core Sim Tool Integration Types (from existing Sim system)
// =============================================================================

/**
 * Sim tool execution context (from existing system)
 */
export interface ToolExecutionContext {
  toolCallId: string
  toolName: string
  log: (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    extra?: Record<string, any>
  ) => void
}

/**
 * Sim tool execution result (from existing system)
 */
export interface ToolRunResult {
  status: number
  message?: any
  data?: any
}

/**
 * Sim client tool call states (from existing system)
 */
export enum ClientToolCallState {
  generating = 'generating',
  pending = 'pending',
  executing = 'executing',
  aborted = 'aborted',
  rejected = 'rejected',
  success = 'success',
  error = 'error',
  review = 'review',
  background = 'background',
}

/**
 * Sim tool display configuration (from existing system)
 */
export interface ClientToolDisplay {
  text: string
  icon: LucideIcon
}

/**
 * Sim tool metadata (from existing system)
 */
export interface BaseClientToolMetadata {
  displayNames: Partial<Record<ClientToolCallState, ClientToolDisplay>>
  interrupt?: {
    accept: ClientToolDisplay
    reject: ClientToolDisplay
  }
  description?: string
}

/**
 * Sim tool definition interface (from existing system)
 */
export interface SimToolDefinition<Args = any> {
  name: string
  metadata?: BaseClientToolMetadata
  hasInterrupt?: boolean | ((args?: Args) => boolean)
  execute: (ctx: ToolExecutionContext, args?: Args) => Promise<ToolRunResult | undefined>
  accept?: (ctx: ToolExecutionContext, args?: Args) => Promise<ToolRunResult | undefined>
  reject?: (ctx: ToolExecutionContext, args?: Args) => Promise<ToolRunResult | undefined>
}

// =============================================================================
// Adapter Configuration and Setup
// =============================================================================

/**
 * Main configuration for a tool adapter
 */
export interface AdapterConfiguration {
  // Basic identification
  parlantId?: string
  displayName?: string
  description?: string
  category?: string
  tags?: string[]

  // Parameter mapping configuration
  parameterMappings?: ParameterMapping[]

  // Validation configuration
  validation?: ValidationConfig

  // Result formatting configuration
  resultFormatting?: ResultFormatting

  // Natural language configuration
  naturalLanguage?: NaturalLanguageConfig

  // Error handling configuration
  errorHandling?: ErrorHandlingConfig

  // Performance and caching
  caching?: CachingConfig

  // Monitoring and logging
  monitoring?: MonitoringConfig

  // Security configuration
  security?: SecurityConfig
}

/**
 * Natural language enhancement configuration
 */
export interface NaturalLanguageConfig {
  // How to describe the tool's purpose
  usageDescription: string

  // Examples of when to use this tool
  exampleUsage: string[]

  // Conversational hints for agents
  conversationalHints: {
    whenToUse: string
    parameters: string
    results: string
  }

  // Alternative names/aliases
  aliases?: string[]

  // Keywords for discovery
  keywords?: string[]
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  // How to handle different types of errors
  strategies?: {
    validation?: 'strict' | 'lenient' | 'custom'
    execution?: 'retry' | 'fail' | 'custom'
    timeout?: 'fail' | 'partial' | 'custom'
  }

  // Retry configuration
  retry?: {
    maxAttempts: number
    backoffMs: number
    retryableErrorCodes?: number[]
  }

  // Custom error handlers
  customHandlers?: {
    [errorType: string]: (error: Error, context: any) => Promise<any>
  }

  // User-friendly error messages
  userFriendlyMessages?: {
    [errorPattern: string]: string
  }
}

/**
 * Caching configuration for performance optimization
 */
export interface CachingConfig {
  enabled: boolean
  ttlMs?: number
  maxSize?: number
  keyStrategy?: 'parameters' | 'context' | 'custom'
  customKeyGenerator?: (args: any, context: any) => string
  invalidationRules?: {
    onUpdate?: string[]
    onTime?: number
    onCondition?: (data: any) => boolean
  }
}

/**
 * Monitoring and observability configuration
 */
export interface MonitoringConfig {
  // Metrics collection
  metrics?: {
    enabled: boolean
    includeParameters?: boolean
    includeResults?: boolean
    customMetrics?: string[]
  }

  // Performance tracking
  performance?: {
    enabled: boolean
    slowExecutionThresholdMs?: number
    trackMemoryUsage?: boolean
  }

  // Error tracking
  errorTracking?: {
    enabled: boolean
    includeStackTrace?: boolean
    groupSimilarErrors?: boolean
  }

  // Usage analytics
  analytics?: {
    enabled: boolean
    trackUserPatterns?: boolean
    trackSuccessRates?: boolean
  }
}

// =============================================================================
// Parameter Mapping System
// =============================================================================

/**
 * Maps a Parlant parameter to a Sim parameter with transformation rules
 */
export interface ParameterMapping {
  // Source parameter (from Parlant)
  parlantParameter: string

  // Target parameter (for Sim tool)
  simParameter: string

  // Optional description
  description?: string

  // Whether this parameter is required
  required?: boolean

  // Default value if not provided
  defaultValue?: any

  // Transformation rules to apply
  transformations?: MappingTransformation[]

  // Validation rules for this parameter
  validation?: ValidationConfig

  // Conditional mapping (only apply if conditions are met)
  conditions?: MappingRule[]

  // Contextual value resolution
  contextualValue?: ContextualValue

  // Target type for type conversion
  targetType?: string
}

/**
 * Individual transformation to apply to a parameter value
 */
export interface MappingTransformation {
  // Type of transformation
  type: string

  // Configuration for this transformation
  config?: Record<string, any>

  // Custom transformation function
  customTransform?: (value: any, config: Record<string, any>, context: any) => Promise<any> | any
}

/**
 * Rule-based conditional mapping
 */
export interface MappingRule {
  // Field to check (in input parameters)
  field: string

  // Operator for comparison
  operator: 'equals' | 'not_equals' | 'exists' | 'not_exists' | 'contains' | 'matches'

  // Value to compare against
  value: any

  // Check context field instead of parameter field
  contextField?: string
}

/**
 * Resolve values from execution context
 */
export interface ContextualValue {
  // Source of the contextual value
  source:
    | 'context'
    | 'user'
    | 'workspace'
    | 'session'
    | 'agent'
    | 'timestamp'
    | 'uuid'
    | 'original'
    | 'constant'
    | 'computed'

  // Path to value (for context source)
  path?: string

  // Static value (for constant source)
  value?: any

  // Computed value function (for computed source)
  compute?: (context: any, originalValue?: any) => any
}

/**
 * Context information for parameter mapping
 */
export interface ParameterContext {
  // Original Parlant parameters
  originalParameters: Record<string, any>

  // Execution context
  executionContext: any

  // Mapping metadata
  mappingMetadata: {
    toolName: string
    mappingVersion: string
    appliedAt: Date
  }
}

// =============================================================================
// Validation System
// =============================================================================

/**
 * Validation configuration for parameters and results
 */
export interface ValidationConfig {
  // Enable/disable different types of validation
  enableStrictValidation?: boolean
  enableBusinessRules?: boolean
  enableCustomValidators?: boolean

  // Basic validation rules
  required?: boolean
  type?: string | string[]
  schema?: z.ZodSchema<any>

  // Custom validation function
  custom?: (value: any, fieldName: string) => Promise<boolean | string> | boolean | string

  // Business rules to apply
  businessRules?: BusinessRule[]

  // Conditional validation
  conditional?: ConditionalValidation[]
}

/**
 * Business rule definition
 */
export interface BusinessRule {
  // Unique name for the rule
  name: string

  // Type of business rule
  type:
    | 'workspace_access'
    | 'user_permissions'
    | 'rate_limit'
    | 'resource_quota'
    | 'data_dependencies'
    | 'custom'

  // Field this rule applies to
  field?: string

  // Human-readable description
  description?: string

  // Error message if rule fails
  errorMessage?: string

  // Rule-specific configuration
  action?: string
  resource?: string
  resourceType?: string
  requestedAmount?: number
  dependencies?: Array<{ type: string; id: string }>

  // Custom validator function
  validator?: (data: any, context: any) => Promise<boolean> | boolean
}

/**
 * Conditional validation based on other values
 */
export interface ConditionalValidation {
  // Condition to evaluate
  condition: any // This would be more specific in practice

  // Schema to apply if condition is true
  ifTrue: z.ZodSchema<any>

  // Schema to apply if condition is false
  ifFalse?: z.ZodSchema<any>
}

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  transformedParameters?: Record<string, any>
  metadata?: Record<string, any>
  timestamp?: number
}

/**
 * Individual validation error
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

// =============================================================================
// Result Formatting System
// =============================================================================

/**
 * Configuration for result formatting
 */
export interface ResultFormatting {
  // Enable different formatting features
  enableConversationalFormatting?: boolean
  enableTemplateFormatting?: boolean
  enableContextualHints?: boolean

  // Formatting constraints
  maxDetailsLength?: number
  maxActionsCount?: number

  // Custom formatting templates
  templates?: FormattingTemplate[]

  // Default actions for different result types
  defaultActions?: {
    success?: string[]
    error?: string[]
    partial?: string[]
  }
}

/**
 * Template for formatting specific types of results
 */
export interface FormattingTemplate {
  // Unique name for this template
  name: string

  // Condition to determine when to use this template
  condition?: ((data: any, context: any) => boolean) | Record<string, any>

  // Template strings with variable substitution
  summary: string
  details?: string
  suggestion?: string

  // Available actions for this result type
  actions?: string[]

  // Priority if multiple templates match
  priority?: number
}

/**
 * Conversational hint for natural interaction
 */
export interface ConversationalHint {
  whenToUse: string
  parameters: string
  results: string
}

// =============================================================================
// Tool Registry and Discovery
// =============================================================================

/**
 * Registry entry for an adapted tool
 */
export interface AdapterRegistryEntry {
  // Unique identifier
  id: string

  // Original Sim tool reference
  simTool: SimToolDefinition

  // Adapter configuration
  config: AdapterConfiguration

  // Adapter instance (lazy-loaded)
  adapter?: any // BaseAdapter instance

  // Registration metadata
  metadata: {
    registeredAt: Date
    version: string
    source: string
    category: string
    tags: string[]
  }

  // Runtime statistics
  statistics?: {
    executionCount: number
    averageExecutionTimeMs: number
    successRate: number
    lastUsed?: Date
    errorCount: number
  }

  // Health status
  health?: {
    status: 'healthy' | 'degraded' | 'unhealthy'
    lastCheckAt: Date
    issues?: string[]
  }
}

/**
 * Tool discovery and search criteria
 */
export interface ToolDiscoveryQuery {
  // Text-based search
  query?: string
  keywords?: string[]

  // Category and tag filtering
  category?: string
  tags?: string[]

  // Capability filtering
  requiredCapabilities?: string[]
  excludeCapabilities?: string[]

  // Context-based filtering
  workspaceId?: string
  userId?: string
  permissions?: string[]

  // Result ordering and pagination
  orderBy?: 'relevance' | 'usage' | 'name' | 'category'
  limit?: number
  offset?: number
}

/**
 * Tool discovery result
 */
export interface DiscoveredTool {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  relevanceScore: number
  usageStats: {
    executionCount: number
    successRate: number
    averageRating?: number
  }
  capabilities: string[]
  requirements: string[]
}

// =============================================================================
// Execution Context and Results
// =============================================================================

/**
 * Enhanced execution context for adapter operations
 */
export interface AdapterExecutionContext {
  // Basic execution info
  executionId: string
  toolId: string
  adapterVersion: string

  // Timing information
  startedAt: Date
  timeoutMs?: number

  // User and workspace context
  userId: string
  workspaceId: string
  sessionId?: string

  // Agent context (if called by an agent)
  agentId?: string
  agentType?: string

  // Request metadata
  requestSource: 'api' | 'chat' | 'workflow' | 'scheduled' | 'test'
  correlationId?: string

  // Feature flags and configuration
  features?: Record<string, boolean>
  config?: Record<string, any>

  // Logging and monitoring
  logger?: (level: string, message: string, extra?: any) => void
  metrics?: (name: string, value: number, tags?: Record<string, string>) => void

  // Variables and state
  variables?: Record<string, any>
  state?: Record<string, any>
}

/**
 * Comprehensive execution result
 */
export interface AdapterExecutionResult {
  // Basic result information
  success: boolean
  executionId: string
  toolId: string

  // Timing and performance
  startedAt: Date
  completedAt: Date
  durationMs: number

  // Result data
  data?: any
  metadata?: Record<string, any>

  // Error information (if failed)
  error?: {
    type: string
    message: string
    code?: string
    details?: any
    recoverable?: boolean
  }

  // Execution statistics
  stats?: {
    parameterMappingTimeMs: number
    validationTimeMs: number
    simToolExecutionTimeMs: number
    resultFormattingTimeMs: number
    memoryUsageMB?: number
  }

  // Warnings and notices
  warnings?: string[]
  notices?: string[]

  // Follow-up actions or suggestions
  suggestions?: Array<{
    type: string
    message: string
    action?: string
    priority: 'low' | 'medium' | 'high'
  }>
}

// =============================================================================
// Extension and Plugin System
// =============================================================================

/**
 * Plugin interface for extending adapter functionality
 */
export interface AdapterPlugin {
  // Plugin identification
  name: string
  version: string
  description?: string

  // Plugin lifecycle hooks
  onInitialize?: (adapter: any) => Promise<void> | void
  onBeforeExecution?: (context: AdapterExecutionContext, args: any) => Promise<void> | void
  onAfterExecution?: (context: AdapterExecutionContext, result: any) => Promise<void> | void
  onParameterMapping?: (params: any, context: any) => Promise<any> | any
  onResultFormatting?: (result: any, context: any) => Promise<any> | any
  onError?: (error: Error, context: AdapterExecutionContext) => Promise<void> | void

  // Plugin configuration
  config?: Record<string, any>

  // Dependencies on other plugins
  dependencies?: string[]

  // Plugin-specific extensions
  extensions?: Record<string, any>
}

/**
 * Extension point definition
 */
export interface ExtensionPoint {
  name: string
  description: string
  type: 'hook' | 'filter' | 'provider' | 'middleware'
  parameters?: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
  returnType?: string
}

// =============================================================================
// Testing and Development Support
// =============================================================================

/**
 * Test configuration for adapter development
 */
export interface AdapterTestConfig {
  // Test scenarios
  scenarios: Array<{
    name: string
    description?: string
    input: any
    expectedOutput: any
    context?: Partial<AdapterExecutionContext>
    assertions?: Array<{
      path: string
      operator: 'equals' | 'contains' | 'matches' | 'type'
      value: any
    }>
  }>

  // Mock configurations
  mocks?: {
    simTool?: Partial<SimToolDefinition>
    context?: Partial<AdapterExecutionContext>
    externalServices?: Record<string, any>
  }

  // Test options
  options?: {
    timeoutMs?: number
    retries?: number
    parallel?: boolean
    verbose?: boolean
  }
}

/**
 * Test result information
 */
export interface AdapterTestResult {
  scenario: string
  success: boolean
  durationMs: number
  assertions?: Array<{
    path: string
    passed: boolean
    expected: any
    actual: any
    message?: string
  }>
  error?: string
  warnings?: string[]
}

// =============================================================================
// Migration and Versioning
// =============================================================================

/**
 * Migration definition for adapter version changes
 */
export interface AdapterMigration {
  fromVersion: string
  toVersion: string
  description: string

  // Configuration migrations
  configMigration?: (oldConfig: any) => any

  // Data migrations
  dataMigration?: (oldData: any) => any

  // Validation for migration
  validate?: (migratedData: any) => boolean

  // Rollback capability
  rollback?: (newData: any) => any
}

/**
 * Version compatibility information
 */
export interface VersionCompatibility {
  adapterVersion: string
  simVersion: string
  parlantVersion: string
  compatible: boolean
  issues?: string[]
  recommendations?: string[]
}

// =============================================================================
// Advanced Configuration Types
// =============================================================================

/**
 * Security configuration for adapters
 */
export interface SecurityConfig {
  // Input sanitization
  sanitization?: {
    enabled: boolean
    allowedTags?: string[]
    stripScripts?: boolean
    maxInputLength?: number
  }

  // Access control
  accessControl?: {
    requiredPermissions?: string[]
    allowedRoles?: string[]
    workspaceRestrictions?: string[]
  }

  // Rate limiting
  rateLimiting?: {
    enabled: boolean
    maxRequestsPerMinute?: number
    maxRequestsPerHour?: number
    maxRequestsPerDay?: number
    perUser?: boolean
    perWorkspace?: boolean
  }

  // Data privacy
  privacy?: {
    logParameters?: boolean
    logResults?: boolean
    encryptSensitiveData?: boolean
    dataRetentionDays?: number
  }
}

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
  // Caching
  caching?: CachingConfig

  // Connection pooling
  connectionPooling?: {
    enabled: boolean
    minConnections?: number
    maxConnections?: number
    idleTimeoutMs?: number
  }

  // Request batching
  batching?: {
    enabled: boolean
    maxBatchSize?: number
    batchTimeoutMs?: number
    batchKeyExtractor?: (args: any) => string
  }

  // Async processing
  asyncProcessing?: {
    enabled: boolean
    queueSize?: number
    workerCount?: number
    priorityLevels?: number
  }
}

// =============================================================================
// Export Collections for Convenience
// =============================================================================

/**
 * All core adapter types
 */
export type AdapterCoreTypes =
  | AdapterConfiguration
  | ParameterMapping
  | ValidationConfig
  | ResultFormatting
  | NaturalLanguageConfig

/**
 * All execution-related types
 */
export type AdapterExecutionTypes =
  | AdapterExecutionContext
  | AdapterExecutionResult
  | ParameterContext

/**
 * All registry and discovery types
 */
export type AdapterRegistryTypes = AdapterRegistryEntry | ToolDiscoveryQuery | DiscoveredTool

/**
 * All extension and plugin types
 */
export type AdapterExtensionTypes = AdapterPlugin | ExtensionPoint | AdapterMigration

/**
 * All testing and development types
 */
export type AdapterTestingTypes = AdapterTestConfig | AdapterTestResult

// =============================================================================
// Testing and Performance Interfaces
// =============================================================================

/**
 * Performance thresholds for testing configurations
 */
export interface PerformanceThresholds {
  contextAnalysisMaxTime?: number // ms
  recommendationGenerationMaxTime?: number // ms
  realtimeResponseMaxTime?: number // ms
  executionTime?: number // ms
  memoryUsage?: number // MB
  throughput?: number // operations/second
  minAccuracyScore?: number // 0-1
  minConfidenceScore?: number // 0-1
  maxErrorRate?: number // 0-1
}

/**
 * Test configuration interface with performance thresholds
 */
export interface TestConfiguration {
  enablePerformanceTesting?: boolean
  enableLoadTesting?: boolean
  enableIntegrationTesting?: boolean
  maxTestDuration?: number
  performanceThresholds?: PerformanceThresholds
  testDatasets?: any[]
  timeout?: number
  retries?: number
  parallel?: boolean
  generateHtmlReport?: boolean
  generateCoverageReport?: boolean
}

/**
 * All advanced configuration types
 */
export type AdapterAdvancedTypes =
  | SecurityConfig
  | PerformanceConfig
  | MonitoringConfig
  | ErrorHandlingConfig

/**
 * All testing and performance types
 */
export type AdapterTestingPerformanceTypes = PerformanceThresholds | TestConfiguration
