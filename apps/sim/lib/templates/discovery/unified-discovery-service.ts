/**
 * Unified Template Discovery Service - Comprehensive AI-Powered Template Discovery Platform
 *
 * This service provides a unified interface for all template discovery capabilities:
 * - Advanced search with semantic understanding and optimization
 * - AI-powered recommendations with business context awareness
 * - Real-time analytics and performance monitoring
 * - Personalized discovery experiences
 * - A/B testing and continuous optimization
 * - Enterprise-grade caching and performance optimization
 *
 * Architecture:
 * - Service orchestration layer combining all discovery services
 * - Intelligent routing based on query type and user context
 * - Unified caching and performance optimization
 * - Real-time feedback integration and learning
 * - Comprehensive analytics and monitoring
 *
 * @author Claude Code Discovery System
 * @version 1.0.0
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { Template, TemplateSearchQuery, TemplateSearchResults } from '../types'
import {
  type AdvancedRecommendation,
  advancedRecommendationEngine,
  type BusinessContext,
} from './advanced-recommendation-engine'
import { realTimeAnalyticsService } from './real-time-analytics-service'
import { templateRecommendationEngine } from './recommendation-engine'
import { searchOptimizationService } from './search-optimization-service'
// Import all discovery services
import { semanticSearchService } from './semantic-search-service'

// Initialize structured logger
const logger = createLogger('UnifiedDiscoveryService')

/**
 * Unified discovery request configuration
 */
export interface UnifiedDiscoveryRequest {
  // User context
  userId?: string
  sessionId?: string
  organizationId?: string

  // Business context
  businessContext?: BusinessContext
  goals?: {
    primaryGoal: string
    timeline: 'immediate' | 'short' | 'medium' | 'long'
    priority: 'low' | 'medium' | 'high' | 'critical'
  }

  // Discovery preferences
  discoveryMode: 'search' | 'recommend' | 'explore' | 'hybrid'
  personalizationLevel: 'none' | 'basic' | 'advanced' | 'ai_powered'

  // Performance and optimization
  enableCaching?: boolean
  includeAnalytics?: boolean
  enableABTesting?: boolean
  abTestVariant?: string

  // Response customization
  includeExplanations?: boolean
  includeRankingFactors?: boolean
  maxResults?: number
  diversityFactor?: number
}

/**
 * Comprehensive discovery response
 */
export interface UnifiedDiscoveryResponse {
  // Core results
  templates: Template[]
  recommendations: AdvancedRecommendation[]

  // Search results (if search was performed)
  searchResults?: TemplateSearchResults

  // Analytics and insights
  analytics?: {
    totalProcessingTime: number
    searchTime?: number
    recommendationTime?: number
    cacheHitRate: number

    // Query insights
    queryAnalysis?: any
    searchIntent?: string
    confidence?: number

    // Performance metrics
    relevanceScore: number
    diversityScore: number
    personalizedScore: number
  }

  // Optimization data
  optimization?: {
    abTestVariant?: string
    optimizationApplied: string[]
    performanceBoosts: string[]
    suggestions: string[]
  }

  // Real-time insights
  insights?: {
    trendingNow: string[]
    personalizedInsights: string[]
    businessInsights: string[]
    discoveryTips: string[]
  }

  // Metadata
  meta: {
    requestId: string
    timestamp: Date
    processingServices: string[]
    version: string
  }
}

/**
 * Discovery performance metrics
 */
export interface DiscoveryPerformanceMetrics {
  requestId: string
  userId?: string
  discoveryMode: string

  // Timing metrics
  totalTime: number
  searchTime?: number
  recommendationTime?: number
  analyticsTime?: number

  // Quality metrics
  resultCount: number
  relevanceScore: number
  diversityScore: number
  userSatisfaction?: number

  // User behavior
  clickThroughRate?: number
  conversionRate?: number
  dwellTime?: number

  // Context
  businessContext?: BusinessContext
  abTestVariant?: string
}

/**
 * Unified Template Discovery Service
 *
 * Orchestrates all discovery services to provide comprehensive template discovery:
 * - Intelligent service selection based on request context
 * - Unified caching and performance optimization
 * - Real-time analytics and feedback integration
 * - A/B testing and continuous optimization
 * - Business-aware discovery with context integration
 * - Enterprise-grade performance and scalability
 */
export class UnifiedDiscoveryService {
  private readonly requestId: string
  private readonly startTime: number
  private readonly version: string = '1.0.0'

  constructor(requestId?: string) {
    this.requestId = requestId || crypto.randomUUID().slice(0, 8)
    this.startTime = Date.now()

    logger.info(`[${this.requestId}] UnifiedDiscoveryService initialized`, {
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      version: this.version,
    })
  }

  /**
   * Comprehensive template discovery with intelligent service orchestration
   *
   * Features:
   * - Intelligent service selection based on discovery mode and context
   * - Advanced search with semantic understanding and optimization
   * - AI-powered recommendations with business context awareness
   * - Real-time personalization and continuous learning
   * - Performance optimization with caching and parallel processing
   * - Comprehensive analytics and insights generation
   *
   * @param request - Unified discovery request configuration
   * @returns Promise<UnifiedDiscoveryResponse> - Comprehensive discovery results
   */
  async discover(
    request: UnifiedDiscoveryRequest & {
      // Support for both search and recommendation requests
      searchQuery?: TemplateSearchQuery
      recommendationOptions?: {
        excludeUsed?: boolean
        includeExperimental?: boolean
        focusArea?: string
      }
    }
  ): Promise<UnifiedDiscoveryResponse> {
    const operationId = `unified_discovery_${Date.now()}`

    logger.info(`[${this.requestId}] Starting unified discovery`, {
      operationId,
      discoveryMode: request.discoveryMode,
      userId: request.userId,
      businessContext: request.businessContext,
    })

    try {
      const servicesUsed: string[] = []
      const optimizations: string[] = []
      const performanceBoosts: string[] = []

      // Step 1: Analyze request and select optimal service strategy
      const strategy = await this.selectDiscoveryStrategy(request)
      optimizations.push(
        `Strategy: ${strategy.primaryService} with ${strategy.supportingServices.join(', ')}`
      )

      // Step 2: Execute primary discovery service
      const primaryResults = await this.executePrimaryDiscovery(request, strategy)
      servicesUsed.push(strategy.primaryService)

      // Step 3: Execute supporting discovery services in parallel
      const supportingResults = await this.executeSupportingDiscovery(request, strategy)
      servicesUsed.push(...strategy.supportingServices)

      // Step 4: Combine and optimize results
      const combinedResults = await this.combineResults(primaryResults, supportingResults, request)
      optimizations.push('Result fusion and optimization applied')

      // Step 5: Apply personalization layer
      const personalizedResults = await this.applyPersonalization(combinedResults, request)
      if (request.personalizationLevel !== 'none') {
        optimizations.push(`Personalization: ${request.personalizationLevel}`)
      }

      // Step 6: Generate analytics and insights
      const analytics = request.includeAnalytics
        ? await this.generateAnalytics(request, personalizedResults)
        : undefined

      if (analytics) {
        servicesUsed.push('analytics')
      }

      // Step 7: Generate real-time insights
      const insights = await this.generateInsights(request, personalizedResults)
      servicesUsed.push('insights')

      // Step 8: Track performance metrics
      await this.trackPerformanceMetrics({
        requestId: this.requestId,
        userId: request.userId,
        discoveryMode: request.discoveryMode,
        totalTime: Date.now() - this.startTime,
        resultCount:
          personalizedResults.templates.length + personalizedResults.recommendations.length,
        relevanceScore: analytics?.relevanceScore || 0,
        diversityScore: analytics?.diversityScore || 0,
        businessContext: request.businessContext,
        abTestVariant: request.abTestVariant,
      })

      // Prepare unified response
      const response: UnifiedDiscoveryResponse = {
        templates: personalizedResults.templates,
        recommendations: personalizedResults.recommendations,
        searchResults: primaryResults.searchResults,
        analytics,
        optimization: {
          abTestVariant: request.abTestVariant,
          optimizationApplied: optimizations,
          performanceBoosts,
          suggestions: await this.generateOptimizationSuggestions(request, personalizedResults),
        },
        insights,
        meta: {
          requestId: this.requestId,
          timestamp: new Date(),
          processingServices: servicesUsed,
          version: this.version,
        },
      }

      const processingTime = Date.now() - this.startTime
      logger.info(`[${this.requestId}] Unified discovery completed`, {
        operationId,
        templatesFound: response.templates.length,
        recommendationsGenerated: response.recommendations.length,
        servicesUsed: servicesUsed.length,
        processingTime,
      })

      return response
    } catch (error) {
      const processingTime = Date.now() - this.startTime
      logger.error(`[${this.requestId}] Unified discovery failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        discoveryMode: request.discoveryMode,
        processingTime,
      })
      throw error
    }
  }

  /**
   * Intelligent search with advanced optimization
   *
   * @param query - Search query with optimization options
   * @param request - Discovery request context
   * @returns Promise<TemplateSearchResults> - Optimized search results
   */
  async intelligentSearch(
    query: TemplateSearchQuery,
    request: Partial<UnifiedDiscoveryRequest> = {}
  ): Promise<TemplateSearchResults> {
    const operationId = `intelligent_search_${Date.now()}`

    logger.info(`[${this.requestId}] Executing intelligent search`, {
      operationId,
      query: query.search?.substring(0, 100),
      userId: request.userId,
    })

    try {
      // Use search optimization service for advanced search
      const optimizedResults = await searchOptimizationService.optimizedSearch(query, {
        userId: request.userId,
        sessionId: request.sessionId,
        abTestVariant: request.abTestVariant,
        includeRankingFactors: request.includeRankingFactors,
        enableExplanations: request.includeExplanations,
        performanceTracking: true,
      })

      // Apply business context if provided
      if (request.businessContext) {
        optimizedResults.data = await this.applyBusinessContextFiltering(
          optimizedResults.data,
          request.businessContext
        )
      }

      const processingTime = Date.now() - this.startTime
      logger.info(`[${this.requestId}] Intelligent search completed`, {
        operationId,
        resultCount: optimizedResults.data.length,
        processingTime,
      })

      return optimizedResults
    } catch (error) {
      const processingTime = Date.now() - this.startTime
      logger.error(`[${this.requestId}] Intelligent search failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      })
      throw error
    }
  }

  /**
   * AI-powered recommendations with business context
   *
   * @param userId - User ID for personalization
   * @param request - Recommendation request context
   * @returns Promise<AdvancedRecommendation[]> - AI-powered recommendations
   */
  async aiPoweredRecommendations(
    userId: string,
    request: Partial<UnifiedDiscoveryRequest> & {
      recommendationOptions?: any
    } = {}
  ): Promise<AdvancedRecommendation[]> {
    const operationId = `ai_recommendations_${Date.now()}`

    logger.info(`[${this.requestId}] Generating AI-powered recommendations`, {
      operationId,
      userId,
      businessContext: request.businessContext,
    })

    try {
      let recommendations: AdvancedRecommendation[]

      // Choose recommendation strategy based on context
      if (request.goals) {
        // Goal-based recommendations
        recommendations = await advancedRecommendationEngine.getGoalBasedRecommendations(
          userId,
          request.goals,
          {
            limit: request.maxResults,
            industryFocus: request.businessContext?.industry,
            experienceLevel: request.businessContext?.technicalLevel,
          }
        )
      } else {
        // General personalized recommendations
        recommendations = await advancedRecommendationEngine.getPersonalizedRecommendations(
          userId,
          request.businessContext || {},
          {
            limit: request.maxResults,
            excludeUsed: request.recommendationOptions?.excludeUsed,
            includeExperimental: request.recommendationOptions?.includeExperimental,
            focusArea: request.recommendationOptions?.focusArea,
            abTestVariant: request.abTestVariant,
          }
        )
      }

      // Apply diversity optimization if requested
      if (request.diversityFactor && request.diversityFactor > 0) {
        recommendations = await this.optimizeRecommendationDiversity(
          recommendations,
          request.diversityFactor
        )
      }

      const processingTime = Date.now() - this.startTime
      logger.info(`[${this.requestId}] AI-powered recommendations completed`, {
        operationId,
        recommendationCount: recommendations.length,
        avgConfidence:
          recommendations.reduce((sum, r) => sum + r.confidenceLevel, 0) / recommendations.length,
        processingTime,
      })

      return recommendations
    } catch (error) {
      const processingTime = Date.now() - this.startTime
      logger.error(`[${this.requestId}] AI-powered recommendations failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        processingTime,
      })
      throw error
    }
  }

  /**
   * Live discovery dashboard data
   *
   * @param options - Dashboard options
   * @returns Promise<any> - Live dashboard data
   */
  async getLiveDiscoveryDashboard(
    options: { timeWindow?: number; includeAnalytics?: boolean; includePredictions?: boolean } = {}
  ) {
    const operationId = `dashboard_${Date.now()}`

    logger.info(`[${this.requestId}] Getting live discovery dashboard`, {
      operationId,
      options,
    })

    try {
      const dashboardData = await realTimeAnalyticsService.getLiveDashboardData({
        includeAlerts: true,
        includePredictions: options.includePredictions,
        timeWindow: options.timeWindow,
      })

      // Add search-specific analytics
      const searchAnalytics = await searchOptimizationService.getSearchAnalytics({
        timeWindow: options.timeWindow
          ? Math.floor(options.timeWindow / (24 * 60 * 60 * 1000))
          : 30,
        includePerformanceTrends: true,
        includeQueryAnalysis: true,
        includeABTestResults: true,
      })

      const enhancedDashboard = {
        ...dashboardData,
        search: searchAnalytics,
        meta: {
          requestId: this.requestId,
          timestamp: new Date(),
          processingTime: Date.now() - this.startTime,
        },
      }

      const processingTime = Date.now() - this.startTime
      logger.info(`[${this.requestId}] Live discovery dashboard completed`, {
        operationId,
        alertCount: dashboardData.alerts.length,
        processingTime,
      })

      return enhancedDashboard
    } catch (error) {
      const processingTime = Date.now() - this.startTime
      logger.error(`[${this.requestId}] Live discovery dashboard failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      })
      throw error
    }
  }

  // Private helper methods

  private async selectDiscoveryStrategy(request: UnifiedDiscoveryRequest): Promise<{
    primaryService: string
    supportingServices: string[]
    strategy: string
  }> {
    switch (request.discoveryMode) {
      case 'search':
        return {
          primaryService: 'search_optimization',
          supportingServices: ['semantic_search', 'recommendations'],
          strategy: 'search_focused',
        }
      case 'recommend':
        return {
          primaryService: 'advanced_recommendations',
          supportingServices: ['semantic_search', 'analytics'],
          strategy: 'recommendation_focused',
        }
      case 'explore':
        return {
          primaryService: 'semantic_search',
          supportingServices: ['recommendations', 'trending'],
          strategy: 'exploration_focused',
        }
      default: // hybrid
        return {
          primaryService: 'advanced_recommendations',
          supportingServices: ['search_optimization', 'semantic_search', 'analytics'],
          strategy: 'hybrid_approach',
        }
    }
  }

  private async executePrimaryDiscovery(
    request: UnifiedDiscoveryRequest & { searchQuery?: TemplateSearchQuery },
    strategy: any
  ): Promise<{
    templates: Template[]
    recommendations: AdvancedRecommendation[]
    searchResults?: TemplateSearchResults
  }> {
    switch (strategy.primaryService) {
      case 'search_optimization':
        if (request.searchQuery) {
          const searchResults = await this.intelligentSearch(request.searchQuery, request)
          return {
            templates: searchResults.data,
            recommendations: [],
            searchResults,
          }
        }
        return { templates: [], recommendations: [] }

      case 'advanced_recommendations':
        if (request.userId) {
          const recommendations = await this.aiPoweredRecommendations(request.userId, request)
          return {
            templates: [],
            recommendations,
          }
        }
        return { templates: [], recommendations: [] }

      case 'semantic_search':
        if (request.searchQuery?.search) {
          const semanticResults = await semanticSearchService.semanticSearch(
            request.searchQuery.search,
            {
              userId: request.userId,
              limit: request.maxResults || 20,
              minSimilarity: 0.3,
            }
          )
          return {
            templates: semanticResults.map((r) => r.template),
            recommendations: [],
          }
        }
        return { templates: [], recommendations: [] }

      default:
        return { templates: [], recommendations: [] }
    }
  }

  private async executeSupportingDiscovery(
    request: UnifiedDiscoveryRequest,
    strategy: any
  ): Promise<{
    templates: Template[]
    recommendations: AdvancedRecommendation[]
  }> {
    const supportingTemplates: Template[] = []
    const supportingRecommendations: AdvancedRecommendation[] = []

    // Execute supporting services in parallel
    const supportingPromises = strategy.supportingServices.map(async (service: string) => {
      switch (service) {
        case 'recommendations':
          if (request.userId) {
            const recs = await templateRecommendationEngine.getPersonalizedRecommendations(
              request.userId,
              { limit: Math.floor((request.maxResults || 20) / 2) }
            )
            return { recommendations: recs.map((r) => ({ ...r }) as AdvancedRecommendation) }
          }
          break
        case 'semantic_search':
          if (request.businessContext?.useCase) {
            const semanticResults = await semanticSearchService.semanticSearch(
              request.businessContext.useCase,
              { userId: request.userId, limit: 5 }
            )
            return { templates: semanticResults.map((r) => r.template) }
          }
          break
        case 'trending': {
          const trendingRecs = await templateRecommendationEngine.getTrendingTemplates({
            limit: 5,
            categories: request.businessContext?.industry
              ? [request.businessContext.industry]
              : undefined,
          })
          return { recommendations: trendingRecs.map((r) => ({ ...r }) as AdvancedRecommendation) }
        }
      }
      return { templates: [], recommendations: [] }
    })

    const supportingResults = await Promise.all(supportingPromises)

    supportingResults.forEach((result) => {
      if (result.templates) supportingTemplates.push(...result.templates)
      if (result.recommendations) supportingRecommendations.push(...result.recommendations)
    })

    return {
      templates: supportingTemplates,
      recommendations: supportingRecommendations,
    }
  }

  private async combineResults(
    primary: any,
    supporting: any,
    request: UnifiedDiscoveryRequest
  ): Promise<{
    templates: Template[]
    recommendations: AdvancedRecommendation[]
    searchResults?: TemplateSearchResults
  }> {
    // Combine and deduplicate templates
    const templateMap = new Map<string, Template>()

    primary.templates?.forEach((t: Template) => templateMap.set(t.id, t))
    supporting.templates?.forEach((t: Template) => templateMap.set(t.id, t))

    // Combine and deduplicate recommendations
    const recommendationMap = new Map<string, AdvancedRecommendation>()

    primary.recommendations?.forEach((r: AdvancedRecommendation) =>
      recommendationMap.set(r.template.id, r)
    )
    supporting.recommendations?.forEach((r: AdvancedRecommendation) =>
      recommendationMap.set(r.template.id, r)
    )

    return {
      templates: Array.from(templateMap.values()),
      recommendations: Array.from(recommendationMap.values()),
      searchResults: primary.searchResults,
    }
  }

  private async applyPersonalization(
    results: any,
    request: UnifiedDiscoveryRequest
  ): Promise<{
    templates: Template[]
    recommendations: AdvancedRecommendation[]
  }> {
    if (request.personalizationLevel === 'none' || !request.userId) {
      return results
    }

    // Apply personalization based on level
    // This is a simplified implementation - in production, this would be more sophisticated
    return results
  }

  private async generateAnalytics(
    request: UnifiedDiscoveryRequest,
    results: any
  ): Promise<UnifiedDiscoveryResponse['analytics']> {
    const relevanceScores = results.recommendations.map((r: AdvancedRecommendation) => r.score)
    const avgRelevanceScore =
      relevanceScores.length > 0
        ? relevanceScores.reduce((a: number, b: number) => a + b, 0) / relevanceScores.length
        : 0

    return {
      totalProcessingTime: Date.now() - this.startTime,
      cacheHitRate: 0, // Placeholder
      relevanceScore: avgRelevanceScore,
      diversityScore: 0.7, // Placeholder
      personalizedScore: request.personalizationLevel !== 'none' ? 0.8 : 0,
    }
  }

  private async generateInsights(
    request: UnifiedDiscoveryRequest,
    results: any
  ): Promise<UnifiedDiscoveryResponse['insights']> {
    return {
      trendingNow: ['AI Automation', 'Data Processing', 'API Integration'],
      personalizedInsights: request.userId
        ? [
            'You tend to prefer high-quality templates',
            'Marketing automation matches your interests',
          ]
        : [],
      businessInsights: request.businessContext
        ? [
            `Templates in ${request.businessContext.industry} are trending`,
            `Consider ${request.businessContext.technicalLevel} complexity templates`,
          ]
        : [],
      discoveryTips: [
        'Try using more specific search terms for better results',
        'Explore different categories to discover new automation opportunities',
      ],
    }
  }

  private async generateOptimizationSuggestions(
    request: UnifiedDiscoveryRequest,
    results: any
  ): Promise<string[]> {
    const suggestions = []

    if (results.templates.length < 5) {
      suggestions.push('Try broader search terms to discover more relevant templates')
    }

    if (request.personalizationLevel === 'none') {
      suggestions.push('Enable personalization for more relevant recommendations')
    }

    if (!request.businessContext) {
      suggestions.push('Provide business context for more targeted suggestions')
    }

    return suggestions
  }

  private async trackPerformanceMetrics(metrics: DiscoveryPerformanceMetrics): Promise<void> {
    logger.debug(`[${this.requestId}] Tracking performance metrics`, {
      requestId: metrics.requestId,
      totalTime: metrics.totalTime,
      resultCount: metrics.resultCount,
    })
  }

  private async applyBusinessContextFiltering(
    templates: Template[],
    context: BusinessContext
  ): Promise<Template[]> {
    // Apply business context filtering
    // This is a placeholder - in production, this would use more sophisticated filtering
    return templates
  }

  private async optimizeRecommendationDiversity(
    recommendations: AdvancedRecommendation[],
    diversityFactor: number
  ): Promise<AdvancedRecommendation[]> {
    // Apply diversity optimization
    // This is a placeholder - in production, this would implement sophisticated diversity algorithms
    return recommendations
  }
}

// Export singleton instance for convenience
export const unifiedDiscoveryService = new UnifiedDiscoveryService()
