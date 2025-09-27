/**
 * Journey Generation Type Definitions
 * ==================================
 *
 * Types for journey generation, conversion results, optimization,
 * and journey-specific configurations.
 */

import type { ConditionalExpression } from "./template-types";

// ============================================================================
// Journey Generation Types
// ============================================================================

export interface JourneyGenerationRequest {
  templateId: string;
  workflowId: string;
  agentId: string;
  workspaceId: string;
  userId?: string;

  // Parameters for generation
  parameters: Record<string, any>;

  // Generation options
  options: JourneyGenerationOptions;

  // Context information
  context: JourneyGenerationContext;
}

export interface JourneyGenerationOptions {
  // Optimization settings
  optimizationLevel: "minimal" | "standard" | "aggressive";
  optimizationTargets: OptimizationTarget[];

  // Journey structure preferences
  maxStates: number;
  maxTransitions: number;
  allowSkipping: boolean;
  allowRevisiting: boolean;

  // Content generation
  generateDescriptions: boolean;
  generateHelpTexts: boolean;
  includeTooltips: boolean;

  // Validation and testing
  validateGeneration: boolean;
  runTestConversations: boolean;

  // Caching
  useCache: boolean;
  cacheStrategy: "aggressive" | "conservative" | "none";

  // Output format
  outputFormat: "parlant" | "generic" | "custom";
  includeMetadata: boolean;
  includeAnalytics: boolean;
}

export interface JourneyGenerationContext {
  // User context
  userPreferences?: UserJourneyPreferences;
  userSkillLevel?: "beginner" | "intermediate" | "advanced";
  previousJourneys?: string[];

  // Agent context
  agentCapabilities: AgentCapability[];
  availableTools: string[];
  knowledgeBases: string[];

  // Workspace context
  workspaceSettings: WorkspaceJourneySettings;
  customizations: WorkspaceCustomization[];

  // Runtime context
  deviceType?: "mobile" | "desktop" | "tablet";
  locale?: string;
  timezone?: string;
  sessionDuration?: number;
}

export interface UserJourneyPreferences {
  preferredCommunicationStyle: "concise" | "detailed" | "conversational";
  interactionPace: "fast" | "moderate" | "slow";
  feedbackFrequency: "minimal" | "regular" | "frequent";
  helpLevel: "independent" | "guided" | "assisted";
  preferredLanguage: string;
}

export interface AgentCapability {
  type:
    | "tool_execution"
    | "knowledge_retrieval"
    | "workflow_trigger"
    | "data_processing";
  name: string;
  confidence: number;
  restrictions?: string[];
}

export interface WorkspaceJourneySettings {
  defaultOptimizationLevel: "minimal" | "standard" | "aggressive";
  maxJourneyDuration: number; // minutes
  allowedComplexity: "simple" | "moderate" | "complex";
  brandingRequired: boolean;
  complianceRules: ComplianceRule[];
}

export interface WorkspaceCustomization {
  type: "branding" | "messaging" | "flow" | "validation";
  configuration: Record<string, any>;
}

export interface ComplianceRule {
  type: "data_protection" | "accessibility" | "industry_specific";
  rule: string;
  required: boolean;
  validationFunction?: string;
}

// ============================================================================
// Journey Structure Types
// ============================================================================

export interface GeneratedJourney {
  id: string;
  title: string;
  description?: string;

  // Journey configuration
  agentId: string;
  workspaceId: string;
  templateId?: string;

  // Journey structure
  states: JourneyState[];
  transitions: JourneyTransition[];
  variables: JourneyVariable[];

  // Journey behavior
  entryConditions: ConditionalExpression[];
  exitConditions: ConditionalExpression[];
  errorHandling: ErrorHandlingRule[];

  // Journey metadata
  estimatedDuration: number; // minutes
  complexity: "simple" | "moderate" | "complex";
  tags: string[];

  // Generation metadata
  generatedAt: Date;
  generatedBy: string;
  generationVersion: string;
  sourceTemplate?: string;

  // Analytics and tracking
  analytics: JourneyAnalytics;
  performance: JourneyPerformance;
}

export interface JourneyState {
  id: string;
  name: string;
  stateType: JourneyStateType;

  // State content
  content: JourneyStateContent;

  // State behavior
  isInitial: boolean;
  isFinal: boolean;
  allowSkip: boolean;

  // State configuration
  timeout?: number; // seconds
  retryPolicy?: RetryPolicy;
  validationRules: ValidationRule[];

  // Conditional behavior
  entryConditions?: ConditionalExpression[];
  exitConditions?: ConditionalExpression[];

  // UI and UX
  uiConfiguration: StateUIConfiguration;

  // Metadata
  metadata: Record<string, any>;
}

export type JourneyStateType =
  | "chat" // Standard conversational interaction
  | "tool" // Tool execution state
  | "decision" // Decision/branching point
  | "input" // User input collection
  | "confirmation" // User confirmation state
  | "processing" // Background processing state
  | "wait" // Waiting for external event
  | "final" // Journey completion state
  | "error"; // Error handling state

export interface JourneyStateContent {
  // Chat state content
  chatPrompt?: string;
  systemInstructions?: string;
  suggestedResponses?: SuggestedResponse[];

  // Tool state content
  toolId?: string;
  toolConfiguration?: Record<string, any>;
  inputMappings?: ParameterMapping[];
  outputMappings?: ParameterMapping[];

  // Decision state content
  decisionPrompt?: string;
  options?: DecisionOption[];
  defaultOption?: string;

  // Input state content
  inputPrompt?: string;
  inputType?: InputType;
  inputValidation?: InputValidation;

  // Processing state content
  processingMessage?: string;
  progressIndicator?: boolean;
  estimatedDuration?: number;

  // Dynamic content
  contentGenerators?: ContentGenerator[];
}

export interface SuggestedResponse {
  text: string;
  value?: any;
  description?: string;
  icon?: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  description?: string;
  value: any;
  conditions?: ConditionalExpression[];
  consequences?: ActionConsequence[];
}

export interface ActionConsequence {
  type: "set_variable" | "trigger_tool" | "send_message" | "jump_to_state";
  configuration: Record<string, any>;
}

export interface InputType {
  type: "text" | "number" | "email" | "phone" | "date" | "choice" | "file";
  constraints?: InputConstraints;
}

export interface InputConstraints {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  choices?: Array<{ label: string; value: any }>;
  fileTypes?: string[];
  maxFileSize?: number;
}

export interface InputValidation {
  rules: ValidationRule[];
  errorMessages: Record<string, string>;
  successMessage?: string;
}

export interface ContentGenerator {
  type: "template" | "ai_generated" | "lookup" | "computed";
  source: string;
  parameters: Record<string, any>;
  caching: CachingConfiguration;
}

export interface CachingConfiguration {
  enabled: boolean;
  duration: number;
  scope: "user" | "session" | "global";
  keys: string[];
}

// ============================================================================
// Journey Transition Types
// ============================================================================

export interface JourneyTransition {
  id: string;
  fromStateId: string;
  toStateId: string;

  // Transition conditions
  conditions: ConditionalExpression[];
  priority: number;

  // Transition behavior
  actions: TransitionAction[];
  validations: ValidationRule[];

  // Transition content
  message?: string;
  confirmationRequired?: boolean;

  // Transition metadata
  name?: string;
  description?: string;
  metadata: Record<string, any>;
}

export interface TransitionAction {
  type:
    | "set_variable"
    | "clear_variable"
    | "call_tool"
    | "send_notification"
    | "log_event";
  configuration: Record<string, any>;
  async: boolean;
  errorHandling: ErrorHandlingRule;
}

export interface ValidationRule {
  type: "required" | "format" | "range" | "custom" | "dependencies";
  rule: string;
  errorMessage: string;
  warningMessage?: string;
  severity: "error" | "warning" | "info";
}

export interface ErrorHandlingRule {
  errorType: string;
  strategy: "retry" | "skip" | "fallback" | "abort" | "escalate";
  configuration: Record<string, any>;
  maxRetries?: number;
  fallbackStateId?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: "linear" | "exponential" | "fixed";
  baseDelay: number; // milliseconds
  maxDelay?: number;
  jitter?: boolean;
}

// ============================================================================
// Journey Variables and Data Types
// ============================================================================

export interface JourneyVariable {
  id: string;
  name: string;
  type: VariableType;
  scope: VariableScope;

  // Variable configuration
  defaultValue?: any;
  persistent: boolean;
  encrypted: boolean;

  // Validation and constraints
  validation?: VariableValidation;
  constraints?: VariableConstraints;

  // Metadata
  description?: string;
  category?: string;
  metadata: Record<string, any>;
}

export type VariableType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "date"
  | "reference";

export type VariableScope =
  | "state" // Available only in current state
  | "journey" // Available throughout journey
  | "session" // Available throughout user session
  | "user" // Available across all user sessions
  | "global"; // Available globally (admin only)

export interface VariableValidation {
  rules: ValidationRule[];
  transform?: VariableTransform[];
}

export interface VariableTransform {
  type: "trim" | "lowercase" | "uppercase" | "normalize" | "encrypt" | "hash";
  configuration?: Record<string, any>;
}

export interface VariableConstraints {
  immutable?: boolean;
  maxAge?: number; // seconds
  dependencies?: string[];
  conflictsWith?: string[];
}

// ============================================================================
// UI and UX Configuration Types
// ============================================================================

export interface StateUIConfiguration {
  // Layout and positioning
  layout: "default" | "compact" | "expanded" | "sidebar";
  position: "center" | "left" | "right" | "bottom";

  // Visual styling
  theme?: string;
  customCSS?: string;
  iconSet?: string;

  // Interactive elements
  showProgress: boolean;
  showBreadcrumbs: boolean;
  showHelp: boolean;
  showSkip: boolean;

  // Accessibility
  accessibilityFeatures: AccessibilityFeature[];
  screenReaderText?: string;
  keyboardShortcuts?: KeyboardShortcut[];

  // Mobile optimization
  mobileOptimized: boolean;
  touchGestures: TouchGesture[];
}

export interface AccessibilityFeature {
  type:
    | "high_contrast"
    | "large_text"
    | "screen_reader"
    | "keyboard_navigation";
  enabled: boolean;
  configuration?: Record<string, any>;
}

export interface KeyboardShortcut {
  keys: string[];
  action: string;
  description: string;
}

export interface TouchGesture {
  gesture: "swipe" | "pinch" | "tap" | "long_press";
  action: string;
  direction?: "left" | "right" | "up" | "down";
}

// ============================================================================
// Journey Analytics and Performance Types
// ============================================================================

export interface JourneyAnalytics {
  // Usage metrics
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  averageCompletionTime: number;

  // State metrics
  stateVisits: Record<string, number>;
  stateCompletionRates: Record<string, number>;
  stateAverageTime: Record<string, number>;

  // Transition metrics
  transitionUsage: Record<string, number>;
  transitionSuccessRates: Record<string, number>;

  // Error metrics
  errorsByState: Record<string, ErrorMetrics>;
  errorsByTransition: Record<string, ErrorMetrics>;

  // User feedback
  satisfactionScores: number[];
  feedbackComments: FeedbackComment[];

  // Performance metrics
  performance: JourneyPerformance;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorTypes: Record<string, number>;
  recoveryRate: number;
  averageRecoveryTime: number;
}

export interface FeedbackComment {
  userId?: string;
  stateId?: string;
  rating: number;
  comment: string;
  timestamp: Date;
  sentiment: "positive" | "neutral" | "negative";
}

export interface JourneyPerformance {
  // Generation performance
  generationTime: number; // milliseconds
  templateProcessingTime: number;
  validationTime: number;
  optimizationTime: number;

  // Runtime performance
  averageStateLoadTime: number;
  averageTransitionTime: number;
  cacheHitRate: number;

  // Resource usage
  memoryUsage: ResourceUsage;
  computeUsage: ResourceUsage;
  networkUsage: ResourceUsage;
}

export interface ResourceUsage {
  peak: number;
  average: number;
  total: number;
  unit: string;
}

// ============================================================================
// Optimization Types
// ============================================================================

export type OptimizationTarget =
  | "performance" // Optimize for speed
  | "memory" // Optimize for memory usage
  | "user_experience" // Optimize for UX
  | "completion_rate" // Optimize for completion
  | "error_reduction" // Optimize for reliability
  | "accessibility"; // Optimize for accessibility

export interface JourneyOptimization {
  target: OptimizationTarget;
  strategies: OptimizationStrategy[];
  metrics: OptimizationMetrics;
  recommendations: OptimizationRecommendation[];
}

export interface OptimizationStrategy {
  name: string;
  description: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  implementation: OptimizationImplementation;
}

export interface OptimizationImplementation {
  type:
    | "state_merge"
    | "transition_simplification"
    | "content_optimization"
    | "caching";
  changes: OptimizationChange[];
  requirements: string[];
  risks: string[];
}

export interface OptimizationChange {
  type: "add" | "remove" | "modify";
  target: "state" | "transition" | "variable" | "content";
  targetId: string;
  changes: Record<string, any>;
  rationale: string;
}

export interface OptimizationMetrics {
  beforeOptimization: PerformanceSnapshot;
  afterOptimization: PerformanceSnapshot;
  improvement: Record<string, number>;
  regressions: Record<string, number>;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  metrics: Record<string, number>;
  context: Record<string, any>;
}

export interface OptimizationRecommendation {
  type: "structural" | "content" | "performance" | "ux";
  priority: "low" | "medium" | "high" | "critical";
  description: string;
  implementation: string;
  expectedBenefit: string;
  risks: string[];
  effort: "low" | "medium" | "high";
}

// ============================================================================
// Conversion Result Types
// ============================================================================

export interface ConversionResult {
  success: boolean;
  journey?: GeneratedJourney;

  // Conversion metadata
  conversionId: string;
  startTime: Date;
  endTime: Date;
  duration: number;

  // Source information
  templateId?: string;
  workflowId: string;
  parameters: Record<string, any>;

  // Results summary
  statesGenerated: number;
  transitionsGenerated: number;
  variablesCreated: number;
  optimizationsApplied: number;

  // Validation results
  validationResults: ValidationResult[];

  // Warnings and errors
  warnings: ConversionWarning[];
  errors: ConversionError[];

  // Performance metrics
  performance: ConversionPerformance;

  // Caching information
  cacheHit: boolean;
  cacheKey?: string;
}

export interface ValidationResult {
  category: "structure" | "content" | "performance" | "compliance";
  passed: boolean;
  score: number;
  details: ValidationDetail[];
}

export interface ValidationDetail {
  rule: string;
  status: "pass" | "fail" | "warning";
  message: string;
  suggestion?: string;
  autoFixAvailable?: boolean;
}

export interface ConversionWarning {
  code: string;
  message: string;
  category: "performance" | "ux" | "compliance" | "compatibility";
  severity: "low" | "medium" | "high";
  context: Record<string, any>;
  suggestion?: string;
}

export interface ConversionError {
  code: string;
  message: string;
  category: "template" | "parameter" | "workflow" | "system";
  fatal: boolean;
  context: Record<string, any>;
  stackTrace?: string;
}

export interface ConversionPerformance {
  templateLoadTime: number;
  parameterValidationTime: number;
  workflowAnalysisTime: number;
  journeyGenerationTime: number;
  optimizationTime: number;
  validationTime: number;
  totalTime: number;

  // Resource usage
  peakMemoryMB: number;
  averageMemoryMB: number;
  cacheOperations: number;
  databaseQueries: number;
}

// ============================================================================
// Parameter Mapping Types (Re-export from template-types for convenience)
// ============================================================================

export interface ParameterMapping {
  parameterId: string;
  targetPath: string; // JSONPath to the target field in journey structure
  transformation?: ParameterTransformation;
  conditional?: ConditionalExpression;
  validation?: MappingValidation;
}

export interface ParameterTransformation {
  type: "direct" | "computed" | "lookup" | "format" | "aggregate";
  expression?: string;
  lookupTable?: Record<string, any>;
  formatString?: string;
  defaultValue?: any;
  computationFunction?: string;
  aggregationRules?: AggregationRule[];
}

export interface AggregationRule {
  operation: "sum" | "average" | "min" | "max" | "count" | "concat" | "merge";
  source: string;
  groupBy?: string;
  filter?: ConditionalExpression;
}

export interface MappingValidation {
  required: boolean;
  type: string;
  constraints: Record<string, any>;
  errorMessage: string;
}
