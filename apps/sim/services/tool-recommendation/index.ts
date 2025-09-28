/**
 * Tool Recommendation System - Main Export
 *
 * Comprehensive tool recommendation system for the Universal Tool Adapter.
 * Provides intelligent, context-aware, personalized tool suggestions using
 * machine learning, behavioral analysis, and real-time monitoring.
 *
 * @author Claude Code Agent - Tool Recommendation Team
 * @version 1.0.0
 */

export { BehaviorTracker, behaviorTracker } from './behavior-tracker'
// Core engines
export { ContextAnalyzer, contextAnalyzer } from './context-analyzer'
export { MLRecommendationEngine, mlEngine } from './ml-engine'
export { PersonalizationEngine, personalizationEngine } from './personalization-engine'
export { RealtimeSuggester, realtimeSuggester } from './realtime-suggester'
// Main service
export { ToolRecommendationService, toolRecommendationService } from './recommendation-service'
// Type definitions
export type {
  AnalyticsInsight,
  AnalyticsPeriod,
  AnalyticsTrend,
  CollaborationStyle,
  ComponentHealth,
  ContextMessage,
  // Core types
  ConversationContext,
  EntityType,
  ExtractedEntity,
  FeatureVector,
  IntegrationPattern,
  // Context analysis types
  IntentClassification,
  LearningEvent,
  LearningEventType,
  // ML types
  MLModelConfig,
  MLModelType,
  ModelPerformance,
  PersonalizationAction,
  // Personalization types
  PersonalizationConfig,
  PersonalizationRule,
  PrivacySettings,
  // Real-time suggestion types
  RealTimeSuggestion,
  // Analytics types
  RecommendationAnalytics,
  // API types
  RecommendationAPI,
  // Error types
  RecommendationError,
  RecommendationMetrics,
  RecommendationRequest,
  RecommendationSet,
  RecommendationSystemHealth,
  SeasonalityPattern,
  SentimentAnalysis,
  SuggestionFeedback,
  SuggestionTrigger,
  TaskType,
  ToolFamiliarityScore,
  ToolRecommendation,
  ToolSequence,
  ToolSuccessRate,
  TrainingData,
  TriggerType,
  UsagePattern,
  UserBehaviorProfile,
  // User behavior types
  UserPreferences,
  // Workspace analysis types
  WorkflowPattern,
  WorkspacePattern,
  WorkspaceToolStats,
} from './types'
export { WorkspaceAnalyzer, workspaceAnalyzer } from './workspace-analyzer'

/**
 * Quick start helper for basic recommendation usage
 */
export const createRecommendation = async (
  conversationContext: any,
  options: {
    userId?: string
    workspaceId?: string
    maxSuggestions?: number
    includeRealTime?: boolean
  } = {}
): Promise<any> => {
  const { toolRecommendationService } = await import('./recommendation-service')

  const request = {
    context: conversationContext,
    maxSuggestions: options.maxSuggestions || 5,
    explainReasons: true,
  }

  const recommendations = await toolRecommendationService.getRecommendations(request)

  // Start real-time monitoring if requested
  if (options.includeRealTime && options.userId && options.workspaceId) {
    const { realtimeSuggester } = await import('./realtime-suggester')
    realtimeSuggester.startMonitoring(conversationContext.id, conversationContext)
  }

  return recommendations
}

/**
 * Configuration helper for system setup
 */
export const configureRecommendationSystem = (config: {
  adaptationRate?: number
  explorationRate?: number
  feedbackSensitivity?: number
  privacyMode?: 'strict' | 'moderate' | 'open'
  enableRealTime?: boolean
  enablePersonalization?: boolean
}) => {
  // This would configure the system-wide settings
  // In a production environment, this might update a configuration store
  console.log('Recommendation system configured with:', config)
}

/**
 * System information and version
 */
export const SYSTEM_INFO = {
  Name: 'Tool Recommendation System',
  version: '1.0.0',
  description: 'Intelligent tool recommendation engine for Universal Tool Adapter',
  features: [
    'Context-aware recommendations',
    'Machine learning powered suggestions',
    'Real-time suggestion monitoring',
    'Personalized user experiences',
    'Workspace pattern analysis',
    'Behavioral learning and adaptation',
    'Privacy-compliant analytics',
    'Enterprise-grade health monitoring',
  ],
  components: {
    contextAnalyzer: 'Natural language processing and intent recognition',
    mlEngine: 'Machine learning recommendation algorithms',
    behaviorTracker: 'User behavior analysis and pattern recognition',
    workspaceAnalyzer: 'Team collaboration and workflow analysis',
    realtimeSuggester: 'Real-time suggestion monitoring and triggers',
    personalizationEngine: 'Individual preference learning and adaptation',
  },
  metrics: {
    supportedTools: '60+',
    intentTypes: '10+',
    entityTypes: '15+',
    triggerTypes: '6',
    adaptationRules: '10+',
    analyticsMetrics: '8',
  },
} as const

/**
 * Health check utility
 */
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'degraded' | 'down'
  components: string[]
  timestamp: Date
}> => {
  try {
    const { toolRecommendationService } = await import('./recommendation-service')
    const health = await toolRecommendationService.getSystemHealth()

    return {
      status: health.status,
      components: health.components.map((c) => `${c.Name}: ${c.status}`),
      timestamp: health.lastCheck,
    }
  } catch (error) {
    return {
      status: 'down',
      components: ['System unavailable'],
      timestamp: new Date(),
    }
  }
}

/**
 * Development utilities
 */
export const devUtils = {
  /**
   * Generate sample conversation context for testing
   */
  createSampleContext: (
    options: { userId?: string; workspaceId?: string; messages?: any[] } = {}
  ) => ({
    id: `conv-${Date.now()}`,
    agentId: 'test-agent',
    workspaceId: options.workspaceId || 'test-workspace',
    userId: options.userId || 'test-user',
    sessionId: `session-${Date.now()}`,
    messages: options.messages || [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: 'I need to analyze some data from our database',
        timestamp: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  /**
   * Generate sample user profile for testing
   */
  createSampleUserProfile: (userId: string, workspaceId: string) => ({
    userId,
    workspaceId,
    preferences: {
      preferredCategories: ['database', 'analytics'],
      toolComplexityTolerance: 'intermediate' as const,
      communicationStyle: 'technical' as const,
      feedbackFrequency: 'medium' as const,
      privacyLevel: 'moderate' as const,
      learningStyle: 'exploratory' as const,
    },
    patterns: [],
    toolFamiliarity: {
      postgresql_query: {
        toolId: 'postgresql_query',
        score: 0.8,
        usageCount: 25,
        lastUsed: new Date(),
        errorRate: 0.1,
        helpRequests: 2,
      },
      google_sheets_read: {
        toolId: 'google_sheets_read',
        score: 0.6,
        usageCount: 15,
        lastUsed: new Date(),
        errorRate: 0.2,
        helpRequests: 5,
      },
    },
    successRates: {},
    collaborationStyle: {
      prefersIndependentWork: false,
      sharesWorkflows: true,
      askForHelp: 'sometimes' as const,
      mentorsOthers: false,
      teamRole: 'contributor' as const,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
}

// Default export
export default {
  service: toolRecommendationService,
  createRecommendation,
  configureRecommendationSystem,
  healthCheck,
  SYSTEM_INFO,
  devUtils,
}
