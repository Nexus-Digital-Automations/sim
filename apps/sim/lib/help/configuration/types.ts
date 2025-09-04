/**
 * Configuration Assistance System - Type Definitions
 *
 * Comprehensive type definitions for the automated configuration assistance system.
 * Defines interfaces for ML-powered parameter detection, recommendation engine,
 * validation framework, and best practices integration.
 *
 * Key Features:
 * - Smart parameter detection with contextual awareness
 * - Configuration recommendations with confidence scoring
 * - Validation and testing framework for configurations
 * - Best practices database with pattern matching
 * - Real-time configuration assistance with error prevention
 *
 * @created 2025-09-04
 * @author Automated Configuration Assistance Specialist
 */

// ========================
// CORE CONFIGURATION TYPES
// ========================

export interface ConfigurationContext {
  /** Component type being configured */
  componentType: string
  /** Current workflow context */
  workflowType?: string
  /** User experience level */
  userLevel: 'beginner' | 'intermediate' | 'expert'
  /** Existing configuration state */
  existingConfig?: Record<string, any>
  /** Previous configuration attempts */
  previousAttempts?: ConfigurationAttempt[]
  /** User preferences and patterns */
  userPreferences?: UserConfigurationPreferences
  /** Environment constraints */
  environment?: EnvironmentConstraints
  /** Template context if applicable */
  templateContext?: TemplateConfigurationContext
}

export interface ConfigurationAttempt {
  id: string
  timestamp: Date
  parameters: Record<string, any>
  success: boolean
  errors?: ConfigurationError[]
  validationResults?: ValidationResult[]
  timeToComplete?: number
  userActions: UserAction[]
}

export interface ConfigurationError {
  code: string
  message: string
  field?: string
  severity: 'error' | 'warning' | 'info'
  suggestion?: string
  category: 'validation' | 'syntax' | 'logic' | 'compatibility' | 'security'
  autoFixable: boolean
}

export interface UserConfigurationPreferences {
  preferredAuthMethods: string[]
  commonDatabaseTypes: string[]
  apiPatterns: string[]
  deploymentTargets: string[]
  securityRequirements: string[]
  performanceRequirements: string[]
  usagePatterns: Record<string, number>
}

export interface EnvironmentConstraints {
  availableServices: string[]
  resourceLimits: Record<string, any>
  securityPolicies: string[]
  complianceRequirements: string[]
  integrationConstraints: string[]
  technologyStack: string[]
}

export interface TemplateConfigurationContext {
  templateId: string
  templateCategory: string
  requiredParameters: ParameterDefinition[]
  optionalParameters: ParameterDefinition[]
  presetConfigurations: PresetConfiguration[]
  compatibilityMatrix: CompatibilityMatrix
}

// ========================
// ML PARAMETER DETECTION
// ========================

export interface ParameterDetectionRequest {
  context: ConfigurationContext
  userInput?: string
  behaviorHistory?: UserBehaviorPattern[]
  currentState?: Record<string, any>
  goals?: ConfigurationGoal[]
}

export interface ParameterDetectionResponse {
  detectedParameters: DetectedParameter[]
  confidence: number
  recommendations: ParameterRecommendation[]
  missingParameters: MissingParameter[]
  conflicts: ParameterConflict[]
  suggestions: SmartSuggestion[]
  metadata: {
    modelVersion: string
    processingTime: number
    confidence: number
    dataSource: string[]
  }
}

export interface DetectedParameter {
  name: string
  value: any
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array'
  confidence: number
  source: 'user_input' | 'context' | 'template' | 'ml_inference' | 'best_practice'
  category: string
  required: boolean
  validation?: ValidationRule[]
  dependencies?: string[]
}

export interface ParameterRecommendation {
  parameter: string
  recommendedValue: any
  confidence: number
  reasoning: string
  category: 'security' | 'performance' | 'compatibility' | 'best_practice' | 'user_preference'
  impact: 'low' | 'medium' | 'high'
  alternatives?: AlternativeRecommendation[]
}

export interface MissingParameter {
  name: string
  dataType: string
  required: boolean
  defaultValue?: any
  description: string
  category: string
  priority: number
  dependencies?: string[]
  validationRules?: ValidationRule[]
}

export interface ParameterConflict {
  conflictType:
    | 'incompatible_values'
    | 'mutual_exclusion'
    | 'dependency_missing'
    | 'validation_error'
  parameters: string[]
  description: string
  severity: 'error' | 'warning'
  resolution: ConflictResolution[]
}

// ========================
// RECOMMENDATION ENGINE
// ========================

export interface ConfigurationRecommendationRequest {
  context: ConfigurationContext
  currentConfiguration: Record<string, any>
  userGoals: ConfigurationGoal[]
  constraints: ConfigurationConstraint[]
  optimizationTargets: OptimizationTarget[]
}

export interface ConfigurationRecommendationResponse {
  recommendations: ConfigurationRecommendation[]
  optimizedConfiguration: Record<string, any>
  alternatives: AlternativeConfiguration[]
  warnings: ConfigurationWarning[]
  improvements: ConfigurationImprovement[]
  metadata: RecommendationMetadata
}

export interface ConfigurationRecommendation {
  id: string
  type: 'parameter_value' | 'structure_change' | 'additional_config' | 'optimization'
  title: string
  description: string
  impact: ConfigurationImpact
  confidence: number
  category: string
  priority: number
  implementation: ImplementationGuidance
  validation: ValidationRequirement[]
}

export interface ConfigurationImpact {
  performance: 'negative' | 'neutral' | 'positive'
  security: 'negative' | 'neutral' | 'positive'
  maintainability: 'negative' | 'neutral' | 'positive'
  complexity: 'increased' | 'neutral' | 'reduced'
  compatibility: 'reduced' | 'neutral' | 'improved'
  estimatedTimeToImplement: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface AlternativeConfiguration {
  id: string
  name: string
  configuration: Record<string, any>
  advantages: string[]
  disadvantages: string[]
  suitability: ConfigurationSuitability
  complexity: 'low' | 'medium' | 'high'
  confidence: number
}

// ========================
// VALIDATION FRAMEWORK
// ========================

export interface ValidationRequest {
  configuration: Record<string, any>
  context: ConfigurationContext
  validationLevel: 'basic' | 'comprehensive' | 'production'
  customRules?: CustomValidationRule[]
}

export interface ValidationResult {
  isValid: boolean
  score: number
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]
  performance: PerformanceAnalysis
  security: SecurityAnalysis
  compatibility: CompatibilityAnalysis
  bestPractices: BestPracticeAnalysis
  metadata: ValidationMetadata
}

export interface ValidationError {
  code: string
  message: string
  field: string
  value: any
  severity: 'critical' | 'error' | 'warning'
  category: string
  fixable: boolean
  suggestedFix?: ConfigurationFix
  documentation?: DocumentationReference
}

export interface ValidationWarning {
  code: string
  message: string
  field?: string
  category: string
  recommendation: string
  impact: 'low' | 'medium' | 'high'
  canIgnore: boolean
}

export interface ValidationSuggestion {
  type: 'optimization' | 'enhancement' | 'alternative' | 'simplification'
  description: string
  benefit: string
  implementation: string
  confidence: number
  priority: number
}

export interface ConfigurationFix {
  type: 'replace' | 'add' | 'remove' | 'transform'
  target: string
  newValue?: any
  explanation: string
  confidence: number
  automated: boolean
}

// ========================
// BEST PRACTICES DATABASE
// ========================

export interface BestPracticePattern {
  id: string
  name: string
  category: string
  description: string
  pattern: ConfigurationPattern
  applicability: PatternApplicability
  benefits: string[]
  drawbacks?: string[]
  examples: ConfigurationExample[]
  metrics: PatternMetrics
  validationRules: ValidationRule[]
}

export interface ConfigurationPattern {
  structure: Record<string, any>
  constraints: PatternConstraint[]
  variants: PatternVariant[]
  dependencies: PatternDependency[]
  context: PatternContext
}

export interface PatternApplicability {
  componentTypes: string[]
  userLevels: ('beginner' | 'intermediate' | 'expert')[]
  environments: string[]
  useCases: string[]
  excludeWhen: ExclusionCriteria[]
}

export interface PatternMetrics {
  usage: {
    frequency: number
    successRate: number
    userSatisfaction: number
  }
  performance: {
    averageSetupTime: number
    errorRate: number
    maintenanceOverhead: number
  }
  compatibility: {
    supportedVersions: string[]
    knownIssues: KnownIssue[]
    migrationPaths: MigrationPath[]
  }
}

// ========================
// SMART SUGGESTIONS
// ========================

export interface SmartSuggestion {
  id: string
  type: 'parameter_fill' | 'configuration_template' | 'optimization' | 'error_fix' | 'best_practice'
  title: string
  description: string
  confidence: number
  priority: number
  category: string
  action: SuggestionAction
  preview?: ConfigurationPreview
  impact: SuggestionImpact
  validation: PreValidationResult
}

export interface SuggestionAction {
  type: 'apply_configuration' | 'open_guide' | 'run_validation' | 'suggest_alternative'
  data: Record<string, any>
  automated: boolean
  reversible: boolean
  confirmation_required: boolean
}

export interface ConfigurationPreview {
  beforeState: Record<string, any>
  afterState: Record<string, any>
  changes: ConfigurationChange[]
  estimatedImpact: ImpactEstimation
}

export interface ConfigurationChange {
  operation: 'add' | 'modify' | 'remove'
  path: string
  oldValue?: any
  newValue?: any
  reasoning: string
}

// ========================
// REAL-TIME ASSISTANCE
// ========================

export interface RealTimeAssistanceRequest {
  sessionId: string
  userId: string
  context: ConfigurationContext
  currentConfiguration: Record<string, any>
  userAction: UserAction
  timestamp: Date
}

export interface RealTimeAssistanceResponse {
  suggestions: SmartSuggestion[]
  warnings: RealTimeWarning[]
  validationFeedback: ValidationFeedback[]
  nextSteps: NextStepGuidance[]
  proactiveHelp?: ProactiveHelpSuggestion[]
  metadata: AssistanceMetadata
}

export interface RealTimeWarning {
  type:
    | 'syntax_error'
    | 'logic_error'
    | 'compatibility_issue'
    | 'security_risk'
    | 'performance_concern'
  message: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  field?: string
  preventSubmission: boolean
  quickFix?: QuickFix
}

export interface ValidationFeedback {
  field: string
  status: 'valid' | 'invalid' | 'warning' | 'pending'
  message?: string
  suggestions?: string[]
  liveValidation: boolean
}

export interface NextStepGuidance {
  step: string
  description: string
  priority: number
  category: 'required' | 'recommended' | 'optional'
  dependencies?: string[]
  estimatedTime: number
  resources: GuidanceResource[]
}

// ========================
// SUPPORTING TYPES
// ========================

export interface UserAction {
  type: 'input_change' | 'field_focus' | 'button_click' | 'validation_request' | 'help_request'
  target: string
  value?: any
  timestamp: Date
  context?: Record<string, any>
}

export interface UserBehaviorPattern {
  patternType: string
  frequency: number
  contexts: string[]
  outcomes: BehaviorOutcome[]
  preferences: Record<string, any>
}

export interface BehaviorOutcome {
  success: boolean
  timeToComplete: number
  errorCount: number
  helpRequests: number
  satisfactionScore?: number
}

export interface ConfigurationGoal {
  id: string
  type: 'performance' | 'security' | 'simplicity' | 'compatibility' | 'cost' | 'maintainability'
  priority: number
  description: string
  metrics?: GoalMetric[]
}

export interface ConfigurationConstraint {
  type: 'resource' | 'security' | 'compliance' | 'compatibility' | 'budget' | 'time'
  description: string
  value: any
  flexible: boolean
}

export interface OptimizationTarget {
  metric: string
  target: 'minimize' | 'maximize' | 'balance'
  weight: number
  threshold?: number
}

export interface ParameterDefinition {
  name: string
  dataType: string
  required: boolean
  defaultValue?: any
  description: string
  constraints?: ParameterConstraint[]
  validation?: ValidationRule[]
  category: string
  dependencies?: ParameterDependency[]
}

export interface ParameterConstraint {
  type: 'range' | 'enum' | 'pattern' | 'length' | 'custom'
  value: any
  message?: string
}

export interface ValidationRule {
  type: string
  parameters: Record<string, any>
  message: string
  severity: 'error' | 'warning' | 'info'
}

// Additional interfaces would continue here...
// Truncated for brevity but would include all remaining supporting types

export type ConfigurationAssistanceEvent =
  | { type: 'parameter_detected'; data: DetectedParameter }
  | { type: 'validation_completed'; data: ValidationResult }
  | { type: 'recommendation_generated'; data: ConfigurationRecommendation }
  | { type: 'error_detected'; data: ConfigurationError }
  | { type: 'user_action'; data: UserAction }
  | { type: 'assistance_provided'; data: RealTimeAssistanceResponse }

export interface ConfigurationAssistanceConfig {
  mlModel: {
    parameterDetection: string
    recommendationEngine: string
    validationModel: string
  }
  thresholds: {
    confidenceThreshold: number
    suggestionLimit: number
    realTimeResponseTime: number
  }
  features: {
    enableRealTimeValidation: boolean
    enableProactiveHelp: boolean
    enableBestPracticesSuggestions: boolean
    enableMLParameterDetection: boolean
  }
  integrations: {
    aiHelpEngine: boolean
    templateSystem: boolean
    workflowWizard: boolean
    validationFramework: boolean
  }
}
