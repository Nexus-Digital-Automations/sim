/**
 * Workflow Integration Type Definitions
 * ====================================
 *
 * Types for integrating with existing Sim workflows, including
 * workflow analysis, block mapping, and conversion utilities.
 */

import type { InputValidation } from './journey-types'
import type { ConditionalExpression } from './template-types'

// ============================================================================
// Workflow Analysis Types
// ============================================================================

export interface WorkflowAnalysis {
  workflowId: string
  analysis: WorkflowStructureAnalysis
  complexity: WorkflowComplexity
  suitability: JourneySuitability
  recommendations: ConversionRecommendation[]
  metadata: WorkflowMetadata
}

export interface WorkflowStructureAnalysis {
  totalBlocks: number
  totalEdges: number
  blocksByType: Record<string, number>

  // Flow analysis
  entryPoints: string[]
  exitPoints: string[]
  cycles: WorkflowCycle[]
  branches: WorkflowBranch[]
  parallelPaths: ParallelPath[]

  // Dependency analysis
  dependencies: BlockDependency[]
  criticalPath: string[]
  isolatedBlocks: string[]

  // Data flow analysis
  dataFlow: DataFlowAnalysis
  variableUsage: VariableUsageAnalysis
}

export interface WorkflowComplexity {
  overall: 'simple' | 'moderate' | 'complex' | 'very_complex'
  scores: {
    structural: number // Based on blocks, edges, nesting
    logical: number // Based on conditions, loops
    dataFlow: number // Based on variables, transformations
    integration: number // Based on external dependencies
  }
  factors: ComplexityFactor[]
}

export interface ComplexityFactor {
  type: 'structural' | 'logical' | 'data' | 'integration'
  factor: string
  weight: number
  impact: 'positive' | 'negative' | 'neutral'
  description: string
}

export interface JourneySuitability {
  score: number // 0-100
  suitabilityLevel: 'poor' | 'fair' | 'good' | 'excellent'
  strengths: SuitabilityFactor[]
  weaknesses: SuitabilityFactor[]
  recommendations: string[]
}

export interface SuitabilityFactor {
  factor: string
  impact: number
  description: string
  examples?: string[]
}

export interface ConversionRecommendation {
  type: 'optimization' | 'restructure' | 'simplification' | 'enhancement'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  implementation: string
  benefits: string[]
  risks: string[]
  effort: 'minimal' | 'moderate' | 'significant'
}

export interface WorkflowMetadata {
  name: string
  description?: string
  category?: string
  tags: string[]
  author: string
  created: Date
  updated: Date
  version?: string
  isPublic: boolean
}

// ============================================================================
// Workflow Structure Types
// ============================================================================

export interface WorkflowCycle {
  id: string
  blocks: string[]
  type: 'simple' | 'complex'
  depth: number
  breakConditions?: ConditionalExpression[]
}

export interface WorkflowBranch {
  id: string
  sourceBlockId: string
  branches: BranchPath[]
  convergenceBlockId?: string
  branchingLogic: BranchingLogic
}

export interface BranchPath {
  id: string
  condition?: ConditionalExpression
  blocks: string[]
  probability?: number // 0-1, for analytics
  isDefault: boolean
}

export interface BranchingLogic {
  type: 'conditional' | 'parallel' | 'exclusive' | 'inclusive'
  decisionCriteria: DecisionCriteria[]
}

export interface DecisionCriteria {
  criterion: string
  type: 'data_driven' | 'user_driven' | 'system_driven' | 'random'
  importance: number
}

export interface ParallelPath {
  id: string
  paths: ParallelBranch[]
  synchronizationPoint: string
  executionMode: 'all' | 'first' | 'majority' | 'any'
}

export interface ParallelBranch {
  id: string
  blocks: string[]
  dependencies: string[]
  timeout?: number
  fallbackAction?: string
}

export interface BlockDependency {
  blockId: string
  dependsOn: string[]
  dependencyType: 'data' | 'control' | 'resource' | 'temporal'
  optional: boolean
}

// ============================================================================
// Data Flow Analysis Types
// ============================================================================

export interface DataFlowAnalysis {
  inputs: DataInput[]
  outputs: DataOutput[]
  transformations: DataTransformation[]
  flows: DataFlow[]
  sinks: DataSink[]
  sources: DataSource[]
}

export interface DataInput {
  name: string
  type: string
  source: 'user' | 'system' | 'external' | 'computed'
  required: boolean
  validation?: InputValidation
  defaultValue?: any
}

export interface DataOutput {
  name: string
  type: string
  destination: 'user' | 'system' | 'external' | 'storage'
  format?: string
  conditions?: ConditionalExpression[]
}

export interface DataTransformation {
  id: string
  blockId: string
  inputData: string[]
  outputData: string[]
  transformationType: 'mapping' | 'computation' | 'aggregation' | 'filtering'
  complexity: 'simple' | 'moderate' | 'complex'
}

export interface DataFlow {
  id: string
  fromBlockId: string
  toBlockId: string
  dataType: string
  required: boolean
  transformation?: string
}

export interface DataSink {
  blockId: string
  dataTypes: string[]
  storage: 'temporary' | 'persistent' | 'session'
}

export interface DataSource {
  blockId: string
  dataTypes: string[]
  sourceType: 'generated' | 'retrieved' | 'computed'
}

export interface VariableUsageAnalysis {
  variables: VariableUsage[]
  totalVariables: number
  scopeDistribution: Record<string, number>
  typeDistribution: Record<string, number>
  unusedVariables: string[]
  overusedVariables: VariableOveruse[]
}

export interface VariableUsage {
  name: string
  type: string
  scope: string
  usageCount: number
  blocks: string[]
  readCount: number
  writeCount: number
  firstUsage: string
  lastUsage: string
}

export interface VariableOveruse {
  variableName: string
  usageCount: number
  recommendation: string
  riskLevel: 'low' | 'medium' | 'high'
}

// ============================================================================
// Block Conversion Types
// ============================================================================

export interface BlockConversionMap {
  blockId: string
  blockType: string
  conversionStrategy: ConversionStrategy
  journeyStateType: JourneyStateType
  mappingRules: BlockMappingRule[]
  requirements: ConversionRequirement[]
  limitations: ConversionLimitation[]
}

export interface ConversionStrategy {
  strategy: 'direct' | 'transform' | 'split' | 'merge' | 'skip'
  confidence: number // 0-100
  reasoning: string
  alternatives: AlternativeStrategy[]
}

export interface AlternativeStrategy {
  strategy: string
  confidence: number
  tradeoffs: string[]
  when: ConditionalExpression[]
}

export interface BlockMappingRule {
  property: string
  mappingType: 'direct' | 'computed' | 'conditional' | 'lookup'
  sourceProperty?: string
  computation?: string
  conditions?: ConditionalExpression[]
  lookupTable?: Record<string, any>
  defaultValue?: any
}

export interface ConversionRequirement {
  type: 'data' | 'tool' | 'agent_capability' | 'workspace_feature'
  requirement: string
  optional: boolean
  fallback?: string
}

export interface ConversionLimitation {
  type: 'functionality' | 'performance' | 'user_experience' | 'compatibility'
  limitation: string
  impact: 'low' | 'medium' | 'high'
  workaround?: string
}

// ============================================================================
// Block Type Definitions
// ============================================================================

export type WorkflowBlockType =
  | 'starter' // Entry point
  | 'agent' // AI agent interaction
  | 'api' // API call
  | 'function' // Code execution
  | 'decision' // Conditional logic
  | 'loop' // Iteration
  | 'delay' // Wait/pause
  | 'trigger' // Event trigger
  | 'webhook' // Webhook handler
  | 'transform' // Data transformation
  | 'storage' // Data storage
  | 'notification' // Send notification
  | 'approval' // Human approval
  | 'integration' // External integration
  | 'subworkflow' // Nested workflow

export type JourneyStateType =
  | 'chat' // Conversational state
  | 'tool' // Tool execution
  | 'decision' // User choice
  | 'input' // Data collection
  | 'confirmation' // User confirmation
  | 'processing' // Background work
  | 'wait' // External wait
  | 'final' // End state
  | 'error' // Error handling

// ============================================================================
// Block Specific Types
// ============================================================================

export interface StarterBlockAnalysis {
  triggerType: 'manual' | 'webhook' | 'schedule' | 'event'
  inputParameters: DataInput[]
  entryConditions?: ConditionalExpression[]
  rateLimiting?: RateLimitingConfig
}

export interface AgentBlockAnalysis {
  agentType: string
  capabilities: string[]
  prompt: string
  parameters: Record<string, any>
  tools: string[]
  knowledgeBases: string[]
  responseFormat: 'text' | 'structured' | 'action'
}

export interface APIBlockAnalysis {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  endpoint: string
  authentication: AuthenticationConfig
  parameters: APIParameter[]
  responseHandling: ResponseHandlingConfig
  errorHandling: APIErrorHandling
  rateLimit?: RateLimitingConfig
}

export interface FunctionBlockAnalysis {
  language: 'javascript' | 'python' | 'custom'
  code: string
  dependencies: string[]
  inputSchema: Record<string, any>
  outputSchema: Record<string, any>
  executionLimits: ExecutionLimits
}

export interface DecisionBlockAnalysis {
  decisionType: 'condition' | 'switch' | 'probability'
  conditions: ConditionalExpression[]
  outputs: DecisionOutput[]
  defaultPath?: string
}

export interface LoopBlockAnalysis {
  loopType: 'for' | 'while' | 'foreach'
  condition: ConditionalExpression
  maxIterations?: number
  breakConditions?: ConditionalExpression[]
  iterationData?: string
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface RateLimitingConfig {
  enabled: boolean
  requestsPerMinute?: number
  requestsPerHour?: number
  burstCapacity?: number
  backoffStrategy?: 'linear' | 'exponential'
}

export interface AuthenticationConfig {
  type: 'none' | 'api_key' | 'oauth' | 'basic' | 'bearer'
  configuration: Record<string, any>
  keySource?: 'workspace' | 'user' | 'global'
}

export interface APIParameter {
  name: string
  location: 'query' | 'header' | 'body' | 'path'
  type: string
  required: boolean
  defaultValue?: any
  validation?: ParameterValidation
}

export interface ParameterValidation {
  format?: string
  pattern?: string
  minimum?: number
  maximum?: number
  enum?: any[]
}

export interface ResponseHandlingConfig {
  successCodes: number[]
  dataPath?: string
  transformations?: ResponseTransformation[]
  caching?: CacheConfig
}

export interface ResponseTransformation {
  type: 'extract' | 'map' | 'filter' | 'aggregate'
  configuration: Record<string, any>
}

export interface CacheConfig {
  enabled: boolean
  duration: number // seconds
  scope: 'user' | 'session' | 'workspace' | 'global'
  invalidation: string[]
}

export interface APIErrorHandling {
  retryStrategy: RetryStrategy
  errorMapping: Record<number, string>
  fallbackValues: Record<string, any>
  escalation?: EscalationConfig
}

export interface RetryStrategy {
  maxRetries: number
  retryableErrors: number[]
  backoffStrategy: 'linear' | 'exponential' | 'fixed'
  baseDelay: number
  maxDelay?: number
}

export interface EscalationConfig {
  enabled: boolean
  conditions: ConditionalExpression[]
  notifications: NotificationConfig[]
  fallbackAction?: string
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'system'
  recipients: string[]
  template: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface ExecutionLimits {
  timeout: number // milliseconds
  memory: number // MB
  cpu: number // CPU units
  network: boolean
  filesystem: boolean
}

export interface DecisionOutput {
  id: string
  label: string
  condition?: ConditionalExpression
  probability?: number
  metadata?: Record<string, any>
}

// ============================================================================
// Conversion Context Types
// ============================================================================

export interface WorkflowConversionContext {
  workflowId: string
  workspaceId: string
  userId?: string
  agentId: string

  // Conversion settings
  conversionSettings: ConversionSettings

  // Available resources
  availableTools: ToolReference[]
  availableKnowledgeBases: KnowledgeBaseReference[]
  availableIntegrations: IntegrationReference[]

  // Constraints and preferences
  constraints: ConversionConstraint[]
  preferences: ConversionPreference[]

  // Context data
  userData?: Record<string, any>
  sessionData?: Record<string, any>
  environmentData?: Record<string, any>
}

export interface ConversionSettings {
  optimizationLevel: 'minimal' | 'standard' | 'aggressive'
  preserveStructure: boolean
  allowApproximation: boolean
  enableCaching: boolean
  validateOutput: boolean
  generateFallbacks: boolean
}

export interface ToolReference {
  id: string
  name: string
  type: string
  capabilities: string[]
  configuration?: Record<string, any>
  available: boolean
}

export interface KnowledgeBaseReference {
  id: string
  name: string
  description?: string
  documentCount: number
  lastUpdated: Date
  searchCapabilities: string[]
}

export interface IntegrationReference {
  id: string
  name: string
  type: string
  status: 'active' | 'inactive' | 'error'
  capabilities: string[]
  configuration?: Record<string, any>
}

export interface ConversionConstraint {
  type: 'performance' | 'security' | 'compliance' | 'cost' | 'compatibility'
  constraint: string
  enforced: boolean
  severity: 'warning' | 'error'
}

export interface ConversionPreference {
  type: 'structure' | 'performance' | 'user_experience' | 'maintainability'
  preference: string
  weight: number // 0-1
  justification?: string
}

// ============================================================================
// Conversion Result Tracking
// ============================================================================

export interface BlockConversionResult {
  sourceBlockId: string
  sourceBlockType: string
  targetStateId?: string
  targetStateType?: JourneyStateType

  conversionStatus: 'success' | 'partial' | 'failed' | 'skipped'
  conversionStrategy: string

  // Conversion details
  mappedProperties: PropertyMapping[]
  generatedContent: GeneratedContent[]
  appliedTransformations: AppliedTransformation[]

  // Issues and warnings
  warnings: ConversionWarning[]
  errors: ConversionError[]
  limitations: string[]

  // Performance metrics
  processingTime: number
  complexity: number
  confidence: number
}

export interface PropertyMapping {
  sourceProperty: string
  targetProperty: string
  mappingType: 'direct' | 'transformed' | 'computed' | 'default'
  transformation?: string
  confidence: number
}

export interface GeneratedContent {
  contentType: 'prompt' | 'message' | 'help_text' | 'validation' | 'instruction'
  content: string
  source: 'template' | 'ai_generated' | 'default' | 'user_provided'
  confidence: number
  alternatives?: string[]
}

export interface AppliedTransformation {
  transformationType: string
  sourceData: any
  targetData: any
  parameters?: Record<string, any>
  success: boolean
  duration: number
}

export interface ConversionWarning {
  code: string
  message: string
  blockId: string
  severity: 'low' | 'medium' | 'high'
  category: 'functionality' | 'performance' | 'user_experience' | 'compatibility'
  suggestion?: string
}

export interface ConversionError {
  code: string
  message: string
  blockId: string
  fatal: boolean
  category: 'mapping' | 'validation' | 'transformation' | 'dependency'
  context?: Record<string, any>
}

// ============================================================================
// Testing and Validation Types
// ============================================================================

export interface WorkflowTestCase {
  id: string
  name: string
  description: string

  // Test setup
  inputs: Record<string, any>
  environment: Record<string, any>
  preconditions: ConditionalExpression[]

  // Expected outcomes
  expectedOutputs: Record<string, any>
  expectedStates: string[]
  expectedDuration?: number

  // Test configuration
  timeout: number
  retryCount: number
  tags: string[]
}

export interface ConversionValidationRule {
  id: string
  name: string
  description: string
  category: 'structural' | 'functional' | 'performance' | 'compliance'

  // Rule definition
  rule: ValidationRuleDefinition
  severity: 'error' | 'warning' | 'info'

  // Execution context
  applicableBlockTypes: string[]
  conditions?: ConditionalExpression[]

  // Remediation
  autoFixAvailable: boolean
  fixInstructions?: string
  relatedRules: string[]
}

export interface ValidationRuleDefinition {
  type: 'schema' | 'logic' | 'performance' | 'custom'
  implementation: string
  parameters?: Record<string, any>
  dependencies?: string[]
}
