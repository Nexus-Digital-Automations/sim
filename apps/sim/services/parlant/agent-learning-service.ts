/**
 * Agent Learning Service for Parlant Integration
 * ==============================================
 *
 * This service enables agents to learn from user interactions, feedback,
 * and conversation patterns to improve their performance and knowledge
 * retrieval capabilities over time.
 *
 * Features:
 * - Conversation analysis and pattern recognition
 * - User feedback collection and processing
 * - Knowledge base relevance optimization
 * - Agent behavior adaptation
 * - Performance metrics tracking
 * - Continuous learning pipeline
 * - A/B testing for improvements
 */

import type { AuthContext } from './types'
import type { RAGContext } from './knowledge-integration'
import { createLogger } from '@/lib/logs/console/logger'
import { errorHandler } from './error-handler'
import { knowledgeIntegrationService } from './knowledge-integration'

const logger = createLogger('ParlantAgentLearning')

export interface UserInteraction {
  sessionId: string
  agentId: string
  timestamp: Date
  interaction: {
    userQuery: string
    agentResponse: string
    ragContext?: RAGContext
    toolsUsed?: string[]
    responseTime: number
    conversationTurn: number
  }
  feedback?: {
    rating: 1 | 2 | 3 | 4 | 5
    type: 'helpful' | 'partially_helpful' | 'not_helpful' | 'incorrect' | 'excellent'
    specificFeedback?: string
    categories?: Array<'accuracy' | 'relevance' | 'completeness' | 'clarity' | 'speed'>
  }
  context: {
    workspaceId: string
    userId: string
    taskCategory?: string
    userExperience?: 'beginner' | 'intermediate' | 'expert'
  }
}

export interface LearningInsight {
  type: 'knowledge_gap' | 'retrieval_optimization' | 'response_improvement' | 'user_pattern'
  confidence: number
  description: string
  evidence: {
    interactionCount: number
    feedbackPatterns: Record<string, number>
    commonQueries: string[]
    failurePatterns?: string[]
  }
  recommendations: Array<{
    action: string
    priority: 'low' | 'medium' | 'high'
    effort: 'minimal' | 'moderate' | 'significant'
    expectedImpact: number
  }>
  affectedAgents: string[]
  createdAt: Date
}

export interface LearningMetrics {
  agentId: string
  period: {
    start: Date
    end: Date
  }
  metrics: {
    totalInteractions: number
    averageRating: number
    responseTimeP95: number
    knowledgeHitRate: number
    userSatisfaction: number
    improvementTrend: number
  }
  breakdowns: {
    byFeedbackType: Record<string, number>
    byTaskCategory: Record<string, { interactions: number; avgRating: number }>
    byUserExperience: Record<string, { interactions: number; avgRating: number }>
  }
  learningProgress: {
    knowledgeGapsIdentified: number
    knowledgeGapsResolved: number
    optimizationsImplemented: number
    performanceGains: Record<string, number>
  }
}

export interface KnowledgeOptimization {
  knowledgeBaseId: string
  optimizationType: 'chunk_relevance' | 'search_ranking' | 'content_enhancement' | 'metadata_enrichment'
  description: string
  metrics: {
    queriesAffected: number
    relevanceImprovement: number
    userSatisfactionDelta: number
  }
  implementation: {
    status: 'planned' | 'testing' | 'deployed' | 'validated'
    deployedAt?: Date
    validationResults?: {
      beforeMetrics: Record<string, number>
      afterMetrics: Record<string, number>
      significance: number
    }
  }
}

/**
 * Agent Learning Service
 * Enables continuous learning and improvement from user interactions
 */
export class AgentLearningService {
  private interactionBuffer: UserInteraction[] = []
  private readonly BUFFER_SIZE = 1000
  private readonly ANALYSIS_INTERVAL = 60000 // 1 minute

  constructor() {
    // Start periodic analysis
    this.startPeriodicAnalysis()
  }

  /**
   * Record a user interaction for learning
   */
  async recordInteraction(interaction: UserInteraction): Promise<{
    recorded: boolean
    learningId: string
    immediateInsights?: string[]
  }> {
    try {
      const learningId = `learning_${interaction.sessionId}_${Date.now()}`

      logger.info('Recording user interaction', {
        learningId,
        agentId: interaction.agentId,
        sessionId: interaction.sessionId,
        hasFeedback: !!interaction.feedback,
        responseTime: interaction.interaction.responseTime,
        ragContextPresent: !!interaction.interaction.ragContext
      })

      // Add to buffer for batch processing
      this.interactionBuffer.push(interaction)

      // Trim buffer if needed
      if (this.interactionBuffer.length > this.BUFFER_SIZE) {
        this.interactionBuffer = this.interactionBuffer.slice(-this.BUFFER_SIZE)
      }

      // Detect immediate patterns or issues
      const immediateInsights = this.detectImmediateInsights(interaction)

      // Store interaction for long-term analysis
      await this.persistInteraction(interaction, learningId)

      logger.info('User interaction recorded', {
        learningId,
        immediateInsightsCount: immediateInsights.length
      })

      return {
        recorded: true,
        learningId,
        immediateInsights
      }
    } catch (error) {
      logger.error('Failed to record user interaction', { error, interaction })
      throw errorHandler.handleError(error, 'record_interaction')
    }
  }

  /**
   * Analyze interactions and generate learning insights
   */
  async generateLearningInsights(
    agentId: string,
    timeRange: { start: Date; end: Date },
    auth: AuthContext
  ): Promise<LearningInsight[]> {
    try {
      logger.info('Generating learning insights', {
        agentId,
        timeRange,
        userId: auth.user_id
      })

      // Fetch interactions for analysis
      const interactions = await this.getInteractionsForAgent(agentId, timeRange)

      if (interactions.length === 0) {
        return []
      }

      const insights: LearningInsight[] = []

      // Analyze knowledge gaps
      const knowledgeGapInsights = this.analyzeKnowledgeGaps(interactions)
      insights.push(...knowledgeGapInsights)

      // Analyze retrieval patterns
      const retrievalInsights = this.analyzeRetrievalPatterns(interactions)
      insights.push(...retrievalInsights)

      // Analyze response quality patterns
      const responseInsights = this.analyzeResponsePatterns(interactions)
      insights.push(...responseInsights)

      // Analyze user behavior patterns
      const userPatternInsights = this.analyzeUserPatterns(interactions)
      insights.push(...userPatternInsights)

      // Sort by confidence and impact
      insights.sort((a, b) => b.confidence - a.confidence)

      logger.info('Learning insights generated', {
        agentId,
        totalInsights: insights.length,
        highConfidenceInsights: insights.filter(i => i.confidence > 0.8).length
      })

      return insights
    } catch (error) {
      logger.error('Failed to generate learning insights', { error, agentId })
      throw errorHandler.handleError(error, 'generate_learning_insights')
    }
  }

  /**
   * Get learning metrics for an agent
   */
  async getLearningMetrics(
    agentId: string,
    period: { start: Date; end: Date },
    auth: AuthContext
  ): Promise<LearningMetrics> {
    try {
      logger.info('Calculating learning metrics', { agentId, period })

      const interactions = await this.getInteractionsForAgent(agentId, period)

      const metrics: LearningMetrics = {
        agentId,
        period,
        metrics: {
          totalInteractions: interactions.length,
          averageRating: this.calculateAverageRating(interactions),
          responseTimeP95: this.calculateResponseTimeP95(interactions),
          knowledgeHitRate: this.calculateKnowledgeHitRate(interactions),
          userSatisfaction: this.calculateUserSatisfaction(interactions),
          improvementTrend: this.calculateImprovementTrend(interactions)
        },
        breakdowns: {
          byFeedbackType: this.breakdownByFeedbackType(interactions),
          byTaskCategory: this.breakdownByTaskCategory(interactions),
          byUserExperience: this.breakdownByUserExperience(interactions)
        },
        learningProgress: {
          knowledgeGapsIdentified: await this.getKnowledgeGapsIdentified(agentId, period),
          knowledgeGapsResolved: await this.getKnowledgeGapsResolved(agentId, period),
          optimizationsImplemented: await this.getOptimizationsImplemented(agentId, period),
          performanceGains: await this.getPerformanceGains(agentId, period)
        }
      }

      logger.info('Learning metrics calculated', {
        agentId,
        totalInteractions: metrics.metrics.totalInteractions,
        averageRating: metrics.metrics.averageRating,
        userSatisfaction: metrics.metrics.userSatisfaction
      })

      return metrics
    } catch (error) {
      logger.error('Failed to calculate learning metrics', { error, agentId })
      throw errorHandler.handleError(error, 'get_learning_metrics')
    }
  }

  /**
   * Optimize knowledge base based on learning insights
   */
  async optimizeKnowledgeBase(
    knowledgeBaseId: string,
    insights: LearningInsight[],
    auth: AuthContext
  ): Promise<KnowledgeOptimization[]> {
    try {
      logger.info('Optimizing knowledge base', {
        knowledgeBaseId,
        insightsCount: insights.length
      })

      const optimizations: KnowledgeOptimization[] = []

      for (const insight of insights) {
        if (insight.type === 'knowledge_gap') {
          const optimization = await this.createKnowledgeGapOptimization(
            knowledgeBaseId,
            insight,
            auth
          )
          optimizations.push(optimization)
        } else if (insight.type === 'retrieval_optimization') {
          const optimization = await this.createRetrievalOptimization(
            knowledgeBaseId,
            insight,
            auth
          )
          optimizations.push(optimization)
        }
      }

      logger.info('Knowledge base optimizations created', {
        knowledgeBaseId,
        optimizationCount: optimizations.length
      })

      return optimizations
    } catch (error) {
      logger.error('Failed to optimize knowledge base', { error, knowledgeBaseId })
      throw errorHandler.handleError(error, 'optimize_knowledge_base')
    }
  }

  /**
   * Start periodic analysis of interactions
   */
  private startPeriodicAnalysis(): void {
    setInterval(async () => {
      try {
        if (this.interactionBuffer.length > 10) {
          await this.performBatchAnalysis(this.interactionBuffer.slice())
        }
      } catch (error) {
        logger.error('Periodic analysis failed', { error })
      }
    }, this.ANALYSIS_INTERVAL)
  }

  /**
   * Detect immediate insights from single interaction
   */
  private detectImmediateInsights(interaction: UserInteraction): string[] {
    const insights: string[] = []

    // Check for poor response time
    if (interaction.interaction.responseTime > 10000) {
      insights.push('Slow response time detected - consider optimization')
    }

    // Check for low relevance in RAG context
    if (interaction.interaction.ragContext && interaction.interaction.ragContext.retrievalScore < 0.5) {
      insights.push('Low knowledge retrieval relevance - review knowledge base content')
    }

    // Check for negative feedback patterns
    if (interaction.feedback?.type === 'not_helpful' || interaction.feedback?.rating <= 2) {
      insights.push('Negative user feedback - investigate response quality')
    }

    return insights
  }

  /**
   * Persist interaction for long-term storage
   */
  private async persistInteraction(interaction: UserInteraction, learningId: string): Promise<void> {
    // In production, this would save to a database
    logger.debug('Persisting interaction', { learningId, agentId: interaction.agentId })
  }

  /**
   * Get interactions for an agent within time range
   */
  private async getInteractionsForAgent(
    agentId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<UserInteraction[]> {
    // In production, this would query the database
    // For now, filter from buffer (limited dataset)
    return this.interactionBuffer.filter(
      interaction =>
        interaction.agentId === agentId &&
        interaction.timestamp >= timeRange.start &&
        interaction.timestamp <= timeRange.end
    )
  }

  /**
   * Analyze knowledge gaps from interactions
   */
  private analyzeKnowledgeGaps(interactions: UserInteraction[]): LearningInsight[] {
    const insights: LearningInsight[] = []

    // Find interactions with poor RAG performance
    const poorRetrievals = interactions.filter(
      i => i.interaction.ragContext && i.interaction.ragContext.retrievalScore < 0.6
    )

    if (poorRetrievals.length > interactions.length * 0.2) {
      const commonQueries = this.extractCommonQueries(poorRetrievals)

      insights.push({
        type: 'knowledge_gap',
        confidence: 0.8,
        description: 'Significant knowledge gaps detected in retrieval system',
        evidence: {
          interactionCount: poorRetrievals.length,
          feedbackPatterns: this.analyzeFeedbackPatterns(poorRetrievals),
          commonQueries,
          failurePatterns: commonQueries.slice(0, 5)
        },
        recommendations: [
          {
            action: 'Add more relevant documents to knowledge base',
            priority: 'high',
            effort: 'moderate',
            expectedImpact: 0.7
          },
          {
            action: 'Improve chunk segmentation strategy',
            priority: 'medium',
            effort: 'moderate',
            expectedImpact: 0.4
          }
        ],
        affectedAgents: [interactions[0]?.agentId].filter(Boolean),
        createdAt: new Date()
      })
    }

    return insights
  }

  /**
   * Analyze retrieval patterns
   */
  private analyzeRetrievalPatterns(interactions: UserInteraction[]): LearningInsight[] {
    const insights: LearningInsight[] = []

    const ragInteractions = interactions.filter(i => i.interaction.ragContext)
    if (ragInteractions.length === 0) return insights

    const avgRetrievalScore = ragInteractions.reduce(
      (sum, i) => sum + (i.interaction.ragContext?.retrievalScore || 0),
      0
    ) / ragInteractions.length

    if (avgRetrievalScore < 0.7) {
      insights.push({
        type: 'retrieval_optimization',
        confidence: 0.7,
        description: 'Retrieval relevance scores below optimal threshold',
        evidence: {
          interactionCount: ragInteractions.length,
          feedbackPatterns: this.analyzeFeedbackPatterns(ragInteractions),
          commonQueries: this.extractCommonQueries(ragInteractions)
        },
        recommendations: [
          {
            action: 'Optimize embedding model or search parameters',
            priority: 'medium',
            effort: 'moderate',
            expectedImpact: 0.5
          },
          {
            action: 'Review and enhance document metadata',
            priority: 'medium',
            effort: 'minimal',
            expectedImpact: 0.3
          }
        ],
        affectedAgents: [interactions[0]?.agentId].filter(Boolean),
        createdAt: new Date()
      })
    }

    return insights
  }

  /**
   * Analyze response quality patterns
   */
  private analyzeResponsePatterns(interactions: UserInteraction[]): LearningInsight[] {
    const insights: LearningInsight[] = []

    const ratedInteractions = interactions.filter(i => i.feedback?.rating)
    if (ratedInteractions.length < 10) return insights

    const avgRating = ratedInteractions.reduce(
      (sum, i) => sum + (i.feedback?.rating || 0),
      0
    ) / ratedInteractions.length

    if (avgRating < 3.5) {
      insights.push({
        type: 'response_improvement',
        confidence: 0.6,
        description: 'Response quality below user expectations',
        evidence: {
          interactionCount: ratedInteractions.length,
          feedbackPatterns: this.analyzeFeedbackPatterns(ratedInteractions),
          commonQueries: this.extractCommonQueries(ratedInteractions)
        },
        recommendations: [
          {
            action: 'Review and improve agent prompts',
            priority: 'high',
            effort: 'minimal',
            expectedImpact: 0.6
          },
          {
            action: 'Enhance response templates and formatting',
            priority: 'medium',
            effort: 'minimal',
            expectedImpact: 0.4
          }
        ],
        affectedAgents: [interactions[0]?.agentId].filter(Boolean),
        createdAt: new Date()
      })
    }

    return insights
  }

  /**
   * Analyze user behavior patterns
   */
  private analyzeUserPatterns(interactions: UserInteraction[]): LearningInsight[] {
    const insights: LearningInsight[] = []

    // Analyze query patterns
    const queryPatterns = this.analyzeQueryPatterns(interactions)

    if (queryPatterns.repeatedQueries.length > 0) {
      insights.push({
        type: 'user_pattern',
        confidence: 0.5,
        description: 'Users frequently ask similar questions',
        evidence: {
          interactionCount: interactions.length,
          feedbackPatterns: {},
          commonQueries: queryPatterns.repeatedQueries
        },
        recommendations: [
          {
            action: 'Create FAQ or quick answers for common queries',
            priority: 'medium',
            effort: 'minimal',
            expectedImpact: 0.5
          }
        ],
        affectedAgents: [...new Set(interactions.map(i => i.agentId))],
        createdAt: new Date()
      })
    }

    return insights
  }

  /**
   * Perform batch analysis on interaction buffer
   */
  private async performBatchAnalysis(interactions: UserInteraction[]): Promise<void> {
    logger.info('Performing batch analysis', { interactionCount: interactions.length })

    // Aggregate metrics
    const agentMetrics = new Map<string, any>()

    for (const interaction of interactions) {
      if (!agentMetrics.has(interaction.agentId)) {
        agentMetrics.set(interaction.agentId, {
          interactions: [],
          totalRating: 0,
          ratingCount: 0,
          responseTimeSum: 0
        })
      }

      const metrics = agentMetrics.get(interaction.agentId)!
      metrics.interactions.push(interaction)

      if (interaction.feedback?.rating) {
        metrics.totalRating += interaction.feedback.rating
        metrics.ratingCount++
      }

      metrics.responseTimeSum += interaction.interaction.responseTime
    }

    // Update agent performance metrics
    for (const [agentId, metrics] of agentMetrics) {
      logger.debug('Updating agent metrics', {
        agentId,
        interactionCount: metrics.interactions.length,
        avgRating: metrics.ratingCount > 0 ? metrics.totalRating / metrics.ratingCount : null
      })
    }
  }

  // Utility methods for analysis
  private extractCommonQueries(interactions: UserInteraction[]): string[] {
    const queryFreq = new Map<string, number>()

    interactions.forEach(i => {
      const normalizedQuery = i.interaction.userQuery.toLowerCase().trim()
      queryFreq.set(normalizedQuery, (queryFreq.get(normalizedQuery) || 0) + 1)
    })

    return Array.from(queryFreq.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query]) => query)
  }

  private analyzeFeedbackPatterns(interactions: UserInteraction[]): Record<string, number> {
    const patterns: Record<string, number> = {}

    interactions.forEach(i => {
      if (i.feedback?.type) {
        patterns[i.feedback.type] = (patterns[i.feedback.type] || 0) + 1
      }
    })

    return patterns
  }

  private analyzeQueryPatterns(interactions: UserInteraction[]): {
    repeatedQueries: string[]
    queryTypes: Record<string, number>
  } {
    const queryFreq = new Map<string, number>()

    interactions.forEach(i => {
      const query = i.interaction.userQuery.toLowerCase()
      queryFreq.set(query, (queryFreq.get(query) || 0) + 1)
    })

    const repeatedQueries = Array.from(queryFreq.entries())
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([query]) => query)

    return {
      repeatedQueries,
      queryTypes: {}
    }
  }

  // Metric calculation methods
  private calculateAverageRating(interactions: UserInteraction[]): number {
    const rated = interactions.filter(i => i.feedback?.rating)
    if (rated.length === 0) return 0

    return rated.reduce((sum, i) => sum + (i.feedback?.rating || 0), 0) / rated.length
  }

  private calculateResponseTimeP95(interactions: UserInteraction[]): number {
    const times = interactions
      .map(i => i.interaction.responseTime)
      .sort((a, b) => a - b)

    const p95Index = Math.floor(times.length * 0.95)
    return times[p95Index] || 0
  }

  private calculateKnowledgeHitRate(interactions: UserInteraction[]): number {
    const ragInteractions = interactions.filter(i => i.interaction.ragContext)
    if (ragInteractions.length === 0) return 0

    const hits = ragInteractions.filter(
      i => (i.interaction.ragContext?.retrievalScore || 0) > 0.7
    )

    return hits.length / ragInteractions.length
  }

  private calculateUserSatisfaction(interactions: UserInteraction[]): number {
    const feedbackInteractions = interactions.filter(i => i.feedback)
    if (feedbackInteractions.length === 0) return 0

    const positiveCount = feedbackInteractions.filter(
      i => ['helpful', 'excellent'].includes(i.feedback?.type || '')
    ).length

    return positiveCount / feedbackInteractions.length
  }

  private calculateImprovementTrend(interactions: UserInteraction[]): number {
    // Simple trend calculation based on ratings over time
    const ratedInteractions = interactions
      .filter(i => i.feedback?.rating)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    if (ratedInteractions.length < 10) return 0

    const halfPoint = Math.floor(ratedInteractions.length / 2)
    const firstHalf = ratedInteractions.slice(0, halfPoint)
    const secondHalf = ratedInteractions.slice(halfPoint)

    const firstAvg = firstHalf.reduce((sum, i) => sum + (i.feedback?.rating || 0), 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, i) => sum + (i.feedback?.rating || 0), 0) / secondHalf.length

    return secondAvg - firstAvg
  }

  private breakdownByFeedbackType(interactions: UserInteraction[]): Record<string, number> {
    const breakdown: Record<string, number> = {}

    interactions.forEach(i => {
      if (i.feedback?.type) {
        breakdown[i.feedback.type] = (breakdown[i.feedback.type] || 0) + 1
      }
    })

    return breakdown
  }

  private breakdownByTaskCategory(interactions: UserInteraction[]): Record<string, { interactions: number; avgRating: number }> {
    const breakdown: Record<string, { interactions: number; totalRating: number; ratingCount: number }> = {}

    interactions.forEach(i => {
      const category = i.context.taskCategory || 'unknown'
      if (!breakdown[category]) {
        breakdown[category] = { interactions: 0, totalRating: 0, ratingCount: 0 }
      }

      breakdown[category].interactions++

      if (i.feedback?.rating) {
        breakdown[category].totalRating += i.feedback.rating
        breakdown[category].ratingCount++
      }
    })

    const result: Record<string, { interactions: number; avgRating: number }> = {}
    for (const [category, stats] of Object.entries(breakdown)) {
      result[category] = {
        interactions: stats.interactions,
        avgRating: stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0
      }
    }

    return result
  }

  private breakdownByUserExperience(interactions: UserInteraction[]): Record<string, { interactions: number; avgRating: number }> {
    const breakdown: Record<string, { interactions: number; totalRating: number; ratingCount: number }> = {}

    interactions.forEach(i => {
      const experience = i.context.userExperience || 'unknown'
      if (!breakdown[experience]) {
        breakdown[experience] = { interactions: 0, totalRating: 0, ratingCount: 0 }
      }

      breakdown[experience].interactions++

      if (i.feedback?.rating) {
        breakdown[experience].totalRating += i.feedback.rating
        breakdown[experience].ratingCount++
      }
    })

    const result: Record<string, { interactions: number; avgRating: number }> = {}
    for (const [experience, stats] of Object.entries(breakdown)) {
      result[experience] = {
        interactions: stats.interactions,
        avgRating: stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0
      }
    }

    return result
  }

  // Placeholder methods for learning progress metrics
  private async getKnowledgeGapsIdentified(agentId: string, period: { start: Date; end: Date }): Promise<number> {
    return 0
  }

  private async getKnowledgeGapsResolved(agentId: string, period: { start: Date; end: Date }): Promise<number> {
    return 0
  }

  private async getOptimizationsImplemented(agentId: string, period: { start: Date; end: Date }): Promise<number> {
    return 0
  }

  private async getPerformanceGains(agentId: string, period: { start: Date; end: Date }): Promise<Record<string, number>> {
    return {}
  }

  private async createKnowledgeGapOptimization(
    knowledgeBaseId: string,
    insight: LearningInsight,
    auth: AuthContext
  ): Promise<KnowledgeOptimization> {
    return {
      knowledgeBaseId,
      optimizationType: 'content_enhancement',
      description: insight.description,
      metrics: {
        queriesAffected: insight.evidence.interactionCount,
        relevanceImprovement: 0,
        userSatisfactionDelta: 0
      },
      implementation: {
        status: 'planned'
      }
    }
  }

  private async createRetrievalOptimization(
    knowledgeBaseId: string,
    insight: LearningInsight,
    auth: AuthContext
  ): Promise<KnowledgeOptimization> {
    return {
      knowledgeBaseId,
      optimizationType: 'search_ranking',
      description: insight.description,
      metrics: {
        queriesAffected: insight.evidence.interactionCount,
        relevanceImprovement: 0,
        userSatisfactionDelta: 0
      },
      implementation: {
        status: 'planned'
      }
    }
  }
}

/**
 * Singleton instance of the Agent Learning Service
 */
export const agentLearningService = new AgentLearningService()

/**
 * Utility functions for learning and analysis
 */
export const learningUtils = {
  /**
   * Create user interaction record
   */
  createInteraction(
    sessionId: string,
    agentId: string,
    userQuery: string,
    agentResponse: string,
    context: UserInteraction['context'],
    ragContext?: RAGContext,
    feedback?: UserInteraction['feedback']
  ): UserInteraction {
    return {
      sessionId,
      agentId,
      timestamp: new Date(),
      interaction: {
        userQuery,
        agentResponse,
        ragContext,
        toolsUsed: [],
        responseTime: 0,
        conversationTurn: 1
      },
      feedback,
      context
    }
  },

  /**
   * Validate learning insight quality
   */
  validateInsight(insight: LearningInsight): boolean {
    return (
      insight.confidence > 0.3 &&
      insight.evidence.interactionCount > 0 &&
      insight.recommendations.length > 0
    )
  },

  /**
   * Format learning metrics for display
   */
  formatMetrics(metrics: LearningMetrics): string {
    return `Agent Learning Summary:
- Total Interactions: ${metrics.metrics.totalInteractions}
- Average Rating: ${metrics.metrics.averageRating.toFixed(2)}/5
- Knowledge Hit Rate: ${(metrics.metrics.knowledgeHitRate * 100).toFixed(1)}%
- User Satisfaction: ${(metrics.metrics.userSatisfaction * 100).toFixed(1)}%
- Improvement Trend: ${metrics.metrics.improvementTrend > 0 ? '+' : ''}${metrics.metrics.improvementTrend.toFixed(2)}
    `
  }
}