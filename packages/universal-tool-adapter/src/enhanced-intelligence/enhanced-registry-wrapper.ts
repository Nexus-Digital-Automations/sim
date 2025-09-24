/**
 * Enhanced Registry Wrapper
 *
 * Wraps existing registry systems with natural language intelligence capabilities,
 * providing seamless integration without breaking existing functionality.
 *
 * @author Natural Language Framework Agent
 * @version 1.0.0
 */

import { NaturalLanguageEngine } from '../natural-language'
import type { ConversationMessage, UsageContext } from '../natural-language/usage-guidelines'
import { AdapterRegistry, type RegistryConfig } from '../registry/adapter-registry'
import { EnhancedAdapterRegistry } from '../registry/enhanced-adapter-registry'
import type {
  AdapterConfiguration,
  AdapterRegistryEntry,
  DiscoveredTool,
  SimToolDefinition,
  ToolDiscoveryQuery,
} from '../types/adapter-interfaces'
import { createLogger } from '../utils/logger'
import {
  DEFAULT_REGISTRY_INTEGRATION_CONFIG,
  type EnhancedDiscoveredTool,
  type EnhancedToolDiscoveryQuery,
  NaturalLanguageRegistryIntegration,
  type RegistryIntegrationConfig,
  type SemanticSearchResult,
} from './registry-integration'

const logger = createLogger('EnhancedRegistryWrapper')

/**
 * Configuration for the enhanced registry wrapper
 */
export interface EnhancedRegistryWrapperConfig {
  // Registry selection
  useEnhancedRegistry: boolean
  fallbackToStandardRegistry: boolean

  // Natural language features
  naturalLanguage: {
    enabled: boolean
    autoEnhanceNewTools: boolean
    backgroundProcessing: boolean
    enhanceOnFirstAccess: boolean
  }

  // Integration settings
  integration: Partial<RegistryIntegrationConfig>

  // Registry configurations
  standardRegistryConfig?: RegistryConfig
  enhancedRegistryConfig?: any // EnhancedRegistry config type

  // Performance settings
  performance: {
    batchSize: number
    maxConcurrentEnhancements: number
    enhancementTimeout: number
    cacheEnabled: boolean
    preloadPopularTools: boolean
  }

  // Backwards compatibility
  compatibility: {
    maintainOriginalInterface: boolean
    logDeprecationWarnings: boolean
    supportLegacyQueries: boolean
  }
}

/**
 * Enhanced Registry Wrapper
 *
 * Provides a unified interface that combines standard registry functionality
 * with advanced natural language intelligence capabilities.
 */
export class EnhancedRegistryWrapper {
  private standardRegistry?: AdapterRegistry
  private enhancedRegistry?: EnhancedAdapterRegistry
  private naturalLanguageEngine: NaturalLanguageEngine
  private registryIntegration: NaturalLanguageRegistryIntegration
  private enhancedToolCache = new Map<string, EnhancedDiscoveredTool>()
  private isInitialized = false

  constructor(private config: EnhancedRegistryWrapperConfig) {
    logger.info('Initializing Enhanced Registry Wrapper', {
      useEnhancedRegistry: config.useEnhancedRegistry,
      naturalLanguageEnabled: config.naturalLanguage.enabled,
    })

    // Initialize registries based on configuration
    if (config.useEnhancedRegistry) {
      this.enhancedRegistry = new EnhancedAdapterRegistry(config.enhancedRegistryConfig)
      logger.debug('Enhanced registry initialized')
    }

    if (!config.useEnhancedRegistry || config.fallbackToStandardRegistry) {
      this.standardRegistry = new AdapterRegistry(
        config.standardRegistryConfig || this.getDefaultStandardConfig()
      )
      logger.debug('Standard registry initialized')
    }

    // Initialize natural language components
    this.naturalLanguageEngine = new NaturalLanguageEngine()
    this.registryIntegration = new NaturalLanguageRegistryIntegration({
      ...DEFAULT_REGISTRY_INTEGRATION_CONFIG,
      ...config.integration,
    })

    logger.debug('Natural language components initialized')
  }

  /**
   * Initialize the registry wrapper and perform any necessary setup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    logger.info('Initializing enhanced registry wrapper')

    try {
      // Perform any necessary setup operations
      if (this.config.performance.preloadPopularTools) {
        await this.preloadPopularTools()
      }

      this.isInitialized = true
      logger.info('Enhanced registry wrapper initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize enhanced registry wrapper', {
        error: error.message,
        stack: error.stack,
      })
      throw error
    }
  }

  /**
   * Register a tool with automatic natural language enhancement
   */
  async registerTool(
    simTool: SimToolDefinition,
    config: AdapterConfiguration,
    naturalLanguageConfig?: any
  ): Promise<void> {
    logger.debug(`Registering tool: ${simTool.name}`)

    try {
      // Register with the primary registry
      const primaryRegistry = this.getPrimaryRegistry()
      await primaryRegistry.registerAdapter(simTool, config)

      // Enhance with natural language capabilities if enabled
      if (this.config.naturalLanguage.enabled && this.config.naturalLanguage.autoEnhanceNewTools) {
        await this.enhanceToolInBackground(config.parlantId || `sim_${simTool.name}`)
      }

      // Register with natural language engine
      if (naturalLanguageConfig) {
        await this.naturalLanguageEngine.registerTool(
          { id: config.parlantId || `sim_${simTool.name}`, name: simTool.name },
          naturalLanguageConfig
        )
      }

      logger.info(`Tool registered successfully: ${simTool.name}`)
    } catch (error) {
      logger.error(`Failed to register tool: ${simTool.name}`, {
        error: error.message,
        stack: error.stack,
      })
      throw error
    }
  }

  /**
   * Enhanced tool discovery with natural language capabilities
   */
  async discoverTools(query: EnhancedToolDiscoveryQuery): Promise<EnhancedDiscoveredTool[]> {
    logger.debug('Performing enhanced tool discovery', {
      hasNaturalLanguageQuery: !!query.naturalLanguageQuery,
      semanticSearch: query.semanticSearch,
    })

    try {
      // Get tools from the primary registry
      const standardResults = await this.getStandardDiscoveryResults(query)

      // Apply natural language enhancements if enabled
      if (this.config.naturalLanguage.enabled) {
        const availableEntries = await this.getRegistryEntries()
        return await this.registryIntegration.enhancedToolDiscovery(query, availableEntries)
      }

      // Convert standard results to enhanced format for compatibility
      return this.convertToEnhancedResults(standardResults)
    } catch (error) {
      logger.error('Enhanced tool discovery failed', {
        error: error.message,
        stack: error.stack,
      })

      // Fallback to standard discovery
      if (this.config.fallbackToStandardRegistry) {
        logger.warn('Falling back to standard registry discovery')
        const standardResults = await this.getStandardDiscoveryResults(query)
        return this.convertToEnhancedResults(standardResults)
      }

      throw error
    }
  }

  /**
   * Semantic search across tool descriptions
   */
  async searchTools(
    searchQuery: string,
    userContext?: UsageContext
  ): Promise<SemanticSearchResult[]> {
    if (!this.config.naturalLanguage.enabled) {
      logger.warn('Semantic search requested but natural language is disabled')
      return []
    }

    logger.debug('Performing semantic tool search', {
      query: searchQuery,
      hasUserContext: !!userContext,
    })

    try {
      const availableEntries = await this.getRegistryEntries()
      const extendedContext = userContext ? this.convertToExtendedContext(userContext) : undefined

      return await this.registryIntegration.searchToolDescriptions(
        searchQuery,
        availableEntries,
        extendedContext
      )
    } catch (error) {
      logger.error('Semantic search failed', {
        query: searchQuery,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Get enhanced tool information with natural language descriptions
   */
  async getEnhancedTool(
    toolId: string,
    userContext?: UsageContext
  ): Promise<EnhancedDiscoveredTool | null> {
    logger.debug(`Getting enhanced tool information: ${toolId}`)

    try {
      // Check cache first
      if (this.config.performance.cacheEnabled && this.enhancedToolCache.has(toolId)) {
        logger.debug(`Returning cached enhanced tool: ${toolId}`)
        return this.enhancedToolCache.get(toolId)!
      }

      // Get tool from registry
      const registryEntry = await this.getRegistryEntry(toolId)
      if (!registryEntry) {
        return null
      }

      // Enhance with natural language capabilities
      let enhancedTool: EnhancedDiscoveredTool
      if (this.config.naturalLanguage.enabled) {
        const extendedContext = userContext ? this.convertToExtendedContext(userContext) : undefined
        const enhancedEntry = await this.registryIntegration.enhanceAdapterEntry(
          registryEntry,
          extendedContext
        )

        enhancedTool = await this.convertRegistryEntryToEnhanced(enhancedEntry, userContext)
      } else {
        enhancedTool = await this.convertRegistryEntryToEnhanced(registryEntry, userContext)
      }

      // Cache the result
      if (this.config.performance.cacheEnabled) {
        this.enhancedToolCache.set(toolId, enhancedTool)
      }

      return enhancedTool
    } catch (error) {
      logger.error(`Failed to get enhanced tool: ${toolId}`, {
        error: error.message,
      })
      return null
    }
  }

  /**
   * Get conversational assistance for tool usage
   */
  async getConversationalAssistance(
    userMessage: string,
    context: UsageContext,
    conversationHistory: ConversationMessage[] = []
  ): Promise<any> {
    if (!this.config.naturalLanguage.enabled) {
      throw new Error('Natural language features are disabled')
    }

    logger.debug('Processing conversational assistance request')

    try {
      const response = await this.naturalLanguageEngine.processConversation(
        userMessage,
        context,
        conversationHistory
      )

      // Enhance recommendations with registry information
      if (response.recommendations.length > 0) {
        const enhancedRecommendations = await Promise.all(
          response.recommendations.map(async (rec) => {
            const enhancedTool = await this.getEnhancedTool(rec.toolId, context)
            return {
              ...rec,
              enhancedTool,
            }
          })
        )

        return {
          ...response,
          recommendations: enhancedRecommendations,
        }
      }

      return response
    } catch (error) {
      logger.error('Conversational assistance failed', {
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Batch enhance multiple tools with natural language capabilities
   */
  async batchEnhanceTools(
    toolIds: string[],
    userContext?: UsageContext,
    options?: {
      priority?: 'high' | 'normal' | 'low'
      background?: boolean
    }
  ): Promise<{
    enhanced: EnhancedDiscoveredTool[]
    failed: { toolId: string; error: string }[]
  }> {
    if (!this.config.naturalLanguage.enabled) {
      throw new Error('Natural language features are disabled')
    }

    logger.info(`Batch enhancing ${toolIds.length} tools`, {
      priority: options?.priority,
      background: options?.background,
    })

    const enhanced: EnhancedDiscoveredTool[] = []
    const failed: { toolId: string; error: string }[] = []

    // Process in batches to avoid overwhelming the system
    const batchSize = this.config.performance.batchSize
    for (let i = 0; i < toolIds.length; i += batchSize) {
      const batch = toolIds.slice(i, i + batchSize)

      const batchPromises = batch.map(async (toolId) => {
        try {
          const enhancedTool = await this.getEnhancedTool(toolId, userContext)
          if (enhancedTool) {
            return enhancedTool
          }
          throw new Error('Tool not found or enhancement failed')
        } catch (error) {
          failed.push({ toolId, error: error.message })
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      enhanced.push(...batchResults.filter((result) => result !== null))
    }

    logger.info('Batch enhancement completed', {
      enhanced: enhanced.length,
      failed: failed.length,
    })

    return { enhanced, failed }
  }

  /**
   * Get registry statistics with natural language enhancements
   */
  async getEnhancedStatistics(): Promise<any> {
    const primaryRegistry = this.getPrimaryRegistry()
    const baseStats = primaryRegistry.getStatistics()

    const enhancedStats = {
      ...baseStats,
      naturalLanguage: {
        enabled: this.config.naturalLanguage.enabled,
        enhancedTools: this.enhancedToolCache.size,
        cacheStats: this.registryIntegration.getCacheStats(),
      },
    }

    return enhancedStats
  }

  /**
   * Backward compatibility method for legacy discovery
   */
  async search(query: ToolDiscoveryQuery): Promise<DiscoveredTool[]> {
    if (this.config.compatibility.logDeprecationWarnings) {
      logger.warn('Using deprecated search method, consider using discoverTools instead')
    }

    const enhancedQuery: EnhancedToolDiscoveryQuery = {
      ...query,
      semanticSearch: false,
      adaptToUser: false,
    }

    const enhancedResults = await this.discoverTools(enhancedQuery)
    return this.convertToLegacyResults(enhancedResults)
  }

  /**
   * Shutdown the registry wrapper and cleanup resources
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down enhanced registry wrapper')

    try {
      // Shutdown registries
      if (this.standardRegistry) {
        await this.standardRegistry.shutdown()
      }
      if (this.enhancedRegistry) {
        await this.enhancedRegistry.shutdown()
      }

      // Clear caches
      this.enhancedToolCache.clear()
      this.registryIntegration.clearCache()

      this.isInitialized = false
      logger.info('Enhanced registry wrapper shut down successfully')
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error.message,
      })
      throw error
    }
  }

  // Private helper methods

  private getPrimaryRegistry(): AdapterRegistry | EnhancedAdapterRegistry {
    if (this.config.useEnhancedRegistry && this.enhancedRegistry) {
      return this.enhancedRegistry as any // Type compatibility hack
    }
    if (this.standardRegistry) {
      return this.standardRegistry
    }
    throw new Error('No registry available')
  }

  private async getStandardDiscoveryResults(query: ToolDiscoveryQuery): Promise<any[]> {
    const primaryRegistry = this.getPrimaryRegistry()

    if ('discover' in primaryRegistry) {
      // Enhanced registry
      return await (primaryRegistry as any).discover(query)
    }
    // Standard registry
    return await (primaryRegistry as any).search(query)
  }

  private async getRegistryEntries(): Promise<AdapterRegistryEntry[]> {
    const primaryRegistry = this.getPrimaryRegistry()

    if ('listAdapters' in primaryRegistry) {
      return (primaryRegistry as any).listAdapters()
    }
    // For enhanced registry, we'd need a different method
    throw new Error('Unable to get registry entries from enhanced registry')
  }

  private async getRegistryEntry(toolId: string): Promise<AdapterRegistryEntry | null> {
    const primaryRegistry = this.getPrimaryRegistry()

    if ('getAdapterEntry' in primaryRegistry) {
      return (primaryRegistry as any).getAdapterEntry(toolId) || null
    }
    if ('get' in primaryRegistry) {
      // For enhanced registry
      const adapter = await (primaryRegistry as any).get(toolId)
      if (adapter) {
        // Create a mock registry entry
        return {
          id: toolId,
          adapter,
          // ... other required fields would need to be constructed
        } as AdapterRegistryEntry
      }
    }

    return null
  }

  private convertToExtendedContext(context: UsageContext): any {
    return {
      userProfile: {
        userId: context.userProfile?.userId || 'anonymous',
        role: context.userProfile?.role || 'user',
        skillLevel: context.userProfile?.skillLevel || 'beginner',
        domain: context.userProfile?.domain,
        preferences: context.userProfile?.preferences || {},
      },
      conversationHistory: [],
      sessionContext: context.sessionContext || {},
      environment: 'production',
    }
  }

  private async convertRegistryEntryToEnhanced(
    entry: AdapterRegistryEntry,
    userContext?: UsageContext
  ): Promise<EnhancedDiscoveredTool> {
    // Basic conversion from registry entry to enhanced tool
    const enhancedTool: EnhancedDiscoveredTool = {
      id: entry.id,
      name: entry.config.displayName || entry.simTool.name,
      description: entry.config.description || '',
      category: entry.metadata.category,
      tags: entry.metadata.tags,
      relevanceScore: 1.0,
      usageStats: {
        executionCount: entry.statistics?.executionCount || 0,
        successRate: entry.statistics?.successRate || 0,
        averageRating: 0,
      },
      capabilities: this.extractCapabilities(entry),
      requirements: this.extractRequirements(entry),
      performance: {
        averageExecutionTimeMs: entry.statistics?.averageExecutionTimeMs || 0,
        healthStatus: entry.health?.status || 'unknown',
        lastUsed: entry.statistics?.lastUsed,
      },
      naturalLanguage: {
        description: entry.config.description || '',
        usageDescription: 'Tool usage description',
        conversationalHints: [],
        exampleUsage: [],
        keywords: entry.metadata.tags,
        contextualTips: [],
      },
      semanticMetadata: {
        concepts: entry.metadata.tags,
        relationships: [],
        similarity: 0,
        relevanceScore: 1.0,
      },
      adaptationData: {},
    }

    return enhancedTool
  }

  private convertToEnhancedResults(standardResults: any[]): EnhancedDiscoveredTool[] {
    // Convert standard discovery results to enhanced format
    return standardResults.map((result) => ({
      ...result,
      naturalLanguage: {
        description: result.description || '',
        usageDescription: 'Standard tool usage description',
        conversationalHints: [],
        exampleUsage: [],
        keywords: result.tags || [],
        contextualTips: [],
      },
      semanticMetadata: {
        concepts: result.tags || [],
        relationships: [],
        similarity: 0,
        relevanceScore: result.relevanceScore || 1.0,
      },
      adaptationData: {},
    }))
  }

  private convertToLegacyResults(enhancedResults: EnhancedDiscoveredTool[]): DiscoveredTool[] {
    // Convert enhanced results back to legacy format for backward compatibility
    return enhancedResults.map((result) => ({
      id: result.id,
      name: result.name,
      description: result.description,
      category: result.category,
      tags: result.tags,
      relevanceScore: result.relevanceScore,
      usageStats: result.usageStats,
      capabilities: result.capabilities,
      requirements: result.requirements,
    }))
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

  private async enhanceToolInBackground(toolId: string): Promise<void> {
    // Perform enhancement in the background without blocking
    setImmediate(async () => {
      try {
        await this.getEnhancedTool(toolId)
        logger.debug(`Background enhancement completed for: ${toolId}`)
      } catch (error) {
        logger.warn(`Background enhancement failed for: ${toolId}`, {
          error: error.message,
        })
      }
    })
  }

  private async preloadPopularTools(): Promise<void> {
    logger.info('Preloading popular tools')

    try {
      const entries = await this.getRegistryEntries()

      // Sort by usage statistics to identify popular tools
      const popularTools = entries
        .filter((entry) => entry.statistics?.executionCount > 0)
        .sort((a, b) => (b.statistics?.executionCount || 0) - (a.statistics?.executionCount || 0))
        .slice(0, 10) // Preload top 10 popular tools

      await Promise.all(popularTools.map((entry) => this.getEnhancedTool(entry.id)))

      logger.info(`Preloaded ${popularTools.length} popular tools`)
    } catch (error) {
      logger.warn('Failed to preload popular tools', {
        error: error.message,
      })
    }
  }

  private getDefaultStandardConfig(): RegistryConfig {
    return {
      storage: {
        type: 'memory',
      },
      plugins: {
        enabled: false,
      },
      healthMonitoring: {
        enabled: false,
      },
      caching: {
        enabled: true,
      },
      security: {},
      analytics: {
        enabled: false,
      },
    }
  }
}

/**
 * Default configuration for enhanced registry wrapper
 */
export const DEFAULT_ENHANCED_WRAPPER_CONFIG: EnhancedRegistryWrapperConfig = {
  useEnhancedRegistry: true,
  fallbackToStandardRegistry: true,
  naturalLanguage: {
    enabled: true,
    autoEnhanceNewTools: true,
    backgroundProcessing: true,
    enhanceOnFirstAccess: true,
  },
  integration: DEFAULT_REGISTRY_INTEGRATION_CONFIG,
  performance: {
    batchSize: 10,
    maxConcurrentEnhancements: 5,
    enhancementTimeout: 30000,
    cacheEnabled: true,
    preloadPopularTools: true,
  },
  compatibility: {
    maintainOriginalInterface: true,
    logDeprecationWarnings: true,
    supportLegacyQueries: true,
  },
}

/**
 * Factory function to create enhanced registry wrapper
 */
export function createEnhancedRegistryWrapper(
  config: Partial<EnhancedRegistryWrapperConfig> = {}
): EnhancedRegistryWrapper {
  const finalConfig = { ...DEFAULT_ENHANCED_WRAPPER_CONFIG, ...config }
  return new EnhancedRegistryWrapper(finalConfig)
}
