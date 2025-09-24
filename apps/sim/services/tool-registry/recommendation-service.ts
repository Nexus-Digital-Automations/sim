/**
 * ToolRecommendationService - Intelligent tool recommendation system
 *
 * Provides contextual tool recommendations based on user behavior, usage patterns,
 * workspace context, and machine learning models.
 */

import { eq, and, desc, sql, count, avg, inArray, gte, lte } from 'drizzle-orm'
import { db } from '@/packages/db'
import {
  toolRecommendations,
  toolRegistry,
  toolUsageAnalytics,
  toolCategories,
} from '@/packages/db/schema'
import { createLogger } from '@/lib/logs/console/logger'

import type {
  RecommendationContext,
  ToolRecommendationData,
  EnrichedTool,
  UserToolPreferences,
  ToolRecommendationInsert,
} from './types'
import { ToolDiscoveryService } from './discovery-service'
import { ToolAnalyticsService } from './analytics-service'

const logger = createLogger('ToolRecommendationService')

/**
 * Advanced tool recommendation service with ML-like capabilities
 */
export class ToolRecommendationService {
  private discoveryService: ToolDiscoveryService
  private analyticsService: ToolAnalyticsService

  constructor() {
    this.discoveryService = new ToolDiscoveryService()
    this.analyticsService = new ToolAnalyticsService()
  }

  /**
   * Generate personalized tool recommendations for a user
   */
  async getPersonalizedRecommendations(
    context: RecommendationContext,
    limit = 10
  ): Promise<EnrichedTool[]> {
    logger.debug('Generating personalized recommendations', { context, limit })

    try {
      // Get multiple recommendation strategies
      const [
        contextualRecommendations,
        popularRecommendations,
        similarRecommendations,
        workflowRecommendations,
      ] = await Promise.all([
        this.getContextualRecommendations(context, limit),
        this.getPopularRecommendations(context, limit),
        this.getSimilarToolRecommendations(context, limit),
        this.getWorkflowBasedRecommendations(context, limit),
      ])

      // Combine and deduplicate recommendations
      const allRecommendations = new Map<string, EnrichedTool>()

      // Add contextual recommendations (highest priority)
      contextualRecommendations.forEach(tool => {
        if (tool.recommendation) {
          tool.recommendation.score *= 1.2 // Boost contextual recommendations
        }
        allRecommendations.set(tool.id, tool)
      })

      // Add popular recommendations
      popularRecommendations.forEach(tool => {
        if (!allRecommendations.has(tool.id)) {
          allRecommendations.set(tool.id, tool)
        }
      })

      // Add similar tool recommendations
      similarRecommendations.forEach(tool => {
        if (!allRecommendations.has(tool.id)) {
          if (tool.recommendation) {
            tool.recommendation.score *= 0.8 // Slight penalty for similar tools
          }
          allRecommendations.set(tool.id, tool)
        }
      })

      // Add workflow-based recommendations
      workflowRecommendations.forEach(tool => {
        if (!allRecommendations.has(tool.id)) {
          allRecommendations.set(tool.id, tool)
        }
      })

      // Sort by recommendation score and return top results
      const recommendations = Array.from(allRecommendations.values())
        .sort((a, b) => (b.recommendation?.score || 0) - (a.recommendation?.score || 0))
        .slice(0, limit)

      // Record recommendations for learning
      await this.recordRecommendations(recommendations, context)

      logger.debug('Generated personalized recommendations', { count: recommendations.length })
      return recommendations
    } catch (error) {
      logger.error('Failed to generate personalized recommendations', { context, error })
      // Fallback to popular tools
      return this.discoveryService.getPopularTools(context.workspaceId, limit)
    }
  }

  /**
   * Get contextual recommendations based on current task/conversation
   */
  async getContextualRecommendations(
    context: RecommendationContext,
    limit = 10
  ): Promise<EnrichedTool[]> {
    try {
      const conditions = [
        eq(toolRegistry.status, 'active'),
        eq(toolRegistry.isPublic, true),
      ]

      // Apply user preferences if available
      if (context.userPreferences) {
        const { favoriteCategories, preferredTypes, dismissed } = context.userPreferences

        if (favoriteCategories.length > 0) {
          conditions.push(inArray(toolRegistry.categoryId, favoriteCategories))
        }

        if (preferredTypes.length > 0) {
          conditions.push(inArray(toolRegistry.toolType, preferredTypes))
        }

        if (dismissed.length > 0) {
          conditions.push(sql`${toolRegistry.id} NOT IN (${dismissed.map(id => `'${id}'`).join(',')})`)
        }
      }

      // Get tools matching context
      let query = db
        .select({
          tool: toolRegistry,
          category: toolCategories,
        })
        .from(toolRegistry)
        .leftJoin(toolCategories, eq(toolRegistry.categoryId, toolCategories.id))
        .where(and(...conditions))

      // If there's a current task, prioritize relevant tools
      if (context.currentTask) {
        // This is a simplified implementation
        // In practice, we'd use NLP to match task description to tool capabilities
        query = query.orderBy(desc(toolRegistry.usageCount))
      } else {
        query = query.orderBy(desc(toolRegistry.usageCount), desc(toolRegistry.successRate))
      }

      const results = await query.limit(limit)

      // Enrich with analytics and recommendation data
      const recommendations = await Promise.all(
        results.map(async (result) => {
          const analytics = await this.analyticsService.getToolAnalytics(result.tool.id)
          const enriched = await this.enrichTool(result.tool, result.category, analytics)

          enriched.recommendation = {
            score: this.calculateContextualScore(enriched, context),
            confidence: 0.85,
            reason: this.generateContextualReason(enriched, context),
            recommendationType: 'contextual',
            contextData: context,
          }

          return enriched
        })
      )

      return recommendations.sort((a, b) => (b.recommendation?.score || 0) - (a.recommendation?.score || 0))
    } catch (error) {
      logger.error('Failed to get contextual recommendations', { context, error })
      return []
    }
  }

  /**
   * Get popular tool recommendations
   */
  async getPopularRecommendations(
    context: RecommendationContext,
    limit = 10
  ): Promise<EnrichedTool[]> {
    try {
      const popularTools = await this.discoveryService.getPopularTools(context.workspaceId, limit)

      // Add recommendation data
      return popularTools.map(tool => {
        tool.recommendation = {
          score: this.calculatePopularityScore(tool),
          confidence: 0.9,
          reason: 'Popular among users',
          recommendationType: 'popular',
          contextData: context,
        }
        return tool
      })
    } catch (error) {
      logger.error('Failed to get popular recommendations', { context, error })
      return []
    }
  }

  /**
   * Get recommendations based on similar tools
   */
  async getSimilarToolRecommendations(
    context: RecommendationContext,
    limit = 10
  ): Promise<EnrichedTool[]> {
    try {
      if (!context.recentTools || context.recentTools.length === 0) {
        return []
      }

      const similarTools = new Map<string, EnrichedTool>()

      // Get similar tools for each recently used tool
      for (const recentToolId of context.recentTools.slice(0, 3)) {
        try {
          const similar = await this.discoveryService.getSimilarTools(recentToolId, limit)
          similar.forEach(tool => {
            if (!similarTools.has(tool.id)) {
              tool.recommendation = {
                score: this.calculateSimilarityScore(tool, context),
                confidence: 0.75,
                reason: `Similar to ${recentToolId}`,
                recommendationType: 'similar',
                contextData: context,
              }
              similarTools.set(tool.id, tool)
            }
          })
        } catch (error) {
          logger.warn('Failed to get similar tools', { recentToolId, error })
        }
      }

      return Array.from(similarTools.values()).slice(0, limit)
    } catch (error) {
      logger.error('Failed to get similar tool recommendations', { context, error })
      return []
    }
  }

  /**
   * Get workflow-based recommendations
   */
  async getWorkflowBasedRecommendations(
    context: RecommendationContext,
    limit = 10
  ): Promise<EnrichedTool[]> {
    try {
      // This would analyze workflow patterns and suggest complementary tools
      // For now, return empty array - this would be implemented based on workflow data
      logger.debug('Workflow-based recommendations not yet implemented')
      return []
    } catch (error) {
      logger.error('Failed to get workflow-based recommendations', { context, error })
      return []
    }
  }

  /**
   * Record user feedback on recommendations
   */
  async recordFeedback(
    recommendationId: string,
    feedback: {
      clicked?: boolean
      used?: boolean
      dismissed?: boolean
      userFeedback?: number // 1-5 rating
      feedbackText?: string
    }
  ): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: sql`NOW()`,
      }

      if (feedback.clicked !== undefined) {
        updateData.clicked = feedback.clicked
        if (feedback.clicked) {
          updateData.interactedAt = new Date()
        }
      }

      if (feedback.used !== undefined) {
        updateData.used = feedback.used
        if (feedback.used) {
          updateData.interactedAt = new Date()
        }
      }

      if (feedback.dismissed !== undefined) {
        updateData.dismissed = feedback.dismissed
        if (feedback.dismissed) {
          updateData.interactedAt = new Date()
        }
      }

      if (feedback.userFeedback !== undefined) {
        updateData.userFeedback = feedback.userFeedback
      }

      if (feedback.feedbackText !== undefined) {
        updateData.feedbackText = feedback.feedbackText
      }

      await db
        .update(toolRecommendations)
        .set(updateData)
        .where(eq(toolRecommendations.id, recommendationId))

      logger.debug('Recorded recommendation feedback', { recommendationId, feedback })
    } catch (error) {
      logger.error('Failed to record recommendation feedback', { recommendationId, error })
    }
  }

  /**
   * Get user preferences based on historical usage
   */
  async getUserPreferences(userId: string): Promise<UserToolPreferences> {
    try {
      // Get user's tool usage history
      const usageHistory = await db
        .select({
          toolId: toolUsageAnalytics.toolId,
          categoryId: toolRegistry.categoryId,
          toolType: toolRegistry.toolType,
          count: count(toolUsageAnalytics.id),
          lastUsed: sql`MAX(${toolUsageAnalytics.startTime})`,
        })
        .from(toolUsageAnalytics)
        .leftJoin(toolRegistry, eq(toolUsageAnalytics.toolId, toolRegistry.id))
        .where(eq(toolUsageAnalytics.userId, userId))
        .groupBy(toolUsageAnalytics.toolId, toolRegistry.categoryId, toolRegistry.toolType)
        .orderBy(desc(count(toolUsageAnalytics.id)))

      // Extract preferences
      const favoriteCategories = Array.from(
        new Set(
          usageHistory
            .filter(h => h.categoryId)
            .slice(0, 5)
            .map(h => h.categoryId!)
        )
      )

      const preferredTypes = Array.from(
        new Set(
          usageHistory
            .slice(0, 10)
            .map(h => h.toolType)
        )
      )

      const recentlyUsed = usageHistory
        .slice(0, 10)
        .map(h => h.toolId)

      // Get dismissed tools (from recommendation feedback)
      const dismissed = await db
        .select({ toolId: toolRecommendations.recommendedToolId })
        .from(toolRecommendations)
        .where(
          and(
            eq(toolRecommendations.userId, userId),
            eq(toolRecommendations.dismissed, true)
          )
        )
        .then(results => results.map(r => r.toolId))

      return {
        favoriteCategories,
        preferredTypes,
        recentlyUsed,
        dismissed,
        customTags: {}, // Could be implemented with user tagging system
      }
    } catch (error) {
      logger.error('Failed to get user preferences', { userId, error })
      return {
        favoriteCategories: [],
        preferredTypes: [],
        recentlyUsed: [],
        dismissed: [],
        customTags: {},
      }
    }
  }

  /**
   * Learn from user behavior to improve recommendations
   */
  async learnFromBehavior(userId: string): Promise<void> {
    try {
      // Analyze recent user behavior
      const recentUsage = await db
        .select({
          toolId: toolUsageAnalytics.toolId,
          success: toolUsageAnalytics.success,
          startTime: toolUsageAnalytics.startTime,
        })
        .from(toolUsageAnalytics)
        .where(
          and(
            eq(toolUsageAnalytics.userId, userId),
            gte(toolUsageAnalytics.startTime, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )
        )
        .orderBy(desc(toolUsageAnalytics.startTime))

      // Update user preferences based on recent behavior
      // This is a simplified implementation - in practice, this would use more sophisticated ML
      logger.debug('Learning from user behavior', { userId, recentUsageCount: recentUsage.length })

      // The learning algorithm would update user preference weights here
      // For now, we just log the activity
    } catch (error) {
      logger.error('Failed to learn from user behavior', { userId, error })
    }
  }

  // Private helper methods

  /**
   * Record recommendations for learning purposes
   */
  private async recordRecommendations(
    recommendations: EnrichedTool[],
    context: RecommendationContext
  ): Promise<void> {
    try {
      const recommendationRecords: ToolRecommendationInsert[] = recommendations.map(tool => ({
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: context.userId || null,
        workspaceId: context.workspaceId || null,
        sessionId: context.sessionId || null,
        recommendedToolId: tool.id,
        recommendationType: tool.recommendation?.recommendationType || 'unknown',
        score: tool.recommendation?.score || 0,
        confidence: tool.recommendation?.confidence || 0,
        contextType: context.currentTask ? 'task' : 'general',
        contextData: JSON.stringify(context),
        triggerEvent: 'recommendation_request',
        presented: false, // Will be set to true when actually shown to user
      }))

      if (recommendationRecords.length > 0) {
        await db.insert(toolRecommendations).values(recommendationRecords)
      }
    } catch (error) {
      logger.error('Failed to record recommendations', { error })
    }
  }

  /**
   * Calculate contextual recommendation score
   */
  private calculateContextualScore(tool: EnrichedTool, context: RecommendationContext): number {
    let score = 0.5 // Base score

    // Usage-based scoring
    score += Math.min(tool.analytics.usageCount / 1000, 0.2)
    score += tool.analytics.successRate * 0.2

    // Context-based scoring
    if (context.userPreferences) {
      const { favoriteCategories, preferredTypes, recentlyUsed } = context.userPreferences

      if (tool.categoryId && favoriteCategories.includes(tool.categoryId)) {
        score += 0.25
      }

      if (preferredTypes.includes(tool.toolType)) {
        score += 0.15
      }

      if (recentlyUsed.includes(tool.id)) {
        score += 0.1
      }
    }

    // Current task context
    if (context.currentTask && tool.naturalLanguageDescription) {
      // Simple keyword matching - in practice, this would use NLP
      const taskWords = context.currentTask.toLowerCase().split(' ')
      const descWords = tool.naturalLanguageDescription.toLowerCase().split(' ')
      const matches = taskWords.filter(word => descWords.includes(word)).length
      score += Math.min(matches / taskWords.length, 0.2)
    }

    return Math.min(score, 1.0)
  }

  /**
   * Calculate popularity-based score
   */
  private calculatePopularityScore(tool: EnrichedTool): number {
    return tool.analytics.popularityScore * 0.8 + tool.analytics.successRate * 0.2
  }

  /**
   * Calculate similarity-based score
   */
  private calculateSimilarityScore(tool: EnrichedTool, context: RecommendationContext): number {
    let score = 0.4 // Base score for similar tools

    score += tool.analytics.successRate * 0.3
    score += Math.min(tool.analytics.usageCount / 500, 0.2)

    // Boost if it's in user's preferred categories
    if (context.userPreferences?.favoriteCategories.includes(tool.categoryId!)) {
      score += 0.1
    }

    return Math.min(score, 1.0)
  }

  /**
   * Generate contextual recommendation reason
   */
  private generateContextualReason(tool: EnrichedTool, context: RecommendationContext): string {
    const reasons = []

    if (tool.analytics.usageCount > 100) {
      reasons.push('widely used')
    }

    if (tool.analytics.successRate > 0.9) {
      reasons.push('highly reliable')
    }

    if (context.userPreferences?.favoriteCategories.includes(tool.categoryId!)) {
      reasons.push('matches your interests')
    }

    if (context.currentTask) {
      reasons.push('relevant to your current task')
    }

    return reasons.length > 0
      ? `Recommended because it's ${reasons.join(' and ')}`
      : 'Recommended for you'
  }

  /**
   * Enrich tool with analytics data (helper method)
   */
  private async enrichTool(
    tool: any,
    category: any,
    analytics: any
  ): Promise<EnrichedTool> {
    return {
      id: tool.id,
      name: tool.name,
      displayName: tool.displayName,
      description: tool.description,
      longDescription: tool.longDescription || undefined,
      version: tool.version,
      toolType: tool.toolType,
      scope: tool.scope,
      status: tool.status,
      categoryId: tool.categoryId || undefined,
      tags: JSON.parse(tool.tags as string),
      keywords: JSON.parse(tool.keywords as string),
      schema: JSON.parse(tool.schema as string),
      resultSchema: tool.resultSchema ? JSON.parse(tool.resultSchema as string) : undefined,
      metadata: JSON.parse(tool.metadata as string),
      implementationType: tool.implementationType as any,
      executionContext: JSON.parse(tool.executionContext as string),
      isPublic: tool.isPublic,
      requiresAuth: tool.requiresAuth,
      requiredPermissions: JSON.parse(tool.requiredPermissions as string),
      naturalLanguageDescription: tool.naturalLanguageDescription || undefined,
      usageExamples: JSON.parse(tool.usageExamples as string),
      commonQuestions: JSON.parse(tool.commonQuestions as string),
      category: category || undefined,
      analytics,
      healthStatus: {
        status: tool.healthStatus as any,
        lastCheckTime: tool.lastHealthCheck || undefined,
      },
    }
  }
}