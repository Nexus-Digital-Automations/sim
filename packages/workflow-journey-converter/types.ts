/**
 * Core Types for Workflow to Journey Conversion Engine
 *
 * Comprehensive type definitions for ReactFlow workflow to Parlant journey
 * conversion system with full fidelity and compatibility preservation.
 */

import type {
  JourneyStateType,
  ParlantJourneyInsert,
  ParlantJourneyStateInsert,
  ParlantJourneyTransitionInsert,
} from '@sim/db/parlant'

// =============================================================================
// ReactFlow Workflow Types
// =============================================================================

export interface ReactFlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label?: string
    [key: string]: any
  }
  width?: number
  height?: number
  selected?: boolean
  dragging?: boolean
  dragHandle?: string
  targetPosition?: string
  sourcePosition?: string
  hidden?: boolean
  deletable?: boolean
  selectable?: boolean
  connectable?: boolean
  focusable?: boolean
  resizing?: boolean
  style?: Record<string, any>
  className?: string
  zIndex?: number
  extent?: 'parent' | [[number, number], [number, number]]
  parentNode?: string
  expandParent?: boolean
  positionAbsolute?: { x: number; y: number }
  ariaLabel?: string
}

export interface ReactFlowEdge {
  id: string
  source: string
  target: string
  type?: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  labelStyle?: Record<string, any>
  labelShowBg?: boolean
  labelBgStyle?: Record<string, any>
  labelBgPadding?: [number, number]
  labelBgBorderRadius?: number
  style?: Record<string, any>
  className?: string
  animated?: boolean
  hidden?: boolean
  deletable?: boolean
  focusable?: boolean
  updatable?: boolean
  selectable?: boolean
  interactionWidth?: number
  zIndex?: number
  ariaLabel?: string
  data?: {
    condition?: string
    priority?: number
    [key: string]: any
  }
  markerStart?: string
  markerEnd?: string
}

export interface SimWorkflowDefinition {
  id: string
  name: string
  description?: string
  version: string
  workspaceId: string
  createdBy: string
  createdAt: string
  updatedAt: string
  nodes: ReactFlowNode[]
  edges: ReactFlowEdge[]
  viewport?: {
    x: number
    y: number
    zoom: number
  }
  metadata?: {
    tags?: string[]
    category?: string
    isTemplate?: boolean
    templateVersion?: string
    complexity?: number
    estimatedDuration?: number
    [key: string]: any
  }
  variables?: Record<string, any>
  configuration?: {
    executionMode?: 'sequential' | 'parallel' | 'hybrid'
    errorHandling?: 'strict' | 'lenient' | 'custom'
    timeout?: number
    retryPolicy?: {
      maxRetries: number
      backoffStrategy: 'linear' | 'exponential'
      baseDelay: number
    }
    [key: string]: any
  }
}

// =============================================================================
// Block Type Definitions
// =============================================================================

export type SimBlockType =
  | 'start'
  | 'end'
  | 'tool'
  | 'condition'
  | 'merge'
  | 'loop'
  | 'parallel_split'
  | 'parallel_join'
  | 'user_input'
  | 'data_transform'
  | 'api_call'
  | 'database_operation'
  | 'notification'
  | 'file_operation'
  | 'custom'

export interface BlockConfiguration {
  type: SimBlockType
  parameters: Record<string, any>
  inputSchema?: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  outputSchema?: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  errorHandling?: {
    strategy: 'retry' | 'fallback' | 'skip' | 'abort'
    maxRetries?: number
    retryDelay?: number
    fallbackValue?: any
    timeout?: number
  }
  execution?: {
    async?: boolean
    timeout?: number
    priority?: number
    resources?: {
      memory?: number
      cpu?: number
      disk?: number
    }
  }
  validation?: {
    required?: boolean
    customValidation?: string
    dependencies?: string[]
  }
  ui?: {
    icon?: string
    color?: string
    description?: string
    helpUrl?: string
  }
}

// =============================================================================
// Journey Conversion Types
// =============================================================================

export interface JourneyDefinition
  extends Omit<ParlantJourneyInsert, 'id' | 'createdAt' | 'updatedAt'> {
  states: JourneyStateDefinition[]
  transitions: JourneyTransitionDefinition[]
  metadata: JourneyMetadata
}

export interface JourneyStateDefinition
  extends Omit<ParlantJourneyStateInsert, 'id' | 'journeyId'> {
  id: string
  stateType: JourneyStateType
  configuration: JourneyStateConfiguration
  position?: { x: number; y: number }
  originalNodeId?: string
  blockType?: SimBlockType
  dependencies?: string[]
  executionGroup?: string
  errorHandling?: {
    onError: 'retry' | 'fallback' | 'skip' | 'abort'
    maxRetries?: number
    fallbackState?: string
    timeout?: number
  }
}

export interface JourneyTransitionDefinition
  extends Omit<ParlantJourneyTransitionInsert, 'id' | 'journeyId'> {
  id: string
  fromStateId: string
  toStateId: string
  condition?: string
  priority?: number
  originalEdgeId?: string
  metadata?: {
    animated?: boolean
    style?: Record<string, any>
    label?: string
  }
}

export interface JourneyMetadata {
  originalWorkflowId: string
  conversionTimestamp: string
  conversionVersion: string
  preservedAttributes: PreservedAttributes
  executionMode: 'sequential' | 'parallel' | 'hybrid'
  complexity: ComplexityMetrics
  performance: PerformanceMetrics
  validation: ValidationMetrics
}

export interface PreservedAttributes {
  name: string
  description?: string
  version: string
  workspaceId: string
  nodeTypes: SimBlockType[]
  edgeTypes: string[]
  hasConditionalLogic: boolean
  hasParallelExecution: boolean
  hasLoops: boolean
  hasUserInteraction: boolean
  toolDependencies: ToolDependency[]
  variableUsage: VariableUsage[]
  errorHandlingStrategies: string[]
}

export interface ComplexityMetrics {
  nodeCount: number
  edgeCount: number
  conditionalBranches: number
  parallelPaths: number
  loopStructures: number
  maxDepth: number
  cyclomaticComplexity: number
  halsteadComplexity?: {
    vocabulary: number
    length: number
    volume: number
    difficulty: number
    effort: number
  }
}

export interface PerformanceMetrics {
  conversionTimeMs: number
  analysisTimeMs: number
  mappingTimeMs: number
  validationTimeMs: number
  memoryUsageMB: number
  cacheHitRate: number
  optimizationApplied: string[]
}

export interface ValidationMetrics {
  preservationScore: number
  functionalEquivalenceScore: number
  structuralIntegrityScore: number
  errorCount: number
  warningCount: number
  issueCategories: ValidationIssueCategory[]
}

export type ValidationIssueCategory =
  | 'missing_state'
  | 'missing_transition'
  | 'invalid_configuration'
  | 'type_mismatch'
  | 'dependency_missing'
  | 'circular_dependency'
  | 'unreachable_state'
  | 'performance_concern'
  | 'security_risk'

// =============================================================================
// Tool Integration and Mapping Types
// =============================================================================

export interface ToolDependency {
  toolId: string
  toolName: string
  toolType: 'builtin' | 'custom' | 'external' | 'mcp'
  version?: string
  configuration: Record<string, any>
  inputMapping: ParameterMapping[]
  outputMapping: ParameterMapping[]
  errorMapping: ErrorMapping[]
  compatibilityLevel: 'full' | 'partial' | 'none'
  migrationRequired?: boolean
  deprecationWarning?: string
}

export interface ParameterMapping {
  workflowParameter: string
  journeyParameter: string
  transformation?: TransformationFunction
  validation?: ValidationRule[]
  required: boolean
  defaultValue?: any
  description?: string
}

export interface ErrorMapping {
  workflowErrorCode: string
  journeyErrorCode: string
  recovery?: RecoveryStrategy
  userMessage?: string
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
}

export interface TransformationFunction {
  type: 'direct' | 'computed' | 'conditional' | 'aggregate'
  expression?: string
  function?: string
  parameters?: Record<string, any>
  validation?: {
    inputTypes: string[]
    outputType: string
    constraints?: Record<string, any>
  }
}

export interface ValidationRule {
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom'
  constraint: any
  errorMessage: string
  severity: 'error' | 'warning' | 'info'
}

export interface RecoveryStrategy {
  type: 'retry' | 'fallback' | 'skip' | 'abort' | 'ask_user'
  maxAttempts?: number
  backoffDelay?: number
  fallbackValue?: any
  userPrompt?: string
}

// =============================================================================
// Variable and Context Management
// =============================================================================

export interface VariableUsage {
  variableName: string
  variableType: 'input' | 'output' | 'intermediate' | 'configuration'
  scope: 'global' | 'workflow' | 'local'
  dataType: string
  defaultValue?: any
  validation?: ValidationRule[]
  dependencies: string[]
  usageCount: number
  firstUsed: string
  lastModified: string
  description?: string
}

export interface ContextMapping {
  workflowContext: Record<string, any>
  journeyContext: Record<string, any>
  variableMappings: VariableMapping[]
  sessionPreservation: SessionPreservation
  statePreservation: StatePreservation
}

export interface VariableMapping {
  workflowVariable: string
  journeyVariable: string
  transformation?: TransformationFunction
  persistence: 'session' | 'journey' | 'state' | 'temporary'
  security: 'public' | 'private' | 'encrypted'
  validation?: ValidationRule[]
}

export interface SessionPreservation {
  preserveUserAuthentication: boolean
  preserveWorkspaceIsolation: boolean
  preservePermissions: boolean
  preserveAuditTrail: boolean
  customSessionHandling?: string
}

export interface StatePreservation {
  preserveExecutionHistory: boolean
  preserveVariableState: boolean
  preserveErrorState: boolean
  preserveMetrics: boolean
  checkpointStrategy: 'none' | 'automatic' | 'manual' | 'conditional'
  recoveryStrategy: 'restart' | 'resume' | 'rollback'
}

// =============================================================================
// Workflow Structure Analysis Types
// =============================================================================

export interface WorkflowAnalysisResult {
  workflow: SimWorkflowDefinition
  structure: WorkflowStructure
  dependencies: DependencyGraph
  executionPaths: ExecutionPath[]
  complexityAnalysis: ComplexityAnalysis
  toolAnalysis: ToolAnalysis
  variableAnalysis: VariableAnalysis
  errorHandlingAnalysis: ErrorHandlingAnalysis
  performanceAnalysis: PerformanceAnalysis
  securityAnalysis: SecurityAnalysis
}

export interface WorkflowStructure {
  entryPoints: string[]
  exitPoints: string[]
  conditionalNodes: ConditionalNode[]
  parallelSections: ParallelSection[]
  loopStructures: LoopStructure[]
  criticalPath: string[]
  alternativePaths: AlternativePath[]
  unreachableNodes: string[]
  orphanedNodes: string[]
}

export interface DependencyGraph {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  stronglyConnectedComponents: string[][]
  topologicalOrder: string[]
  circularDependencies: CircularDependency[]
  dependencyLevels: Record<string, number>
}

export interface DependencyNode {
  nodeId: string
  dependencies: string[]
  dependents: string[]
  level: number
  criticalPath: boolean
}

export interface DependencyEdge {
  from: string
  to: string
  type: 'data' | 'control' | 'resource' | 'temporal'
  strength: 'strong' | 'weak' | 'optional'
  condition?: string
}

export interface CircularDependency {
  nodes: string[]
  type: 'data' | 'control' | 'resource'
  severity: 'error' | 'warning' | 'info'
  resolution?: string
}

export interface ExecutionPath {
  id: string
  path: string[]
  probability: number
  estimatedDuration: number
  resourceRequirements: ResourceRequirement[]
  errorProbability: number
  criticalPath: boolean
}

export interface ConditionalNode {
  nodeId: string
  condition: string
  truePath: string[]
  falsePath: string[]
  defaultPath?: string[]
  variables: string[]
  complexity: number
}

export interface ParallelSection {
  id: string
  splitNode: string
  joinNode: string
  branches: ParallelBranch[]
  synchronizationType: 'all' | 'any' | 'first' | 'majority'
  timeout?: number
  errorHandling: 'fail_fast' | 'continue' | 'best_effort'
}

export interface ParallelBranch {
  id: string
  nodes: string[]
  estimatedDuration: number
  priority: number
  resources: ResourceRequirement[]
  canFail: boolean
}

export interface LoopStructure {
  id: string
  entryNode: string
  exitNode: string
  bodyNodes: string[]
  condition: string
  loopType: 'while' | 'for' | 'do_while' | 'foreach'
  maxIterations?: number
  iterationVariable?: string
  exitConditions: string[]
}

export interface AlternativePath {
  mainPath: string[]
  alternativePath: string[]
  condition: string
  trigger: 'error' | 'condition' | 'user_choice' | 'timeout'
  probability: number
}

// =============================================================================
// Analysis Result Types
// =============================================================================

export interface ComplexityAnalysis {
  overall: number
  cyclomatic: number
  cognitive: number
  structural: number
  maintainability: number
  testability: number
  categories: {
    simple: string[]
    moderate: string[]
    complex: string[]
    veryComplex: string[]
  }
  recommendations: string[]
}

export interface ToolAnalysis {
  totalTools: number
  uniqueTools: number
  toolCategories: Record<string, number>
  toolCompatibility: ToolCompatibilityReport[]
  migrationRequired: string[]
  deprecatedTools: string[]
  securityRisks: string[]
  performanceImpact: Record<string, number>
}

export interface ToolCompatibilityReport {
  toolId: string
  compatibility: 'full' | 'partial' | 'none'
  issues: string[]
  migrations: string[]
  alternatives: string[]
  confidence: number
}

export interface VariableAnalysis {
  totalVariables: number
  scopeDistribution: Record<string, number>
  typeDistribution: Record<string, number>
  usagePatterns: VariableUsagePattern[]
  potentialIssues: VariableIssue[]
  optimizations: VariableOptimization[]
}

export interface VariableUsagePattern {
  variable: string
  pattern: 'read_only' | 'write_only' | 'read_write' | 'accumulator' | 'flag'
  frequency: number
  nodes: string[]
  lifetime: 'short' | 'medium' | 'long'
}

export interface VariableIssue {
  variable: string
  issue: 'unused' | 'uninitialized' | 'type_mismatch' | 'scope_leak' | 'race_condition'
  severity: 'error' | 'warning' | 'info'
  location: string[]
  suggestion: string
}

export interface VariableOptimization {
  variable: string
  optimization: 'inline' | 'cache' | 'lazy_load' | 'compress' | 'remove'
  impact: 'high' | 'medium' | 'low'
  savings: {
    memory?: number
    cpu?: number
    network?: number
  }
}

export interface ErrorHandlingAnalysis {
  coverage: number
  strategies: Record<string, number>
  unhandledErrors: UnhandledError[]
  errorPaths: ErrorPath[]
  recoveryMechanisms: RecoveryMechanism[]
  recommendations: string[]
}

export interface UnhandledError {
  nodeId: string
  errorType: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  likelihood: number
  impact: string
  mitigation: string
}

export interface ErrorPath {
  triggerNode: string
  errorType: string
  propagationPath: string[]
  handlingNode?: string
  recovery?: string
  userImpact: string
}

export interface RecoveryMechanism {
  errorType: string
  strategy: RecoveryStrategy
  effectiveness: number
  cost: number
  userExperience: 'transparent' | 'visible' | 'disruptive'
}

export interface PerformanceAnalysis {
  estimatedExecutionTime: number
  criticalPathTime: number
  parallelizationOpportunities: string[]
  bottlenecks: PerformanceBottleneck[]
  resourceUtilization: ResourceUtilization
  scalabilityMetrics: ScalabilityMetrics
  optimizations: PerformanceOptimization[]
}

export interface PerformanceBottleneck {
  nodeId: string
  type: 'cpu' | 'memory' | 'network' | 'disk' | 'external_api'
  severity: 'critical' | 'high' | 'medium' | 'low'
  impact: number
  mitigation: string[]
}

export interface ResourceUtilization {
  cpu: {
    peak: number
    average: number
    distribution: Record<string, number>
  }
  memory: {
    peak: number
    average: number
    allocation: Record<string, number>
  }
  network: {
    bandwidth: number
    latency: number
    requests: number
  }
  disk: {
    reads: number
    writes: number
    space: number
  }
}

export interface ScalabilityMetrics {
  maxConcurrentUsers: number
  throughput: number
  responseTime: {
    p50: number
    p95: number
    p99: number
  }
  errorRate: number
  degradationPoints: DegradationPoint[]
}

export interface DegradationPoint {
  load: number
  metric: string
  impact: number
  description: string
}

export interface PerformanceOptimization {
  type: 'caching' | 'parallelization' | 'batching' | 'lazy_loading' | 'compression'
  location: string[]
  impact: {
    timeReduction: number
    resourceSaving: number
    complexity: number
  }
  implementation: string
  tradeoffs: string[]
}

export interface SecurityAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  vulnerabilities: SecurityVulnerability[]
  dataFlowAnalysis: DataFlowSecurity
  accessControlAnalysis: AccessControlSecurity
  compliance: ComplianceCheck[]
  recommendations: SecurityRecommendation[]
}

export interface SecurityVulnerability {
  type: 'injection' | 'auth_bypass' | 'data_exposure' | 'privilege_escalation' | 'dos'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  location: string[]
  description: string
  impact: string
  mitigation: string[]
  cve?: string
}

export interface DataFlowSecurity {
  sensitiveDataPaths: DataPath[]
  encryptionCoverage: number
  exposurePoints: ExposurePoint[]
  dataClassification: Record<string, 'public' | 'internal' | 'confidential' | 'restricted'>
}

export interface DataPath {
  source: string
  destination: string
  dataType: string
  sensitivity: string
  encryption: boolean
  validation: boolean
  logging: boolean
}

export interface ExposurePoint {
  nodeId: string
  dataType: string
  exposureType: 'log' | 'api' | 'storage' | 'network'
  severity: 'critical' | 'high' | 'medium' | 'low'
  mitigation: string
}

export interface AccessControlSecurity {
  authenticationRequired: boolean
  authorizationGranularity: 'none' | 'basic' | 'role_based' | 'attribute_based'
  privilegeEscalation: string[]
  bypasses: string[]
  sessionSecurity: SessionSecurityLevel
}

export type SessionSecurityLevel = 'none' | 'basic' | 'secure' | 'paranoid'

export interface ComplianceCheck {
  standard: 'GDPR' | 'HIPAA' | 'SOX' | 'PCI_DSS' | 'SOC2' | 'ISO27001'
  compliance: 'compliant' | 'partial' | 'non_compliant'
  issues: string[]
  requirements: string[]
  remediation: string[]
}

export interface SecurityRecommendation {
  category:
    | 'authentication'
    | 'authorization'
    | 'encryption'
    | 'validation'
    | 'logging'
    | 'monitoring'
  priority: 'critical' | 'high' | 'medium' | 'low'
  description: string
  implementation: string
  cost: 'low' | 'medium' | 'high'
  impact: 'high' | 'medium' | 'low'
}

export interface ResourceRequirement {
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'external_api'
  amount: number
  unit: string
  duration: number
  shared: boolean
  critical: boolean
}

// =============================================================================
// Journey State Configuration Union Types
// =============================================================================

export interface JourneyStateConfiguration {
  stateType: JourneyStateType
  [key: string]: any
}

export interface ChatStateConfiguration extends JourneyStateConfiguration {
  stateType: 'chat'
  prompt: {
    template: string
    variables?: Record<string, string>
    tone?: 'professional' | 'friendly' | 'casual' | 'formal'
    length?: 'brief' | 'moderate' | 'detailed'
  }
  validation?: {
    required: boolean
    minLength?: number
    maxLength?: number
    pattern?: string
  }
  responseOptions?: {
    type: 'text' | 'choice' | 'number' | 'date' | 'file'
    choices?: string[]
    multiSelect?: boolean
  }
}

export interface ToolStateConfiguration extends JourneyStateConfiguration {
  stateType: 'tool'
  toolId: string
  parameters: Record<string, any>
  inputMapping: ParameterMapping[]
  outputMapping: ParameterMapping[]
  errorHandling: {
    strategy: 'retry' | 'fallback' | 'skip' | 'abort'
    maxRetries?: number
    fallbackValue?: any
    timeout?: number
  }
  async?: boolean
  cacheable?: boolean
}

export interface ConditionalStateConfiguration extends JourneyStateConfiguration {
  stateType: 'conditional'
  condition: {
    expression: string
    variables: string[]
    type: 'boolean' | 'comparison' | 'regex' | 'custom'
  }
  branches: {
    true: string
    false: string
    default?: string
  }
  evaluation?: {
    timeout?: number
    async?: boolean
    caching?: boolean
  }
}

export interface FinalStateConfiguration extends JourneyStateConfiguration {
  stateType: 'final'
  outcome: {
    status: 'success' | 'failure' | 'cancelled' | 'timeout'
    message?: string
    data?: Record<string, any>
  }
  cleanup?: {
    clearVariables?: boolean
    saveSession?: boolean
    sendNotifications?: boolean
  }
}

// =============================================================================
// Conversion Result Types
// =============================================================================

export interface ConversionResult {
  success: boolean
  journey?: JourneyDefinition
  error?: ConversionError
  warnings?: ConversionWarning[]
  metrics: ConversionMetrics
  validationReport: ValidationReport
  recommendations?: ConversionRecommendation[]
}

export interface ConversionError {
  code: string
  message: string
  category: 'parsing' | 'mapping' | 'validation' | 'compatibility' | 'security' | 'performance'
  severity: 'critical' | 'high' | 'medium' | 'low'
  location?: string
  cause?: string
  resolution?: string
  userMessage?: string
  technicalDetails?: Record<string, any>
}

export interface ConversionWarning {
  code: string
  message: string
  category: 'optimization' | 'compatibility' | 'deprecation' | 'performance' | 'security'
  severity: 'high' | 'medium' | 'low'
  location?: string
  recommendation?: string
  impact?: string
}

export interface ConversionMetrics {
  conversionTimeMs: number
  analysisTimeMs: number
  mappingTimeMs: number
  validationTimeMs: number
  memoryUsageMB: number
  originalComplexity: number
  resultingComplexity: number
  preservationScore: number
  optimizationScore: number
  cacheHitRate?: number
}

export interface ValidationReport {
  isValid: boolean
  score: number
  issues: ValidationIssue[]
  warnings: ValidationWarning[]
  metrics: ValidationMetrics
  functionalEquivalence: FunctionalEquivalenceReport
  structuralIntegrity: StructuralIntegrityReport
  performanceImpact: PerformanceImpactReport
}

export interface ValidationIssue {
  category: ValidationIssueCategory
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  location: string
  impact: string
  resolution: string
  blocking: boolean
}

export interface ValidationWarning {
  category: string
  message: string
  location?: string
  recommendation?: string
  impact?: 'high' | 'medium' | 'low'
}

export interface FunctionalEquivalenceReport {
  score: number
  behaviorPreserved: boolean
  dataFlowPreserved: boolean
  errorHandlingPreserved: boolean
  userExperiencePreserved: boolean
  performanceCharacteristics: {
    similar: boolean
    improvements: string[]
    regressions: string[]
  }
  differences: FunctionalDifference[]
}

export interface FunctionalDifference {
  type: 'behavior' | 'data_flow' | 'error_handling' | 'performance' | 'ui_ux'
  description: string
  impact: 'breaking' | 'significant' | 'minor' | 'none'
  mitigation?: string
  acceptable: boolean
}

export interface StructuralIntegrityReport {
  score: number
  graphIntegrity: boolean
  stateConsistency: boolean
  transitionValidity: boolean
  dependencyResolution: boolean
  circularDependencies: CircularDependency[]
  unreachableStates: string[]
  orphanedTransitions: string[]
}

export interface PerformanceImpactReport {
  executionTimeChange: number
  memoryUsageChange: number
  throughputChange: number
  scalabilityImpact: 'positive' | 'neutral' | 'negative'
  bottlenecks: PerformanceBottleneck[]
  optimizationOpportunities: PerformanceOptimization[]
}

export interface ConversionRecommendation {
  type: 'optimization' | 'security' | 'performance' | 'maintainability' | 'user_experience'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  implementation: string
  impact: {
    effort: 'low' | 'medium' | 'high'
    benefit: 'low' | 'medium' | 'high'
    risk: 'low' | 'medium' | 'high'
  }
  timeline?: string
  dependencies?: string[]
}

// =============================================================================
// Conversion Engine Configuration
// =============================================================================

export interface ConversionEngineConfig {
  analysis: {
    enableComplexityAnalysis: boolean
    enableSecurityAnalysis: boolean
    enablePerformanceAnalysis: boolean
    maxAnalysisDepth: number
    parallelAnalysis: boolean
    cacheResults: boolean
  }
  mapping: {
    preserveLayout: boolean
    preserveMetadata: boolean
    optimizeStructure: boolean
    enableAutoRecovery: boolean
    strictTypeMapping: boolean
    allowLossyConversion: boolean
  }
  validation: {
    strictValidation: boolean
    performanceValidation: boolean
    securityValidation: boolean
    functionalValidation: boolean
    generateReport: boolean
    failOnWarnings: boolean
  }
  optimization: {
    enableOptimizations: boolean
    parallelizeExecution: boolean
    cacheToolResults: boolean
    compressData: boolean
    batchOperations: boolean
    lazyLoading: boolean
  }
  output: {
    includeOriginalMetadata: boolean
    generateDocumentation: boolean
    createMigrationGuide: boolean
    exportDiagnostics: boolean
    verboseLogging: boolean
  }
  compatibility: {
    strictCompatibility: boolean
    allowDeprecatedFeatures: boolean
    enableMigrationAssistance: boolean
    validateToolCompatibility: boolean
    checkVersionRequirements: boolean
  }
  security: {
    validatePermissions: boolean
    encryptSensitiveData: boolean
    auditTrail: boolean
    validateDataFlow: boolean
    checkCompliance: string[]
  }
  performance: {
    maxConversionTime: number
    maxMemoryUsage: number
    enableProfiling: boolean
    optimizeForThroughput: boolean
    enableConcurrency: boolean
    maxConcurrentConversions: number
  }
}

// =============================================================================
// Factory and Utility Types
// =============================================================================

export interface ConversionContext {
  workspaceId: string
  userId: string
  timestamp: string
  version: string
  config: ConversionEngineConfig
  session: {
    id: string
    metadata: Record<string, any>
  }
  cache?: Map<string, any>
  logger?: {
    debug: (message: string, meta?: any) => void
    info: (message: string, meta?: any) => void
    warn: (message: string, meta?: any) => void
    error: (message: string, meta?: any) => void
  }
}

export interface ConversionCache {
  analysisResults: Map<string, WorkflowAnalysisResult>
  toolMappings: Map<string, ToolDependency>
  validationResults: Map<string, ValidationReport>
  conversionResults: Map<string, ConversionResult>
  performanceMetrics: Map<string, PerformanceMetrics>
  expirationTimes: Map<string, number>
}

export interface ConversionFactory {
  createAnalysisEngine(): WorkflowAnalysisEngine
  createMappingService(): JourneyMappingService
  createValidationEngine(): ValidationEngine
  createOptimizationEngine(): OptimizationEngine
}

// Abstract base classes for implementation
export abstract class WorkflowAnalysisEngine {
  abstract analyzeWorkflow(
    workflow: SimWorkflowDefinition,
    context: ConversionContext
  ): Promise<WorkflowAnalysisResult>
}

export abstract class JourneyMappingService {
  abstract mapToJourney(
    analysis: WorkflowAnalysisResult,
    context: ConversionContext
  ): Promise<JourneyDefinition>
}

export abstract class ValidationEngine {
  abstract validateConversion(
    workflow: SimWorkflowDefinition,
    journey: JourneyDefinition,
    context: ConversionContext
  ): Promise<ValidationReport>
}

export abstract class OptimizationEngine {
  abstract optimizeJourney(
    journey: JourneyDefinition,
    context: ConversionContext
  ): Promise<JourneyDefinition>
}

// =============================================================================
// Event and Notification Types
// =============================================================================

export type ConversionEvent =
  | 'conversion_started'
  | 'analysis_completed'
  | 'mapping_completed'
  | 'validation_completed'
  | 'optimization_completed'
  | 'conversion_completed'
  | 'conversion_failed'
  | 'warning_generated'

export interface ConversionEventData {
  event: ConversionEvent
  timestamp: string
  workflowId: string
  journeyId?: string
  userId: string
  workspaceId: string
  data?: Record<string, any>
  error?: ConversionError
  metrics?: ConversionMetrics
}

export interface ConversionNotification {
  id: string
  event: ConversionEvent
  data: ConversionEventData
  recipients: string[]
  channels: ('email' | 'webhook' | 'websocket' | 'database')[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
  expiry?: string
}

// =============================================================================
// Context Management and Preservation Types
// =============================================================================

export interface VariableDefinition {
  id: string
  name: string
  type: string
  value?: any
  description?: string
  scope?: 'global' | 'workflow' | 'local' | 'session' | 'user'
  required?: boolean
  validation?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: string
    min?: number
    max?: number
    [key: string]: any
  }
  metadata?: {
    [key: string]: any
  }
}

export interface ContextMapping {
  workflowId: string
  journeyId: string
  variableMapping: VariableMapping
  sessionStateMapping: SessionStateMapping
  executionContextMapping: ExecutionContextMapping
  dynamicResolution: DynamicVariableResolution
  contextInheritance: ContextInheritance
  validation: ContextValidation
  timestamp: string
  version: string
}

export interface VariableMapping {
  mappings: Array<{
    workflowVariable: VariableDefinition
    journeyVariable: VariableDefinition
    conversionType: 'direct' | 'converted' | 'complex'
    transformationRules: any
    validation: ValidationResult
  }>
  journeyVariables: VariableDefinition[]
  statistics: {
    totalMappings: number
    typePreservations: number
    typeConversions: number
    complexMappings: number
  }
  validation: ValidationResult
}

export interface SessionStateMapping {
  states: Array<{
    stateId: string
    nodeName: string
    requirements: {
      persistent: boolean
      shared: boolean
      encrypted: boolean
      ttl?: number
    }
    context: any
  }>
  configuration: {
    sessionPersistence: boolean
    stateSync: boolean
    contextPreservation: boolean
    variableSync: boolean
  }
  statistics: {
    totalStates: number
    persistentStates: number
    sharedStates: number
  }
}

export interface ExecutionContextMapping {
  contexts: Array<{
    stateId: string
    context: {
      nodeId: string
      nodeType: string
      executionOrder: number
      dependencies: string[]
      conditions: any[]
      timeout: number
      retryPolicy: any
      errorHandling: any
    }
    options: {
      async: boolean
      parallel: boolean
      cached: boolean
      errorHandling: boolean
      monitoring: boolean
    }
  }>
  configuration: {
    preserveExecutionOrder: boolean
    maintainState: boolean
    errorHandling: boolean
    parallelExecution: boolean
  }
  statistics: {
    totalContexts: number
    asyncContexts: number
    errorHandledContexts: number
  }
}

export interface DynamicVariableResolution {
  resolutions: Array<{
    stateId: string
    resolution: {
      variables: Array<{
        name: string
        type: string
        source: string
        dependencies: string[]
        resolutionStrategy: string
        caching: boolean
      }>
      complexity: 'simple' | 'moderate' | 'complex'
      timing: 'immediate' | 'lazy' | 'on-demand'
    }
    rules: any
  }>
  configuration: {
    enableDynamicResolution: boolean
    lazyEvaluation: boolean
    cacheResolutions: boolean
    errorRecovery: boolean
  }
  statistics: {
    totalResolutions: number
    dynamicVariables: number
    complexResolutions: number
  }
}

export interface ContextInheritance {
  hierarchy: Array<{
    stateId: string
    parentContext?: string
    childContexts?: string[]
    rules: any
  }>
  configuration: {
    enableInheritance: boolean
    inheritanceDepth: number
    overrideAllowed: boolean
    cascadeUpdates: boolean
  }
  statistics: {
    totalNodes: number
    inheritanceDepth: number
    isolatedNodes: number
  }
}

export interface ContextValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  details?: {
    variableMapping?: ValidationResult
    sessionStateMapping?: ValidationResult
    executionContextMapping?: ValidationResult
    dynamicResolution?: ValidationResult
    contextInheritance?: ValidationResult
    crossValidation?: ValidationResult
  }
}

export interface StatePreservation {
  originalState: any
  preservedState: any
  transformationRules: any[]
  validationResults: ValidationResult[]
}

// =============================================================================
// Export All Types
// =============================================================================

export type {
  // Core workflow types
  ReactFlowNode,
  ReactFlowEdge,
  SimWorkflowDefinition,
  // Block and configuration types
  SimBlockType,
  BlockConfiguration,
  // Journey definition types
  JourneyDefinition,
  JourneyStateDefinition,
  JourneyTransitionDefinition,
  JourneyMetadata,
  // Analysis types
  WorkflowAnalysisResult,
  WorkflowStructure,
  DependencyGraph,
  ExecutionPath,
  ConditionalNode,
  ParallelSection,
  LoopStructure,
  // Tool integration types
  ToolDependency,
  ParameterMapping,
  ErrorMapping,
  TransformationFunction,
  ValidationRule,
  RecoveryStrategy,
  // Context and variable types
  VariableUsage,
  VariableDefinition,
  ContextMapping,
  VariableMapping,
  SessionStateMapping,
  ExecutionContextMapping,
  DynamicVariableResolution,
  ContextInheritance,
  ContextValidation,
  SessionPreservation,
  StatePreservation,
  // Result types
  ConversionResult,
  ConversionError,
  ConversionWarning,
  ConversionMetrics,
  ValidationReport,
  ValidationIssue,
  // Configuration and context types
  ConversionEngineConfig,
  ConversionContext,
  ConversionCache,
  ConversionFactory,
  // Event types
  ConversionEvent,
  ConversionEventData,
  ConversionNotification,
}
