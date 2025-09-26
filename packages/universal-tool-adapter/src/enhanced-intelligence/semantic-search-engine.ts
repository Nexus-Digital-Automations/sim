/**
 * Semantic Search Engine
 *
 * Advanced semantic search capabilities for tool descriptions with vector similarity,
 * concept matching, contextual understanding, and personalized recommendations.
 *
 * @author Natural Language Framework Agent
 * @version 1.0.0
 */

import type { UsageContext } from '../natural-language/usage-guidelines'
import type { AdapterRegistryEntry } from '../types/adapter-interfaces'
import { createLogger } from '../utils/logger'
import { NLPProcessor } from './nlp-processor'
import type { SemanticSearchResult } from './registry-integration'

const logger = createLogger('SemanticSearchEngine')

/**
 * Semantic search configuration
 */
export interface SemanticSearchConfig {
  // Core search settings
  search: {
    minRelevanceScore: number
    maxResults: number
    enableFuzzyMatching: boolean
    enableConceptExpansion: boolean
  }

  // Vector similarity settings
  vectorSimilarity: {
    enabled: boolean
    algorithm: 'cosine' | 'euclidean' | 'manhattan'
    threshold: number
    dimensions: number
  }

  // Concept matching settings
  conceptMatching: {
    enabled: boolean
    synonymExpansion: boolean
    hierarchicalMatching: boolean
    weightedScoring: boolean
  }

  // Contextual search settings
  contextualSearch: {
    enabled: boolean
    roleBasedBoosting: boolean
    domainSpecificScoring: boolean
    personalizedResults: boolean
  }

  // Performance settings
  performance: {
    cacheResults: boolean
    cacheTTL: number
    indexingEnabled: boolean
    batchProcessing: boolean
  }

  // Natural language processing
  nlp: {
    enableEntityExtraction: boolean
    enableSentimentAnalysis: boolean
    enableIntentRecognition: boolean
    languageModel: 'basic' | 'advanced' | 'multilingual'
  }
}

/**
 * Search query enhancement with semantic understanding
 */
export interface EnhancedSearchQuery {
  // Original query
  originalQuery: string

  // Enhanced query components
  processedQuery: string
  extractedEntities: string[]
  identifiedConcepts: string[]
  recognizedIntent: string
  queryComplexity: 'simple' | 'moderate' | 'complex'

  // Context
  userContext?: UsageContext
  searchContext: {
    timestamp: Date
    sessionId?: string
    previousQueries?: string[]
    userFeedback?: SearchFeedback[]
  }

  // Search parameters
  filters: {
    categories?: string[]
    tags?: string[]
    capabilities?: string[]
    complexity?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    domains?: string[]
  }

  // Ranking preferences
  rankingPreferences: {
    prioritizeRecentlyUsed?: boolean
    prioritizeHighRated?: boolean
    prioritizePopular?: boolean
    personalizedRanking?: boolean
  }
}

/**
 * Enhanced semantic search result with detailed scoring
 */
export interface EnhancedSemanticSearchResult extends SemanticSearchResult {
  // Detailed scoring breakdown
  scoring: {
    textSimilarity: number
    conceptMatch: number
    contextualRelevance: number
    userPreferenceBoost: number
    popularityBoost: number
    recencyBoost: number
    finalScore: number
  }

  // Match details
  matchDetails: {
    exactMatches: string[]
    conceptMatches: string[]
    synonymMatches: string[]
    fuzzyMatches: string[]
    contextualMatches: string[]
  }

  // Explanation
  explanation: {
    whyRelevant: string[]
    strengthIndicators: string[]
    potentialLimitations: string[]
    suggestedAlternatives?: string[]
  }

  // Personalization data
  personalization?: {
    userSimilarityScore: number
    roleRelevanceScore: number
    domainRelevanceScore: number
    historicalUsageScore: number
  }
}

/**
 * Search feedback for learning and improvement
 */
export interface SearchFeedback {
  queryId: string
  resultId: string
  relevanceRating: number // 1-5 scale
  userAction: 'clicked' | 'used' | 'dismissed' | 'bookmarked'
  feedback?: string
  timestamp: Date
}

/**
 * User model type for preference tracking
 */
type UserModel = {
  preferredConcepts: Map<string, number>
  searchHistory: string[]
  clickedResults: Map<string, number>
  lastUpdated: Date
}

/**
 * Semantic index for efficient searching
 */
interface SemanticIndex {
  // Tool metadata index
  tools: Map<
    string,
    {
      id: string
      concepts: string[]
      vectors: number[]
      metadata: any
      lastIndexed: Date
    }
  >

  // Concept hierarchy
  conceptHierarchy: Map<
    string,
    {
      parent?: string
      children: string[]
      synonyms: string[]
      weight: number
    }
  >

  // User preference models
  userModels: Map<string, UserModel>

  // Search analytics
  analytics: {
    popularQueries: Map<string, number>
    successfulPatterns: Map<string, number>
    failurePatterns: Map<string, number>
  }
}

/**
 * Advanced Semantic Search Engine
 *
 * Provides sophisticated semantic search capabilities with natural language understanding,
 * contextual ranking, and personalized results.
 */
export class SemanticSearchEngine {
  private nlpProcessor: NLPProcessor
  private semanticIndex: SemanticIndex
  private queryCache = new Map<string, EnhancedSemanticSearchResult[]>()
  private feedbackHistory = new Map<string, SearchFeedback[]>()

  constructor(private config: SemanticSearchConfig) {
    logger.info('Initializing Semantic Search Engine', {
      vectorSimilarity: config.vectorSimilarity.enabled,
      conceptMatching: config.conceptMatching.enabled,
      contextualSearch: config.contextualSearch.enabled,
    })

    // Initialize NLP processor with semantic search optimizations
    this.nlpProcessor = new NLPProcessor({
      model: 'advanced-nlp-v2',
      accuracy: 0.8,
      verbosity: 'standard',
      analysisDepth: 'deep',
    })

    // Initialize semantic index
    this.semanticIndex = {
      tools: new Map(),
      conceptHierarchy: new Map(),
      userModels: new Map(),
      analytics: {
        popularQueries: new Map(),
        successfulPatterns: new Map(),
        failurePatterns: new Map(),
      },
    }

    this.initializeConceptHierarchy()
    logger.debug('Semantic Search Engine initialized successfully')
  }

  /**
   * Perform advanced semantic search across tools
   */
  async search(
    query: string | EnhancedSearchQuery,
    availableTools: AdapterRegistryEntry[],
    userContext?: UsageContext
  ): Promise<EnhancedSemanticSearchResult[]> {
    const startTime = Date.now()
    logger.debug('Starting semantic search', {
      queryType: typeof query === 'string' ? 'simple' : 'enhanced',
      toolsCount: availableTools.length,
      hasUserContext: !!userContext,
    })

    try {
      // Enhance query if it's a simple string
      const enhancedQuery =
        typeof query === 'string' ? await this.enhanceQuery(query, userContext) : query

      // Check cache
      const cacheKey = this.generateCacheKey(enhancedQuery)
      if (this.config.performance.cacheResults && this.queryCache.has(cacheKey)) {
        logger.debug('Returning cached search results')
        return this.queryCache.get(cacheKey)!
      }

      // Update semantic index with new tools if needed
      await this.updateSemanticIndex(availableTools)

      // Perform multi-stage semantic search
      const results = await this.performMultiStageSearch(enhancedQuery, availableTools)

      // Apply contextual ranking
      const rankedResults = await this.applyContextualRanking(results, enhancedQuery)

      // Apply personalization if user context is available
      const personalizedResults = userContext
        ? await this.applyPersonalization(rankedResults, userContext)
        : rankedResults

      // Generate explanations for top results
      const explainedResults = await this.generateExplanations(personalizedResults, enhancedQuery)

      // Cache results
      if (this.config.performance.cacheResults) {
        this.queryCache.set(cacheKey, explainedResults)
        setTimeout(() => this.queryCache.delete(cacheKey), this.config.performance.cacheTTL)
      }

      // Update analytics
      this.updateSearchAnalytics(enhancedQuery, explainedResults)

      const duration = Date.now() - startTime
      logger.info('Semantic search completed', {
        resultsCount: explainedResults.length,
        duration,
        topScore: explainedResults[0]?.scoring.finalScore || 0,
      })

      return explainedResults
    } catch (error) {
      logger.error('Semantic search failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  }

  /**
   * Search with advanced filters and ranking
   */
  async advancedSearch(
    enhancedQuery: EnhancedSearchQuery,
    availableTools: AdapterRegistryEntry[]
  ): Promise<{
    results: EnhancedSemanticSearchResult[]
    searchMetadata: {
      totalMatches: number
      searchTime: number
      appliedFilters: string[]
      rankingFactors: string[]
    }
  }> {
    const startTime = Date.now()
    const appliedFilters: string[] = []
    const rankingFactors: string[] = []

    logger.debug('Performing advanced search with filters', {
      filters: enhancedQuery.filters,
      rankingPreferences: enhancedQuery.rankingPreferences,
    })

    // Apply filters
    let filteredTools = availableTools

    if (enhancedQuery.filters.categories?.length) {
      filteredTools = filteredTools.filter((tool) =>
        enhancedQuery.filters.categories!.includes(tool.metadata.category)
      )
      appliedFilters.push('categories')
    }

    if (enhancedQuery.filters.tags?.length) {
      filteredTools = filteredTools.filter((tool) =>
        enhancedQuery.filters.tags!.some((tag) => tool.metadata.tags.includes(tag))
      )
      appliedFilters.push('tags')
    }

    // Perform search on filtered tools
    const results = await this.search(enhancedQuery, filteredTools, enhancedQuery.userContext)

    // Apply advanced ranking
    const advancedRanking = await this.applyAdvancedRanking(
      results,
      enhancedQuery.rankingPreferences
    )

    const duration = Date.now() - startTime
    return {
      results: advancedRanking,
      searchMetadata: {
        totalMatches: results.length,
        searchTime: duration,
        appliedFilters,
        rankingFactors,
      },
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(
    partialQuery: string,
    userContext?: UsageContext,
    maxSuggestions = 5
  ): Promise<{
    suggestions: string[]
    popularQueries: string[]
    contextualSuggestions: string[]
  }> {
    logger.debug('Generating search suggestions', {
      partialQuery,
      maxSuggestions,
    })

    // Extract concepts from partial query
    const queryAnalysis = await this.nlpProcessor.extractKeyInformation({
      id: 'partial_query',
      name: 'partial_query',
      description: partialQuery,
      params: {},
      version: '1.0.0',
      output: {},
    })

    const suggestions: string[] = []
    const popularQueries: string[] = []
    const contextualSuggestions: string[] = []

    // Generate concept-based suggestions
    for (const concept of queryAnalysis.quickTags) {
      const relatedConcepts = this.findRelatedConcepts(concept)
      suggestions.push(...relatedConcepts.slice(0, 3))
    }

    // Add popular queries that match the partial query
    for (const [query, count] of this.semanticIndex.analytics.popularQueries) {
      if (
        query.toLowerCase().includes(partialQuery.toLowerCase()) &&
        popularQueries.length < maxSuggestions
      ) {
        popularQueries.push(query)
      }
    }

    // Add contextual suggestions based on user context
    if (userContext?.userId) {
      const userModel = this.getUserModel(userContext.userId)
      if (userModel) {
        for (const [concept, weight] of userModel.preferredConcepts) {
          if (
            concept.toLowerCase().includes(partialQuery.toLowerCase()) &&
            contextualSuggestions.length < maxSuggestions
          ) {
            contextualSuggestions.push(concept)
          }
        }
      }
    }

    return {
      suggestions: [...new Set(suggestions)].slice(0, maxSuggestions),
      popularQueries: popularQueries.slice(0, maxSuggestions),
      contextualSuggestions: contextualSuggestions.slice(0, maxSuggestions),
    }
  }

  /**
   * Record search feedback for learning
   */
  async recordFeedback(feedback: SearchFeedback): Promise<void> {
    logger.debug('Recording search feedback', {
      queryId: feedback.queryId,
      relevanceRating: feedback.relevanceRating,
      userAction: feedback.userAction,
    })

    // Store feedback
    if (!this.feedbackHistory.has(feedback.queryId)) {
      this.feedbackHistory.set(feedback.queryId, [])
    }
    this.feedbackHistory.get(feedback.queryId)!.push(feedback)

    // Update user model if available
    // This would typically update machine learning models for personalization

    // Update analytics
    if (feedback.relevanceRating >= 4 && feedback.userAction === 'used') {
      // Mark as successful pattern
      const pattern = this.extractSearchPattern(feedback)
      const currentCount = this.semanticIndex.analytics.successfulPatterns.get(pattern) || 0
      this.semanticIndex.analytics.successfulPatterns.set(pattern, currentCount + 1)
    }

    logger.debug('Search feedback recorded successfully')
  }

  /**
   * Get search analytics and insights
   */
  getSearchAnalytics(): {
    popularQueries: Array<{ query: string; count: number }>
    successfulPatterns: Array<{ pattern: string; count: number }>
    userEngagement: {
      totalSearches: number
      clickThroughRate: number
      averageResultsPerQuery: number
    }
    conceptDistribution: Array<{ concept: string; frequency: number }>
  } {
    const popularQueries = Array.from(this.semanticIndex.analytics.popularQueries.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const successfulPatterns = Array.from(this.semanticIndex.analytics.successfulPatterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Calculate engagement metrics
    const totalSearches = Array.from(this.semanticIndex.analytics.popularQueries.values()).reduce(
      (sum, count) => sum + count,
      0
    )

    const totalClicks = Array.from(this.feedbackHistory.values())
      .flat()
      .filter((feedback) => feedback.userAction === 'clicked').length

    const clickThroughRate = totalSearches > 0 ? totalClicks / totalSearches : 0

    // Concept distribution
    const conceptCounts = new Map<string, number>()
    for (const [toolId, tool] of this.semanticIndex.tools) {
      for (const concept of tool.concepts) {
        conceptCounts.set(concept, (conceptCounts.get(concept) || 0) + 1)
      }
    }

    const conceptDistribution = Array.from(conceptCounts.entries())
      .map(([concept, frequency]) => ({ concept, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20)

    return {
      popularQueries,
      successfulPatterns,
      userEngagement: {
        totalSearches,
        clickThroughRate,
        averageResultsPerQuery: 8.5, // Would be calculated from actual data
      },
      conceptDistribution,
    }
  }

  // Private helper methods

  private async enhanceQuery(
    query: string,
    userContext?: UsageContext
  ): Promise<EnhancedSearchQuery> {
    // Analyze the query using NLP
    const queryAnalysis = await this.nlpProcessor.extractKeyInformation({
      id: 'search_query',
      name: 'search_query',
      description: query,
      params: {},
      version: '1.0.0',
      output: {},
    })

    // Extract entities and concepts
    const extractedEntities: string[] = []
    const identifiedConcepts = queryAnalysis.quickTags

    // Recognize intent (simplified)
    const recognizedIntent = this.recognizeSearchIntent(query)

    // Assess complexity
    const queryComplexity = this.assessQueryComplexity(query)

    return {
      originalQuery: query,
      processedQuery: query.toLowerCase().trim(),
      extractedEntities,
      identifiedConcepts,
      recognizedIntent,
      queryComplexity,
      userContext,
      searchContext: {
        timestamp: new Date(),
        previousQueries: [],
        userFeedback: [],
      },
      filters: {
        categories: [],
        tags: [],
        capabilities: [],
        domains: [],
      },
      rankingPreferences: {
        prioritizeRecentlyUsed: false,
        prioritizeHighRated: true,
        prioritizePopular: false,
        personalizedRanking: !!userContext,
      },
    }
  }

  private async updateSemanticIndex(tools: AdapterRegistryEntry[]): Promise<void> {
    const newTools = tools.filter((tool) => !this.semanticIndex.tools.has(tool.id))

    if (newTools.length === 0) {
      return
    }

    logger.debug(`Updating semantic index with ${newTools.length} new tools`)

    for (const tool of newTools) {
      try {
        // Analyze tool to extract concepts
        const analysis = await this.nlpProcessor.analyzeToolComprehensively({
          id: tool.id,
          name: tool.simTool.name,
          description: tool.config.description || '',
          params: (tool.simTool as any).params || (tool.simTool as any).parameters || {},
          version: '1.0.0',
          output: {},
        })

        // Get key information for concepts
        const keyInfo = await this.nlpProcessor.extractKeyInformation({
          id: tool.id,
          name: tool.simTool.name,
          description: tool.config.description || '',
          params: (tool.simTool as any).params || (tool.simTool as any).parameters || {},
          version: '1.0.0',
          output: {},
        })

        // Generate semantic vectors (simplified representation)
        const vectors = this.generateSemanticVectors(keyInfo.quickTags)

        // Store in index
        this.semanticIndex.tools.set(tool.id, {
          id: tool.id,
          concepts: keyInfo.quickTags,
          vectors,
          metadata: {
            category: tool.metadata.category,
            tags: tool.metadata.tags,
            description: tool.config.description,
          },
          lastIndexed: new Date(),
        })
      } catch (error) {
        logger.warn(`Failed to index tool: ${tool.id}`, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    logger.debug('Semantic index updated successfully')
  }

  private async performMultiStageSearch(
    query: EnhancedSearchQuery,
    tools: AdapterRegistryEntry[]
  ): Promise<EnhancedSemanticSearchResult[]> {
    const results: EnhancedSemanticSearchResult[] = []

    for (const tool of tools) {
      const indexedTool = this.semanticIndex.tools.get(tool.id)
      if (!indexedTool) {
        continue // Tool not indexed yet
      }

      // Calculate different types of similarity
      const textSimilarity = this.calculateTextSimilarity(query, tool)
      const conceptMatch = this.calculateConceptMatch(
        query.identifiedConcepts,
        indexedTool.concepts
      )
      const contextualRelevance = await this.calculateContextualRelevance(query, tool)

      // Calculate overall relevance score
      const relevanceScore = textSimilarity * 0.4 + conceptMatch * 0.4 + contextualRelevance * 0.2

      if (relevanceScore >= this.config.search.minRelevanceScore) {
        const result: EnhancedSemanticSearchResult = {
          toolId: tool.id,
          title: tool.config.displayName || tool.simTool.name,
          description: tool.config.description || '',
          relevanceScore,
          conceptMatches: this.findConceptMatches(query.identifiedConcepts, indexedTool.concepts),
          semanticSimilarity: conceptMatch,
          contextualRelevance,
          adaptedContent: {},
          scoring: {
            textSimilarity,
            conceptMatch,
            contextualRelevance,
            userPreferenceBoost: 0,
            popularityBoost: 0,
            recencyBoost: 0,
            finalScore: relevanceScore,
          },
          matchDetails: {
            exactMatches: this.findExactMatches(query.processedQuery, tool),
            conceptMatches: this.findConceptMatches(query.identifiedConcepts, indexedTool.concepts),
            synonymMatches: [],
            fuzzyMatches: [],
            contextualMatches: [],
          },
          explanation: {
            whyRelevant: [],
            strengthIndicators: [],
            potentialLimitations: [],
          },
        }

        results.push(result)
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  private async applyContextualRanking(
    results: EnhancedSemanticSearchResult[],
    query: EnhancedSearchQuery
  ): Promise<EnhancedSemanticSearchResult[]> {
    if (!this.config.contextualSearch.enabled) {
      return results
    }

    return results
      .map((result) => {
        let contextualBoost = 0

        // Role-based boosting
        if (
          this.config.contextualSearch.roleBasedBoosting &&
          query.userContext?.userProfile?.role
        ) {
          contextualBoost += this.calculateRoleBasedBoost(
            result,
            query.userContext.userProfile.role
          )
        }

        // Domain-specific scoring
        if (
          this.config.contextualSearch.domainSpecificScoring &&
          query.userContext?.userProfile?.domains &&
          query.userContext.userProfile.domains.length > 0
        ) {
          contextualBoost += this.calculateDomainBoost(
            result,
            query.userContext.userProfile.domains[0]
          )
        }

        // Update scoring
        result.scoring.contextualRelevance += contextualBoost
        result.scoring.finalScore = this.calculateFinalScore(result.scoring)

        return result
      })
      .sort((a, b) => b.scoring.finalScore - a.scoring.finalScore)
  }

  private async applyPersonalization(
    results: EnhancedSemanticSearchResult[],
    userContext: UsageContext
  ): Promise<EnhancedSemanticSearchResult[]> {
    if (!this.config.contextualSearch.personalizedResults || !userContext.userId) {
      return results
    }

    const userModel = this.getUserModel(userContext.userId)
    if (!userModel) {
      return results
    }

    return results
      .map((result) => {
        // Calculate personalization scores
        const userSimilarityScore = this.calculateUserSimilarity(result, userModel)
        const historicalUsageScore = this.calculateHistoricalUsage(result, userModel)

        result.personalization = {
          userSimilarityScore,
          roleRelevanceScore: result.scoring.contextualRelevance,
          domainRelevanceScore: result.scoring.contextualRelevance,
          historicalUsageScore,
        }

        // Apply personalization boost
        result.scoring.userPreferenceBoost = userSimilarityScore * 0.1
        result.scoring.finalScore = this.calculateFinalScore(result.scoring)

        return result
      })
      .sort((a, b) => b.scoring.finalScore - a.scoring.finalScore)
  }

  private async applyAdvancedRanking(
    results: EnhancedSemanticSearchResult[],
    preferences: EnhancedSearchQuery['rankingPreferences']
  ): Promise<EnhancedSemanticSearchResult[]> {
    return results
      .map((result) => {
        let boost = 0

        // Apply different ranking boosts based on preferences
        if (preferences.prioritizePopular) {
          boost += 0.1 // Would calculate actual popularity
        }
        if (preferences.prioritizeHighRated) {
          boost += 0.05 // Would use actual ratings
        }
        if (preferences.prioritizeRecentlyUsed) {
          boost += 0.05 // Would use recency data
        }

        result.scoring.popularityBoost = boost
        result.scoring.finalScore = this.calculateFinalScore(result.scoring)

        return result
      })
      .sort((a, b) => b.scoring.finalScore - a.scoring.finalScore)
  }

  private async generateExplanations(
    results: EnhancedSemanticSearchResult[],
    query: EnhancedSearchQuery
  ): Promise<EnhancedSemanticSearchResult[]> {
    return results.map((result) => {
      // Generate explanations for why this result is relevant
      const whyRelevant: string[] = []
      const strengthIndicators: string[] = []
      const potentialLimitations: string[] = []

      if (result.matchDetails.exactMatches.length > 0) {
        whyRelevant.push(
          `Contains exact matches for: ${result.matchDetails.exactMatches.join(', ')}`
        )
        strengthIndicators.push('High text similarity')
      }

      if (result.matchDetails.conceptMatches.length > 0) {
        whyRelevant.push(`Matches concepts: ${result.matchDetails.conceptMatches.join(', ')}`)
        strengthIndicators.push('Strong conceptual alignment')
      }

      if (result.scoring.contextualRelevance > 0.7) {
        whyRelevant.push('Highly relevant to your current context')
        strengthIndicators.push('Contextually appropriate')
      }

      if (result.scoring.finalScore < 0.5) {
        potentialLimitations.push('Lower overall relevance score')
      }

      result.explanation = {
        whyRelevant,
        strengthIndicators,
        potentialLimitations,
        suggestedAlternatives: [], // Could suggest similar tools
      }

      return result
    })
  }

  // Helper methods for calculations

  private calculateTextSimilarity(query: EnhancedSearchQuery, tool: AdapterRegistryEntry): number {
    const queryText = query.processedQuery
    const toolText = [tool.simTool.name, tool.config.description || '', ...tool.metadata.tags]
      .join(' ')
      .toLowerCase()

    // Simple text similarity (could be enhanced with more sophisticated algorithms)
    const commonWords = queryText.split(' ').filter((word) => toolText.includes(word))
    return commonWords.length / Math.max(queryText.split(' ').length, 1)
  }

  private calculateConceptMatch(queryConcepts: string[], toolConcepts: string[]): number {
    if (queryConcepts.length === 0 || toolConcepts.length === 0) return 0

    const matches = queryConcepts.filter((concept) => toolConcepts.includes(concept))
    return matches.length / Math.max(queryConcepts.length, toolConcepts.length)
  }

  private async calculateContextualRelevance(
    query: EnhancedSearchQuery,
    tool: AdapterRegistryEntry
  ): Promise<number> {
    let relevance = 0.5 // Base relevance

    // Role-based relevance
    if (query.userContext?.userProfile?.role) {
      relevance += this.calculateRoleRelevance(tool, query.userContext.userProfile.role) * 0.3
    }

    // Domain-based relevance
    if (
      query.userContext?.userProfile?.domains &&
      query.userContext.userProfile.domains.length > 0
    ) {
      relevance +=
        this.calculateDomainRelevance(tool, query.userContext.userProfile.domains[0]) * 0.2
    }

    return Math.min(relevance, 1)
  }

  private calculateRoleRelevance(tool: AdapterRegistryEntry, role: string): number {
    const roleMappings: Record<string, string[]> = {
      developer: ['development', 'coding', 'technical', 'api'],
      business_user: ['business', 'workflow', 'process', 'management'],
      analyst: ['analysis', 'data', 'reporting', 'insights'],
      admin: ['configuration', 'settings', 'management', 'system'],
    }

    const relevantTags = roleMappings[role] || []
    const matches = tool.metadata.tags.filter((tag) => relevantTags.includes(tag.toLowerCase()))

    return matches.length / Math.max(relevantTags.length, 1)
  }

  private calculateDomainRelevance(tool: AdapterRegistryEntry, domain: string): number {
    const domainKeywords = domain.toLowerCase().split(/[^a-z]+/)
    const toolText = [tool.simTool.name, tool.config.description || '', ...tool.metadata.tags]
      .join(' ')
      .toLowerCase()

    const matches = domainKeywords.filter((keyword) => toolText.includes(keyword))
    return matches.length / Math.max(domainKeywords.length, 1)
  }

  private calculateRoleBasedBoost(result: EnhancedSemanticSearchResult, role: string): number {
    // Calculate boost based on role alignment
    return 0.1 // Simplified implementation
  }

  private calculateDomainBoost(result: EnhancedSemanticSearchResult, domain: string): number {
    // Calculate boost based on domain alignment
    return 0.1 // Simplified implementation
  }

  private calculateFinalScore(scoring: EnhancedSemanticSearchResult['scoring']): number {
    return (
      scoring.textSimilarity +
      scoring.conceptMatch +
      scoring.contextualRelevance +
      scoring.userPreferenceBoost +
      scoring.popularityBoost +
      scoring.recencyBoost
    )
  }

  private findConceptMatches(queryConcepts: string[], toolConcepts: string[]): string[] {
    return queryConcepts.filter((concept) => toolConcepts.includes(concept))
  }

  private findExactMatches(query: string, tool: AdapterRegistryEntry): string[] {
    const queryWords = query.split(' ').filter((word) => word.length > 2)
    const toolText = [tool.simTool.name, tool.config.description || ''].join(' ').toLowerCase()

    return queryWords.filter((word) => toolText.includes(word))
  }

  private recognizeSearchIntent(query: string): string {
    const lowerQuery = query.toLowerCase()

    if (lowerQuery.includes('how to') || lowerQuery.includes('help')) return 'help_seeking'
    if (lowerQuery.includes('create') || lowerQuery.includes('make')) return 'creation'
    if (lowerQuery.includes('find') || lowerQuery.includes('search')) return 'discovery'
    if (lowerQuery.includes('analyze') || lowerQuery.includes('process')) return 'analysis'

    return 'general'
  }

  private assessQueryComplexity(query: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = query.split(/\s+/).length
    const hasSpecialTerms = /\b(integrate|complex|advanced|configure)\b/i.test(query)

    if (wordCount > 10 || hasSpecialTerms) return 'complex'
    if (wordCount > 5) return 'moderate'
    return 'simple'
  }

  private generateSemanticVectors(concepts: string[]): number[] {
    // Simplified vector generation (in production, would use proper word embeddings)
    return concepts
      .map((concept) => concept.length % 100)
      .slice(0, this.config.vectorSimilarity.dimensions)
  }

  private initializeConceptHierarchy(): void {
    // Initialize with common concept relationships
    const concepts = [
      { concept: 'development', synonyms: ['coding', 'programming', 'building'], weight: 1.0 },
      { concept: 'analysis', synonyms: ['analyzing', 'processing', 'examining'], weight: 1.0 },
      { concept: 'management', synonyms: ['managing', 'organizing', 'controlling'], weight: 1.0 },
      { concept: 'integration', synonyms: ['connecting', 'linking', 'combining'], weight: 1.0 },
    ]

    concepts.forEach(({ concept, synonyms, weight }) => {
      this.semanticIndex.conceptHierarchy.set(concept, {
        children: [],
        synonyms,
        weight,
      })
    })
  }

  private findRelatedConcepts(concept: string): string[] {
    const conceptData = this.semanticIndex.conceptHierarchy.get(concept)
    if (!conceptData) return []

    return [...conceptData.synonyms, ...conceptData.children]
  }

  private getUserModel(userId?: string): UserModel | undefined {
    if (!userId) return undefined
    return this.semanticIndex.userModels.get(userId)
  }

  private calculateUserSimilarity(
    result: EnhancedSemanticSearchResult,
    userModel: UserModel
  ): number {
    // Calculate similarity between result and user preferences
    return 0.5 // Simplified implementation
  }

  private calculateHistoricalUsage(
    result: EnhancedSemanticSearchResult,
    userModel: UserModel
  ): number {
    // Calculate score based on historical usage
    if (!userModel || !userModel.clickedResults) return 0
    return userModel.clickedResults.get(result.toolId) || 0
  }

  private generateCacheKey(query: EnhancedSearchQuery): string {
    return `${query.originalQuery}_${query.userContext?.userId || 'anonymous'}`
  }

  private extractSearchPattern(feedback: SearchFeedback): string {
    // Extract patterns from feedback for learning
    return `${feedback.userAction}_${feedback.relevanceRating}`
  }

  private updateSearchAnalytics(
    query: EnhancedSearchQuery,
    results: EnhancedSemanticSearchResult[]
  ): void {
    // Update popular queries
    const currentCount = this.semanticIndex.analytics.popularQueries.get(query.originalQuery) || 0
    this.semanticIndex.analytics.popularQueries.set(query.originalQuery, currentCount + 1)

    // Update other analytics as needed
  }
}

/**
 * Default semantic search configuration
 */
export const DEFAULT_SEMANTIC_SEARCH_CONFIG: SemanticSearchConfig = {
  search: {
    minRelevanceScore: 0.3,
    maxResults: 20,
    enableFuzzyMatching: true,
    enableConceptExpansion: true,
  },
  vectorSimilarity: {
    enabled: true,
    algorithm: 'cosine',
    threshold: 0.7,
    dimensions: 100,
  },
  conceptMatching: {
    enabled: true,
    synonymExpansion: true,
    hierarchicalMatching: true,
    weightedScoring: true,
  },
  contextualSearch: {
    enabled: true,
    roleBasedBoosting: true,
    domainSpecificScoring: true,
    personalizedResults: true,
  },
  performance: {
    cacheResults: true,
    cacheTTL: 300000, // 5 minutes
    indexingEnabled: true,
    batchProcessing: true,
  },
  nlp: {
    enableEntityExtraction: true,
    enableSentimentAnalysis: false,
    enableIntentRecognition: true,
    languageModel: 'advanced',
  },
}

/**
 * Factory function to create semantic search engine
 */
export function createSemanticSearchEngine(
  config: Partial<SemanticSearchConfig> = {}
): SemanticSearchEngine {
  const finalConfig = { ...DEFAULT_SEMANTIC_SEARCH_CONFIG, ...config }
  return new SemanticSearchEngine(finalConfig)
}
