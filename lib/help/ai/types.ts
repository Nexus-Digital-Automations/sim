/**
 * AI Help Engine - Type Definitions
 *
 * Comprehensive TypeScript type definitions for the AI Help Engine system.
 * Provides strong typing for all interfaces, ensuring type safety across components.
 *
 * Key Type Categories:
 * - Core service interfaces and configurations
 * - User interaction and context types
 * - Response and result structures
 * - Metrics and monitoring types
 * - Error handling and validation types
 *
 * Usage: Import specific types as needed across AI help components
 */

// Re-export core types from individual modules for convenience
export type {
  EmbeddingConfig,
  EmbeddingMetrics,
  EmbeddingRequest,
  SimilarityResult,
} from './embedding-service'
export type {
  AIHelpContext,
  AIHelpEngineConfig,
  AIHelpMetrics,
  AIHelpRequest,
  AIHelpResponse,
  AIHelpSuggestion,
  AIRelatedContent,
} from './index'
export type {
  ChatbotConfig,
  ChatResponse,
  ConversationContext,
  ConversationError,
  ConversationMessage,
  ConversationState,
  DetectedIntent,
  ExtractedEntity,
  RelatedContent,
  SuggestedAction,
} from './intelligent-chatbot'
export type {
  DismissalPattern,
  HelpSeekingPattern,
  InterventionAction,
  InterventionContent,
  InterventionSuggestion,
  LearningProgressMetrics,
  PredictionResult,
  PredictionTrigger,
  PredictiveHelpConfig,
  UserBehaviorProfile,
  UserIssuePattern,
  UserSessionMetrics,
  WorkflowContext,
  WorkflowError,
  WorkflowWarning,
} from './predictive-help'
export type {
  HelpContent,
  HybridSearchConfig,
  SearchContext,
  SearchFilter,
  SearchOptions,
  SearchResult,
  UserPermissions,
} from './semantic-search'

// Additional common types for the AI Help system

/**
 * User profile and identification
 */
export interface User {
  id: string
  email?: string
  name?: string
  role: UserRole
  organizationId?: string
  preferences: UserPreferences
  permissions: UserPermissions
  createdAt: Date
  lastActiveAt: Date
}

export type UserRole = 'admin' | 'user' | 'viewer' | 'support'

export interface UserPreferences {
  language: string
  theme: 'light' | 'dark' | 'system'
  helpPreferences: {
    enableProactiveHelp: boolean
    preferredHelpFormat: 'text' | 'video' | 'interactive'
    notificationLevel: 'all' | 'important' | 'none'
  }
  privacySettings: {
    allowBehaviorTracking: boolean
    allowPersonalization: boolean
    dataRetentionPeriod: number // days
  }
}

/**
 * Workflow and automation context
 */
export interface Workflow {
  id: string
  name: string
  description?: string
  type: WorkflowType
  status: WorkflowStatus
  complexity: WorkflowComplexity
  steps: WorkflowStep[]
  metadata: WorkflowMetadata
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type WorkflowType =
  | 'data_processing'
  | 'api_integration'
  | 'notification'
  | 'file_processing'
  | 'database_operation'
  | 'automation'
  | 'webhook'
  | 'scheduled_task'
  | 'conditional_logic'

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'archived'

export type WorkflowComplexity = 'simple' | 'moderate' | 'complex' | 'advanced'

export interface WorkflowStep {
  id: string
  type: BlockType
  name: string
  description?: string
  configuration: Record<string, any>
  position: { x: number; y: number }
  connections: StepConnection[]
  status: StepStatus
  executionTime?: number
  errorCount: number
  lastExecuted?: Date
}

export type BlockType =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'transform'
  | 'loop'
  | 'delay'
  | 'webhook'
  | 'database'
  | 'api_call'
  | 'notification'
  | 'file_operation'

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface StepConnection {
  sourceId: string
  targetId: string
  condition?: string
  label?: string
}

export interface WorkflowMetadata {
  tags: string[]
  category: string
  estimatedDuration?: number
  requiredPermissions: string[]
  dependencies: string[]
  version: string
}

/**
 * Help content and documentation
 */
export interface HelpArticle extends HelpContent {
  slug: string
  excerpt: string
  readingTime: number
  author: {
    id: string
    name: string
    avatar?: string
  }
  seoMetadata: {
    metaTitle?: string
    metaDescription?: string
    keywords: string[]
  }
  analytics: {
    views: number
    upvotes: number
    downvotes: number
    helpfulVotes: number
    avgRating: number
  }
}

export interface HelpVideo {
  id: string
  title: string
  description: string
  url: string
  thumbnailUrl: string
  duration: number // seconds
  transcript?: string
  chapters: VideoChapter[]
  category: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  createdAt: Date
  updatedAt: Date
}

export interface VideoChapter {
  title: string
  startTime: number // seconds
  endTime: number // seconds
  description?: string
}

export interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
  popularity: number
  lastUpdated: Date
  relatedQuestions: string[]
}

/**
 * Analytics and monitoring
 */
export interface HelpAnalytics {
  period: AnalyticsPeriod
  metrics: {
    totalRequests: number
    uniqueUsers: number
    averageResponseTime: number
    successRate: number
    popularQueries: PopularQuery[]
    userSatisfaction: SatisfactionMetrics
    contentPerformance: ContentPerformance[]
    errorAnalysis: ErrorAnalysis
  }
  generatedAt: Date
}

export type AnalyticsPeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface PopularQuery {
  query: string
  count: number
  averageResultsReturned: number
  clickThroughRate: number
}

export interface SatisfactionMetrics {
  averageRating: number
  totalRatings: number
  positivePercentage: number
  commonFeedback: FeedbackSummary[]
}

export interface FeedbackSummary {
  category: string
  sentiment: 'positive' | 'negative' | 'neutral'
  count: number
  examples: string[]
}

export interface ContentPerformance {
  contentId: string
  contentType: 'article' | 'video' | 'faq'
  views: number
  helpfulVotes: number
  averageTimeSpent: number
  exitRate: number
  conversionRate: number
}

export interface ErrorAnalysis {
  totalErrors: number
  errorsByType: Record<string, number>
  errorsByComponent: Record<string, number>
  criticalErrors: CriticalError[]
  resolutionTimes: number[]
}

export interface CriticalError {
  id: string
  type: string
  message: string
  component: string
  frequency: number
  impact: 'low' | 'medium' | 'high' | 'critical'
  firstOccurred: Date
  lastOccurred: Date
  resolved: boolean
}

/**
 * API and integration types
 */
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: APIError
  metadata?: ResponseMetadata
}

export interface APIError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: Date
  requestId: string
}

export interface ResponseMetadata {
  requestId: string
  timestamp: Date
  duration: number
  version: string
  cached: boolean
  rateLimitRemaining: number
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

/**
 * Configuration and settings
 */
export interface FeatureFlags {
  enableAIHelp: boolean
  enableSemanticSearch: boolean
  enableChatbot: boolean
  enablePredictiveHelp: boolean
  enableAnalytics: boolean
  enableRateLimiting: boolean
  enableCaching: boolean
  enableProactiveAssistance: boolean
  betaFeatures: string[]
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  components: ComponentHealth[]
  lastChecked: Date
  uptime: number
  version: string
}

export interface ComponentHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  error?: string
  dependencies?: string[]
  lastHealthy: Date
}

/**
 * Event and logging types
 */
export interface LogEntry {
  level: LogLevel
  message: string
  service: string
  operationId?: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface UserEvent {
  id: string
  type: UserEventType
  userId: string
  sessionId: string
  data: Record<string, any>
  timestamp: Date
  source: string
}

export type UserEventType =
  | 'help_request'
  | 'search_query'
  | 'chat_message'
  | 'content_view'
  | 'feedback_provided'
  | 'workflow_started'
  | 'workflow_completed'
  | 'error_encountered'
  | 'suggestion_accepted'
  | 'suggestion_dismissed'

/**
 * Utility types for better type safety
 */

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type Partial<T> = { [P in keyof T]?: T[P] }
export type Required<T> = { [P in keyof T]-?: T[P] }
export type NonNullable<T> = T extends null | undefined ? never : T

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

export type ValueOf<T> = T[keyof T]

/**
 * Generic async operation result
 */
export type AsyncResult<T, E = Error> = Promise<
  { success: true; data: T } | { success: false; error: E }
>

/**
 * Time-based types
 */
export interface TimeRange {
  start: Date
  end: Date
}

export interface Duration {
  value: number
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days'
}

/**
 * Validation and schema types
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

export interface ValidationWarning {
  field: string
  message: string
  suggestion?: string
}

/**
 * Export utility functions for type checking
 */

export function isAPIResponse<T>(obj: any): obj is APIResponse<T> {
  return typeof obj === 'object' && obj !== null && typeof obj.success === 'boolean'
}

export function isUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.role === 'string'
  )
}

export function isWorkflow(obj: any): obj is Workflow {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.steps)
  )
}

export function isHelpContent(obj: any): obj is HelpContent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.content === 'string'
  )
}

// Export all types as default for convenience
export default {
  isAPIResponse,
  isUser,
  isWorkflow,
  isHelpContent,
}
