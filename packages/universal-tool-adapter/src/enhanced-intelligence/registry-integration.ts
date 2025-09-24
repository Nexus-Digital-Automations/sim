/**
 * Registry Integration Layer
 *
 * Integrates enhanced natural language framework with Universal Tool Adapter registry
 * to provide intelligent tool descriptions, semantic search, and contextual adaptation.
 *
 * @author Natural Language Framework Agent
 * @version 1.0.0
 */

import type {
  AdapterRegistryEntry,
  ToolDiscoveryQuery,
  DiscoveredTool,
  AdapterConfiguration
} from '../types/adapter-interfaces'
import type { ParlantTool } from '../types/parlant-interfaces'
import type {
  UsageContext,
  UserProfile,
  ConversationMessage
} from '../natural-language/usage-guidelines'
import { createLogger } from '../utils/logger'
import { NLPProcessor } from './nlp-processor'
import { RoleBasedAdapter, SkillLevelAdapter, DomainAdapter } from './contextual-adapters'
import { IntelligentTemplateEngine } from './intelligent-template-engine'
import {
  SemanticSearchEngine,
  createSemanticSearchEngine,
  DEFAULT_SEMANTIC_SEARCH_CONFIG,
  type SemanticSearchConfig,
  type EnhancedSemanticSearchResult
} from './semantic-search-engine'
import {
  EnhancedDescriptionSchema,
  DescriptionLevels,
  ExtendedUsageContext,
  ExtendedUserProfile
} from './description-templates'

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
  private domainAdapter: DomainAdapter
  private templateEngine: IntelligentTemplateEngine
  private semanticSearchEngine: SemanticSearchEngine
  private descriptionCache = new Map<string, any>()
  private searchCache = new Map<string, SemanticSearchResult[]>()

  constructor(private config: RegistryIntegrationConfig) {
    logger.info('Initializing Natural Language Registry Integration', {
      nlpEnabled: config.nlp.enabled,
      contextualAdaptation: config.contextualAdaptation.enabled,
      templateEngine: config.templateEngine.enabled
    })

    // Initialize core components
    this.nlpProcessor = new NLPProcessor({
      enableAdvancedAnalysis: config.nlp.enhancedAnalysis,
      qualityThreshold: config.nlp.qualityThreshold,
      enableSemanticAnalysis: true,
      vocabularyEnhancement: true
    })

    this.roleAdapter = new RoleBasedAdapter()
    this.skillAdapter = new SkillLevelAdapter()
    this.domainAdapter = new DomainAdapter()
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
      const naturalLanguageConfig = await this.generateNaturalLanguageConfig(
        entry,
        userContext
      )

      // Create enhanced entry
      const enhancedEntry: AdapterRegistryEntry = {
        ...entry,
        config: {
          ...entry.config,
          naturalLanguage: naturalLanguageConfig,
          enhancedIntelligence: {
            nlpProcessed: true,
            contextuallyAdapted: !!userContext,
            lastEnhanced: new Date(),
            semanticKeywords: naturalLanguageConfig.keywords || []
          }
        },
        metadata: {
          ...entry.metadata,
          naturalLanguageCapabilities: true,
          semanticSearchReady: true,
          contextualAdaptationSupported: true
        }
      }

      // Cache the enhanced configuration if enabled
      if (this.config.performance.cacheResults) {
        this.cacheEnhancedEntry(entry.id, enhancedEntry)
      }

      logger.info(`Enhanced adapter entry successfully: ${entry.id}`)
      return enhancedEntry

    } catch (error) {
      logger.error(`Failed to enhance adapter entry: ${entry.id}`, {
        error: error.message,
        stack: error.stack
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
      semanticSearch: query.semanticSearch
    })

    const startTime = Date.now()

    try {
      // Process entries in parallel for better performance
      const enhancedEntries = await Promise.all(
        availableEntries.map(entry => this.processEntryForDiscovery(entry, query))
      )

      // Filter out null results and sort by relevance
      const validEntries = enhancedEntries
        .filter(entry => entry !== null)
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
        semanticSearchUsed: query.semanticSearch
      })

      return results

    } catch (error) {
      logger.error('Enhanced tool discovery failed', {
        error: error.message,
        stack: error.stack
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
    const cacheKey = `search:${searchQuery}:${userContext?.userProfile?.userId || 'anonymous'}`

    // Check cache first
    if (this.config.performance.cacheResults && this.searchCache.has(cacheKey)) {
      logger.debug('Returning cached search results')
      return this.searchCache.get(cacheKey)!
    }

    logger.debug('Performing semantic search on tool descriptions', {
      query: searchQuery,
      entriesCount: availableEntries.length
    })

    try {
      // Analyze search query using NLP processor
      const queryAnalysis = await this.nlpProcessor.extractKeyInformation({
        name: 'search_query',
        description: searchQuery,
        parameters: {}
      })

      const results: SemanticSearchResult[] = []

      // Process each tool entry for semantic matching
      for (const entry of availableEntries) {
        const searchResult = await this.performSemanticMatchingForEntry(
          entry,
          searchQuery,
          queryAnalysis,
          userContext
        )

        if (searchResult.relevanceScore >= this.config.semanticSearch.relevanceThreshold) {
          results.push(searchResult)
        }
      }

      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore)

      // Cache results if enabled
      if (this.config.performance.cacheResults) {
        this.searchCache.set(cacheKey, results)
        setTimeout(() => this.searchCache.delete(cacheKey), this.config.performance.cacheTTL)
      }

      logger.info('Semantic search completed', {
        query: searchQuery,
        resultsCount: results.length,
        topScore: results[0]?.relevanceScore || 0
      })

      return results

    } catch (error) {
      logger.error('Semantic search failed', {
        query: searchQuery,
        error: error.message
      })
      throw error
    }
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
        this.domainAdapter.adapt(baseSchema, userContext)
      ])

      // Generate enhanced descriptions using template engine
      const templateContext = {
        tool,
        userContext,
        adaptations,
        baseSchema
      }

      const enhancedDescriptions = await this.templateEngine.generateEnhancedDescriptions(
        templateContext
      )

      logger.debug(`Generated adapted description successfully: ${tool.id}`)
      return enhancedDescriptions

    } catch (error) {
      logger.error(`Failed to generate adapted description: ${tool.id}`, {
        error: error.message
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
      failFast: options?.failFast
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
          failed.push({ entryId: entry.id, error: error.message })
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      enhanced.push(...batchResults.filter(result => result !== null))
    }

    const duration = Date.now() - startTime
    const analytics = options?.includeAnalytics ? {
      totalProcessed: entries.length,
      successRate: enhanced.length / entries.length,
      averageProcessingTime: duration / entries.length
    } : undefined

    logger.info('Batch enhancement completed', {
      enhanced: enhanced.length,
      failed: failed.length,
      duration,
      successRate: analytics?.successRate
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
      name: entry.simTool.name,
      description: entry.config.description || '',
      parameters: entry.simTool.parameters || {}
    })

    // Generate base natural language configuration
    const config = {
      description: analysis.enhancedDescription,
      usageDescription: analysis.usagePatterns.join('. '),
      conversationalHints: analysis.conversationalElements,
      exampleUsage: analysis.exampleUsage,
      keywords: analysis.keyInformation.concepts,
      contextualTips: analysis.recommendations
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
          averageRating: 0 // Would be calculated from actual ratings
        },
        capabilities: this.extractCapabilities(entry),
        requirements: this.extractRequirements(entry),
        performance: {
          averageExecutionTimeMs: entry.statistics?.averageExecutionTimeMs || 0,
          healthStatus: entry.health?.status || 'unknown',
          lastUsed: entry.statistics?.lastUsed
        },
        naturalLanguage,
        semanticMetadata,
        adaptationData
      }

      return enhancedTool

    } catch (error) {
      logger.warn(`Failed to process entry for discovery: ${entry.id}`, {
        error: error.message
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
        name: 'query',
        description: query.naturalLanguageQuery,
        parameters: {}
      })

      const toolAnalysis = await this.nlpProcessor.extractKeyInformation({
        name: entry.simTool.name,
        description: entry.config.description || '',
        parameters: entry.simTool.parameters || {}
      })

      // Calculate semantic similarity
      score += this.calculateSemanticSimilarity(
        queryAnalysis.keyInformation.concepts,
        toolAnalysis.keyInformation.concepts
      ) * 50
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
      const matchingTags = query.tags.filter(tag => entry.metadata.tags.includes(tag))
      score += matchingTags.length * 5
    }

    // Health and performance boosters
    if (entry.health?.status === 'healthy') score += 5
    if (entry.statistics?.successRate > 0.8) score += 5

    return Math.min(score, 100) / 100 // Normalize to 0-1
  }

  private async generateNaturalLanguageEnhancements(
    entry: AdapterRegistryEntry,
    query: EnhancedToolDiscoveryQuery
  ): Promise<EnhancedDiscoveredTool['naturalLanguage']> {
    const analysis = await this.nlpProcessor.analyzeToolComprehensively({
      name: entry.simTool.name,
      description: entry.config.description || '',
      parameters: entry.simTool.parameters || {}
    })

    return {
      description: analysis.enhancedDescription,
      usageDescription: analysis.usagePatterns.join('. '),
      conversationalHints: analysis.conversationalElements,
      exampleUsage: analysis.exampleUsage,
      keywords: analysis.keyInformation.concepts,
      contextualTips: analysis.recommendations
    }
  }

  private async generateSemanticMetadata(
    entry: AdapterRegistryEntry,
    query: EnhancedToolDiscoveryQuery
  ): Promise<EnhancedDiscoveredTool['semanticMetadata']> {
    const analysis = await this.nlpProcessor.analyzeToolComprehensively({
      name: entry.simTool.name,
      description: entry.config.description || '',
      parameters: entry.simTool.parameters || {}
    })

    const concepts = analysis.keyInformation.concepts
    const relationships = analysis.keyInformation.relationships || []

    let similarity = 0
    if (query.naturalLanguageQuery) {
      const queryAnalysis = await this.nlpProcessor.extractKeyInformation({
        name: 'query',
        description: query.naturalLanguageQuery,
        parameters: {}
      })
      similarity = this.calculateSemanticSimilarity(concepts, queryAnalysis.keyInformation.concepts)
    }

    return {
      concepts,
      relationships,
      similarity,
      relevanceScore: await this.calculateRelevanceScore(entry, query)
    }
  }

  private async generateAdaptationData(
    entry: AdapterRegistryEntry,
    userProfile: ExtendedUserProfile
  ): Promise<EnhancedDiscoveredTool['adaptationData']> {
    const baseSchema = await this.createDescriptionSchema(entry)
    const context: ExtendedUsageContext = {
      userProfile,
      conversationHistory: [],
      sessionContext: {},
      environment: 'production'
    }

    const [roleAdaptation, skillAdaptation, domainAdaptation] = await Promise.all([
      this.roleAdapter.adapt(baseSchema, context),
      this.skillAdapter.adapt(baseSchema, context),
      this.domainAdapter.adapt(baseSchema, context)
    ])

    return {
      roleSpecificGuidance: roleAdaptation.adaptedContent?.guidance,
      skillLevelAdvice: skillAdaptation.adaptedContent?.guidance,
      domainContext: domainAdaptation.adaptedContent?.guidance,
      personalizationHints: [
        ...(roleAdaptation.adaptedContent?.tips || []),
        ...(skillAdaptation.adaptedContent?.tips || []),
        ...(domainAdaptation.adaptedContent?.tips || [])
      ]
    }
  }

  private async performSemanticSearch(
    query: string,
    tools: EnhancedDiscoveredTool[]
  ): Promise<EnhancedDiscoveredTool[]> {
    // Enhance search with semantic understanding
    const queryAnalysis = await this.nlpProcessor.extractKeyInformation({
      name: 'search_query',
      description: query,
      parameters: {}
    })

    // Re-score tools based on semantic similarity
    const enhancedTools = tools.map(tool => {
      const semanticScore = this.calculateSemanticSimilarity(
        queryAnalysis.keyInformation.concepts,
        tool.semanticMetadata.concepts
      )

      return {
        ...tool,
        relevanceScore: (tool.relevanceScore * 0.6) + (semanticScore * 0.4), // Weighted combination
        semanticMetadata: {
          ...tool.semanticMetadata,
          similarity: semanticScore
        }
      }
    })

    return enhancedTools.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  private async adaptResultsToUser(
    results: EnhancedDiscoveredTool[],
    userProfile: ExtendedUserProfile
  ): Promise<EnhancedDiscoveredTool[]> {
    // Apply user-specific adaptations to the results
    return Promise.all(results.map(async (result) => {
      if (!result.adaptationData) {
        result.adaptationData = await this.generateAdaptationData(
          { id: result.id } as AdapterRegistryEntry,
          userProfile
        )
      }
      return result
    }))
  }

  private async performSemanticMatchingForEntry(
    entry: AdapterRegistryEntry,
    searchQuery: string,
    queryAnalysis: any,
    userContext?: ExtendedUsageContext
  ): Promise<SemanticSearchResult> {
    const toolAnalysis = await this.nlpProcessor.analyzeToolComprehensively({
      name: entry.simTool.name,
      description: entry.config.description || '',
      parameters: entry.simTool.parameters || {}
    })

    const conceptMatches = queryAnalysis.keyInformation.concepts.filter(
      concept => toolAnalysis.keyInformation.concepts.includes(concept)
    )

    const semanticSimilarity = this.calculateSemanticSimilarity(
      queryAnalysis.keyInformation.concepts,
      toolAnalysis.keyInformation.concepts
    )

    const contextualRelevance = userContext
      ? await this.calculateContextualRelevance(entry, userContext)
      : 0.5

    const relevanceScore = (semanticSimilarity * 0.5) + (contextualRelevance * 0.3) +
                          (conceptMatches.length / Math.max(queryAnalysis.keyInformation.concepts.length, 1) * 0.2)

    const adaptedContent = userContext?.userProfile
      ? await this.generateAdaptationData(entry, userContext.userProfile)
      : {}

    return {
      toolId: entry.id,
      title: entry.config.displayName || entry.simTool.name,
      description: toolAnalysis.enhancedDescription,
      relevanceScore,
      conceptMatches,
      semanticSimilarity,
      contextualRelevance,
      adaptedContent: {
        roleBasedDescription: adaptedContent.roleSpecificGuidance,
        skillLevelDescription: adaptedContent.skillLevelAdvice,
        domainSpecificDescription: adaptedContent.domainContext
      }
    }
  }

  private async createDescriptionSchema(tool: any): Promise<EnhancedDescriptionSchema> {
    const analysis = await this.nlpProcessor.analyzeToolComprehensively({
      name: tool.simTool?.name || tool.name,
      description: tool.config?.description || tool.description || '',
      parameters: tool.simTool?.parameters || tool.parameters || {}
    })

    return {
      toolId: tool.id,
      basicInfo: {
        name: tool.simTool?.name || tool.name,
        category: tool.metadata?.category || 'utility',
        tags: tool.metadata?.tags || []
      },
      descriptions: {
        brief: analysis.enhancedDescription.substring(0, 100) + '...',
        detailed: analysis.enhancedDescription,
        expert: analysis.enhancedDescription + '\n\nAdvanced Usage: ' + analysis.usagePatterns.join(', ')
      },
      usageContext: {
        commonScenarios: analysis.usagePatterns,
        bestPractices: analysis.recommendations,
        limitations: analysis.keyInformation.limitations || []
      },
      conversationalElements: analysis.conversationalElements,
      examples: analysis.exampleUsage,
      metadata: {
        lastUpdated: new Date(),
        version: '1.0.0',
        confidence: 0.85
      }
    }
  }

  private async adaptConfigToContext(config: any, context: ExtendedUsageContext): Promise<any> {
    // Apply contextual adaptations to the configuration
    const adaptations = await Promise.all([
      this.roleAdapter.adapt({
        descriptions: { detailed: config.description }
      } as EnhancedDescriptionSchema, context),
      this.skillAdapter.adapt({
        descriptions: { detailed: config.description }
      } as EnhancedDescriptionSchema, context)
    ])

    return {
      contextualDescription: adaptations[0].adaptedContent?.description,
      skillAppropriateExplanation: adaptations[1].adaptedContent?.description,
      personalizedTips: [
        ...(adaptations[0].adaptedContent?.tips || []),
        ...(adaptations[1].adaptedContent?.tips || [])
      ]
    }
  }

  private calculateSemanticSimilarity(concepts1: string[], concepts2: string[]): number {
    if (!concepts1.length || !concepts2.length) return 0

    const intersection = concepts1.filter(concept => concepts2.includes(concept))
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
    if (context.userProfile?.domain) {
      const domainRelevance = this.calculateDomainRelevance(entry, context.userProfile.domain)
      relevance += domainRelevance * 0.2
    }

    return Math.min(relevance, 1)
  }

  private calculateRoleRelevance(entry: AdapterRegistryEntry, role: string): number {
    const roleMappings: Record<string, string[]> = {
      developer: ['development', 'coding', 'technical', 'api'],
      business_user: ['business', 'workflow', 'process', 'management'],
      analyst: ['analysis', 'data', 'reporting', 'insights'],
      admin: ['configuration', 'settings', 'management', 'system']
    }

    const relevantTags = roleMappings[role] || []
    const matches = entry.metadata.tags.filter(tag => relevantTags.includes(tag.toLowerCase()))

    return matches.length / Math.max(relevantTags.length, 1)
  }

  private calculateDomainRelevance(entry: AdapterRegistryEntry, domain: string): number {
    const domainKeywords = domain.toLowerCase().split(/[^a-z]+/)
    const entryText = [
      entry.simTool.name,
      entry.config.description || '',
      ...entry.metadata.tags
    ].join(' ').toLowerCase()

    const matches = domainKeywords.filter(keyword => entryText.includes(keyword))
    return matches.length / Math.max(domainKeywords.length, 1)
  }

  private extractCapabilities(entry: AdapterRegistryEntry): string[] {
    const capabilities = [...entry.metadata.tags]

    if (entry.config.naturalLanguage) capabilities.push('natural_language')
    if (entry.config.caching?.enabled) capabilities.push('caching')
    if (entry.config.monitoring?.enabled) capabilities.push('monitoring')

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
      timestamp: Date.now()
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
      searchCache: { size: this.searchCache.size }
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
    qualityThreshold: 0.7
  },
  contextualAdaptation: {
    enabled: true,
    roleBasedAdaptation: true,
    skillLevelAdaptation: true,
    domainAdaptation: true,
    personalization: true
  },
  templateEngine: {
    enabled: true,
    dynamicGeneration: true,
    multiLevelDescriptions: true,
    personalizationEnabled: true
  },
  semanticSearch: {
    enabled: true,
    vectorSimilarity: true,
    conceptMatching: true,
    relevanceThreshold: 0.3
  },
  performance: {
    cacheResults: true,
    cacheTTL: 300000, // 5 minutes
    asyncProcessing: true,
    batchProcessing: true
  }
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