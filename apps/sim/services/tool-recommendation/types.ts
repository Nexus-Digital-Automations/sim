/**
 * Tool Recommendation System - Type Definitions
 *
 * Comprehensive type system for the intelligent tool recommendation engine
 * that provides contextual tool suggestions based on user intent, behavior,
 * and workspace patterns.
 */

import type { ToolConfig } from '@/tools/types'

// ===== CONTEXT ANALYSIS TYPES =====

export interface ConversationContext {
  id: string
  agentId: string
  workspaceId: string
  userId: string
  sessionId: string
  messages: ContextMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface ContextMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    intent?: IntentClassification
    entities?: ExtractedEntity[]
    toolsUsed?: string[]
    sentiment?: SentimentAnalysis
  }
}

export interface IntentClassification {
  primary: string
  confidence: number
  secondary?: Array<{
    intent: string
    confidence: number
  }>
  domains: string[]
  tasks: TaskType[]
}

export interface ExtractedEntity {
  type: EntityType
  value: string
  confidence: number
  startIndex: number
  endIndex: number
}

export type EntityType =
  | 'database'
  | 'api_service'
  | 'file_type'
  | 'data_format'
  | 'task_priority'
  | 'time_reference'
  | 'contact_info'
  | 'url'
  | 'email'
  | 'person_name'
  | 'company_name'
  | 'location'
  | 'number'
  | 'date'

export type TaskType =
  | 'data_retrieval'
  | 'data_analysis'
  | 'communication'
  | 'file_processing'
  | 'automation'
  | 'integration'
  | 'reporting'
  | 'monitoring'
  | 'search'
  | 'transformation'

export interface SentimentAnalysis {
  polarity: number // -1 to 1
  confidence: number
  emotions: Array<{
    emotion: string
    intensity: number
  }>
}

// ===== USER BEHAVIOR TRACKING =====

export interface UserBehaviorProfile {
  userId: string
  workspaceId: string
  preferences: UserPreferences
  patterns: UsagePattern[]
  toolFamiliarity: Record<string, ToolFamiliarityScore>
  successRates: Record<string, ToolSuccessRate>
  collaborationStyle: CollaborationStyle
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferences {
  preferredCategories: string[]
  toolComplexityTolerance: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  communicationStyle: 'formal' | 'casual' | 'technical'
  feedbackFrequency: 'high' | 'medium' | 'low'
  privacyLevel: 'strict' | 'moderate' | 'open'
  learningStyle: 'guided' | 'exploratory' | 'documentation-first'
}

export interface UsagePattern {
  timeOfDay: number // 0-23
  dayOfWeek: number // 0-6
  toolSequences: ToolSequence[]
  sessionDuration: number
  frequency: number
  context: string[]
}

export interface ToolSequence {
  tools: string[]
  frequency: number
  successRate: number
  averageDuration: number
}

export interface ToolFamiliarityScore {
  toolId: string
  score: number // 0-1
  usageCount: number
  lastUsed: Date
  errorRate: number
  helpRequests: number
}

export interface ToolSuccessRate {
  toolId: string
  attempts: number
  successes: number
  rate: number
  lastCalculated: Date
  commonErrors: string[]
}

export interface CollaborationStyle {
  prefersIndependentWork: boolean
  sharesWorkflows: boolean
  askForHelp: 'rarely' | 'sometimes' | 'often'
  mentorsOthers: boolean
  teamRole: 'leader' | 'contributor' | 'observer'
}

// ===== WORKSPACE PATTERN ANALYSIS =====

export interface WorkspacePattern {
  workspaceId: string
  industry: string
  teamSize: number
  commonWorkflows: WorkflowPattern[]
  toolUsageStats: WorkspaceToolStats
  integrationPoints: IntegrationPattern[]
  seasonality: SeasonalityPattern[]
  complianceRequirements: string[]
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowPattern {
  id: string
  name: string
  frequency: number
  tools: string[]
  triggers: string[]
  outcomes: string[]
  averageDuration: number
  userRoles: string[]
}

export interface WorkspaceToolStats {
  totalTools: number
  activeTools: number
  mostUsed: Array<{
    toolId: string
    usage: number
  }>
  leastUsed: Array<{
    toolId: string
    usage: number
  }>
  categoryBreakdown: Record<string, number>
  integrationHealth: number // 0-1
}

export interface IntegrationPattern {
  sourceToolId: string
  targetToolId: string
  frequency: number
  dataFlow: 'unidirectional' | 'bidirectional'
  latency: number
  errorRate: number
}

export interface SeasonalityPattern {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  tools: string[]
  peakUsage: Date[]
  variance: number
}

// ===== RECOMMENDATION ENGINE =====

export interface RecommendationRequest {
  context: ConversationContext
  userProfile?: UserBehaviorProfile
  workspacePattern?: WorkspacePattern
  currentTools?: string[]
  excludeTools?: string[]
  maxSuggestions?: number
  explainReasons?: boolean
}

export interface ToolRecommendation {
  toolId: string
  tool: ToolConfig
  score: number
  confidence: number
  reasons: RecommendationReason[]
  category: RecommendationCategory
  alternatives?: ToolAlternative[]
  estimatedRelevance: number // 0-1
  contextAlignment: number // 0-1
  userFit: number // 0-1
  workspaceFit: number // 0-1
}

export interface RecommendationReason {
  type: ReasonType
  weight: number
  explanation: string
  evidence?: any
}

export type ReasonType =
  | 'intent_match'
  | 'entity_alignment'
  | 'user_preference'
  | 'past_success'
  | 'workflow_pattern'
  | 'workspace_standard'
  | 'collaboration_style'
  | 'temporal_pattern'
  | 'integration_benefit'
  | 'efficiency_gain'

export type RecommendationCategory =
  | 'highly_relevant'
  | 'contextually_appropriate'
  | 'workflow_enhancement'
  | 'alternative_approach'
  | 'learning_opportunity'
  | 'integration_suggestion'

export interface ToolAlternative {
  toolId: string
  reason: string
  tradeoffs: string[]
  whenToconsider: string
}

export interface RecommendationSet {
  request: RecommendationRequest
  recommendations: ToolRecommendation[]
  metadata: {
    generatedAt: Date
    processingTime: number
    modelVersion: string
    totalScored: number
    confidenceThreshold: number
  }
  explanation?: RecommendationExplanation
}

export interface RecommendationExplanation {
  summary: string
  keyFactors: string[]
  userPersonalization: string[]
  workspaceContext: string[]
  improvementSuggestions: string[]
}

// ===== MACHINE LEARNING MODELS =====

export interface MLModelConfig {
  name: string
  version: string
  type: MLModelType
  features: string[]
  hyperparameters: Record<string, any>
  performance: ModelPerformance
  lastTrained: Date
}

export type MLModelType =
  | 'collaborative_filtering'
  | 'content_based'
  | 'hybrid'
  | 'neural_network'
  | 'random_forest'
  | 'gradient_boosting'

export interface ModelPerformance {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  auc: number
  trainingSize: number
  validationSize: number
  testSize: number
}

export interface FeatureVector {
  userId: string
  toolId: string
  contextFeatures: number[]
  userFeatures: number[]
  toolFeatures: number[]
  interactionFeatures: number[]
  temporalFeatures: number[]
  workspaceFeatures: number[]
}

export interface TrainingData {
  positive: FeatureVector[]
  negative: FeatureVector[]
  implicit: FeatureVector[]
  metadata: {
    collectedFrom: Date
    collectedTo: Date
    totalSamples: number
    qualityScore: number
  }
}

// ===== REAL-TIME SUGGESTION =====

export interface SuggestionTrigger {
  type: TriggerType
  threshold: number
  cooldown: number // seconds
  enabled: boolean
}

export type TriggerType =
  | 'user_pause'
  | 'error_detected'
  | 'inefficient_pattern'
  | 'new_capability'
  | 'workflow_completion'
  | 'integration_opportunity'

export interface RealTimeSuggestion {
  id: string
  conversationId: string
  trigger: TriggerType
  suggestion: ToolRecommendation
  urgency: 'low' | 'medium' | 'high'
  timing: 'immediate' | 'next_pause' | 'end_of_task'
  displayDuration?: number
  dismissed?: boolean
  accepted?: boolean
  feedback?: SuggestionFeedback
  createdAt: Date
}

export interface SuggestionFeedback {
  helpful: boolean
  accurate: boolean
  timely: boolean
  reason?: string
  improvements?: string[]
  rating: number // 1-5
  submittedAt: Date
}

// ===== PERSONALIZATION & LEARNING =====

export interface PersonalizationConfig {
  userId: string
  workspaceId: string
  adaptationRate: number // 0-1
  explorationRate: number // 0-1
  feedbackSensitivity: number // 0-1
  privacySettings: PrivacySettings
  customRules: PersonalizationRule[]
}

export interface PrivacySettings {
  shareWithTeam: boolean
  shareAcrossWorkspaces: boolean
  collectDetailedAnalytics: boolean
  retentionPeriod: number // days
  anonymizeData: boolean
}

export interface PersonalizationRule {
  id: string
  condition: string
  action: PersonalizationAction
  priority: number
  enabled: boolean
  createdBy: 'user' | 'system' | 'admin'
}

export interface PersonalizationAction {
  type: 'boost' | 'suppress' | 'reorder' | 'customize'
  target: string
  parameters: Record<string, any>
}

export interface LearningEvent {
  id: string
  userId: string
  workspaceId: string
  eventType: LearningEventType
  toolId?: string
  context: Record<string, any>
  outcome: 'positive' | 'negative' | 'neutral'
  feedback?: any
  timestamp: Date
}

export type LearningEventType =
  | 'tool_selected'
  | 'tool_rejected'
  | 'suggestion_accepted'
  | 'suggestion_dismissed'
  | 'workflow_completed'
  | 'error_encountered'
  | 'help_requested'
  | 'feedback_provided'

// ===== ANALYTICS & MONITORING =====

export interface RecommendationAnalytics {
  workspaceId: string
  period: AnalyticsPeriod
  metrics: RecommendationMetrics
  trends: AnalyticsTrend[]
  insights: AnalyticsInsight[]
  generatedAt: Date
}

export interface AnalyticsPeriod {
  start: Date
  end: Date
  granularity: 'hour' | 'day' | 'week' | 'month'
}

export interface RecommendationMetrics {
  totalRecommendations: number
  acceptanceRate: number
  averageRelevanceScore: number
  userSatisfaction: number
  performanceGains: number
  errorReduction: number
  toolAdoption: number
  workflowEfficiency: number
}

export interface AnalyticsTrend {
  metric: string
  direction: 'up' | 'down' | 'stable'
  magnitude: number
  confidence: number
  timeframe: string
}

export interface AnalyticsInsight {
  type: 'opportunity' | 'issue' | 'success' | 'trend'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  actionable: boolean
  recommendations?: string[]
}

// ===== API INTERFACES =====

export interface RecommendationAPI {
  getRecommendations(request: RecommendationRequest): Promise<RecommendationSet>
  provideFeedback(suggestionId: string, feedback: SuggestionFeedback): Promise<void>
  updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void>
  getAnalytics(workspaceId: string, period: AnalyticsPeriod): Promise<RecommendationAnalytics>
  trainModel(modelName: string, data: TrainingData): Promise<ModelPerformance>
}

// ===== ERROR TYPES =====

export class RecommendationError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'RecommendationError'
  }
}

export interface RecommendationSystemHealth {
  status: 'healthy' | 'degraded' | 'down'
  lastCheck: Date
  components: ComponentHealth[]
  overallScore: number // 0-1
}

export interface ComponentHealth {
  name: string
  status: 'healthy' | 'warning' | 'error'
  latency?: number
  errorRate?: number
  lastError?: string
  lastSuccess?: Date
}