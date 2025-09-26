/**
 * Registry Integration Layer
 *
 * Integrates enhanced natural language framework with Universal Tool Adapter registry
 * to provide intelligent tool descriptions, semantic search, and contextual adaptation.
 *
 * @author Natural Language Framework Agent
 * @version 1.0.0
 */

import type { ConversationMessage } from '../natural-language/usage-guidelines'
import type {
  AdapterRegistryEntry,
  DiscoveredTool,
  ToolDiscoveryQuery,
} from '../types/adapter-interfaces'
import type { ParlantTool } from '../types/parlant-interfaces'
import { createLogger } from '../utils/logger'
import {
  DomainSpecificAdapter,
  type ExtendedUsageContext,
  type ExtendedUserProfile,
  RoleBasedAdapter,
  SkillLevelAdapter,
} from './contextual-adapters'
import { IntelligentTemplateEngine } from './intelligent-template-engine'
import type {
  DescriptionLevels,
  EnhancedDescriptionSchema,
} from './natural-language-description-framework'
import { NLPProcessor } from './nlp-processor'
import {
  createSemanticSearchEngine,
  DEFAULT_SEMANTIC_SEARCH_CONFIG,
  type SemanticSearchConfig,
  type SemanticSearchEngine,
} from './semantic-search-engine'

const logger = createLogger('RegistryIntegration')

/**
 * Enhanced registry integration configuration
 */
export interface RegistryIntegrationConfig {
  // Natural language processing settings
  nlp: {
    enabled: boolean
    enhancedAnalysis: boolean
    semanticCaching: boolean
    qualityThreshold: number
  }

  // Contextual adaptation settings
  contextualAdaptation: {
    enabled: boolean
    roleBasedAdaptation: boolean
    skillLevelAdaptation: boolean
    domainAdaptation: boolean
    personalization: boolean
  }

  // Template engine settings
  templateEngine: {
    enabled: boolean
    dynamicGeneration: boolean
    multiLevelDescriptions: boolean
    personalizationEnabled: boolean
  }

  // Semantic search configuration
  semanticSearch: SemanticSearchConfig

  // Performance and caching
  performance: {
    cacheResults: boolean
    cacheTTL: number
    asyncProcessing: boolean
    batchProcessing: boolean
  }
}

/**
 * Enhanced tool discovery result with natural language enhancements
 */
export interface EnhancedDiscoveredTool extends DiscoveredTool {
  naturalLanguage: {
    description: string
    usageDescription: string
    conversationalHints: string[]
    exampleUsage: string[]
    keywords: string[]
    contextualTips: string[]
  }
  semanticMetadata: {
    concepts: string[]
    relationships: string[]
    similarity: number
    relevanceScore: number
  }
  adaptationData: {
    roleSpecificGuidance?: string
    skillLevelAdvice?: string
    domainContext?: string
    personalizationHints?: string[]
  }
}

/**
 * Enhanced tool discovery query with natural language capabilities
 */
export interface EnhancedToolDiscoveryQuery extends ToolDiscoveryQuery {
  naturalLanguageQuery?: string
  conversationContext?: ConversationMessage[]
  userProfile?: ExtendedUserProfile
  semanticSearch?: boolean
  adaptToUser?: boolean
  includeConversationalHints?: boolean
}

/**
 * Semantic search result for tool descriptions
 */
export interface SemanticSearchResult {
  toolId: string
  title: string
  description: string
  relevanceScore: number
  conceptMatches: string[]
  semanticSimilarity: number
  contextualRelevance: number
  adaptedContent: {
    roleBasedDescription?: string
    skillLevelDescription?: string
    domainSpecificDescription?: string
  }
}

/**
 * Natural Language Registry Integration
 *
 * Provides enhanced natural language capabilities for tool registry operations
 */
export class NaturalLanguageRegistryIntegration {
  private nlpProcessor: NLPProcessor
  private roleAdapter: RoleBasedAdapter
  private skillAdapter: SkillLevelAdapter
  private domainAdapter: DomainSpecificAdapter
  private templateEngine: IntelligentTemplateEngine
  private semanticSearchEngine: SemanticSearchEngine
  private descriptionCache = new Map<string, any>()
  private searchCache = new Map<string, SemanticSearchResult[]>()

  constructor(private config: RegistryIntegrationConfig) {
    logger.info('Initializing Natural Language Registry Integration', {
      nlpEnabled: config.nlp.enabled,
      contextualAdaptation: config.contextualAdaptation.enabled,
      templateEngine: config.templateEngine.enabled,
    })

    // Initialize core components
    this.nlpProcessor = new NLPProcessor({
      accuracy: config.nlp.qualityThreshold,
      verbosity: config.nlp.enhancedAnalysis ? 'detailed' : 'standard',
      analysisDepth: config.nlp.enhancedAnalysis ? 'deep' : 'intermediate',
    })

    this.roleAdapter = new RoleBasedAdapter()
    this.skillAdapter = new SkillLevelAdapter()
    this.domainAdapter = new DomainSpecificAdapter()
    this.templateEngine = new IntelligentTemplateEngine()
    this.semanticSearchEngine = createSemanticSearchEngine(config.semanticSearch)

    logger.debug('Natural Language Registry Integration initialized successfully')
  }

  /**
   * Enhance adapter registry entry with natural language capabilities
   */
  async enhanceAdapterEntry(
    entry: AdapterRegistryEntry,
    userContext?: ExtendedUsageContext
  ): Promise<AdapterRegistryEntry> {
    logger.debug(`Enhancing adapter entry: ${entry.id}`)

    try {
      // Generate natural language configuration
      const naturalLanguageConfig = await this.generateNaturalLanguageConfig(entry, userContext)

      // Create enhanced entry
      const enhancedEntry: AdapterRegistryEntry = {
        ...entry,
        config: {
          ...entry.config,
          naturalLanguage: naturalLanguageConfig,
          // Note: enhancedIntelligence is not part of AdapterConfiguration, so we store it in metadata
        },
        metadata: {
          ...entry.metadata,
          // Store additional properties as part of existing metadata
          enhancedIntelligence: {
            nlpProcessed: true,
            contextuallyAdapted: !!userContext,
            lastEnhanced: new Date(),
            semanticKeywords: naturalLanguageConfig.keywords || [],
            naturalLanguageCapabilities: true,
            semanticSearchReady: true,
            contextualAdaptationSupported: true,
          },
        } as any, // Use type assertion to allow additional properties
      }

      // Cache the enhanced configuration if enabled
      if (this.config.performance.cacheResults) {
        this.cacheEnhancedEntry(entry.id, enhancedEntry)
      }

      logger.info(`Enhanced adapter entry successfully: ${entry.id}`)
      return enhancedEntry
    } catch (error) {
      logger.error(`Failed to enhance adapter entry: ${entry.id}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      return entry // Return original entry if enhancement fails
    }
  }

  /**
   * Perform enhanced tool discovery with natural language processing
   */
  async enhancedToolDiscovery(
    query: EnhancedToolDiscoveryQuery,
    availableEntries: AdapterRegistryEntry[]
  ): Promise<EnhancedDiscoveredTool[]> {
    logger.debug('Performing enhanced tool discovery', {
      queryType: query.naturalLanguageQuery ? 'natural_language' : 'structured',
      entriesCount: availableEntries.length,
      semanticSearch: query.semanticSearch,
    })

    const startTime = Date.now()

    try {
      // Process entries in parallel for better performance
      const enhancedEntries = await Promise.all(
        availableEntries.map((entry) => this.processEntryForDiscovery(entry, query))
      )

      // Filter out null results and sort by relevance
      const validEntries = enhancedEntries
        .filter((entry) => entry !== null)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)

      // Apply semantic search if requested
      let results = validEntries as EnhancedDiscoveredTool[]
      if (query.semanticSearch && query.naturalLanguageQuery) {
        results = await this.performSemanticSearch(query.naturalLanguageQuery, results)
      }

      // Apply contextual adaptation if user profile provided
      if (query.userProfile && query.adaptToUser) {
        results = await this.adaptResultsToUser(results, query.userProfile)
      }

      const duration = Date.now() - startTime
      logger.info('Enhanced tool discovery completed', {
        resultsCount: results.length,
        duration,
        semanticSearchUsed: query.semanticSearch,
      })

      return results
    } catch (error) {
      logger.error('Enhanced tool discovery failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  }

  /**
   * Generate comprehensive semantic search across tool descriptions
   */
  async searchToolDescriptions(
    searchQuery: string,
    availableEntries: AdapterRegistryEntry[],
    userContext?: ExtendedUsageContext
  ): Promise<SemanticSearchResult[]> {
    logger.debug('Performing semantic search on tool descriptions', {
      query: searchQuery,
      entriesCount: availableEntries.length,
    })

    try {
      // Use the semantic search engine for advanced search capabilities
      const enhancedResults = await this.semanticSearchEngine.search(
        searchQuery,
        availableEntries,
        userContext as any // Convert to compatible type
      )

      // Convert enhanced results to our SemanticSearchResult format
      const results: SemanticSearchResult[] = enhancedResults.map((result) => ({
        toolId: result.toolId,
        title: result.title,
        description: result.description,
        relevanceScore: result.scoring.finalScore,
        conceptMatches: result.matchDetails.conceptMatches,
        semanticSimilarity: result.semanticSimilarity,
        contextualRelevance: result.contextualRelevance,
        adaptedContent: {
          roleBasedDescription: (result as any).adaptationData?.roleSpecificGuidance,
          skillLevelDescription: (result as any).adaptationData?.skillLevelAdvice,
          domainSpecificDescription: (result as any).adaptationData?.domainContext,
        },
      }))

      logger.info('Semantic search completed', {
        query: searchQuery,
        resultsCount: results.length,
        topScore: results[0]?.relevanceScore || 0,
      })

      return results
    } catch (error) {
      logger.error('Semantic search failed', {
        query: searchQuery,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Advanced semantic search with enhanced query capabilities
   */
  async advancedSemanticSearch(
    query: string,
    availableEntries: AdapterRegistryEntry[],
    userContext?: ExtendedUsageContext,
    options?: {
      filters?: {
        categories?: string[]
        tags?: string[]
        capabilities?: string[]
      }
      ranking?: {
        prioritizePopular?: boolean
        prioritizeRecent?: boolean
        personalizedRanking?: boolean
      }
      maxResults?: number
    }
  ): Promise<{
    results: SemanticSearchResult[]
    suggestions?: string[]
    analytics?: any
  }> {
    logger.debug('Performing advanced semantic search', {
      query,
      hasFilters: !!options?.filters,
      hasRanking: !!options?.ranking,
    })

    try {
      // Create enhanced query
      const enhancedQuery = {
        originalQuery: query,
        processedQuery: query.toLowerCase().trim(),
        extractedEntities: [],
        identifiedConcepts: [],
        recognizedIntent: 'search',
        queryComplexity: 'moderate' as const,
        userContext: userContext as any,
        searchContext: {
          timestamp: new Date(),
          sessionId: (userContext as any)?.sessionContext?.sessionId,
          previousQueries: [],
          userFeedback: [],
        },
        filters: {
          categories: options?.filters?.categories || [],
          tags: options?.filters?.tags || [],
          capabilities: options?.filters?.capabilities || [],
          domains: [],
        },
        rankingPreferences: {
          prioritizePopular: options?.ranking?.prioritizePopular || false,
          prioritizeRecentlyUsed: options?.ranking?.prioritizeRecent || false,
          personalizedRanking: options?.ranking?.personalizedRanking || !!userContext,
        },
      }

      // Perform advanced search
      const searchResult = await this.semanticSearchEngine.advancedSearch(
        enhancedQuery,
        availableEntries
      )

      // Convert results
      const results: SemanticSearchResult[] = searchResult.results.map((result) => ({
        toolId: result.toolId,
        title: result.title,
        description: result.description,
        relevanceScore: result.scoring.finalScore,
        conceptMatches: result.matchDetails.conceptMatches,
        semanticSimilarity: result.semanticSimilarity,
        contextualRelevance: result.contextualRelevance,
        adaptedContent: {
          roleBasedDescription: (result as any).adaptationData?.roleSpecificGuidance,
          skillLevelDescription: (result as any).adaptationData?.skillLevelAdvice,
          domainSpecificDescription: (result as any).adaptationData?.domainContext,
        },
      }))

      // Get suggestions
      const suggestionResult = await this.semanticSearchEngine.getSearchSuggestions(
        query,
        userContext as any
      )

      return {
        results: results.slice(0, options?.maxResults || 20),
        suggestions: suggestionResult.suggestions,
        analytics: searchResult.searchMetadata,
      }
    } catch (error) {
      logger.error('Advanced semantic search failed', {
        query,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get search suggestions for query completion
   */
  async getSearchSuggestions(
    partialQuery: string,
    userContext?: ExtendedUsageContext
  ): Promise<string[]> {
    try {
      const suggestions = await this.semanticSearchEngine.getSearchSuggestions(
        partialQuery,
        userContext as any
      )

      return [
        ...suggestions.suggestions,
        ...suggestions.contextualSuggestions,
        ...suggestions.popularQueries,
      ].slice(0, 10) // Return top 10 suggestions
    } catch (error) {
      logger.error('Failed to get search suggestions', {
        partialQuery,
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
  }

  /**
   * Record search feedback for learning
   */
  async recordSearchFeedback(feedback: {
    queryId: string
    resultId: string
    relevanceRating: number
    userAction: 'clicked' | 'used' | 'dismissed' | 'bookmarked'
    feedback?: string
  }): Promise<void> {
    try {
      await this.semanticSearchEngine.recordFeedback({
        ...feedback,
        timestamp: new Date(),
      })

      logger.debug('Search feedback recorded successfully')
    } catch (error) {
      logger.error('Failed to record search feedback', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics(): any {
    return this.semanticSearchEngine.getSearchAnalytics()
  }

  /**
   * Generate contextually adapted tool description
   */
  async generateAdaptedDescription(
    tool: ParlantTool | AdapterRegistryEntry,
    userContext: ExtendedUsageContext
  ): Promise<DescriptionLevels> {
    logger.debug(`Generating adapted description for tool: ${tool.id}`)

    try {
      // Create base description schema
      const baseSchema = await this.createDescriptionSchema(tool)

      // Apply contextual adaptations
      const adaptations = await Promise.all([
        this.roleAdapter.adapt(baseSchema, userContext),
        this.skillAdapter.adapt(baseSchema, userContext),
        this.domainAdapter.adapt(baseSchema, userContext),
      ])

      // Generate enhanced descriptions using template engine
      const templateContext = {
        tool,
        userContext,
        adaptations,
        baseSchema,
      }

      const enhancedDescriptions = await this.templateEngine.generateEnhancedDescriptions(
        templateContext as any
      )

      logger.debug(`Generated adapted description successfully: ${tool.id}`)
      return enhancedDescriptions
    } catch (error) {
      logger.error(`Failed to generate adapted description: ${tool.id}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Batch process multiple tools for enhanced natural language capabilities
   */
  async batchEnhanceTools(
    entries: AdapterRegistryEntry[],
    userContext?: ExtendedUsageContext,
    options?: {
      concurrency?: number
      failFast?: boolean
      includeAnalytics?: boolean
    }
  ): Promise<{
    enhanced: AdapterRegistryEntry[]
    failed: { entryId: string; error: string }[]
    analytics?: {
      totalProcessed: number
      successRate: number
      averageProcessingTime: number
    }
  }> {
    const startTime = Date.now()
    const concurrency = options?.concurrency || 5
    const enhanced: AdapterRegistryEntry[] = []
    const failed: { entryId: string; error: string }[] = []

    logger.info(`Batch enhancing ${entries.length} tools`, {
      concurrency,
      failFast: options?.failFast,
    })

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < entries.length; i += concurrency) {
      const batch = entries.slice(i, i + concurrency)

      const batchPromises = batch.map(async (entry) => {
        try {
          return await this.enhanceAdapterEntry(entry, userContext)
        } catch (error) {
          if (options?.failFast) {
            throw error
          }
          failed.push({
            entryId: entry.id,
            error: error instanceof Error ? error.message : String(error),
          })
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      enhanced.push(...batchResults.filter((result) => result !== null))
    }

    const duration = Date.now() - startTime
    const analytics = options?.includeAnalytics
      ? {
          totalProcessed: entries.length,
          successRate: enhanced.length / entries.length,
          averageProcessingTime: duration / entries.length,
        }
      : undefined

    logger.info('Batch enhancement completed', {
      enhanced: enhanced.length,
      failed: failed.length,
      duration,
      successRate: analytics?.successRate,
    })

    return { enhanced, failed, analytics }
  }

  // Private helper methods

  private async generateNaturalLanguageConfig(
    entry: AdapterRegistryEntry,
    userContext?: ExtendedUsageContext
  ): Promise<any> {
    // Analyze the tool using NLP processor
    const analysis = await this.nlpProcessor.analyzeToolComprehensively({
      id: entry.id,
      name: entry.simTool.name,
      description: entry.config.description || '',
      version: '1.0.0',
      params: {},
      output: {},
    })

    // Generate base natural language configuration
    const config = {
      description: analysis.overview,
      usageDescription: analysis.usagePatterns.map((p) => p.description).join('. '),
      conversationalHints: analysis.benefits,
      exampleUsage: analysis.usagePatterns.flatMap((p) => p.examples),
      keywords: analysis.benefits.concat(analysis.limitations),
      contextualTips: analysis.benefits,
    }

    // Apply contextual adaptation if user context is provided
    if (userContext) {
      const adaptedConfig = await this.adaptConfigToContext(config, userContext)
      return { ...config, ...adaptedConfig }
    }

    return config
  }

  private async processEntryForDiscovery(
    entry: AdapterRegistryEntry,
    query: EnhancedToolDiscoveryQuery
  ): Promise<EnhancedDiscoveredTool | null> {
    try {
      // Calculate base relevance score
      const relevanceScore = await this.calculateRelevanceScore(entry, query)

      if (relevanceScore < 0.1) {
        return null // Filter out very low relevance tools
      }

      // Generate natural language enhancements
      const naturalLanguage = await this.generateNaturalLanguageEnhancements(entry, query)

      // Generate semantic metadata
      const semanticMetadata = await this.generateSemanticMetadata(entry, query)

      // Generate adaptation data if user profile provided
      const adaptationData = query.userProfile
        ? await this.generateAdaptationData(entry, query.userProfile)
        : {}

      const enhancedTool: EnhancedDiscoveredTool = {
        id: entry.id,
        name: entry.config.displayName || entry.simTool.name,
        description: entry.config.description || '',
        category: entry.metadata.category,
        tags: entry.metadata.tags,
        relevanceScore,
        usageStats: {
          executionCount: entry.statistics?.executionCount || 0,
          successRate: entry.statistics?.successRate || 0,
          averageRating: 0, // Would be calculated from actual ratings
        },
        capabilities: this.extractCapabilities(entry),
        requirements: this.extractRequirements(entry),
        performance: {
          averageExecutionTimeMs: entry.statistics?.averageExecutionTimeMs || 0,
          healthStatus: entry.health?.status || 'unknown',
          lastUsed: entry.statistics?.lastUsed,
        },
        naturalLanguage,
        semanticMetadata,
        adaptationData,
      }

      return enhancedTool
    } catch (error) {
      logger.warn(`Failed to process entry for discovery: ${entry.id}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  private async calculateRelevanceScore(
    entry: AdapterRegistryEntry,
    query: EnhancedToolDiscoveryQuery
  ): Promise<number> {
    let score = 0

    // Natural language query matching
    if (query.naturalLanguageQuery) {
      const queryAnalysis = await this.nlpProcessor.extractKeyInformation({
        id: 'query',
        name: 'query',
        description: query.naturalLanguageQuery,
        version: '1.0.0',
        params: {},
        output: {},
      })

      const toolAnalysis = await this.nlpProcessor.extractKeyInformation({
        id: entry.id,
        name: entry.simTool.name,
        description: entry.config.description || '',
        version: '1.0.0',
        params: {},
        output: {},
      })

      // Calculate semantic similarity
      score +=
        this.calculateSemanticSimilarity(queryAnalysis.quickTags, toolAnalysis.quickTags) * 50
    }

    // Traditional query matching
    if (query.query) {
      score += this.calculateTextMatchScore(entry, query.query)
    }

    // Category and tag matching
    if (query.category && entry.metadata.category === query.category) {
      score += 20
    }

    if (query.tags) {
      const matchingTags = query.tags.filter((tag) => entry.metadata.tags.includes(tag))
      score += matchingTags.length * 5
    }

    // Health and performance boosters
    if (entry.health?.status === 'healthy') score += 5
    if (entry.statistics?.successRate && entry.statistics.successRate > 0.8) score += 5

    return Math.min(score, 100) / 100 // Normalize to 0-1
  }

  private async generateNaturalLanguageEnhancements(
    entry: AdapterRegistryEntry,
    query: EnhancedToolDiscoveryQuery
  ): Promise<EnhancedDiscoveredTool['naturalLanguage']> {
    const analysis = await this.nlpProcessor.analyzeToolComprehensively({
      id: entry.id,
      name: entry.simTool.name,
      description: entry.config.description || '',
      version: '1.0.0',
      params: {},
      output: {},
    })

    return {
      description: analysis.overview,
      usageDescription: analysis.usagePatterns.map((p) => p.description).join('. '),
      conversationalHints: analysis.benefits,
      exampleUsage: analysis.usagePatterns.flatMap((p) => p.examples),
      keywords: analysis.benefits.concat(analysis.limitations),
      contextualTips: analysis.benefits,
    }
  }

  private async generateSemanticMetadata(
    entry: AdapterRegistryEntry,
    query: EnhancedToolDiscoveryQuery
  ): Promise<EnhancedDiscoveredTool['semanticMetadata']> {
    const analysis = await this.nlpProcessor.analyzeToolComprehensively({
      id: entry.id,
      name: entry.simTool.name,
      description: entry.config.description || '',
      version: '1.0.0',
      params: {},
      output: {},
    })

    const concepts = analysis.benefits.concat(analysis.limitations)
    const relationships = analysis.usagePatterns.map((p) => p.pattern)

    let similarity = 0
    if (query.naturalLanguageQuery) {
      const queryAnalysis = await this.nlpProcessor.extractKeyInformation({
        id: 'search_query',
        name: 'search_query',
        description: query.naturalLanguageQuery,
        version: '1.0.0',
        params: {},
        output: {},
      })
      similarity = this.calculateSemanticSimilarity(concepts, queryAnalysis.quickTags)
    }

    return {
      concepts,
      relationships,
      similarity,
      relevanceScore: await this.calculateRelevanceScore(entry, query),
    }
  }

  private async generateAdaptationData(
    entry: AdapterRegistryEntry,
    userProfile: ExtendedUserProfile
  ): Promise<EnhancedDiscoveredTool['adaptationData']> {
    const baseSchema = await this.createDescriptionSchema(entry)
    const context: ExtendedUsageContext = {
      userProfile,
      conversationId: 'default',
      userId: userProfile.role || 'default-user',
      workspaceId: 'default-workspace',
    }

    const [roleAdaptation, skillAdaptation, domainAdaptation] = await Promise.all([
      this.roleAdapter.adapt(baseSchema, context),
      this.skillAdapter.adapt(baseSchema, context),
      this.domainAdapter.adapt(baseSchema, context),
    ])

    return {
      roleSpecificGuidance: roleAdaptation.changes?.guidance || roleAdaptation.summary,
      skillLevelAdvice: skillAdaptation.changes?.guidance || skillAdaptation.summary,
      domainContext: domainAdaptation.changes?.guidance || domainAdaptation.summary,
      personalizationHints: [
        ...(roleAdaptation.changes?.tips || [roleAdaptation.summary]),
        ...(skillAdaptation.changes?.tips || [skillAdaptation.summary]),
        ...(domainAdaptation.changes?.tips || [domainAdaptation.summary]),
      ],
    }
  }

  private async performSemanticSearch(
    query: string,
    tools: EnhancedDiscoveredTool[]
  ): Promise<EnhancedDiscoveredTool[]> {
    // Enhance search with semantic understanding
    const queryAnalysis = await this.nlpProcessor.extractKeyInformation({
      id: 'search_query',
      name: 'search_query',
      description: query,
      version: '1.0.0',
      params: {},
      output: {},
    })

    // Re-score tools based on semantic similarity
    const enhancedTools = tools.map((tool) => {
      const semanticScore = this.calculateSemanticSimilarity(
        queryAnalysis.quickTags,
        tool.semanticMetadata.concepts
      )

      return {
        ...tool,
        relevanceScore: tool.relevanceScore * 0.6 + semanticScore * 0.4, // Weighted combination
        semanticMetadata: {
          ...tool.semanticMetadata,
          similarity: semanticScore,
        },
      }
    })

    return enhancedTools.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  private async adaptResultsToUser(
    results: EnhancedDiscoveredTool[],
    userProfile: ExtendedUserProfile
  ): Promise<EnhancedDiscoveredTool[]> {
    // Apply user-specific adaptations to the results
    return Promise.all(
      results.map(async (result) => {
        if (!result.adaptationData) {
          result.adaptationData = await this.generateAdaptationData(
            { id: result.id } as AdapterRegistryEntry,
            userProfile
          )
        }
        return result
      })
    )
  }

  private async performSemanticMatchingForEntry(
    entry: AdapterRegistryEntry,
    searchQuery: string,
    queryAnalysis: any,
    userContext?: ExtendedUsageContext
  ): Promise<SemanticSearchResult> {
    const toolAnalysis = await this.nlpProcessor.analyzeToolComprehensively({
      id: entry.id,
      name: entry.simTool.name,
      description: entry.config.description || '',
      version: '1.0.0',
      params: {},
      output: {},
    })

    const conceptMatches = queryAnalysis.quickTags.filter((concept: any) =>
      toolAnalysis.benefits.concat(toolAnalysis.limitations).includes(concept)
    )

    const semanticSimilarity = this.calculateSemanticSimilarity(
      queryAnalysis.quickTags,
      toolAnalysis.benefits.concat(toolAnalysis.limitations)
    )

    const contextualRelevance = userContext
      ? await this.calculateContextualRelevance(entry, userContext)
      : 0.5

    const relevanceScore =
      semanticSimilarity * 0.5 +
      contextualRelevance * 0.3 +
      (conceptMatches.length / Math.max(queryAnalysis.keyInformation.concepts.length, 1)) * 0.2

    const adaptedContent = userContext?.userProfile
      ? await this.generateAdaptationData(entry, userContext.userProfile)
      : {}

    return {
      toolId: entry.id,
      title: entry.config.displayName || entry.simTool.name,
      description: toolAnalysis.overview,
      relevanceScore,
      conceptMatches,
      semanticSimilarity,
      contextualRelevance,
      adaptedContent: {
        roleBasedDescription: adaptedContent.roleSpecificGuidance,
        skillLevelDescription: adaptedContent.skillLevelAdvice,
        domainSpecificDescription: adaptedContent.domainContext,
      },
    }
  }

  private async createDescriptionSchema(tool: any): Promise<EnhancedDescriptionSchema> {
    const analysis = await this.nlpProcessor.analyzeToolComprehensively({
      id: tool.id,
      name: tool.simTool?.name || tool.name,
      description: tool.config?.description || tool.description || '',
      version: '1.0.0',
      params: tool.simTool?.parameters || tool.params || {},
      output: {},
    })

    return {
      toolId: tool.id,
      toolName: tool.simTool?.name || tool.name,
      toolVersion: '1.0.0',
      category: (tool.metadata?.category || 'utility') as any,
      subcategories: tool.metadata?.tags || [],
      descriptions: {
        brief: {
          summary: `${analysis.overview.substring(0, 100)}...`,
          primaryUseCase: analysis.usagePatterns[0]?.description || 'General purpose tool',
          keyCapability: analysis.benefits[0] || 'Versatile functionality',
          complexityLevel: 'moderate' as const,
          quickTags: analysis.benefits.slice(0, 3),
        },
        detailed: {
          overview: analysis.overview,
          functionality: analysis.functionality || analysis.overview,
          useCases: analysis.usagePatterns.map((p) => ({
            scenario: p.pattern,
            description: p.description,
            benefits: p.examples.slice(0, 2),
            complexity: p.complexity,
          })) as any,
          workingPrinciple: analysis.workingPrinciple || 'Standard operation principles apply',
          benefits: analysis.benefits,
          limitations: analysis.limitations,
          integrationInfo: {
            integrationComplexity: 'moderate' as const,
            compatibilityRequirements: [],
          } as any,
        },
        expert: {
          technicalArchitecture: {
            architecture: 'monolithic',
            performanceProfile: 'standard',
          } as any,
          advancedConfiguration: {
            configurableParameters: [],
            customizationPoints: [],
          } as any,
          performanceProfile: {
            responseTime: {
              averageMs: 100,
              p95Ms: 200,
              p99Ms: 500,
            } as any,
            throughput: {
              concurrentRequests: 100,
            } as any,
            resourceUsage: {
              memory: 256,
              cpuCores: 1,
            } as any,
            scalabilityLimits: {
              maxConcurrentUsers: 1000,
              maxThroughputPerSecond: 100,
            } as any,
          },
          securityProfile: {
            authenticationRequirements: [],
            accessControls: [],
            auditingFeatures: [],
          } as any,
          troubleshooting: {
            commonIssues: [],
            diagnosticSteps: [],
          } as any,
          extensibilityInfo: {
            apiExtensions: [],
            customizationGuide: 'Standard configuration options available',
          } as any,
        },
        contextual: {},
      },
      contextualDescriptions: {} as any,
      usageGuidance: {} as any,
      interactiveElements: {} as any,
      adaptiveFeatures: {} as any,
      qualityMetadata: {} as any,
      versionInfo: {} as any,
    }
  }

  private async adaptConfigToContext(config: any, context: ExtendedUsageContext): Promise<any> {
    // Apply contextual adaptations to the configuration
    const adaptations = await Promise.all([
      this.roleAdapter.adapt(
        {
          descriptions: { detailed: config.description },
        } as EnhancedDescriptionSchema,
        context
      ),
      this.skillAdapter.adapt(
        {
          descriptions: { detailed: config.description },
        } as EnhancedDescriptionSchema,
        context
      ),
    ])

    return {
      contextualDescription: adaptations[0].changes?.description || adaptations[0].summary,
      skillAppropriateExplanation: adaptations[1].changes?.description || adaptations[1].summary,
      personalizedTips: [
        ...(adaptations[0].changes?.tips || [adaptations[0].summary]),
        ...(adaptations[1].changes?.tips || [adaptations[1].summary]),
      ],
    }
  }

  private calculateSemanticSimilarity(concepts1: string[], concepts2: string[]): number {
    if (!concepts1.length || !concepts2.length) return 0

    const intersection = concepts1.filter((concept) => concepts2.includes(concept))
    const union = [...new Set([...concepts1, ...concepts2])]

    return intersection.length / union.length
  }

  private calculateTextMatchScore(entry: AdapterRegistryEntry, searchText: string): number {
    const text = searchText.toLowerCase()
    let score = 0

    const name = (entry.config.displayName || entry.simTool.name || '').toLowerCase()
    const description = (entry.config.description || '').toLowerCase()
    const tags = entry.metadata.tags.join(' ').toLowerCase()

    if (name.includes(text)) score += 30
    if (description.includes(text)) score += 15
    if (tags.includes(text)) score += 10

    return score
  }

  private async calculateContextualRelevance(
    entry: AdapterRegistryEntry,
    context: ExtendedUsageContext
  ): Promise<number> {
    let relevance = 0.5 // Base relevance

    // Role-based relevance
    if (context.userProfile?.role) {
      const roleRelevance = this.calculateRoleRelevance(entry, context.userProfile.role)
      relevance += roleRelevance * 0.3
    }

    // Domain-based relevance
    if ((context.userProfile as any)?.domain) {
      const domainRelevance = this.calculateDomainRelevance(
        entry,
        (context.userProfile as any).domain
      )
      relevance += domainRelevance * 0.2
    }

    return Math.min(relevance, 1)
  }

  private calculateRoleRelevance(entry: AdapterRegistryEntry, role: string): number {
    const roleMappings: Record<string, string[]> = {
      developer: ['development', 'coding', 'technical', 'api'],
      business_user: ['business', 'workflow', 'process', 'management'],
      analyst: ['analysis', 'data', 'reporting', 'insights'],
      admin: ['configuration', 'settings', 'management', 'system'],
    }

    const relevantTags = roleMappings[role] || []
    const matches = entry.metadata.tags.filter((tag) => relevantTags.includes(tag.toLowerCase()))

    return matches.length / Math.max(relevantTags.length, 1)
  }

  private calculateDomainRelevance(entry: AdapterRegistryEntry, domain: string): number {
    const domainKeywords = domain.toLowerCase().split(/[^a-z]+/)
    const entryText = [entry.simTool.name, entry.config.description || '', ...entry.metadata.tags]
      .join(' ')
      .toLowerCase()

    const matches = domainKeywords.filter((keyword) => entryText.includes(keyword))
    return matches.length / Math.max(domainKeywords.length, 1)
  }

  private extractCapabilities(entry: AdapterRegistryEntry): string[] {
    const capabilities = [...entry.metadata.tags]

    if (entry.config.naturalLanguage) capabilities.push('natural_language')
    if (entry.config.caching?.enabled) capabilities.push('caching')
    if (entry.config.monitoring?.metrics?.enabled) capabilities.push('monitoring')

    return [...new Set(capabilities)]
  }

  private extractRequirements(entry: AdapterRegistryEntry): string[] {
    const requirements: string[] = []

    if (entry.config.security?.accessControl?.requiredPermissions) {
      requirements.push(...entry.config.security.accessControl.requiredPermissions)
    }

    if (entry.metadata.tags.includes('authentication')) {
      requirements.push('authentication')
    }

    return [...new Set(requirements)]
  }

  private cacheEnhancedEntry(entryId: string, enhanced: AdapterRegistryEntry): void {
    this.descriptionCache.set(entryId, {
      entry: enhanced,
      timestamp: Date.now(),
    })

    // Set TTL cleanup
    setTimeout(() => {
      this.descriptionCache.delete(entryId)
    }, this.config.performance.cacheTTL)
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.descriptionCache.clear()
    this.searchCache.clear()
    logger.info('All caches cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    descriptionCache: { size: number; hitRate?: number }
    searchCache: { size: number; hitRate?: number }
  } {
    return {
      descriptionCache: { size: this.descriptionCache.size },
      searchCache: { size: this.searchCache.size },
    }
  }
}

/**
 * Default configuration for registry integration
 */
export const DEFAULT_REGISTRY_INTEGRATION_CONFIG: RegistryIntegrationConfig = {
  nlp: {
    enabled: true,
    enhancedAnalysis: true,
    semanticCaching: true,
    qualityThreshold: 0.7,
  },
  contextualAdaptation: {
    enabled: true,
    roleBasedAdaptation: true,
    skillLevelAdaptation: true,
    domainAdaptation: true,
    personalization: true,
  },
  templateEngine: {
    enabled: true,
    dynamicGeneration: true,
    multiLevelDescriptions: true,
    personalizationEnabled: true,
  },
  semanticSearch: DEFAULT_SEMANTIC_SEARCH_CONFIG,
  performance: {
    cacheResults: true,
    cacheTTL: 300000, // 5 minutes
    asyncProcessing: true,
    batchProcessing: true,
  },
}

/**
 * Factory function to create registry integration
 */
export function createRegistryIntegration(
  config: Partial<RegistryIntegrationConfig> = {}
): NaturalLanguageRegistryIntegration {
  const finalConfig = { ...DEFAULT_REGISTRY_INTEGRATION_CONFIG, ...config }
  return new NaturalLanguageRegistryIntegration(finalConfig)
}
