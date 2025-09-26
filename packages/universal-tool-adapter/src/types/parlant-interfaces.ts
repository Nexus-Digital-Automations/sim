/**
 * Universal Tool Adapter - Parlant Integration Interfaces
 *
 * Type definitions for Parlant agent system integration, including tool
 * interfaces, execution contexts, and conversational result formatting.
 *
 * @author Claude Code Adapter Pattern Design Agent
 * @version 1.0.0
 */

// =============================================================================
// Core Parlant Tool Interface
// =============================================================================

/**
 * Main Parlant tool interface that all adapted tools must implement
 */
export interface ParlantTool {
  // Tool identification
  id: string
  name: string
  description: string

  // Parameter definition for Parlant agents
  parameters: ParameterDefinition[]

  // Tool metadata for discovery and usage
  metadata: ToolMetadata

  // Main execution method
  execute(context: ParlantExecutionContext, args: any): Promise<ParlantToolResult>
}

/**
 * Parameter definition for Parlant tool interface
 */
export interface ParameterDefinition {
  // Parameter name
  name: string

  // Human-readable description for agents
  description: string

  // Parameter type information
  type: ParameterType

  // Whether this parameter is required
  required: boolean

  // Default value if not provided
  defaultValue?: any

  // Example values for guidance
  examples?: any[]

  // Validation constraints
  constraints?: ParameterConstraints

  // Conversational hints for agents
  conversationalHints?: {
    prompt?: string
    clarification?: string
    validation?: string
  }
}

/**
 * Parameter type definition with rich metadata
 */
export interface ParameterType {
  // Base type
  baseType:
    | 'string'
    | 'number'
    | 'boolean'
    | 'array'
    | 'object'
    | 'file'
    | 'date'
    | 'enum'
    | 'union'

  // Subtype for arrays and objects
  itemType?: ParameterType
  properties?: Record<string, ParameterType>

  // Enum values
  enumValues?: Array<{
    value: any
    label: string
    description?: string
  }>

  // Union type options
  unionTypes?: ParameterType[]

  // Format hints for strings
  format?:
    | 'email'
    | 'url'
    | 'uuid'
    | 'date'
    | 'time'
    | 'datetime'
    | 'phone'
    | 'json'
    | 'markdown'
    | 'html'
    | 'regex'

  // MIME types for files
  acceptedMimeTypes?: string[]
}

/**
 * Parameter validation constraints
 */
export interface ParameterConstraints {
  // String constraints
  minLength?: number
  maxLength?: number
  pattern?: string

  // Number constraints
  minimum?: number
  maximum?: number
  multipleOf?: number

  // Array constraints
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean

  // Object constraints
  requiredProperties?: string[]
  additionalProperties?: boolean

  // File constraints
  maxFileSize?: number
  allowedExtensions?: string[]

  // Custom validation
  customValidator?: string // Reference to a validation function
}

/**
 * Tool metadata for Parlant integration
 */
export interface ToolMetadata {
  // Tool categorization
  source: 'sim' | 'external' | 'builtin'
  category: string
  tags: string[]

  // Version and compatibility
  version: string
  lastUpdated: string
  parlantVersion?: string
  compatibility?: string[]

  // Capabilities and requirements
  capabilities: string[]
  requirements: string[]

  // Natural language enhancement
  naturalLanguage: NaturalLanguageConfig

  // Usage statistics (for recommendations)
  usage?: {
    totalExecutions?: number
    successRate?: number
    averageExecutionTime?: number
    popularityScore?: number
    lastUsed?: string
  }

  // Documentation links
  documentation?: {
    userGuide?: string
    examples?: string
    troubleshooting?: string
    apiReference?: string
  }
}

/**
 * Natural language configuration for conversational interaction
 */
export interface NaturalLanguageConfig {
  // Primary usage description
  usageDescription: string

  // Example usage scenarios
  exampleUsage: string[]

  // Conversational hints for agents
  conversationalHints: {
    whenToUse: string
    parameters: string
    results: string
  }

  // Alternative names and aliases
  aliases?: string[]

  // Keywords for discovery and matching
  keywords?: string[]

  // Localization support
  localization?: Record<
    string,
    {
      usageDescription: string
      exampleUsage: string[]
      conversationalHints: {
        whenToUse: string
        parameters: string
        results: string
      }
    }
  >
}

// =============================================================================
// Execution Context and Environment
// =============================================================================

/**
 * Execution context provided by Parlant agents
 */
export interface ParlantExecutionContext {
  // Execution identification
  executionId: string
  correlationId?: string

  // Timing and constraints
  startTime: Date
  timestamp: Date // Legacy timestamp property for backward compatibility
  maxExecutionTime?: number
  timeoutMs?: number

  // Agent context
  agentId: string
  agentType: string
  agentCapabilities: string[]

  // Session context
  sessionId: string
  conversationId?: string
  messageId?: string

  // User and workspace context
  userId: string
  workspaceId: string
  tenantId?: string

  // Execution type and source
  type: 'chat' | 'workflow' | 'api' | 'scheduled' | 'test'
  source: string

  // Permissions and security
  permissions: string[]
  securityContext?: SecurityContext

  // Environment and configuration
  environment: 'development' | 'staging' | 'production'
  features: Record<string, boolean>
  config: Record<string, any>

  // State and variables
  variables?: Record<string, any>
  sessionState?: Record<string, any>
  conversationState?: Record<string, any>

  // Logging and monitoring
  logger?: (level: string, message: string, extra?: any) => void
  metrics?: (name: string, value: number, tags?: Record<string, string>) => void
  tracer?: (operation: string, data?: any) => void

  // Tool chain context (for composed operations)
  toolChain?: {
    previousTools: string[]
    nextTools: string[]
    chainId: string
    stepIndex: number
  }

  // Feedback and learning
  feedback?: {
    enabled: boolean
    collector: (feedback: ToolFeedback) => Promise<void>
  }
}

/**
 * Security context for tool execution
 */
export interface SecurityContext {
  // Authentication information
  authMethod: 'jwt' | 'oauth' | 'api_key' | 'service_account'
  authLevel: 'user' | 'service' | 'admin' | 'system'
  tokenScopes?: string[]

  // Access control
  roles: string[]
  permissions: string[]
  restrictions?: string[]

  // Network and origin
  originIp?: string
  userAgent?: string
  referer?: string

  // Audit and compliance
  auditRequired: boolean
  complianceLevel?: string
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted'

  // Rate limiting context
  rateLimitContext?: {
    limitKey: string
    currentUsage: number
    limitThreshold: number
    resetTime: Date
  }
}

// =============================================================================
// Tool Results and Responses
// =============================================================================

/**
 * Comprehensive tool execution result for Parlant agents
 */
export interface ParlantToolResult {
  // Execution status
  type: 'success' | 'error' | 'partial' | 'timeout' | 'cancelled'

  // Primary message (short summary)
  message?: string

  // Structured data result
  data?: any

  // Conversational formatting for natural interaction
  conversational?: ConversationalResult

  // Execution metadata
  metadata?: {
    executionId?: string
    toolId?: string
    durationMs?: number
    statusCode?: number
    retryCount?: number
    fromCache?: boolean
    [key: string]: any
  }

  // Follow-up actions or suggestions
  followUp?: {
    suggestedActions?: SuggestedAction[]
    relatedTools?: string[]
    nextSteps?: string[]
  }

  // Error details (for error types)
  error?: {
    code: string
    type: string
    message: string
    details?: any
    recoverable: boolean
    suggestedFix?: string
  }

  // Warnings and notices
  warnings?: string[]
  notices?: string[]

  // Performance and quality metrics
  metrics?: {
    confidence?: number
    relevance?: number
    quality?: number
    userSatisfaction?: number
  }
}

/**
 * Conversational result formatting for natural agent interaction
 */
export interface ConversationalResult {
  // Primary summary for the user
  summary: string

  // Detailed explanation (optional)
  details?: string

  // Helpful suggestion or next step
  suggestion?: string

  // Available actions the user can take
  actions?: string[]

  // Rich media content
  media?: MediaContent[]

  // Structured presentation data
  presentation?: {
    format: 'table' | 'list' | 'card' | 'chart' | 'timeline' | 'gallery'
    data: any
    layout?: Record<string, any>
  }

  // Emotional context for agent response
  tone?: 'informative' | 'encouraging' | 'cautious' | 'celebratory' | 'apologetic' | 'neutral'

  // Personalization hints
  personalization?: {
    userPreferences?: Record<string, any>
    adaptToContext?: boolean
    customization?: Record<string, any>
  }
}

/**
 * Suggested action for user interaction
 */
export interface SuggestedAction {
  // Unique identifier for the action
  id: string

  // Display label for the action
  label: string

  // Description of what the action does
  description?: string

  // Action type
  type: 'execute_tool' | 'navigate' | 'copy' | 'download' | 'share' | 'edit' | 'delete' | 'custom'

  // Action configuration
  config?: {
    toolId?: string
    parameters?: Record<string, any>
    url?: string
    data?: any
    confirmationRequired?: boolean
  }

  // Visual presentation
  icon?: string
  color?: string
  priority?: 'low' | 'medium' | 'high'

  // Conditional availability
  availableWhen?: {
    permissions?: string[]
    features?: string[]
    context?: Record<string, any>
  }
}

/**
 * Media content for rich results
 */
export interface MediaContent {
  // Media type
  type: 'image' | 'video' | 'audio' | 'document' | 'link' | 'embed'

  // Content URL or data
  url?: string
  data?: string
  embed?: string

  // Media metadata
  title?: string
  description?: string
  thumbnail?: string
  duration?: number
  size?: number

  // Display configuration
  display?: {
    width?: number
    height?: number
    aspectRatio?: string
    autoplay?: boolean
    controls?: boolean
  }
}

// =============================================================================
// Tool Discovery and Registry
// =============================================================================

/**
 * Tool discovery interface for Parlant agents
 */
export interface ToolDiscovery {
  // Search for tools by query
  search(query: ToolSearchQuery): Promise<ToolSearchResult[]>

  // Get tool by ID
  getTool(id: string): Promise<ParlantTool | null>

  // Get tools by category
  getToolsByCategory(category: string): Promise<ParlantTool[]>

  // Get recommended tools for context
  getRecommendations(context: RecommendationContext): Promise<ToolRecommendation[]>

  // Get tools with specific capabilities
  getToolsByCapabilities(capabilities: string[]): Promise<ParlantTool[]>
}

/**
 * Tool search query
 */
export interface ToolSearchQuery {
  // Text query
  query?: string

  // Category filter
  category?: string

  // Tag filters
  tags?: string[]

  // Capability requirements
  requiredCapabilities?: string[]

  // Context filters
  context?: {
    userId?: string
    workspaceId?: string
    agentType?: string
    currentTool?: string
  }

  // Result configuration
  limit?: number
  offset?: number
  includeMetadata?: boolean
  sortBy?: 'relevance' | 'usage' | 'name' | 'updated'
}

/**
 * Tool search result
 */
export interface ToolSearchResult {
  tool: ParlantTool
  relevanceScore: number
  matchedFields: string[]
  highlightedSnippets?: string[]
  usageStats?: {
    executionCount: number
    successRate: number
    lastUsed: string
  }
}

/**
 * Context for tool recommendations
 */
export interface RecommendationContext {
  // Current conversation context
  conversationHistory?: Array<{
    role: 'user' | 'agent' | 'tool'
    content: string
    timestamp: Date
  }>

  // User context
  userId: string
  userPreferences?: Record<string, any>
  userSkillLevel?: 'beginner' | 'intermediate' | 'advanced'

  // Workspace context
  workspaceId: string
  workspaceType?: string
  availableIntegrations?: string[]

  // Current task context
  currentGoal?: string
  taskCategory?: string
  urgency?: 'low' | 'medium' | 'high'

  // Tool usage history
  recentTools?: Array<{
    toolId: string
    usedAt: Date
    successful: boolean
  }>
}

/**
 * Tool recommendation
 */
export interface ToolRecommendation {
  tool: ParlantTool
  confidence: number
  reason: string
  category: 'popular' | 'contextual' | 'complementary' | 'alternative' | 'trending'
  suggestedParameters?: Record<string, any>
}

// =============================================================================
// Tool Execution Monitoring and Feedback
// =============================================================================

/**
 * Tool execution monitoring interface
 */
export interface ToolExecutionMonitor {
  // Start monitoring an execution
  startExecution(context: ParlantExecutionContext): Promise<string>

  // Update execution progress
  updateProgress(executionId: string, progress: ExecutionProgress): Promise<void>

  // Complete execution
  completeExecution(executionId: string, result: ParlantToolResult): Promise<void>

  // Cancel execution
  cancelExecution(executionId: string, reason: string): Promise<void>

  // Get execution status
  getExecutionStatus(executionId: string): Promise<ExecutionStatus>
}

/**
 * Execution progress information
 */
export interface ExecutionProgress {
  // Current step information
  currentStep: string
  stepIndex: number
  totalSteps: number

  // Progress percentage
  progressPercent: number

  // Time estimates
  estimatedRemainingMs?: number
  estimatedCompletionTime?: Date

  // Status message
  message?: string

  // Intermediate results
  intermediateData?: any
}

/**
 * Execution status information
 */
export interface ExecutionStatus {
  executionId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout'
  progress?: ExecutionProgress
  result?: ParlantToolResult
  error?: string
  startTime: Date
  endTime?: Date
  durationMs?: number
}

/**
 * Tool feedback for learning and improvement
 */
export interface ToolFeedback {
  // Execution context
  executionId: string
  toolId: string
  userId: string

  // Feedback type
  type: 'rating' | 'correction' | 'improvement' | 'bug_report' | 'feature_request'

  // Feedback content
  rating?: number // 1-5 scale
  comment?: string
  improvements?: string[]

  // Specific issues
  issues?: Array<{
    type:
      | 'incorrect_result'
      | 'slow_execution'
      | 'confusing_interface'
      | 'missing_feature'
      | 'error'
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>

  // Suggested improvements
  suggestions?: Array<{
    category: 'interface' | 'functionality' | 'performance' | 'documentation'
    suggestion: string
    priority: 'low' | 'medium' | 'high'
  }>

  // Context information
  context?: {
    userSkillLevel?: string
    taskComplexity?: string
    timeOfDay?: string
    deviceType?: string
  }

  // Timing
  submittedAt: Date
  executedAt: Date
}

// =============================================================================
// Advanced Integration Features
// =============================================================================

/**
 * Tool composition for complex workflows
 */
export interface ToolComposition {
  // Composition identification
  id: string
  name: string
  description: string

  // Component tools
  tools: Array<{
    toolId: string
    stepIndex: number
    dependencies: number[]
    parameterMappings?: Record<string, string>
    errorHandling?: 'fail' | 'skip' | 'retry' | 'alternative'
  }>

  // Composition metadata
  metadata: {
    category: string
    tags: string[]
    complexity: 'simple' | 'moderate' | 'complex'
    estimatedDuration?: number
  }

  // Execution configuration
  execution: {
    mode: 'sequential' | 'parallel' | 'conditional'
    timeout?: number
    retryPolicy?: {
      maxRetries: number
      backoffMs: number
    }
  }
}

/**
 * Tool authentication and authorization
 */
export interface ToolAuthProvider {
  // Provider identification
  providerId: string
  name: string
  type: 'oauth2' | 'api_key' | 'jwt' | 'basic' | 'custom'

  // Authentication methods
  authenticate(context: ParlantExecutionContext): Promise<AuthResult>
  refreshAuth(authData: any): Promise<AuthResult>
  validateAuth(authData: any): Promise<boolean>

  // Authorization methods
  authorize(authData: any, requiredPermissions: string[]): Promise<boolean>
  getPermissions(authData: any): Promise<string[]>

  // Configuration
  config: {
    authEndpoint?: string
    tokenEndpoint?: string
    scopeMapping?: Record<string, string[]>
    refreshThresholdMs?: number
  }
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean
  authData?: {
    token?: string
    refreshToken?: string
    expiresAt?: Date
    permissions?: string[]
    metadata?: Record<string, any>
  }
  error?: string
}

// =============================================================================
// Type Utilities and Helpers
// =============================================================================

/**
 * Tool parameter input type extraction
 */
export type ExtractToolParameters<T extends ParlantTool> = Parameters<T['execute']>[1]

/**
 * Tool result type extraction
 */
export type ExtractToolResult<T extends ParlantTool> = Awaited<ReturnType<T['execute']>>

/**
 * Generic tool interface with typed parameters and results
 */
export interface TypedParlantTool<TParams = any, TResult = any> extends ParlantTool {
  execute(
    context: ParlantExecutionContext,
    args: TParams
  ): Promise<ParlantToolResult & { data?: TResult }>
}

/**
 * Tool factory interface for dynamic tool creation
 */
export interface ToolFactory<T extends ParlantTool = ParlantTool> {
  createTool(config: any): T
  validateConfig(config: any): boolean
  getConfigSchema(): any
}

/**
 * Tool registry interface for managing tools
 */
export interface ToolRegistry {
  // Registration
  register(tool: ParlantTool): Promise<void>
  unregister(toolId: string): Promise<boolean>

  // Retrieval
  get(toolId: string): Promise<ParlantTool | null>
  list(filter?: any): Promise<ParlantTool[]>

  // Discovery
  discover(query: ToolSearchQuery): Promise<ToolSearchResult[]>
  recommend(context: RecommendationContext): Promise<ToolRecommendation[]>

  // Health and monitoring
  checkHealth(toolId?: string): Promise<Record<string, any>>
  getStats(toolId?: string): Promise<Record<string, any>>
}

// =============================================================================
// Export Collections
// =============================================================================

/**
 * All core Parlant interface types
 */
export type ParlantCoreTypes =
  | ParlantTool
  | ParameterDefinition
  | ToolMetadata
  | ParlantExecutionContext
  | ParlantToolResult

/**
 * All discovery and registry types
 */
export type ParlantDiscoveryTypes =
  | ToolDiscovery
  | ToolSearchQuery
  | ToolSearchResult
  | ToolRecommendation

/**
 * All execution and monitoring types
 */
export type ParlantExecutionTypes =
  | ToolExecutionMonitor
  | ExecutionProgress
  | ExecutionStatus
  | ToolFeedback

/**
 * All advanced integration types
 */
export type ParlantAdvancedTypes = ToolComposition | ToolAuthProvider | AuthResult
