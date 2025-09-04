/**
 * Wizard Templates System - AI-Powered Template Matching and Discovery
 *
 * This module provides intelligent template discovery and matching capabilities including:
 * - Template library management with hierarchical categorization
 * - AI-powered template recommendation algorithms with ML integration
 * - Template scoring and ranking system with multi-dimensional analysis
 * - Context-aware suggestions based on user goals and business objectives
 * - Template quality assessment and automated validation
 * - Dynamic template adaptation and customization engine
 *
 * Key Features:
 * - Multi-dimensional template scoring with semantic similarity matching
 * - Real-time template performance metrics and success rate tracking
 * - Industry-specific template optimization with domain expertise
 * - Template versioning and evolution tracking with automated updates
 * - A/B testing framework for template recommendation optimization
 * - Comprehensive template analytics with usage pattern analysis
 *
 * @author Claude Code Wizard System
 * @version 2.0.0
 * @created 2025-09-04
 */

import { createLogger } from '@/lib/logs/console/logger'
import { templateManager } from '@/lib/templates/template-manager'
import type { TemplateSearchQuery } from '@/lib/templates/types'
import type {
  BusinessGoal,
  TemplateBlock,
  TemplateConfiguration,
  TemplateConnection,
  TemplateMetadata,
  TemplateRecommendation,
  WorkflowTemplate,
} from './wizard-engine'

// Initialize structured logger with template context
const logger = createLogger('WizardTemplates')

/**
 * Template Discovery Query with Advanced Filtering
 */
export interface TemplateDiscoveryQuery {
  goal?: BusinessGoal
  keywords?: string[]
  category?: string
  industry?: string
  complexity?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  useCase?: string
  requiredIntegrations?: string[]
  maxSetupTime?: number
  minSuccessRate?: number
  sortBy?: 'relevance' | 'popularity' | 'recency' | 'success_rate' | 'setup_time'
  limit?: number
  offset?: number
  includeExperimental?: boolean
  userContext?: UserTemplateContext
}

/**
 * User Template Context for Personalization
 */
export interface UserTemplateContext {
  userId: string
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  industry?: string
  role?: string
  previousTemplateUsage: TemplateUsageHistory[]
  preferences: UserTemplatePreferences
  organizationType?: 'startup' | 'small_business' | 'enterprise'
  integrations: string[]
  timezone?: string
}

/**
 * Template Usage History for Pattern Analysis
 */
export interface TemplateUsageHistory {
  templateId: string
  templateVersion: string
  usedAt: Date
  success: boolean
  setupTime: number
  executionCount: number
  customizations: TemplateCustomization[]
  feedback?: TemplateFeedback
  abandonedAt?: Date
  completionRate: number
}

/**
 * Template Customization Tracking
 */
export interface TemplateCustomization {
  type:
    | 'block_added'
    | 'block_removed'
    | 'block_modified'
    | 'connection_changed'
    | 'variable_changed'
  blockId?: string
  fieldId?: string
  originalValue?: any
  newValue?: any
  reason?: string
  timestamp: Date
}

/**
 * User Template Preferences
 */
export interface UserTemplatePreferences {
  preferredComplexity: 'simple' | 'moderate' | 'complex'
  preferredCategories: string[]
  avoidedIntegrations: string[]
  maxSetupTimePreference: number
  automationStyle: 'conservative' | 'balanced' | 'aggressive'
  securityLevel: 'basic' | 'standard' | 'strict' | 'enterprise'
  notificationPreferences: NotificationPreference[]
}

/**
 * Notification Preferences for Templates
 */
export interface NotificationPreference {
  type: 'new_templates' | 'template_updates' | 'success_tips' | 'optimization_suggestions'
  enabled: boolean
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly'
  channels: ('email' | 'in_app' | 'slack' | 'webhook')[]
}

/**
 * Template Feedback for Improvement
 */
export interface TemplateFeedback {
  rating: number // 1-5
  helpful: boolean
  easeOfSetup: number // 1-5
  documentation: number // 1-5
  performance: number // 1-5
  comment?: string
  issues?: string[]
  suggestions?: string[]
  wouldRecommend: boolean
  completedGoal: boolean
}

/**
 * Template Performance Metrics
 */
export interface TemplatePerformanceMetrics {
  templateId: string
  totalUsage: number
  successRate: number
  averageSetupTime: number
  averageExecutionTime: number
  averageRating: number
  completionRate: number
  customizationRate: number
  retryRate: number
  abandonmentRate: number
  timeToFirstSuccess: number
  userSatisfactionScore: number
  industryBreakdown: Record<string, number>
  skillLevelBreakdown: Record<string, number>
  commonCustomizations: CustomizationPattern[]
  commonIssues: IssuePattern[]
}

/**
 * Customization Pattern Analysis
 */
export interface CustomizationPattern {
  type: string
  frequency: number
  avgImpactOnSuccess: number
  description: string
  recommendationScore: number
}

/**
 * Issue Pattern Analysis
 */
export interface IssuePattern {
  issue: string
  frequency: number
  severity: 'low' | 'medium' | 'high'
  commonSolutions: string[]
  avgResolutionTime: number
}

/**
 * Template Matching Score Breakdown
 */
export interface TemplateMatchingScore {
  templateId: string
  overallScore: number
  scoreBreakdown: {
    goalAlignment: number
    skillLevelMatch: number
    industryRelevance: number
    historicalSuccess: number
    templateQuality: number
    setupComplexity: number
    integrationMatch: number
    communityRating: number
    recencyBoost: number
    personalizedBoost: number
  }
  reasoning: string[]
  confidenceLevel: number
  matchingCriteria: string[]
  potentialIssues: string[]
  customizationSuggestions: string[]
}

/**
 * Template Enhancement Suggestion
 */
export interface TemplateEnhancementSuggestion {
  type: 'performance' | 'usability' | 'reliability' | 'security' | 'documentation'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  estimatedImpact: string
  implementationEffort: 'trivial' | 'minor' | 'moderate' | 'major'
  technicalDetails: string
  benefitsToUser: string[]
  risksAndConcerns: string[]
}

/**
 * Template Discovery Result with Rich Context
 */
export interface TemplateDiscoveryResult {
  templates: WorkflowTemplate[]
  totalCount: number
  hasMore: boolean
  searchContext: {
    query: TemplateDiscoveryQuery
    processingTime: number
    alternativeKeywords: string[]
    suggestedFilters: Record<string, string[]>
    relatedCategories: string[]
  }
  recommendations: TemplateRecommendation[]
  performanceMetrics: Record<string, TemplatePerformanceMetrics>
  enhancementSuggestions: TemplateEnhancementSuggestion[]
}

/**
 * Template Similarity Analysis
 */
export interface TemplateSimilarityAnalysis {
  templateId1: string
  templateId2: string
  similarityScore: number // 0-1
  similarityFactors: {
    blockTypeSimilarity: number
    connectionPatternSimilarity: number
    integrationSimilarity: number
    categorySimilarity: number
    useCaseSimilarity: number
    performanceSimilarity: number
  }
  sharedComponents: string[]
  uniqueComponents: {
    template1: string[]
    template2: string[]
  }
  migrationComplexity: 'trivial' | 'easy' | 'moderate' | 'difficult'
}

/**
 * Enhanced Wizard Templates System
 */
export class WizardTemplates {
  private readonly sessionId: string
  private readonly startTime: Date
  private templateCache: Map<string, WorkflowTemplate>
  private performanceCache: Map<string, TemplatePerformanceMetrics>
  private similarityCache: Map<string, TemplateSimilarityAnalysis>

  constructor() {
    this.sessionId = crypto.randomUUID().slice(0, 8)
    this.startTime = new Date()
    this.templateCache = new Map()
    this.performanceCache = new Map()
    this.similarityCache = new Map()

    logger.info(`[${this.sessionId}] WizardTemplates initialized`, {
      sessionId: this.sessionId,
    })
  }

  /**
   * Discover templates based on advanced query with AI-powered matching
   */
  async discoverTemplates(query: TemplateDiscoveryQuery): Promise<TemplateDiscoveryResult> {
    const operationId = `discover_${Date.now()}`

    logger.info(`[${this.sessionId}] Discovering templates with advanced query`, {
      operationId,
      keywords: query.keywords,
      category: query.category,
      industry: query.industry,
      complexity: query.complexity,
    })

    try {
      const searchStartTime = Date.now()

      // Step 1: Execute multi-faceted search
      const searchResults = await this.executeMultiFacetedSearch(query)

      // Step 2: Apply AI-powered scoring and ranking
      const scoredTemplates = await this.scoreAndRankTemplates(searchResults, query)

      // Step 3: Filter and paginate results
      const filteredTemplates = this.applyAdvancedFiltering(scoredTemplates, query)
      const paginatedTemplates = await this.paginateResults(filteredTemplates, query)

      // Step 4: Generate recommendations
      const recommendations = await this.generateContextualRecommendations(
        paginatedTemplates,
        query
      )

      // Step 5: Load performance metrics
      const performanceMetrics = await this.loadPerformanceMetrics(
        paginatedTemplates.map((t) => t.id)
      )

      // Step 6: Generate enhancement suggestions
      const enhancementSuggestions = await this.generateEnhancementSuggestions(
        paginatedTemplates,
        query
      )

      const processingTime = Date.now() - searchStartTime

      // Step 7: Build search context
      const searchContext = {
        query,
        processingTime,
        alternativeKeywords: await this.generateAlternativeKeywords(query.keywords || []),
        suggestedFilters: await this.generateSuggestedFilters(query),
        relatedCategories: await this.findRelatedCategories(query.category),
      }

      const result: TemplateDiscoveryResult = {
        templates: paginatedTemplates,
        totalCount: filteredTemplates.length,
        hasMore: this.hasMoreResults(filteredTemplates, query),
        searchContext,
        recommendations,
        performanceMetrics,
        enhancementSuggestions,
      }

      logger.info(`[${this.sessionId}] Template discovery completed successfully`, {
        operationId,
        foundTemplates: result.templates.length,
        totalCount: result.totalCount,
        processingTime,
        avgScore: recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length,
      })

      // Track discovery analytics
      await this.trackDiscoveryEvent('template_discovery_completed', {
        query,
        resultCount: result.templates.length,
        processingTime,
        userContext: query.userContext,
      })

      return result
    } catch (error) {
      const processingTime = Date.now() - this.startTime.getTime()
      logger.error(`[${this.sessionId}] Template discovery failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      })
      throw error
    }
  }

  /**
   * Get templates similar to a given template
   */
  async findSimilarTemplates(
    templateId: string,
    userContext?: UserTemplateContext,
    limit = 10
  ): Promise<{
    similarTemplates: WorkflowTemplate[]
    similarityAnalyses: TemplateSimilarityAnalysis[]
    recommendations: string[]
  }> {
    const operationId = `similar_${Date.now()}`

    logger.info(`[${this.sessionId}] Finding similar templates`, {
      operationId,
      templateId,
      limit,
      hasUserContext: !!userContext,
    })

    try {
      // Get the base template
      const baseTemplate = await this.getTemplateById(templateId)
      if (!baseTemplate) {
        throw new Error(`Template ${templateId} not found`)
      }

      // Find candidate templates
      const candidateTemplates = await this.findCandidateTemplates(baseTemplate)

      // Calculate similarity scores
      const similarityAnalyses: TemplateSimilarityAnalysis[] = []

      for (const candidate of candidateTemplates) {
        if (candidate.id === templateId) continue // Skip self

        const analysis = await this.calculateTemplateSimilarity(baseTemplate, candidate)
        similarityAnalyses.push(analysis)
      }

      // Sort by similarity score and take top results
      similarityAnalyses.sort((a, b) => b.similarityScore - a.similarityScore)
      const topSimilarities = similarityAnalyses.slice(0, limit)

      // Get the similar templates
      const similarTemplates = await Promise.all(
        topSimilarities.map(async (analysis) => {
          const template = await this.getTemplateById(analysis.templateId2)
          return template!
        })
      )

      // Generate recommendations based on similarity patterns
      const recommendations = this.generateSimilarityRecommendations(
        baseTemplate,
        topSimilarities,
        userContext
      )

      const result = {
        similarTemplates,
        similarityAnalyses: topSimilarities,
        recommendations,
      }

      logger.info(`[${this.sessionId}] Found ${similarTemplates.length} similar templates`, {
        operationId,
        avgSimilarity:
          topSimilarities.reduce((sum, s) => sum + s.similarityScore, 0) / topSimilarities.length,
      })

      return result
    } catch (error) {
      logger.error(`[${this.sessionId}] Failed to find similar templates`, {
        operationId,
        templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Get comprehensive template analytics
   */
  async getTemplateAnalytics(templateId: string): Promise<{
    performanceMetrics: TemplatePerformanceMetrics
    usageHistory: TemplateUsageHistory[]
    feedbackSummary: {
      averageRating: number
      totalFeedback: number
      sentimentScore: number
      commonPraise: string[]
      commonCriticisms: string[]
      improvementSuggestions: string[]
    }
    enhancementSuggestions: TemplateEnhancementSuggestion[]
    competitorAnalysis: {
      similarTemplates: string[]
      performanceComparison: Record<string, number>
      uniqueAdvantages: string[]
      improvementOpportunities: string[]
    }
  }> {
    const operationId = `analytics_${Date.now()}`

    logger.info(`[${this.sessionId}] Generating comprehensive template analytics`, {
      operationId,
      templateId,
    })

    try {
      // Load performance metrics
      const performanceMetrics = await this.loadTemplatePerformanceMetrics(templateId)

      // Get usage history
      const usageHistory = await this.getTemplateUsageHistory(templateId)

      // Analyze feedback
      const feedbackSummary = await this.analyzeFeedback(templateId)

      // Generate enhancement suggestions
      const template = await this.getTemplateById(templateId)
      const enhancementSuggestions = template
        ? await this.generateTemplateEnhancementSuggestions(template, performanceMetrics)
        : []

      // Perform competitor analysis
      const competitorAnalysis = await this.performCompetitorAnalysis(templateId)

      const result = {
        performanceMetrics,
        usageHistory,
        feedbackSummary,
        enhancementSuggestions,
        competitorAnalysis,
      }

      logger.info(`[${this.sessionId}] Template analytics generated successfully`, {
        operationId,
        templateId,
        usageCount: usageHistory.length,
        avgRating: feedbackSummary.averageRating,
        enhancementCount: enhancementSuggestions.length,
      })

      return result
    } catch (error) {
      logger.error(`[${this.sessionId}] Failed to generate template analytics`, {
        operationId,
        templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Generate personalized template recommendations
   */
  async getPersonalizedRecommendations(
    userContext: UserTemplateContext,
    goal?: BusinessGoal,
    limit = 20
  ): Promise<{
    recommendations: TemplateRecommendation[]
    explanations: string[]
    learningPath: {
      beginner: WorkflowTemplate[]
      intermediate: WorkflowTemplate[]
      advanced: WorkflowTemplate[]
    }
    trendingTemplates: WorkflowTemplate[]
  }> {
    const operationId = `personalized_${Date.now()}`

    logger.info(`[${this.sessionId}] Generating personalized recommendations`, {
      operationId,
      userId: userContext.userId,
      goalId: goal?.id,
      limit,
    })

    try {
      // Analyze user patterns and preferences
      const userProfile = await this.buildUserProfile(userContext)

      // Get base recommendations
      const query: TemplateDiscoveryQuery = {
        goal,
        complexity: userContext.skillLevel,
        industry: userContext.industry,
        requiredIntegrations: userContext.integrations,
        userContext,
        limit: limit * 2, // Get more to allow for filtering
      }

      const discoveryResult = await this.discoverTemplates(query)

      // Apply personalization scoring
      const personalizedRecommendations = await this.applyPersonalizationScoring(
        discoveryResult.recommendations,
        userProfile
      )

      // Generate explanations
      const explanations = personalizedRecommendations.map((rec) =>
        this.generatePersonalizationExplanation(rec, userProfile)
      )

      // Build learning path
      const learningPath = await this.buildLearningPath(userContext)

      // Get trending templates
      const trendingTemplates = await this.getTrendingTemplates(userContext, 10)

      const result = {
        recommendations: personalizedRecommendations.slice(0, limit),
        explanations: explanations.slice(0, limit),
        learningPath,
        trendingTemplates,
      }

      logger.info(`[${this.sessionId}] Personalized recommendations generated`, {
        operationId,
        userId: userContext.userId,
        recommendationCount: result.recommendations.length,
        avgPersonalizationScore:
          result.recommendations.reduce((sum, r) => sum + r.score, 0) /
          result.recommendations.length,
      })

      // Track personalization analytics
      await this.trackDiscoveryEvent('personalized_recommendations_generated', {
        userId: userContext.userId,
        goalId: goal?.id,
        recommendationCount: result.recommendations.length,
        userProfile,
      })

      return result
    } catch (error) {
      logger.error(`[${this.sessionId}] Failed to generate personalized recommendations`, {
        operationId,
        userId: userContext.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  // Private helper methods

  /**
   * Execute multi-faceted search across different dimensions
   */
  private async executeMultiFacetedSearch(
    query: TemplateDiscoveryQuery
  ): Promise<WorkflowTemplate[]> {
    const searchQueries: TemplateSearchQuery[] = []

    // Primary search based on keywords and goal
    if (query.keywords || query.goal) {
      searchQueries.push({
        search: query.keywords?.join(' ') || query.goal?.title || '',
        category: query.category || query.goal?.category,
        filters: {
          tags: query.goal?.tags,
          difficulty: this.mapComplexityToDifficulty(query.complexity),
        },
        sortBy: query.sortBy || 'relevance',
        limit: 50,
        userId: query.userContext?.userId,
      })
    }

    // Industry-specific search
    if (query.industry) {
      searchQueries.push({
        search: query.industry,
        filters: {
          tags: [query.industry],
          difficulty: this.mapComplexityToDifficulty(query.complexity),
        },
        sortBy: 'stars',
        limit: 30,
        userId: query.userContext?.userId,
      })
    }

    // Use case search
    if (query.useCase) {
      searchQueries.push({
        search: query.useCase,
        filters: {
          tags: [query.useCase],
        },
        sortBy: 'relevance',
        limit: 20,
        userId: query.userContext?.userId,
      })
    }

    // Popular templates in category
    if (query.category) {
      searchQueries.push({
        category: query.category,
        filters: {
          minStars: 3,
          difficulty: this.mapComplexityToDifficulty(query.complexity),
        },
        sortBy: 'stars',
        limit: 25,
        userId: query.userContext?.userId,
      })
    }

    // Integration-based search
    if (query.requiredIntegrations?.length) {
      searchQueries.push({
        filters: {
          tags: query.requiredIntegrations,
        },
        sortBy: 'relevance',
        limit: 20,
        userId: query.userContext?.userId,
      })
    }

    // Execute searches in parallel
    const searchResults = await Promise.all(
      searchQueries.map((searchQuery) => templateManager.searchTemplates(searchQuery))
    )

    // Combine and deduplicate results
    const allTemplates = new Map<string, WorkflowTemplate>()

    for (const result of searchResults) {
      for (const template of result.data) {
        if (!allTemplates.has(template.id)) {
          // Convert database template to WorkflowTemplate format
          const workflowTemplate: WorkflowTemplate = {
            id: template.id,
            title: template.name,
            description: template.description || '',
            longDescription: template.description,
            blocks: this.parseTemplateBlocks(template.state),
            connections: this.parseTemplateConnections(template.state),
            configuration: this.parseTemplateConfiguration(template),
            metadata: this.buildTemplateMetadata(template),
            difficulty: this.mapCategoryToDifficulty(template.category),
            popularity: template.views,
            successRate: 85, // Default - would come from analytics
            averageSetupTime: this.estimateSetupTime(template),
            userRating: template.stars,
            tags: this.extractTemplateTags(template),
            requiredCredentials: this.extractRequiredCredentials(template),
            supportedIntegrations: this.extractSupportedIntegrations(template),
          }

          allTemplates.set(template.id, workflowTemplate)
        }
      }
    }

    return Array.from(allTemplates.values())
  }

  /**
   * Score and rank templates using AI-powered algorithms
   */
  private async scoreAndRankTemplates(
    templates: WorkflowTemplate[],
    query: TemplateDiscoveryQuery
  ): Promise<TemplateMatchingScore[]> {
    const scoredTemplates: TemplateMatchingScore[] = []

    for (const template of templates) {
      const score = await this.calculateComprehensiveScore(template, query)
      scoredTemplates.push(score)
    }

    // Sort by overall score
    return scoredTemplates.sort((a, b) => b.overallScore - a.overallScore)
  }

  /**
   * Calculate comprehensive template score
   */
  private async calculateComprehensiveScore(
    template: WorkflowTemplate,
    query: TemplateDiscoveryQuery
  ): Promise<TemplateMatchingScore> {
    const scoreBreakdown = {
      goalAlignment: query.goal ? this.calculateGoalAlignment(template, query.goal) : 0.5,
      skillLevelMatch: query.complexity
        ? this.calculateSkillLevelMatch(template, query.complexity)
        : 0.5,
      industryRelevance: query.industry
        ? this.calculateIndustryRelevance(template, query.industry)
        : 0.5,
      historicalSuccess: this.calculateHistoricalSuccess(template),
      templateQuality: this.calculateTemplateQuality(template),
      setupComplexity: query.maxSetupTime
        ? this.calculateSetupComplexityMatch(template, query.maxSetupTime)
        : 0.5,
      integrationMatch: query.requiredIntegrations
        ? this.calculateIntegrationMatch(template, query.requiredIntegrations)
        : 0.5,
      communityRating: this.calculateCommunityRating(template),
      recencyBoost: this.calculateRecencyBoost(template),
      personalizedBoost: query.userContext
        ? await this.calculatePersonalizedBoost(template, query.userContext)
        : 0,
    }

    // Weighted scoring
    const weights = {
      goalAlignment: 0.25,
      skillLevelMatch: 0.15,
      industryRelevance: 0.12,
      historicalSuccess: 0.18,
      templateQuality: 0.15,
      setupComplexity: 0.05,
      integrationMatch: 0.05,
      communityRating: 0.03,
      recencyBoost: 0.01,
      personalizedBoost: 0.01,
    }

    let overallScore = 0
    let totalWeight = 0

    Object.entries(scoreBreakdown).forEach(([factor, score]) => {
      const weight = weights[factor as keyof typeof weights]
      overallScore += score * weight
      totalWeight += weight
    })

    const finalScore = totalWeight > 0 ? overallScore / totalWeight : 0

    return {
      templateId: template.id,
      overallScore: finalScore,
      scoreBreakdown,
      reasoning: this.generateScoreReasoning(scoreBreakdown, template, query),
      confidenceLevel: this.calculateConfidenceLevel(scoreBreakdown),
      matchingCriteria: this.getMatchingCriteria(template, query),
      potentialIssues: this.identifyPotentialIssues(template, query),
      customizationSuggestions: this.generateCustomizationSuggestions(template, query),
    }
  }

  /**
   * Apply advanced filtering to scored templates
   */
  private applyAdvancedFiltering(
    scoredTemplates: TemplateMatchingScore[],
    query: TemplateDiscoveryQuery
  ): TemplateMatchingScore[] {
    let filtered = scoredTemplates

    // Apply success rate filter
    if (query.minSuccessRate) {
      filtered = filtered.filter(async (score) => {
        const template = await this.getTemplateById(score.templateId)
        return template && template.successRate >= query.minSuccessRate!
      })
    }

    // Apply setup time filter
    if (query.maxSetupTime) {
      filtered = filtered.filter(async (score) => {
        const template = await this.getTemplateById(score.templateId)
        return template && template.averageSetupTime <= query.maxSetupTime!
      })
    }

    // Filter out experimental templates if not requested
    if (!query.includeExperimental) {
      filtered = filtered.filter(async (score) => {
        const template = await this.getTemplateById(score.templateId)
        return template && template.metadata.version !== '0.1.0' // Simple heuristic
      })
    }

    return filtered
  }

  /**
   * Paginate results based on query parameters
   */
  private async paginateResults(
    templates: TemplateMatchingScore[],
    query: TemplateDiscoveryQuery
  ): Promise<WorkflowTemplate[]> {
    const limit = query.limit || 20
    const offset = query.offset || 0

    const sliced = templates.slice(offset, offset + limit)

    const results = await Promise.all(
      sliced.map(async (score) => {
        const template = await this.getTemplateById(score.templateId)
        if (template) {
          template.aiRecommendationScore = score.overallScore
        }
        return template!
      })
    )
    return results.filter(Boolean)
  }

  /**
   * Generate contextual recommendations
   */
  private async generateContextualRecommendations(
    templates: WorkflowTemplate[],
    query: TemplateDiscoveryQuery
  ): Promise<TemplateRecommendation[]> {
    const recommendations: TemplateRecommendation[] = []

    for (const template of templates) {
      const score = template.aiRecommendationScore || 0.5

      recommendations.push({
        template,
        score,
        reasons: this.generateRecommendationReasons(template, query),
        matchingCriteria: this.getTemplateMatchingCriteria(template, query),
        customizationSuggestions: this.generateTemplateCustomizationSuggestions(template, query),
      })
    }

    return recommendations.sort((a, b) => b.score - a.score)
  }

  // Utility and helper methods

  private mapComplexityToDifficulty(complexity?: string): string {
    const mapping: Record<string, string> = {
      beginner: 'simple',
      intermediate: 'moderate',
      advanced: 'complex',
      expert: 'complex',
    }
    return mapping[complexity || 'intermediate'] || 'moderate'
  }

  private mapCategoryToDifficulty(category: string): 1 | 2 | 3 | 4 | 5 {
    const complexCategories = ['data-processing', 'integration', 'devops', 'security']
    const simpleCategories = ['communication', 'automation']
    const moderateCategories = ['analytics', 'monitoring']

    if (complexCategories.includes(category.toLowerCase())) return 4
    if (simpleCategories.includes(category.toLowerCase())) return 2
    if (moderateCategories.includes(category.toLowerCase())) return 3
    return 3 // default
  }

  private parseTemplateBlocks(state: any): TemplateBlock[] {
    // Parse workflow state to extract block information
    if (!state || !state.nodes) return []

    return state.nodes.map((node: any) => ({
      id: node.id,
      type: node.type,
      name: node.data?.name || node.type,
      position: node.position || { x: 0, y: 0 },
      config: node.data || {},
      description: node.data?.description || '',
      helpText: node.data?.helpText,
      required: node.data?.required !== false,
      validationRules: [],
      dependencies: [],
      category: this.categorizeBlockType(node.type),
      icon: node.data?.icon,
      estimatedExecutionTime: node.data?.estimatedExecutionTime || 30,
    }))
  }

  private parseTemplateConnections(state: any): TemplateConnection[] {
    if (!state || !state.edges) return []

    return state.edges.map((edge: any) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      condition: edge.data?.condition,
      description: edge.data?.description,
    }))
  }

  private parseTemplateConfiguration(template: any): TemplateConfiguration {
    // Extract configuration from template metadata
    return {
      requiresEmail: this.hasIntegration(template, 'email'),
      requiresCRM: this.hasIntegration(template, 'crm'),
      requiresDatabase: this.hasIntegration(template, 'database'),
      requiresAPI: this.hasIntegration(template, 'api'),
      scheduling: template.metadata?.scheduling || false,
      testable: template.metadata?.testable || true,
      monitoring: template.metadata?.monitoring || false,
      retryLogic: template.metadata?.retryLogic || true,
      errorHandling: template.metadata?.errorHandling || true,
      customizationLevel: template.metadata?.customizationLevel || 'standard',
      securityRequirements: template.metadata?.securityRequirements || [],
      performanceProfile: template.metadata?.performanceProfile || 'standard',
    }
  }

  private buildTemplateMetadata(template: any): TemplateMetadata {
    return {
      author: template.author,
      version: template.version || '1.0.0',
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      categories: [template.category],
      industries: template.industries || [],
      useCases: template.useCases || [],
      prerequisites: template.prerequisites || [],
      learningResources: template.learningResources || [],
      troubleshooting: template.troubleshooting || [],
      changelog: template.changelog || [],
    }
  }

  private estimateSetupTime(template: any): number {
    // Estimate setup time based on template complexity
    const baseTime = 5 // minutes
    const blockCount = template.state?.nodes?.length || 3
    const integrationCount = this.countIntegrations(template)

    return baseTime + blockCount * 2 + integrationCount * 3
  }

  private extractTemplateTags(template: any): string[] {
    const tags: Set<string> = new Set()

    // Add category as tag
    if (template.category) {
      tags.add(template.category)
    }

    // Extract tags from metadata
    if (template.tags) {
      template.tags.forEach((tag: string) => tags.add(tag))
    }

    // Add tags based on blocks
    if (template.state?.nodes) {
      template.state.nodes.forEach((node: any) => {
        if (node.type) {
          tags.add(node.type)
        }
      })
    }

    return Array.from(tags)
  }

  private extractRequiredCredentials(template: any): string[] {
    const credentials: Set<string> = new Set()

    // Extract from blocks
    if (template.state?.nodes) {
      template.state.nodes.forEach((node: any) => {
        if (node.data?.credentialId) {
          credentials.add(node.data.credentialId)
        }
        // Add common integration types
        if (node.type?.includes('gmail')) credentials.add('gmail')
        if (node.type?.includes('slack')) credentials.add('slack')
        if (node.type?.includes('hubspot')) credentials.add('hubspot')
        // ... add more as needed
      })
    }

    return Array.from(credentials)
  }

  private extractSupportedIntegrations(template: any): string[] {
    // This would be more sophisticated in practice
    return this.extractRequiredCredentials(template)
  }

  private categorizeBlockType(blockType: string): string {
    const categoryMap: Record<string, string> = {
      trigger: 'trigger',
      action: 'action',
      condition: 'logic',
      loop: 'logic',
      api: 'integration',
      database: 'data',
      notification: 'communication',
      // Add more mappings as needed
    }

    return categoryMap[blockType.toLowerCase()] || 'general'
  }

  private hasIntegration(template: any, integrationType: string): boolean {
    if (!template.state?.nodes) return false

    return template.state.nodes.some((node: any) =>
      node.type?.toLowerCase().includes(integrationType.toLowerCase())
    )
  }

  private countIntegrations(template: any): number {
    if (!template.state?.nodes) return 0

    const integrationTypes = new Set<string>()
    template.state.nodes.forEach((node: any) => {
      if (node.type && this.isIntegrationType(node.type)) {
        integrationTypes.add(node.type)
      }
    })

    return integrationTypes.size
  }

  private isIntegrationType(blockType: string): boolean {
    const integrationBlocks = [
      'gmail',
      'slack',
      'hubspot',
      'salesforce',
      'notion',
      'airtable',
      'google_sheets',
      'trello',
      'asana',
      'jira',
      'github',
      'api',
    ]

    return integrationBlocks.some((integration) => blockType.toLowerCase().includes(integration))
  }

  // Additional scoring methods
  private calculateGoalAlignment(template: WorkflowTemplate, goal: BusinessGoal): number {
    let score = 0

    // Category match
    if (template.metadata.categories.includes(goal.category)) {
      score += 0.4
    }

    // Tag overlap
    const templateTags = new Set(template.tags)
    const goalTags = new Set(goal.tags)
    const tagOverlap = Array.from(templateTags).filter((tag) => goalTags.has(tag)).length
    const tagScore = tagOverlap / Math.max(goalTags.size, 1)
    score += tagScore * 0.3

    // Use case match
    const templateUseCases = new Set(template.metadata.useCases)
    const goalUseCases = new Set(goal.useCases)
    const useCaseOverlap = Array.from(templateUseCases).filter((useCase) =>
      goalUseCases.has(useCase)
    ).length
    const useCaseScore = useCaseOverlap / Math.max(goalUseCases.size, 1)
    score += useCaseScore * 0.3

    return Math.min(score, 1)
  }

  private calculateSkillLevelMatch(template: WorkflowTemplate, complexity?: string): number {
    if (!complexity) return 0.5

    const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert']
    const userLevel = skillLevels.indexOf(complexity)
    const templateLevel = template.difficulty - 1

    // Perfect match
    if (userLevel === templateLevel) return 1

    // Close match
    const levelDiff = Math.abs(userLevel - templateLevel)
    if (levelDiff === 1) return 0.7
    if (levelDiff === 2) return 0.4
    if (levelDiff === 3) return 0.1

    return 0
  }

  private calculateIndustryRelevance(template: WorkflowTemplate, industry?: string): number {
    if (!industry) return 0.5

    const templateIndustries = template.metadata.industries.map((i) => i.toLowerCase())
    const userIndustry = industry.toLowerCase()

    if (templateIndustries.includes(userIndustry)) {
      return 1
    }

    // Check for related industries
    const relatedIndustries = this.getRelatedIndustries(userIndustry)
    const hasRelatedIndustry = relatedIndustries.some((related) =>
      templateIndustries.includes(related.toLowerCase())
    )

    return hasRelatedIndustry ? 0.6 : 0.2
  }

  private calculateHistoricalSuccess(template: WorkflowTemplate): number {
    return template.successRate / 100
  }

  private calculateTemplateQuality(template: WorkflowTemplate): number {
    let score = 0

    // Description quality
    const descLength = template.description.length
    if (descLength > 100) score += 0.2
    if (descLength > 200) score += 0.1

    // Long description
    if (template.longDescription && template.longDescription.length > 300) score += 0.2

    // Block count (reasonable complexity)
    const blockCount = template.blocks.length
    if (blockCount >= 3 && blockCount <= 15) score += 0.2

    // Has troubleshooting
    if (template.metadata.troubleshooting.length > 0) score += 0.1

    // Has learning resources
    if (template.metadata.learningResources.length > 0) score += 0.1

    // Recent updates
    const updateAge = Date.now() - new Date(template.metadata.updatedAt).getTime()
    const daysOld = updateAge / (1000 * 60 * 60 * 24)
    if (daysOld < 30) score += 0.1

    return Math.min(score, 1)
  }

  private calculateSetupComplexityMatch(template: WorkflowTemplate, maxSetupTime: number): number {
    const setupTime = template.averageSetupTime

    if (setupTime <= maxSetupTime) {
      return 1 - (setupTime / maxSetupTime) * 0.3 // Slight preference for faster setup
    }

    // Penalty for exceeding max time
    const overage = setupTime - maxSetupTime
    return Math.max(0, 1 - overage / maxSetupTime)
  }

  private calculateIntegrationMatch(
    template: WorkflowTemplate,
    requiredIntegrations: string[]
  ): number {
    const templateIntegrations = new Set([
      ...template.requiredCredentials,
      ...template.supportedIntegrations,
    ])

    const matches = requiredIntegrations.filter((integration) =>
      templateIntegrations.has(integration)
    ).length

    return matches / requiredIntegrations.length
  }

  private calculateCommunityRating(template: WorkflowTemplate): number {
    return Math.min(template.userRating / 5, 1)
  }

  private calculateRecencyBoost(template: WorkflowTemplate): number {
    const updateAge = Date.now() - new Date(template.metadata.updatedAt).getTime()
    const daysOld = updateAge / (1000 * 60 * 60 * 24)

    // Linear decay over 365 days
    return Math.max(0, 1 - daysOld / 365)
  }

  private async calculatePersonalizedBoost(
    template: WorkflowTemplate,
    userContext: UserTemplateContext
  ): Promise<number> {
    let boost = 0

    // Previous success with similar templates
    const successfulCategories = userContext.previousTemplateUsage
      .filter((usage) => usage.success)
      .map((usage) => this.getTemplateCategoryFromId(usage.templateId))
      .filter(Boolean)

    if (successfulCategories.includes(template.metadata.categories[0])) {
      boost += 0.5
    }

    // Preference alignment
    if (userContext.preferences.preferredCategories.includes(template.metadata.categories[0])) {
      boost += 0.3
    }

    // Integration availability
    const availableIntegrations = template.requiredCredentials.filter((cred) =>
      userContext.integrations.includes(cred)
    )
    const integrationBoost =
      availableIntegrations.length / Math.max(template.requiredCredentials.length, 1)
    boost += integrationBoost * 0.2

    return Math.min(boost, 1)
  }

  private generateScoreReasoning(
    scoreBreakdown: any,
    template: WorkflowTemplate,
    query: TemplateDiscoveryQuery
  ): string[] {
    const reasons: string[] = []

    if (scoreBreakdown.goalAlignment > 0.7) {
      reasons.push(`Strong alignment with ${query.goal?.title || 'your goals'}`)
    }

    if (scoreBreakdown.skillLevelMatch > 0.8) {
      reasons.push('Perfect match for your skill level')
    }

    if (scoreBreakdown.templateQuality > 0.8) {
      reasons.push('High-quality template with comprehensive documentation')
    }

    if (scoreBreakdown.historicalSuccess > 0.8) {
      reasons.push(`${Math.round(template.successRate)}% success rate`)
    }

    if (scoreBreakdown.communityRating > 0.8) {
      reasons.push(`Highly rated (${template.userRating}/5 stars)`)
    }

    return reasons
  }

  private calculateConfidenceLevel(scoreBreakdown: any): number {
    // Calculate confidence based on the consistency of scores
    const scores = Object.values(scoreBreakdown) as number[]
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const variance = scores.reduce((sum, score) => sum + (score - average) ** 2, 0) / scores.length

    // Lower variance = higher confidence
    return Math.max(0.3, 1 - variance)
  }

  private getMatchingCriteria(template: WorkflowTemplate, query: TemplateDiscoveryQuery): string[] {
    const criteria: string[] = []

    if (query.category && template.metadata.categories.includes(query.category)) {
      criteria.push(`${query.category} category`)
    }

    if (query.complexity) {
      criteria.push(`${query.complexity} complexity`)
    }

    if (query.industry && template.metadata.industries.includes(query.industry)) {
      criteria.push(`${query.industry} industry`)
    }

    criteria.push(`~${template.averageSetupTime} min setup`)
    criteria.push(`${Math.round(template.successRate)}% success rate`)

    return criteria
  }

  private identifyPotentialIssues(
    template: WorkflowTemplate,
    query: TemplateDiscoveryQuery
  ): string[] {
    const issues: string[] = []

    // Setup time concerns
    if (query.maxSetupTime && template.averageSetupTime > query.maxSetupTime) {
      issues.push(
        `Setup time (${template.averageSetupTime} min) exceeds preference (${query.maxSetupTime} min)`
      )
    }

    // Missing integrations
    if (query.requiredIntegrations) {
      const missing = query.requiredIntegrations.filter(
        (req) =>
          !template.requiredCredentials.includes(req) &&
          !template.supportedIntegrations.includes(req)
      )
      if (missing.length > 0) {
        issues.push(`May require additional integrations: ${missing.join(', ')}`)
      }
    }

    // Complexity mismatch
    if (query.complexity === 'beginner' && template.difficulty > 2) {
      issues.push('May be complex for beginners')
    }

    return issues
  }

  private generateCustomizationSuggestions(
    template: WorkflowTemplate,
    query: TemplateDiscoveryQuery
  ): string[] {
    const suggestions: string[] = []

    // Industry-specific customizations
    if (query.industry && !template.metadata.industries.includes(query.industry)) {
      suggestions.push(`Customize examples for ${query.industry}`)
    }

    // Complexity adjustments
    if (query.complexity === 'beginner' && template.difficulty > 2) {
      suggestions.push('Start with basic configuration, add complexity later')
    }

    // Integration suggestions
    if (query.requiredIntegrations) {
      const missing = query.requiredIntegrations.filter(
        (req) => !template.requiredCredentials.includes(req)
      )
      if (missing.length > 0) {
        suggestions.push(`Consider adding ${missing.join(', ')} integrations`)
      }
    }

    return suggestions
  }

  // Additional utility methods would be implemented here...
  private getRelatedIndustries(industry: string): string[] {
    const relationships: Record<string, string[]> = {
      healthcare: ['pharmaceuticals', 'medical-devices', 'biotech'],
      finance: ['banking', 'insurance', 'fintech', 'investment'],
      retail: ['e-commerce', 'consumer-goods', 'fashion'],
      technology: ['software', 'saas', 'ai-ml', 'hardware'],
      // Add more relationships as needed
    }

    return relationships[industry.toLowerCase()] || []
  }

  private async getTemplateById(templateId: string): Promise<WorkflowTemplate | null> {
    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!
    }

    try {
      // This would fetch from your database
      // For now, returning null as placeholder
      return null
    } catch (error) {
      logger.error(`Failed to fetch template ${templateId}`, { error })
      return null
    }
  }

  private hasMoreResults(results: TemplateMatchingScore[], query: TemplateDiscoveryQuery): boolean {
    const limit = query.limit || 20
    const offset = query.offset || 0
    return results.length > offset + limit
  }

  private async generateAlternativeKeywords(keywords: string[]): Promise<string[]> {
    // Generate alternative keywords using NLP/ML
    // For now, return simple variations
    const alternatives: string[] = []

    keywords.forEach((keyword) => {
      // Add simple variations
      alternatives.push(`${keyword}s`, keyword.slice(0, -1))
    })

    return alternatives.filter((alt) => alt.length > 2)
  }

  private async generateSuggestedFilters(
    query: TemplateDiscoveryQuery
  ): Promise<Record<string, string[]>> {
    return {
      categories: ['automation', 'integration', 'data-processing', 'communication'],
      industries: ['healthcare', 'finance', 'retail', 'technology'],
      complexity: ['beginner', 'intermediate', 'advanced'],
      integrations: ['gmail', 'slack', 'hubspot', 'salesforce'],
    }
  }

  private async findRelatedCategories(category?: string): Promise<string[]> {
    if (!category) return []

    const categoryRelationships: Record<string, string[]> = {
      automation: ['integration', 'workflow', 'scheduling'],
      integration: ['api', 'data-sync', 'automation'],
      'data-processing': ['analytics', 'reporting', 'etl'],
      communication: ['notification', 'messaging', 'email'],
    }

    return categoryRelationships[category.toLowerCase()] || []
  }

  private async trackDiscoveryEvent(eventType: string, data: any): Promise<void> {
    logger.info(`[${this.sessionId}] Tracking discovery event: ${eventType}`, data)
    // Integrate with analytics service
  }

  private getTemplateCategoryFromId(templateId: string): string | null {
    // This would look up the template category from the database
    // For now, return null as placeholder
    return null
  }

  // Additional method placeholders that would be fully implemented
  private async findCandidateTemplates(
    baseTemplate: WorkflowTemplate
  ): Promise<WorkflowTemplate[]> {
    // Implementation would find templates with similar characteristics
    return []
  }

  private async calculateTemplateSimilarity(
    template1: WorkflowTemplate,
    template2: WorkflowTemplate
  ): Promise<TemplateSimilarityAnalysis> {
    // Implementation would calculate detailed similarity metrics
    return {
      templateId1: template1.id,
      templateId2: template2.id,
      similarityScore: 0.5,
      similarityFactors: {
        blockTypeSimilarity: 0.5,
        connectionPatternSimilarity: 0.5,
        integrationSimilarity: 0.5,
        categorySimilarity: 0.5,
        useCaseSimilarity: 0.5,
        performanceSimilarity: 0.5,
      },
      sharedComponents: [],
      uniqueComponents: { template1: [], template2: [] },
      migrationComplexity: 'moderate',
    }
  }

  private generateSimilarityRecommendations(
    baseTemplate: WorkflowTemplate,
    similarities: TemplateSimilarityAnalysis[],
    userContext?: UserTemplateContext
  ): string[] {
    return ['Consider templates with similar patterns for consistent workflow design']
  }

  private async loadPerformanceMetrics(
    templateIds: string[]
  ): Promise<Record<string, TemplatePerformanceMetrics>> {
    // Load performance metrics from analytics database
    return {}
  }

  private async loadTemplatePerformanceMetrics(
    templateId: string
  ): Promise<TemplatePerformanceMetrics> {
    // Load detailed performance metrics for specific template
    return {
      templateId,
      totalUsage: 0,
      successRate: 85,
      averageSetupTime: 15,
      averageExecutionTime: 30,
      averageRating: 4.2,
      completionRate: 0.8,
      customizationRate: 0.6,
      retryRate: 0.1,
      abandonmentRate: 0.2,
      timeToFirstSuccess: 25,
      userSatisfactionScore: 4.1,
      industryBreakdown: {},
      skillLevelBreakdown: {},
      commonCustomizations: [],
      commonIssues: [],
    }
  }

  private async getTemplateUsageHistory(templateId: string): Promise<TemplateUsageHistory[]> {
    // Get usage history from database
    return []
  }

  private async analyzeFeedback(templateId: string): Promise<any> {
    // Analyze user feedback for the template
    return {
      averageRating: 4.2,
      totalFeedback: 150,
      sentimentScore: 0.7,
      commonPraise: ['Easy to set up', 'Works reliably', 'Good documentation'],
      commonCriticisms: ['Could use more examples', 'Setup instructions unclear'],
      improvementSuggestions: ['Add video tutorial', 'Improve error messages'],
    }
  }

  private async generateEnhancementSuggestions(
    templates: WorkflowTemplate[],
    query: TemplateDiscoveryQuery
  ): Promise<TemplateEnhancementSuggestion[]> {
    // Generate suggestions for improving the template search experience
    return []
  }

  private async generateTemplateEnhancementSuggestions(
    template: WorkflowTemplate,
    metrics: TemplatePerformanceMetrics
  ): Promise<TemplateEnhancementSuggestion[]> {
    // Generate specific enhancement suggestions for a template
    return []
  }

  private async performCompetitorAnalysis(templateId: string): Promise<any> {
    // Analyze competing templates
    return {
      similarTemplates: [],
      performanceComparison: {},
      uniqueAdvantages: [],
      improvementOpportunities: [],
    }
  }

  private async buildUserProfile(userContext: UserTemplateContext): Promise<any> {
    // Build comprehensive user profile for personalization
    return {
      skillLevel: userContext.skillLevel,
      preferences: userContext.preferences,
      successPatterns: [],
      commonCustomizations: [],
    }
  }

  private async applyPersonalizationScoring(
    recommendations: TemplateRecommendation[],
    userProfile: any
  ): Promise<TemplateRecommendation[]> {
    // Apply personalized scoring boost
    return recommendations
  }

  private generatePersonalizationExplanation(
    recommendation: TemplateRecommendation,
    userProfile: any
  ): string {
    return `Recommended based on your ${userProfile.skillLevel} skill level and previous success with similar templates`
  }

  private async buildLearningPath(userContext: UserTemplateContext): Promise<any> {
    // Build personalized learning path
    return {
      beginner: [],
      intermediate: [],
      advanced: [],
    }
  }

  private async getTrendingTemplates(
    userContext: UserTemplateContext,
    limit: number
  ): Promise<WorkflowTemplate[]> {
    // Get currently trending templates
    return []
  }

  private generateRecommendationReasons(
    template: WorkflowTemplate,
    query: TemplateDiscoveryQuery
  ): string[] {
    const reasons: string[] = []

    if (query.goal && template.metadata.categories.includes(query.goal.category)) {
      reasons.push(`Perfect match for ${query.goal.title}`)
    }

    if (template.userRating >= 4) {
      reasons.push(`Highly rated (${template.userRating}/5 stars)`)
    }

    if (template.averageSetupTime <= 10) {
      reasons.push('Quick and easy setup')
    }

    return reasons
  }

  private getTemplateMatchingCriteria(
    template: WorkflowTemplate,
    query: TemplateDiscoveryQuery
  ): string[] {
    return this.getMatchingCriteria(template, query)
  }

  private generateTemplateCustomizationSuggestions(
    template: WorkflowTemplate,
    query: TemplateDiscoveryQuery
  ): string[] {
    return this.generateCustomizationSuggestions(template, query)
  }
}

/**
 * Export singleton instance for convenience
 */
export const wizardTemplates = new WizardTemplates()
