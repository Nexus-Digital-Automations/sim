/**
 * Execution Compatibility System - Type Definitions
 * =================================================
 *
 * Comprehensive type definitions for ensuring journey execution produces
 * identical results to workflow execution across all aspects.
 */

// ========================================
// CORE EXECUTION RESULT TYPES
// ========================================

export interface BaseExecutionResult {
  executionId: string
  status: ExecutionStatus
  startTime: string
  endTime: string
  duration: number
  outputs: Record<string, any>
  variables: Record<string, any>
  errors: ExecutionError[]
  warnings: ExecutionWarning[]
  metadata: ExecutionMetadata
}

export interface WorkflowExecutionResult extends BaseExecutionResult {
  type: 'workflow'
  workflowId: string
  blockResults: BlockExecutionResult[]
  executionPath: string[]
  resourceUsage: ResourceUsage
}

export interface JourneyExecutionResult extends BaseExecutionResult {
  type: 'journey'
  journeyId: string
  agentId: string
  stepResults: StepExecutionResult[]
  conversationContext: ConversationContext
  sessionState: SessionState
}

export interface BlockExecutionResult {
  blockId: string
  blockType: string
  blockName: string
  status: ExecutionStatus
  startTime: string
  endTime: string
  duration: number
  inputs: Record<string, any>
  outputs: Record<string, any>
  toolCalls: ToolCall[]
  errors: ExecutionError[]
  warnings: ExecutionWarning[]
  retryCount: number
  resourceUsage: ResourceUsage
}

export interface StepExecutionResult {
  stepId: string
  stepType: string
  stepName: string
  status: ExecutionStatus
  startTime: string
  endTime: string
  duration: number
  inputs: Record<string, any>
  outputs: Record<string, any>
  agentActions: AgentAction[]
  userInteractions: UserInteraction[]
  errors: ExecutionError[]
  warnings: ExecutionWarning[]
  retryCount: number
  contextUpdates: ContextUpdate[]
}

export type ExecutionResult = WorkflowExecutionResult | JourneyExecutionResult

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'error'
  | 'cancelled'
  | 'timeout'

// ========================================
// COMPATIBILITY COMPARISON TYPES
// ========================================

export interface ResultComparison {
  compatible: boolean
  similarityScore: number
  differences: ResultDiff[]
  workflowResult: ExecutionResult
  journeyResult: ExecutionResult
  metadata: ComparisonMetadata
}

export interface ResultDiff {
  path: string
  workflowValue: any
  journeyValue: any
  difference: DifferenceType
  severity: 'critical' | 'error' | 'warning' | 'info'
  description: string
  suggestion?: string
}

export type DifferenceType =
  | 'value_mismatch'
  | 'type_mismatch'
  | 'missing_key'
  | 'extra_key'
  | 'count_mismatch'
  | 'structure_mismatch'
  | 'performance_variation'
  | 'timing_difference'
  | 'side_effect_difference'

export interface ComparisonMetadata {
  comparisonId: string
  context: ExecutionContext
  processingTimeMs: number
  comparedAt: string
  totalDifferences: number
  criticalDifferences: number
  errorDifferences: number
  warningDifferences: number
}

// ========================================
// EXECUTION CONTEXT TYPES
// ========================================

export interface ExecutionContext {
  executionId: string
  workspaceId: string
  userId: string
  mode: 'workflow' | 'journey'
  configuration: ExecutionConfiguration
  environment: ExecutionEnvironment
  requestMetadata: RequestMetadata
}

export interface ExecutionConfiguration {
  enableCompatibilityMode: boolean
  preserveExecutionOrder: boolean
  enableStateSync: boolean
  enforceIdenticalResults: boolean
  timeoutMs: number
  maxRetries: number
  debugMode: boolean
}

export interface ExecutionEnvironment {
  platform: string
  version: string
  nodeVersion: string
  memoryLimit: number
  cpuLimit: number
  networkAccess: boolean
  externalServices: ExternalServiceConfig[]
}

export interface ExternalServiceConfig {
  name: string
  endpoint: string
  version: string
  available: boolean
  responseTime: number
}

export interface RequestMetadata {
  traceId: string
  correlationId: string
  requestId: string
  sourceIp: string
  userAgent: string
  timestamp: string
}

// ========================================
// COMPATIBILITY ENGINE CONFIGURATION
// ========================================

export interface ResultCompatibilityConfig {
  enableStrictMode: boolean
  enableDurationComparison: boolean
  durationToleranceMs: number
  enablePerformanceAnalysis: boolean
  enableSideEffectTracking: boolean
  workflowTransformations: string[]
  journeyTransformations: string[]
  excludePaths: string[]
  customComparisons: CustomComparisonConfig[]
  reportingLevel: 'minimal' | 'standard' | 'detailed' | 'verbose'
}

export interface CustomComparisonConfig {
  path: string
  comparisonType: 'exact' | 'fuzzy' | 'ignore' | 'custom'
  tolerance?: number
  customComparator?: string
}

// ========================================
// BEHAVIOR PRESERVATION TYPES
// ========================================

export interface ExecutionBehaviorConfig {
  preserveTiming: boolean
  preserveSideEffects: boolean
  preserveApiCalls: boolean
  preserveLogging: boolean
  preserveMonitoring: boolean
  preserveErrorHandling: boolean
  synchronizeExecution: boolean
}

export interface SideEffectTracker {
  apiCalls: ApiCall[]
  databaseOperations: DatabaseOperation[]
  fileOperations: FileOperation[]
  externalIntegrations: ExternalIntegration[]
  webhooks: WebhookCall[]
  notifications: NotificationSent[]
}

export interface ApiCall {
  id: string
  method: string
  url: string
  headers: Record<string, string>
  body: any
  response: {
    status: number
    headers: Record<string, string>
    body: any
    duration: number
  }
  timestamp: string
  retries: number
}

export interface DatabaseOperation {
  id: string
  operation: 'select' | 'insert' | 'update' | 'delete'
  table: string
  query: string
  parameters: any[]
  result: any
  duration: number
  timestamp: string
}

export interface FileOperation {
  id: string
  operation: 'read' | 'write' | 'delete' | 'move' | 'copy'
  path: string
  size?: number
  content?: string
  timestamp: string
  duration: number
}

export interface ExternalIntegration {
  id: string
  service: string
  action: string
  parameters: any
  result: any
  duration: number
  timestamp: string
  success: boolean
}

export interface WebhookCall {
  id: string
  url: string
  method: string
  payload: any
  response: any
  timestamp: string
  duration: number
  success: boolean
}

export interface NotificationSent {
  id: string
  type: 'email' | 'sms' | 'push' | 'slack' | 'webhook'
  recipient: string
  subject?: string
  content: string
  timestamp: string
  success: boolean
}

// ========================================
// STATE MANAGEMENT COMPATIBILITY
// ========================================

export interface StateCompatibilityConfig {
  enableStateSynchronization: boolean
  preserveVariableTypes: boolean
  enableStateValidation: boolean
  handleStateConflicts: 'workflow_wins' | 'journey_wins' | 'merge' | 'error'
  stateUpdateFrequency: number
  enableStateSnapshots: boolean
  maxStateHistorySize: number
}

export interface ExecutionState {
  variables: Record<string, VariableState>
  context: ContextState
  progress: ProgressState
  locks: StateLock[]
  cache: CacheState
  session: SessionState
}

export interface VariableState {
  name: string
  value: any
  type: string
  scope: 'global' | 'workflow' | 'block' | 'step'
  lastUpdated: string
  source: 'workflow' | 'journey' | 'user' | 'system'
  encrypted: boolean
}

export interface ContextState {
  workflowContext: Record<string, any>
  journeyContext: Record<string, any>
  userContext: Record<string, any>
  systemContext: Record<string, any>
  conversationHistory: ConversationTurn[]
  activeTools: ActiveTool[]
}

export interface ProgressState {
  currentStep: string
  completedSteps: string[]
  totalSteps: number
  percentage: number
  estimatedTimeRemaining: number
  lastProgressUpdate: string
}

export interface StateLock {
  id: string
  resource: string
  type: 'read' | 'write' | 'exclusive'
  acquiredBy: string
  acquiredAt: string
  expiresAt: string
}

export interface CacheState {
  entries: CacheEntry[]
  size: number
  maxSize: number
  hitRate: number
  lastCleanup: string
}

export interface CacheEntry {
  key: string
  value: any
  type: string
  createdAt: string
  expiresAt?: string
  hits: number
  lastAccessed: string
}

export interface SessionState {
  sessionId: string
  startTime: string
  lastActivity: string
  authenticated: boolean
  userId?: string
  permissions: string[]
  preferences: Record<string, any>
  temporaryData: Record<string, any>
}

// ========================================
// INTEGRATION POINT COMPATIBILITY
// ========================================

export interface IntegrationCompatibilityConfig {
  validateApiCalls: boolean
  preserveApiCallOrder: boolean
  enableApiMocking: boolean
  validateDatabaseOperations: boolean
  preserveTransactionBoundaries: boolean
  validateExternalIntegrations: boolean
  enableIntegrationTracing: boolean
  failOnIntegrationMismatch: boolean
}

export interface IntegrationPointValidator {
  validateApiIntegration(call: ApiCall, expected: ApiCall): IntegrationValidationResult
  validateDatabaseIntegration(op: DatabaseOperation, expected: DatabaseOperation): IntegrationValidationResult
  validateExternalIntegration(integration: ExternalIntegration, expected: ExternalIntegration): IntegrationValidationResult
  validateWebhookIntegration(webhook: WebhookCall, expected: WebhookCall): IntegrationValidationResult
}

export interface IntegrationValidationResult {
  valid: boolean
  differences: IntegrationDifference[]
  severity: 'critical' | 'error' | 'warning' | 'info'
  recommendation: string
}

export interface IntegrationDifference {
  type: 'endpoint' | 'method' | 'parameters' | 'response' | 'timing' | 'headers'
  expected: any
  actual: any
  impact: 'high' | 'medium' | 'low'
  description: string
}

// ========================================
// RESULT FORMATTING AND TRANSFORMATION
// ========================================

export interface ResultFormatter {
  format(result: ExecutionResult, context?: ExecutionContext): Promise<any>
}

export interface ResultTransformer {
  transform(result: any, context: ExecutionContext): Promise<any>
}

export interface ResultValidator {
  validate(result: any, context: ExecutionContext): Promise<FormatValidationResult>
}

export interface FormatValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  path: string
  message: string
  code: string
  severity: 'critical' | 'error'
}

export interface ValidationWarning {
  path: string
  message: string
  code: string
  severity: 'warning' | 'info'
}

// ========================================
// COMPATIBILITY TESTING TYPES
// ========================================

export interface CompatibilityTestSuite {
  name: string
  description: string
  tests: CompatibilityTest[]
  configuration: TestConfiguration
  metadata: TestSuiteMetadata
}

export interface CompatibilityTest {
  id: string
  name: string
  description: string
  workflowId: string
  journeyId?: string
  inputData: any
  expectedBehavior: ExpectedBehavior
  assertions: TestAssertion[]
  timeout: number
  retries: number
}

export interface ExpectedBehavior {
  shouldMatch: string[]
  shouldDiffer: string[]
  tolerances: Record<string, number>
  allowedDifferences: DifferenceType[]
}

export interface TestAssertion {
  type: 'equals' | 'contains' | 'matches' | 'performance' | 'side_effects'
  path: string
  expected: any
  tolerance?: number
  description: string
}

export interface TestConfiguration {
  enableParallelExecution: boolean
  enablePerformanceTesting: boolean
  enableSideEffectTesting: boolean
  maxConcurrentTests: number
  defaultTimeout: number
  reportFormat: 'json' | 'html' | 'xml' | 'junit'
}

export interface TestSuiteMetadata {
  createdAt: string
  createdBy: string
  version: string
  lastExecuted?: string
  totalTests: number
  passRate: number
}

export interface TestResult {
  testId: string
  status: 'passed' | 'failed' | 'skipped' | 'error'
  startTime: string
  endTime: string
  duration: number
  comparison: ResultComparison
  assertions: AssertionResult[]
  errors: TestError[]
  warnings: TestWarning[]
}

export interface AssertionResult {
  assertion: TestAssertion
  passed: boolean
  actual: any
  expected: any
  message: string
}

export interface TestError {
  code: string
  message: string
  stack?: string
  context?: any
}

export interface TestWarning {
  code: string
  message: string
  context?: any
}

// ========================================
// COMPATIBILITY REPORTING TYPES
// ========================================

export interface CompatibilityReport {
  compatible: boolean
  similarityScore: number
  summary: CompatibilitySummary
  categories: Record<string, ResultDiff[]>
  recommendations: string[]
  metadata: ReportMetadata
}

export interface CompatibilitySummary {
  totalDifferences: number
  criticalIssues: number
  errorIssues: number
  warningIssues: number
  infoIssues: number
}

export interface ReportMetadata {
  generatedAt: string
  context: ExecutionContext
  comparisonMetadata: ComparisonMetadata
}

// ========================================
// UTILITY AND HELPER TYPES
// ========================================

export interface ToolCall {
  id: string
  name: string
  parameters: Record<string, any>
  result: any
  duration: number
  timestamp: string
  success: boolean
  error?: string
}

export interface AgentAction {
  id: string
  type: string
  description: string
  parameters: any
  result: any
  timestamp: string
  duration: number
}

export interface UserInteraction {
  id: string
  type: 'message' | 'input' | 'choice' | 'confirmation'
  content: any
  timestamp: string
  responseTime?: number
}

export interface ContextUpdate {
  path: string
  oldValue: any
  newValue: any
  timestamp: string
  source: string
}

export interface ConversationTurn {
  id: string
  speaker: 'user' | 'agent' | 'system'
  content: string
  timestamp: string
  metadata?: any
}

export interface ActiveTool {
  name: string
  status: 'active' | 'idle' | 'error'
  lastUsed: string
  callCount: number
}

export interface ConversationContext {
  turns: ConversationTurn[]
  currentTopic?: string
  intentHistory: string[]
  entityTracking: Record<string, any>
  emotionalState?: string
}

export interface ExecutionError {
  code: string
  message: string
  stackTrace?: string
  context?: any
  timestamp: string
  retryable: boolean
}

export interface ExecutionWarning {
  code: string
  message: string
  context?: any
  timestamp: string
  severity: 'low' | 'medium' | 'high'
}

export interface ExecutionMetadata {
  version: string
  environment: string
  nodeVersion: string
  startedBy: string
  tags: string[]
  correlationId: string
  traceId: string
  customProperties: Record<string, any>
}

export interface ResourceUsage {
  cpuTimeMs: number
  memoryMb: number
  diskIoMb: number
  networkIoMb: number
  executionTimeMs: number
  apiCalls: number
  databaseQueries: number
}

// ========================================
// EVENT TYPES FOR REAL-TIME COMPATIBILITY
// ========================================

export interface CompatibilityEvent {
  id: string
  type: CompatibilityEventType
  source: 'workflow' | 'journey'
  executionId: string
  timestamp: string
  data: any
}

export type CompatibilityEventType =
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'step_started'
  | 'step_completed'
  | 'variable_updated'
  | 'state_synchronized'
  | 'compatibility_check'
  | 'difference_detected'
  | 'side_effect_recorded'
  | 'integration_called'

export interface CompatibilityEventHandler {
  handleEvent(event: CompatibilityEvent): Promise<void>
  canHandle(eventType: CompatibilityEventType): boolean
}

export interface CompatibilityEventBus {
  publish(event: CompatibilityEvent): Promise<void>
  subscribe(eventType: CompatibilityEventType, handler: CompatibilityEventHandler): void
  unsubscribe(eventType: CompatibilityEventType, handler: CompatibilityEventHandler): void
}