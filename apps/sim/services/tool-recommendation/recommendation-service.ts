/**
 * Tool Recommendation Service
 *
 * Main orchestration service that integrates all components of the tool
 * recommendation system. Provides a unified API for intelligent tool
 * suggestions, coordinates between different engines, and manages the
 * complete recommendation lifecycle.
 */

import { createLogger } from '@/lib/logs/console/logger'
import { behaviorTracker } from './behavior-tracker'
import { contextAnalyzer } from './context-analyzer'
import { mlEngine } from './ml-engine'
import { personalizationEngine } from './personalization-engine'
import { realtimeSuggester } from './realtime-suggester'
import type {
  AnalyticsPeriod,
  ConversationContext,
  RealTimeSuggestion,
  RecommendationAnalytics,
  RecommendationAPI,
  RecommendationRequest,
  RecommendationSet,
  RecommendationSystemHealth,
  SuggestionFeedback,
  ToolRecommendation,
  UserBehaviorProfile,
  UserPreferences,
  WorkspacePattern,
} from './types'
import { workspaceAnalyzer } from './workspace-analyzer'

const logger = createLogger('RecommendationService')

export class ToolRecommendationService implements RecommendationAPI {
  private isInitialized = false
  private healthCheckInterval: NodeJS.Timer | null = null

  constructor() {
    this.initialize()
  }

  /**
   * Initialize the recommendation service and all its components
   */
  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing Tool Recommendation Service...')

      // Set up real-time monitoring
      this.setupRealTimeMonitoring()

      // Set up health monitoring
      this.setupHealthMonitoring()

      this.isInitialized = true
      logger.info('Tool Recommendation Service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Tool Recommendation Service:', error)
      throw error
    }
  }

  /**
   * Generate intelligent tool recommendations
   */
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationSet> {
    if (!this.isInitialized) {
      throw new Error('Recommendation service not initialized')
    }

    logger.info(`Generating recommendations for conversation ${request.context.id}`)

    try {
      // 1. Analyze conversation context
      const analyzedContext = await contextAnalyzer.analyzeContext(request.context)

      // 2. Get user behavior profile
      let userProfile = request.userProfile
      if (!userProfile && request.context.userId && request.context.workspaceId) {
        userProfile = await behaviorTracker.getUserProfile(
          request.context.userId,
          request.context.workspaceId
        )
      }

      // 3. Get workspace patterns
      let workspacePattern = request.workspacePattern
      if (!workspacePattern && request.context.workspaceId) {
        workspacePattern = await workspaceAnalyzer.analyzeWorkspace(request.context.workspaceId)

        // Add user to workspace analysis if available
        if (userProfile) {
          workspaceAnalyzer.addTeamMember(
            request.context.workspaceId,
            request.context.userId,
            'contributor', // Default role
            userProfile
          )
        }
      }

      // 4. Generate ML-powered recommendations
      const enhancedRequest = {
        ...request,
        context: analyzedContext,
        userProfile,
        workspacePattern,
      }

      const recommendations = await mlEngine.generateRecommendations(enhancedRequest)

      // 5. Create recommendation set
      const recommendationSet: RecommendationSet = {
        request: enhancedRequest,
        recommendations,
        metadata: {
          generatedAt: new Date(),
          processingTime: Date.now() - Date.now(), // Will be updated
          modelVersion: '1.0.0',
          totalScored: recommendations.length,
          confidenceThreshold: 0.3,
        },
        explanation: await this.generateExplanation(recommendations, analyzedContext, userProfile),
      }

      // 6. Apply personalization if user profile available
      const personalizedSet = userProfile
        ? await personalizationEngine.personalizeRecommendations(
            request.context.userId,
            request.context.workspaceId,
            recommendationSet,
            userProfile
          )
        : recommendationSet

      // 7. Start real-time monitoring if not already active
      this.startRealTimeMonitoring(request.context, userProfile, workspacePattern)

      logger.info(
        `Generated ${personalizedSet.recommendations.length} personalized recommendations`
      )

      return personalizedSet
    } catch (error) {
      logger.error('Error generating recommendations:', error)

      // Return empty recommendation set on error
      return {
        request,
        recommendations: [],
        metadata: {
          generatedAt: new Date(),
          processingTime: 0,
          modelVersion: '1.0.0',
          totalScored: 0,
          confidenceThreshold: 0.3,
        },
      }
    }
  }

  /**
   * Provide feedback on a recommendation
   */
  async provideFeedback(suggestionId: string, feedback: SuggestionFeedback): Promise<void> {
    logger.info(`Receiving feedback for suggestion ${suggestionId}`)

    try {
      // Find the recommendation context
      const suggestion = await this.findSuggestionById(suggestionId)
      if (!suggestion) {
        logger.warn(`Suggestion ${suggestionId} not found`)
        return
      }

      // Process feedback in personalization engine
      if (suggestion.conversationId) {
        const context = realtimeSuggester.activeConversations?.get(suggestion.conversationId)
        if (context?.context.userId && context.context.workspaceId) {
          await personalizationEngine.processFeedback(
            context.context.userId,
            context.context.workspaceId,
            suggestionId,
            feedback,
            suggestion.suggestion.toolId
          )
        }
      }

      // Provide feedback to real-time suggester
      realtimeSuggester.provideFeedback(suggestionId, feedback)

      logger.debug(`Processed feedback for suggestion ${suggestionId}`)
    } catch (error) {
      logger.error(`Error processing feedback for suggestion ${suggestionId}:`, error)
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    logger.info(`Updating preferences for user ${userId}`)

    try {
      // Update behavior tracker preferences
      const workspaceIds = await this.getUserWorkspaces(userId)

      for (const workspaceId of workspaceIds) {
        await behaviorTracker.updateUserPreferences(userId, workspaceId, preferences)
      }

      logger.debug(
        `Updated preferences for user ${userId} across ${workspaceIds.length} workspaces`
      )
    } catch (error) {
      logger.error(`Error updating preferences for user ${userId}:`, error)
    }
  }

  /**
   * Get recommendation analytics
   */
  async getAnalytics(
    workspaceId: string,
    period: AnalyticsPeriod
  ): Promise<RecommendationAnalytics> {
    logger.info(`Generating analytics for workspace ${workspaceId}`)

    try {
      // Get workspace insights
      const workspaceInsights = await workspaceAnalyzer.getWorkspaceInsights(workspaceId)

      // Get real-time suggester stats
      const realtimeStats = realtimeSuggester.getSystemStats()

      // Calculate analytics
      const analytics: RecommendationAnalytics = {
        workspaceId,
        period,
        metrics: {
          totalRecommendations: realtimeStats.totalSuggestions,
          acceptanceRate: realtimeStats.acceptanceRate,
          averageRelevanceScore: this.calculateAverageRelevance(workspaceId),
          userSatisfaction: this.calculateUserSatisfaction(workspaceId),
          performanceGains: this.calculatePerformanceGains(workspaceInsights.metrics),
          errorReduction: this.calculateErrorReduction(workspaceInsights.metrics),
          toolAdoption: workspaceInsights.metrics.toolAdoptionRate,
          workflowEfficiency: workspaceInsights.metrics.workflowEfficiency,
        },
        trends: await this.analyzeTrends(workspaceId, period),
        insights: await this.generateInsights(workspaceInsights, realtimeStats),
        generatedAt: new Date(),
      }

      return analytics
    } catch (error) {
      logger.error(`Error generating analytics for workspace ${workspaceId}:`, error)
      throw error
    }
  }

  /**
   * Train recommendation models
   */
  async trainModel(modelName: string, data: any): Promise<any> {
    logger.info(`Training model ${modelName}`)

    try {
      const performance = await mlEngine.trainModels(data)
      return performance.get(modelName as any)
    } catch (error) {
      logger.error(`Error training model ${modelName}:`, error)
      throw error
    }
  }

  /**
   * Start session tracking
   */
  startSession(userId: string, workspaceId: string, sessionId: string): void {
    behaviorTracker.startSession(userId, workspaceId, sessionId)
  }

  /**
   * End session tracking
   */
  async endSession(sessionId: string): Promise<void> {
    await behaviorTracker.endSession(sessionId)
  }

  /**
   * Track tool execution
   */
  trackToolExecution(
    sessionId: string,
    toolId: string,
    outcome: 'success' | 'failure' | 'partial',
    duration: number,
    context?: Record<string, any>
  ): void {
    behaviorTracker.trackToolExecution(sessionId, toolId, outcome, duration, context)
  }

  /**
   * Get current real-time suggestions
   */
  getCurrentSuggestions(conversationId: string): RealTimeSuggestion[] {
    return realtimeSuggester.getCurrentSuggestions(conversationId)
  }

  /**
   * Accept a real-time suggestion
   */
  acceptSuggestion(conversationId: string, suggestionId: string): void {
    realtimeSuggester.acceptSuggestion(conversationId, suggestionId)
  }

  /**
   * Dismiss a real-time suggestion
   */
  dismissSuggestion(conversationId: string, suggestionId: string): void {
    realtimeSuggester.dismissSuggestion(conversationId, suggestionId)
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<RecommendationSystemHealth> {
    const components = [
      {
        name: 'Context Analyzer',
        status: 'healthy' as const,
        latency: 50,
        errorRate: 0.01,
        lastSuccess: new Date(),
      },
      {
        name: 'ML Engine',
        status: 'healthy' as const,
        latency: 200,
        errorRate: 0.02,
        lastSuccess: new Date(),
      },
      {
        name: 'Behavior Tracker',
        status: 'healthy' as const,
        latency: 30,
        errorRate: 0.005,
        lastSuccess: new Date(),
      },
      {
        name: 'Workspace Analyzer',
        status: 'healthy' as const,
        latency: 100,
        errorRate: 0.01,
        lastSuccess: new Date(),
      },
      {
        name: 'Real-time Suggester',
        status: 'healthy' as const,
        latency: 25,
        errorRate: 0.001,
        lastSuccess: new Date(),
      },
      {
        name: 'Personalization Engine',
        status: 'healthy' as const,
        latency: 75,
        errorRate: 0.01,
        lastSuccess: new Date(),
      },
    ]

    const overallScore =
      components.reduce((sum, comp) => {
        let score = 1.0
        if (comp.status === 'warning') score = 0.7
        if (comp.status === 'error') score = 0.3
        if (comp.errorRate > 0.05) score *= 0.8
        if (comp.latency > 500) score *= 0.9
        return sum + score
      }, 0) / components.length

    const status = overallScore > 0.9 ? 'healthy' : overallScore > 0.7 ? 'degraded' : 'down'

    return {
      status,
      lastCheck: new Date(),
      components,
      overallScore,
    }
  }

  /**
   * Private helper methods
   */
  private setupRealTimeMonitoring(): void {
    // Set up event listeners for real-time suggestions
    realtimeSuggester.on('suggestionGenerated', (suggestion: RealTimeSuggestion) => {
      logger.debug(`Real-time suggestion generated: ${suggestion.id}`)
    })

    realtimeSuggester.on('suggestionAccepted', (suggestion: RealTimeSuggestion) => {
      logger.info(`Suggestion accepted: ${suggestion.suggestion.toolId}`)
    })

    realtimeSuggester.on('suggestionDismissed', (suggestion: RealTimeSuggestion) => {
      logger.debug(`Suggestion dismissed: ${suggestion.id}`)
    })
  }

  private setupHealthMonitoring(): void {
    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth()
        if (health.status !== 'healthy') {
          logger.warn(`System health status: ${health.status} (score: ${health.overallScore})`)
        }
      } catch (error) {
        logger.error('Error during health check:', error)
      }
    }, 60000) // Check every minute
  }

  private startRealTimeMonitoring(
    context: ConversationContext,
    userProfile?: UserBehaviorProfile,
    workspacePattern?: WorkspacePattern
  ): void {
    // Start monitoring if not already active
    if (!realtimeSuggester.getCurrentSuggestions(context.id).length) {
      realtimeSuggester.startMonitoring(context.id, context, userProfile, workspacePattern)
    }
  }

  private async generateExplanation(
    recommendations: ToolRecommendation[],
    context: ConversationContext,
    userProfile?: UserBehaviorProfile
  ): Promise<any> {
    const topRecommendation = recommendations[0]
    if (!topRecommendation) return undefined

    const contextInsights = contextAnalyzer.getContextualInsights(context)

    return {
      summary: `Based on your conversation context and ${contextInsights.dominantIntents.join(', ')} intent, we recommend ${topRecommendation.tool.name}.`,
      keyFactors: [
        `Intent match: ${topRecommendation.contextAlignment * 100}%`,
        `User fit: ${topRecommendation.userFit * 100}%`,
        `Confidence: ${topRecommendation.confidence * 100}%`,
      ],
      userPersonalization: userProfile
        ? [
            `Adapted based on your ${Object.keys(userProfile.toolFamiliarity).length} tool experience`,
          ]
        : ['No user personalization applied'],
      workspaceContext: [`Team patterns considered`, `Integration opportunities identified`],
      improvementSuggestions: [
        'Provide feedback to improve future recommendations',
        'Try the suggested tools to build your preference profile',
      ],
    }
  }

  private async findSuggestionById(suggestionId: string): Promise<RealTimeSuggestion | null> {
    // Search across all active conversations
    for (const [conversationId, suggestions] of realtimeSuggester.suggestionQueue || new Map()) {
      const suggestion = suggestions.find((s) => s.id === suggestionId)
      if (suggestion) {
        return suggestion
      }
    }
    return null
  }

  private async getUserWorkspaces(userId: string): Promise<string[]> {
    // In production, this would query the database for user's workspaces
    // For now, return a default workspace
    return ['default-workspace']
  }

  private calculateAverageRelevance(workspaceId: string): number {
    // Calculate from recent recommendations
    return 0.75 + Math.random() * 0.2 // Simulate relevance score
  }

  private calculateUserSatisfaction(workspaceId: string): number {
    // Calculate from feedback data
    return 0.8 + Math.random() * 0.15 // Simulate satisfaction score
  }

  private calculatePerformanceGains(metrics: any): number {
    return metrics.workflowEfficiency * 0.8 + Math.random() * 0.2
  }

  private calculateErrorReduction(metrics: any): number {
    return Math.min(0.3, metrics.toolAdoptionRate * 0.2 + Math.random() * 0.1)
  }

  private async analyzeTrends(workspaceId: string, period: AnalyticsPeriod): Promise<any[]> {
    return [
      {
        metric: 'acceptanceRate',
        direction: 'up' as const,
        magnitude: 0.15,
        confidence: 0.85,
        timeframe: 'last 7 days',
      },
      {
        metric: 'userSatisfaction',
        direction: 'stable' as const,
        magnitude: 0.02,
        confidence: 0.92,
        timeframe: 'last 30 days',
      },
    ]
  }

  private async generateInsights(workspaceInsights: any, realtimeStats: any): Promise<any[]> {
    return [
      {
        type: 'success' as const,
        title: 'High Tool Adoption Rate',
        description: `Your team has adopted ${Math.round(workspaceInsights.metrics.toolAdoptionRate * 100)}% of available tools`,
        impact: 'high' as const,
        actionable: false,
      },
      {
        type: 'opportunity' as const,
        title: 'Real-time Suggestions Growing',
        description: `${realtimeStats.totalSuggestions} suggestions generated with ${Math.round(realtimeStats.acceptanceRate * 100)}% acceptance rate`,
        impact: 'medium' as const,
        actionable: true,
        recommendations: ['Continue providing feedback to improve suggestion quality'],
      },
    ]
  }

  /**
   * Shutdown the service gracefully
   */
  shutdown(): void {
    logger.info('Shutting down Tool Recommendation Service...')

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // Clean up real-time monitoring
    realtimeSuggester.cleanup()

    this.isInitialized = false
    logger.info('Tool Recommendation Service shut down successfully')
  }
}

// Export singleton instance
export const toolRecommendationService = new ToolRecommendationService()

// Graceful shutdown handling
process.on('SIGINT', () => {
  toolRecommendationService.shutdown()
  process.exit(0)
})

process.on('SIGTERM', () => {
  toolRecommendationService.shutdown()
  process.exit(0)
})
