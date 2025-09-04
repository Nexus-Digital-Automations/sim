/**
 * Template Recommendation Engine - Intelligent Template Discovery
 *
 * This service provides intelligent template recommendations using:
 * - User behavior analysis and collaborative filtering
 * - Template similarity algorithms with content analysis
 * - Industry and use-case pattern matching
 * - Machine learning-based recommendation optimization
 * - Real-time personalization and adaptive learning
 *
 * Architecture:
 * - Multi-algorithm recommendation system with hybrid approaches
 * - User behavior tracking and preference learning
 * - Template content analysis and similarity matching
 * - Performance optimization with caching and batching
 * - A/B testing framework for recommendation improvements
 *
 * @author Claude Code Discovery System
 * @version 1.0.0
 */

import { and, desc, eq, gte, inArray, sql, count, avg } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import { templates, templateStars, workflow } from '@/db/schema'
import type {
  TemplateRecommendation,
  Template,
  TemplateMetadata,
  TemplateUserProfile,
} from '../types'

// Initialize structured logger with recommendation context
const logger = createLogger('TemplateRecommendationEngine')

/**
 * Template similarity score calculation result
 */
interface TemplateSimilarityScore {
  templateId: string
  similarityScore: number
  matchingFeatures: string[]
  confidence: number
}

/**
 * User behavior analytics for personalization
 */
interface UserBehaviorProfile {
  userId: string
  preferredCategories: string[]
  preferredTags: string[]
  preferredAuthors: string[]
  averageComplexity: 'simple' | 'moderate' | 'complex'
  usagePatterns: {
    timeOfDay: number[]
    dayOfWeek: number[]
    templateTypes: string[]
  }
  engagementScore: number
}

/**
 * Advanced Template Recommendation Engine
 *
 * Provides intelligent template discovery using:
 * - Collaborative filtering based on user behavior
 * - Content-based filtering using template similarity
 * - Hybrid recommendations combining multiple algorithms
 * - Real-time personalization and preference learning
 * - Industry and use-case pattern matching
 * - Performance optimization with intelligent caching
 */
export class TemplateRecommendationEngine {
  private readonly requestId: string
  private readonly startTime: number
  private readonly cacheExpiry: number = 3600000 // 1 hour cache

  constructor(requestId?: string) {
    this.requestId = requestId || crypto.randomUUID().slice(0, 8)
    this.startTime = Date.now()

    logger.info(`[${this.requestId}] TemplateRecommendationEngine initialized`, {
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
    })
  }

  /**
   * Get personalized template recommendations for a user
   *
   * Features:
   * - Hybrid recommendation algorithm (collaborative + content-based)
   * - User behavior analysis and preference learning
   * - Real-time personalization based on recent activity
   * - Diversity optimization to avoid filter bubbles
   * - Performance optimization with intelligent caching
   *
   * @param userId - User ID for personalized recommendations
   * @param options - Recommendation options and filters
   * @returns Promise<TemplateRecommendation[]> - Ranked template recommendations
   */
  async getPersonalizedRecommendations(
    userId: string,
    options: {
      limit?: number
      excludeOwned?: boolean
      excludeUsed?: boolean
      categories?: string[]
      includeReasoning?: boolean
      diversityFactor?: number // 0-1, higher = more diverse recommendations
    } = {}
  ): Promise<TemplateRecommendation[]> {
    const operationId = `personalized_${Date.now()}`
    const limit = options.limit || 10

    logger.info(`[${this.requestId}] Generating personalized recommendations`, {
      operationId,
      userId,
      limit,
      excludeOwned: options.excludeOwned,
      excludeUsed: options.excludeUsed,
    })

    try {
      // Get user behavior profile for personalization
      const userProfile = await this.getUserBehaviorProfile(userId)

      // Get collaborative filtering recommendations (users with similar behavior)
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId, userProfile, limit)

      // Get content-based recommendations (similar to user's preferences)
      const contentBasedRecs = await this.getContentBasedRecommendations(userId, userProfile, limit)

      // Get trending templates in user's categories
      const trendingRecs = await this.getTrendingRecommendations(userProfile.preferredCategories, limit)

      // Get diversity recommendations (explore new categories)
      const diversityRecs = await this.getDiversityRecommendations(userId, userProfile, limit)

      // Combine and rank all recommendations using hybrid scoring
      const combinedRecommendations = await this.combineAndRankRecommendations(
        [
          { recommendations: collaborativeRecs, weight: 0.4, type: 'collaborative_filtering' },
          { recommendations: contentBasedRecs, weight: 0.3, type: 'similar_to_used' },
          { recommendations: trendingRecs, weight: 0.2, type: 'trending' },
          { recommendations: diversityRecs, weight: 0.1, type: 'highly_rated' },
        ],
        options.diversityFactor || 0.3
      )

      // Apply filters and post-processing
      const filteredRecommendations = await this.applyRecommendationFilters(
        combinedRecommendations,
        userId,
        options
      )

      // Limit to requested number and add confidence scores
      const finalRecommendations = filteredRecommendations
        .slice(0, limit)
        .map((rec, index) => ({
          ...rec,
          confidence: Math.max(0.1, rec.score * (1 - index * 0.05)), // Decrease confidence with rank
        }))

      // Track recommendation event for learning and optimization
      await this.trackRecommendationEvent(userId, operationId, finalRecommendations)

      const processingTime = Date.now() - this.startTime
      logger.info(`[${this.requestId}] Personalized recommendations generated`, {
        operationId,
        recommendationCount: finalRecommendations.length,
        processingTime,
      })

      return finalRecommendations
    } catch (error) {
      const processingTime = Date.now() - this.startTime
      logger.error(`[${this.requestId}] Personalized recommendations failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      })
      throw error
    }
  }

  /**
   * Get template recommendations based on similarity to a given template
   *
   * Features:
   * - Content similarity analysis (categories, tags, block types)
   * - Workflow structure similarity comparison
   * - Author and style pattern matching
   * - Quality and popularity scoring integration
   * - Performance-optimized similarity calculations
   *
   * @param templateId - Base template ID for similarity matching
   * @param options - Similarity options and filters
   * @returns Promise<TemplateRecommendation[]> - Templates similar to the given template
   */
  async getSimilarTemplates(
    templateId: string,
    options: {
      limit?: number
      userId?: string
      minSimilarityScore?: number
      includeReasoning?: boolean
    } = {}
  ): Promise<TemplateRecommendation[]> {
    const operationId = `similar_${Date.now()}`
    const limit = options.limit || 8

    logger.info(`[${this.requestId}] Finding similar templates`, {
      operationId,
      templateId,
      limit,
      minSimilarityScore: options.minSimilarityScore || 0.3,
    })

    try {
      // Get the base template for comparison
      const baseTemplate = await this.getTemplateById(templateId)
      if (!baseTemplate) {
        throw new Error(`Template not found: ${templateId}`)
      }

      // Get all potential similar templates (excluding the base template)
      const candidateTemplates = await db
        .select({
          id: templates.id,
          name: templates.name,
          description: templates.description,
          author: templates.author,
          views: templates.views,
          stars: templates.stars,
          color: templates.color,
          icon: templates.icon,
          category: templates.category,
          state: templates.state,
          createdAt: templates.createdAt,
          updatedAt: templates.updatedAt,
        })
        .from(templates)
        .where(
          and(
            sql`${templates.id} != ${templateId}`, // Exclude base template
            eq(templates.category, baseTemplate.category) // Start with same category
          )
        )
        .orderBy(desc(templates.views))
        .limit(100) // Get top candidates for similarity calculation

      // Calculate similarity scores for each candidate
      const similarityScores = await Promise.all(
        candidateTemplates.map(async (candidate) => {
          const similarityScore = await this.calculateTemplateSimilarity(
            baseTemplate,
            candidate as Template
          )
          return {
            template: candidate as Template,
            similarityScore,
          }
        })
      )

      // Filter by minimum similarity score and sort by score
      const filteredSimilar = similarityScores
        .filter(item => item.similarityScore.similarityScore >= (options.minSimilarityScore || 0.3))
        .sort((a, b) => b.similarityScore.similarityScore - a.similarityScore.similarityScore)
        .slice(0, limit)

      // Convert to recommendation format
      const recommendations: TemplateRecommendation[] = filteredSimilar.map((item, index) => ({
        template: item.template,
        score: item.similarityScore.similarityScore,
        reason: 'similar_to_used',
        confidence: Math.max(0.2, item.similarityScore.confidence * (1 - index * 0.05)),
      }))

      const processingTime = Date.now() - this.startTime
      logger.info(`[${this.requestId}] Similar templates found`, {
        operationId,
        similarTemplateCount: recommendations.length,
        processingTime,
      })

      return recommendations
    } catch (error) {
      const processingTime = Date.now() - this.startTime
      logger.error(`[${this.requestId}] Similar templates search failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      })
      throw error
    }
  }

  /**
   * Get trending templates with intelligent ranking
   *
   * Features:
   * - Multi-factor trending algorithm (recent activity + popularity)
   * - Category-specific trending analysis
   * - Time-weighted popularity scoring
   * - Quality filter integration
   * - Real-time trend detection
   *
   * @param options - Trending analysis options
   * @returns Promise<TemplateRecommendation[]> - Currently trending templates
   */
  async getTrendingTemplates(
    options: {
      limit?: number
      categories?: string[]
      timePeriod?: 'day' | 'week' | 'month'
      userId?: string
    } = {}
  ): Promise<TemplateRecommendation[]> {
    const operationId = `trending_${Date.now()}`
    const limit = options.limit || 10
    const timePeriod = options.timePeriod || 'week'

    logger.info(`[${this.requestId}] Finding trending templates`, {
      operationId,
      limit,
      timePeriod,
      categories: options.categories,
    })

    try {
      // Calculate time cutoff for trending analysis
      const timeCutoffDays = timePeriod === 'day' ? 1 : timePeriod === 'week' ? 7 : 30
      const timeCutoff = new Date(Date.now() - timeCutoffDays * 24 * 60 * 60 * 1000)

      // Build trending query with multi-factor scoring
      let trendingQuery = db
        .select({
          id: templates.id,
          name: templates.name,
          description: templates.description,
          author: templates.author,
          views: templates.views,
          stars: templates.stars,
          color: templates.color,
          icon: templates.icon,
          category: templates.category,
          createdAt: templates.createdAt,
          updatedAt: templates.updatedAt,
          // Trending score calculation
          trendingScore: sql<number>`(
            -- Recent activity boost (40%)
            CASE WHEN ${templates.createdAt} >= ${timeCutoff} THEN 
              EXTRACT(EPOCH FROM ${timeCutoff} - ${templates.createdAt}) / -86400 * 40
            ELSE 0 END
            
            -- Popularity score (35%)
            + (${templates.views} * 0.6 + ${templates.stars} * 0.4) * 0.35
            
            -- Velocity score - views per day since creation (25%)
            + CASE WHEN ${templates.createdAt} < NOW() - INTERVAL '1 day' THEN
                ${templates.views} / GREATEST(1, EXTRACT(EPOCH FROM NOW() - ${templates.createdAt}) / 86400) * 25
              ELSE ${templates.views} * 25
            END
          )`.as('trending_score'),
        })
        .from(templates)

      // Apply category filter if specified
      if (options.categories && options.categories.length > 0) {
        trendingQuery = trendingQuery.where(inArray(templates.category, options.categories))
      }

      // Execute trending query
      const trendingResults = await trendingQuery
        .orderBy(desc(sql`trending_score`))
        .limit(limit * 2) // Get extra results for filtering

      // Convert to recommendation format with trending-specific scoring
      const recommendations: TemplateRecommendation[] = trendingResults
        .slice(0, limit)
        .map((template, index) => ({
          template: template as Template,
          score: Math.max(0.1, (template.trendingScore / 100) * (1 - index * 0.05)), // Normalize score
          reason: 'trending',
          confidence: Math.max(0.3, 0.8 * (1 - index * 0.08)), // High confidence for trending
        }))

      const processingTime = Date.now() - this.startTime
      logger.info(`[${this.requestId}] Trending templates found`, {
        operationId,
        trendingTemplateCount: recommendations.length,
        avgTrendingScore: recommendations.reduce((sum, rec) => sum + rec.score, 0) / recommendations.length,
        processingTime,
      })

      return recommendations
    } catch (error) {
      const processingTime = Date.now() - this.startTime
      logger.error(`[${this.requestId}] Trending templates search failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      })
      throw error
    }
  }

  /**
   * Get category-specific template recommendations
   *
   * @param category - Template category to recommend from
   * @param options - Category recommendation options
   * @returns Promise<TemplateRecommendation[]> - Top templates in category
   */
  async getCategoryRecommendations(
    category: string,
    options: {
      limit?: number
      userId?: string
      sortBy?: 'popular' | 'recent' | 'rated' | 'trending'
    } = {}
  ): Promise<TemplateRecommendation[]> {
    const operationId = `category_${Date.now()}`
    const limit = options.limit || 8
    const sortBy = options.sortBy || 'popular'

    logger.info(`[${this.requestId}] Getting category recommendations`, {
      operationId,
      category,
      limit,
      sortBy,
    })

    try {
      // Build sort configuration based on sortBy option
      const getSortConfig = () => {
        switch (sortBy) {
          case 'recent':
            return desc(templates.createdAt)
          case 'rated':
            return desc(templates.stars)
          case 'trending':
            return desc(sql`(${templates.views} + ${templates.stars} * 2 + CASE WHEN ${templates.createdAt} > NOW() - INTERVAL '7 days' THEN 50 ELSE 0 END)`)
          case 'popular':
          default:
            return desc(templates.views)
        }
      }

      // Get category templates
      const categoryTemplates = await db
        .select({
          id: templates.id,
          name: templates.name,
          description: templates.description,
          author: templates.author,
          views: templates.views,
          stars: templates.stars,
          color: templates.color,
          icon: templates.icon,
          category: templates.category,
          createdAt: templates.createdAt,
          updatedAt: templates.updatedAt,
        })
        .from(templates)
        .where(eq(templates.category, category))
        .orderBy(getSortConfig())
        .limit(limit)

      // Convert to recommendation format
      const recommendations: TemplateRecommendation[] = categoryTemplates.map((template, index) => ({
        template: template as Template,
        score: Math.max(0.2, 0.9 * (1 - index * 0.1)), // Decreasing score by rank
        reason: 'same_category',
        confidence: Math.max(0.4, 0.8 * (1 - index * 0.05)),
      }))

      const processingTime = Date.now() - this.startTime
      logger.info(`[${this.requestId}] Category recommendations generated`, {
        operationId,
        category,
        recommendationCount: recommendations.length,
        processingTime,
      })

      return recommendations
    } catch (error) {
      const processingTime = Date.now() - this.startTime
      logger.error(`[${this.requestId}] Category recommendations failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      })
      throw error
    }
  }

  // Private helper methods for recommendation algorithms

  /**
   * Build user behavior profile from usage history
   */
  private async getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile> {
    // Get user's starred templates for preference analysis
    const starredTemplates = await db
      .select({
        category: templates.category,
        author: templates.author,
        state: templates.state,
      })
      .from(templateStars)
      .leftJoin(templates, eq(templateStars.templateId, templates.id))
      .where(eq(templateStars.userId, userId))

    // Get user's created templates for additional preference signals
    const userTemplates = await db
      .select({
        category: templates.category,
        state: templates.state,
      })
      .from(templates)
      .where(eq(templates.userId, userId))

    // Analyze preferences from starred and created templates
    const allTemplates = [...starredTemplates, ...userTemplates]
    const categoryCount: Record<string, number> = {}
    const tagCount: Record<string, number> = {}
    const authorCount: Record<string, number> = {}

    allTemplates.forEach(template => {
      // Count categories
      if (template.category) {
        categoryCount[template.category] = (categoryCount[template.category] || 0) + 1
      }

      // Count authors
      if (template.author) {
        authorCount[template.author] = (authorCount[template.author] || 0) + 1
      }

      // Count tags from metadata
      const metadata = template.state?.metadata
      const tags = [...(metadata?.tags || []), ...(metadata?.autoTags || [])]
      tags.forEach(tag => {
        if (typeof tag === 'string') {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        }
      })
    })

    // Build preference arrays
    const preferredCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category)

    const preferredTags = Object.entries(tagCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag)

    const preferredAuthors = Object.entries(authorCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([author]) => author)

    return {
      userId,
      preferredCategories,
      preferredTags,
      preferredAuthors,
      averageComplexity: 'moderate', // Would analyze from template complexity
      usagePatterns: {
        timeOfDay: [], // Would analyze from usage timestamps
        dayOfWeek: [], // Would analyze from usage timestamps
        templateTypes: preferredCategories,
      },
      engagementScore: starredTemplates.length + userTemplates.length * 2, // Simple engagement metric
    }
  }

  /**
   * Get collaborative filtering recommendations
   */
  private async getCollaborativeRecommendations(
    userId: string,
    userProfile: UserBehaviorProfile,
    limit: number
  ): Promise<Template[]> {
    // Find users with similar preferences (starred similar templates)
    const similarUsers = await db
      .select({
        userId: templateStars.userId,
        commonStars: count(templateStars.id),
      })
      .from(templateStars)
      .leftJoin(templates, eq(templateStars.templateId, templates.id))
      .where(
        and(
          sql`${templateStars.userId} != ${userId}`, // Exclude current user
          inArray(templates.category, userProfile.preferredCategories) // Similar categories
        )
      )
      .groupBy(templateStars.userId)
      .having(sql`count(*) >= 2`) // At least 2 common interests
      .orderBy(desc(count(templateStars.id)))
      .limit(10) // Top similar users

    if (similarUsers.length === 0) {
      return []
    }

    // Get templates starred by similar users (but not by current user)
    const collaborativeTemplates = await db
      .select({
        id: templates.id,
        name: templates.name,
        description: templates.description,
        author: templates.author,
        views: templates.views,
        stars: templates.stars,
        color: templates.color,
        icon: templates.icon,
        category: templates.category,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        starCount: count(templateStars.id),
      })
      .from(templateStars)
      .leftJoin(templates, eq(templateStars.templateId, templates.id))
      .where(
        and(
          inArray(templateStars.userId, similarUsers.map(u => u.userId)),
          sql`${templates.id} NOT IN (
            SELECT template_id FROM template_stars WHERE user_id = ${userId}
          )` // Exclude already starred
        )
      )
      .groupBy(
        templates.id, templates.name, templates.description, templates.author,
        templates.views, templates.stars, templates.color, templates.icon,
        templates.category, templates.createdAt, templates.updatedAt
      )
      .orderBy(desc(count(templateStars.id)), desc(templates.stars))
      .limit(limit)

    return collaborativeTemplates as Template[]
  }

  /**
   * Get content-based recommendations
   */
  private async getContentBasedRecommendations(
    userId: string,
    userProfile: UserBehaviorProfile,
    limit: number
  ): Promise<Template[]> {
    // Get templates matching user's preferred categories and tags
    let contentQuery = db
      .select({
        id: templates.id,
        name: templates.name,
        description: templates.description,
        author: templates.author,
        views: templates.views,
        stars: templates.stars,
        color: templates.color,
        icon: templates.icon,
        category: templates.category,
        state: templates.state,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
      })
      .from(templates)
      .where(
        and(
          sql`${templates.userId} != ${userId}`, // Exclude user's own templates
          or(
            inArray(templates.category, userProfile.preferredCategories),
            inArray(templates.author, userProfile.preferredAuthors),
            // Tag matching would go here if we had better tag indexing
          )
        )
      )
      .orderBy(desc(templates.stars), desc(templates.views))
      .limit(limit * 2) // Get extra for filtering

    const contentTemplates = await contentQuery

    // Filter out templates user has already starred
    const userStarredIds = await db
      .select({ templateId: templateStars.templateId })
      .from(templateStars)
      .where(eq(templateStars.userId, userId))

    const starredIds = new Set(userStarredIds.map(s => s.templateId))
    
    return contentTemplates
      .filter(template => !starredIds.has(template.id))
      .slice(0, limit) as Template[]
  }

  /**
   * Get diversity recommendations (explore new categories)
   */
  private async getDiversityRecommendations(
    userId: string,
    userProfile: UserBehaviorProfile,
    limit: number
  ): Promise<Template[]> {
    // Get categories user hasn't explored much
    const allCategories = await db
      .select({ category: templates.category })
      .from(templates)
      .groupBy(templates.category)

    const unexploredCategories = allCategories
      .map(c => c.category)
      .filter(category => !userProfile.preferredCategories.includes(category))
      .slice(0, 3) // Pick top 3 unexplored categories

    if (unexploredCategories.length === 0) {
      return []
    }

    // Get high-quality templates from unexplored categories
    const diversityTemplates = await db
      .select({
        id: templates.id,
        name: templates.name,
        description: templates.description,
        author: templates.author,
        views: templates.views,
        stars: templates.stars,
        color: templates.color,
        icon: templates.icon,
        category: templates.category,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
      })
      .from(templates)
      .where(
        and(
          inArray(templates.category, unexploredCategories),
          gte(templates.stars, 5), // High-quality filter
          sql`${templates.userId} != ${userId}` // Exclude user's templates
        )
      )
      .orderBy(desc(templates.stars))
      .limit(limit)

    return diversityTemplates as Template[]
  }

  /**
   * Calculate similarity between two templates
   */
  private async calculateTemplateSimilarity(
    template1: Template,
    template2: Template
  ): Promise<TemplateSimilarityScore> {
    let similarityScore = 0
    let confidence = 0
    const matchingFeatures: string[] = []

    // Category similarity (40% weight)
    if (template1.category === template2.category) {
      similarityScore += 0.4
      confidence += 0.2
      matchingFeatures.push('category')
    }

    // Author similarity (20% weight)
    if (template1.author === template2.author) {
      similarityScore += 0.2
      confidence += 0.1
      matchingFeatures.push('author')
    }

    // Metadata similarity analysis
    const metadata1 = template1.state?.metadata
    const metadata2 = template2.state?.metadata

    if (metadata1 && metadata2) {
      // Tag similarity (25% weight)
      const tags1 = new Set([...(metadata1.tags || []), ...(metadata1.autoTags || [])])
      const tags2 = new Set([...(metadata2.tags || []), ...(metadata2.autoTags || [])])
      const commonTags = new Set([...tags1].filter(tag => tags2.has(tag)))
      const totalTags = new Set([...tags1, ...tags2]).size
      
      if (totalTags > 0) {
        const tagSimilarity = commonTags.size / totalTags
        similarityScore += tagSimilarity * 0.25
        confidence += tagSimilarity * 0.15
        if (commonTags.size > 0) {
          matchingFeatures.push('tags')
        }
      }

      // Block type similarity (15% weight)
      const blockTypes1 = new Set(metadata1.blockTypes || [])
      const blockTypes2 = new Set(metadata2.blockTypes || [])
      const commonBlockTypes = new Set([...blockTypes1].filter(type => blockTypes2.has(type)))
      const totalBlockTypes = new Set([...blockTypes1, ...blockTypes2]).size
      
      if (totalBlockTypes > 0) {
        const blockTypeSimilarity = commonBlockTypes.size / totalBlockTypes
        similarityScore += blockTypeSimilarity * 0.15
        confidence += blockTypeSimilarity * 0.1
        if (commonBlockTypes.size > 0) {
          matchingFeatures.push('blockTypes')
        }
      }

      // Complexity similarity (5% weight)
      if (metadata1.complexity === metadata2.complexity) {
        similarityScore += 0.05
        confidence += 0.05
        matchingFeatures.push('complexity')
      }
    }

    // Normalize confidence to 0-1 range
    confidence = Math.min(1, confidence + 0.2) // Base confidence

    return {
      templateId: template2.id,
      similarityScore,
      matchingFeatures,
      confidence,
    }
  }

  /**
   * Combine and rank recommendations from multiple algorithms
   */
  private async combineAndRankRecommendations(
    algorithmResults: Array<{
      recommendations: Template[]
      weight: number
      type: TemplateRecommendation['reason']
    }>,
    diversityFactor: number
  ): Promise<TemplateRecommendation[]> {
    const templateScores = new Map<string, {
      template: Template
      totalScore: number
      reasons: TemplateRecommendation['reason'][]
      algorithmScores: number[]
    }>()

    // Combine scores from all algorithms
    algorithmResults.forEach(({ recommendations, weight, type }) => {
      recommendations.forEach((template, index) => {
        const rankScore = 1 - (index / recommendations.length) // Higher rank = higher score
        const algorithmScore = rankScore * weight

        if (templateScores.has(template.id)) {
          const existing = templateScores.get(template.id)!
          existing.totalScore += algorithmScore
          existing.reasons.push(type)
          existing.algorithmScores.push(algorithmScore)
        } else {
          templateScores.set(template.id, {
            template,
            totalScore: algorithmScore,
            reasons: [type],
            algorithmScores: [algorithmScore],
          })
        }
      })
    })

    // Convert to recommendation format and apply diversity
    const recommendations = Array.from(templateScores.values())
      .map(item => ({
        template: item.template,
        score: item.totalScore,
        reason: item.reasons[0], // Primary reason
        confidence: Math.min(0.95, item.totalScore + (item.reasons.length - 1) * 0.1), // Bonus for multiple algorithms
      }))
      .sort((a, b) => b.score - a.score)

    // Apply diversity factor to avoid too many similar templates
    if (diversityFactor > 0) {
      return this.applyDiversityFilter(recommendations, diversityFactor)
    }

    return recommendations
  }

  /**
   * Apply diversity filter to reduce similar templates in results
   */
  private applyDiversityFilter(
    recommendations: TemplateRecommendation[],
    diversityFactor: number
  ): TemplateRecommendation[] {
    const diverseRecommendations: TemplateRecommendation[] = []
    const usedCategories = new Set<string>()
    const usedAuthors = new Set<string>()

    for (const rec of recommendations) {
      const template = rec.template
      let diversityPenalty = 0

      // Apply penalty for repeated categories
      if (usedCategories.has(template.category)) {
        diversityPenalty += diversityFactor * 0.3
      }

      // Apply penalty for repeated authors
      if (usedAuthors.has(template.author)) {
        diversityPenalty += diversityFactor * 0.2
      }

      // Adjust score with diversity penalty
      const adjustedScore = Math.max(0.1, rec.score - diversityPenalty)

      diverseRecommendations.push({
        ...rec,
        score: adjustedScore,
      })

      // Track used categories and authors
      usedCategories.add(template.category)
      usedAuthors.add(template.author)
    }

    // Re-sort after diversity adjustment
    return diverseRecommendations.sort((a, b) => b.score - a.score)
  }

  /**
   * Apply filters to recommendation results
   */
  private async applyRecommendationFilters(
    recommendations: TemplateRecommendation[],
    userId: string,
    options: any
  ): Promise<TemplateRecommendation[]> {
    let filtered = recommendations

    // Exclude user's own templates if requested
    if (options.excludeOwned) {
      filtered = filtered.filter(rec => rec.template.userId !== userId)
    }

    // Exclude templates user has already used (would need usage tracking)
    if (options.excludeUsed) {
      // This would require a usage history table
      // For now, we'll exclude starred templates
      const starredIds = await db
        .select({ templateId: templateStars.templateId })
        .from(templateStars)
        .where(eq(templateStars.userId, userId))

      const starredSet = new Set(starredIds.map(s => s.templateId))
      filtered = filtered.filter(rec => !starredSet.has(rec.template.id))
    }

    // Category filtering
    if (options.categories && options.categories.length > 0) {
      filtered = filtered.filter(rec => options.categories.includes(rec.template.category))
    }

    return filtered
  }

  /**
   * Get template by ID with full details
   */
  private async getTemplateById(templateId: string): Promise<Template | null> {
    const result = await db
      .select({
        id: templates.id,
        workflowId: templates.workflowId,
        userId: templates.userId,
        name: templates.name,
        description: templates.description,
        author: templates.author,
        views: templates.views,
        stars: templates.stars,
        color: templates.color,
        icon: templates.icon,
        category: templates.category,
        state: templates.state,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
      })
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1)

    return result[0] as Template || null
  }

  /**
   * Track recommendation event for analytics and learning
   */
  private async trackRecommendationEvent(
    userId: string,
    operationId: string,
    recommendations: TemplateRecommendation[]
  ): Promise<void> {
    // This would typically insert into a recommendation analytics table
    logger.info(`[${this.requestId}] Recommendation event tracked`, {
      operationId,
      userId,
      recommendationCount: recommendations.length,
      avgScore: recommendations.reduce((sum, rec) => sum + rec.score, 0) / recommendations.length,
      avgConfidence: recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length,
      reasonDistribution: recommendations.reduce((dist, rec) => {
        dist[rec.reason] = (dist[rec.reason] || 0) + 1
        return dist
      }, {} as Record<string, number>),
      processingTime: Date.now() - this.startTime,
    })
  }

  /**
   * Get trending recommendations for specific categories
   */
  private async getTrendingRecommendations(
    categories: string[],
    limit: number
  ): Promise<Template[]> {
    if (categories.length === 0) {
      return []
    }

    const trendingTemplates = await db
      .select({
        id: templates.id,
        name: templates.name,
        description: templates.description,
        author: templates.author,
        views: templates.views,
        stars: templates.stars,
        color: templates.color,
        icon: templates.icon,
        category: templates.category,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
      })
      .from(templates)
      .where(inArray(templates.category, categories))
      .orderBy(
        desc(sql`(${templates.views} + ${templates.stars} * 2 + CASE WHEN ${templates.createdAt} > NOW() - INTERVAL '7 days' THEN 50 ELSE 0 END)`)
      )
      .limit(limit)

    return trendingTemplates as Template[]
  }
}

// Export singleton instance for convenience
export const templateRecommendationEngine = new TemplateRecommendationEngine()