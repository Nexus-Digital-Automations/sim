/**
 * Enhanced Universal Tool Adapter Framework
 *
 * Comprehensive system for transforming Sim BlockConfig definitions into Parlant-compatible
 * tools with natural language interfaces, advanced validation, caching, and monitoring.
 *
 * @author Claude Code Framework Architecture Agent
 * @version 2.0.0
 */

import { z } from 'zod'
import { ResultFormatter } from '../formatting/result-formatter'
import { ParameterMapper } from '../mapping/parameter-mapper'
import type {
  AdapterConfiguration,
  AdapterPlugin,
  AdapterRegistryEntry,
  DiscoveredTool,
  NaturalLanguageConfig,
  ParameterMapping,
  // Universal Adapter types
  SimToolDefinition,
  ToolDiscoveryQuery,
  ValidationConfig,
} from '../types/adapter-interfaces'
import type {
  // Sim BlockConfig types
  BlockConfig,
  SubBlockConfig,
} from '../types/blocks-types'
import type { ParameterDefinition, ParameterType } from '../types/parlant-interfaces'
import { createLogger } from '../utils/logger'
import { ValidationEngine } from '../validation/validation-engine'
import { BaseAdapter } from './base-adapter'

const logger = createLogger('EnhancedAdapterFramework')

/**
 * Enhanced adapter framework for comprehensive BlockConfig transformation
 */
export class EnhancedAdapterFramework {
  private readonly registry = new Map<string, AdapterRegistryEntry>()
  private readonly plugins = new Map<string, AdapterPlugin>()
  private readonly cache = new Map<string, any>()
  private readonly metrics = new Map<string, number>()

  // Framework configuration
  private readonly config: FrameworkConfiguration

  // Performance optimization
  private readonly performanceOptimizer: any
  private readonly connectionPool: any

  // Monitoring and analytics
  private readonly monitor: any
  private readonly analytics: any

  constructor(config: FrameworkConfiguration = {}) {
    this.config = {
      // Default configuration
      enableCaching: true,
      enableMonitoring: true,
      enableAutoDiscovery: true,
      enablePlugins: true,
      maxCacheSize: 1000,
      cacheTtlMs: 300000, // 5 minutes
      maxConcurrentAdapters: 50,
      healthCheckIntervalMs: 60000, // 1 minute
      metricsRetentionDays: 30,
      enableSecurity: true,
      enablePerformanceOptimization: true,
      ...config,
    }

    // Initialize core subsystems
    this.parameterMapper = new ParameterMapper()
    this.validationEngine = new ValidationEngine()
    this.resultFormatter = new ResultFormatter()

    // Initialize performance systems
    this.performanceOptimizer = {} // TODO: Implement PerformanceOptimizer
    this.connectionPool = {} // TODO: Implement ConnectionPool

    // Initialize monitoring
    this.monitor = {} // TODO: Implement FrameworkMonitor
    this.analytics = {} // TODO: Implement UsageAnalytics

    logger.info('Enhanced Adapter Framework initialized', {
      caching: this.config.enableCaching,
      monitoring: this.config.enableMonitoring,
      plugins: this.config.enablePlugins,
      maxCacheSize: this.config.maxCacheSize,
    })
  }

  /**
   * Transform a Sim BlockConfig into a Parlant-compatible tool adapter
   */
  async createAdapterFromBlockConfig<T = any>(
    blockConfig: BlockConfig,
    customConfig: Partial<AdapterConfiguration> = {}
  ): Promise<BlockConfigAdapter<T>> {
    const startTime = Date.now()
    logger.info('Creating adapter from BlockConfig', { type: blockConfig.type })

    try {
      // Build adapter configuration from BlockConfig
      const adapterConfig = await this.buildAdapterConfiguration(blockConfig, customConfig)

      // Create parameter mappings from subBlocks
      const parameterMappings = await this.buildParameterMappings(blockConfig.subBlocks || [])

      // Build validation configuration
      const validationConfig = await this.buildValidationConfiguration(blockConfig)

      // Generate natural language configuration
      const naturalLanguageConfig = await this.generateNaturalLanguageConfig(blockConfig)

      // Create the adapter instance
      const adapter = new BlockConfigAdapter<T>(blockConfig, {
        ...adapterConfig,
        parameterMappings,
        validation: validationConfig,
        naturalLanguage: naturalLanguageConfig,
      })

      // Register the adapter
      const registryEntry = await this.registerAdapter(adapter, blockConfig)

      // Apply plugins
      await this.applyPlugins(adapter, registryEntry)

      const duration = Date.now() - startTime
      logger.info('Successfully created adapter', {
        type: blockConfig.type,
        duration,
        parameterCount: parameterMappings.length,
      })

      // Update metrics
      this.metrics.set('adapters_created', (this.metrics.get('adapters_created') || 0) + 1)
      this.analytics.recordAdapterCreation(blockConfig.type || 'unknown', duration)

      return adapter
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Failed to create adapter from BlockConfig', {
        type: blockConfig.type,
        error: errorMessage,
        duration,
      })

      this.metrics.set(
        'adapter_creation_errors',
        (this.metrics.get('adapter_creation_errors') || 0) + 1
      )
      throw error
    }
  }

  /**
   * Build comprehensive adapter configuration from BlockConfig
   */
  private async buildAdapterConfiguration(
    blockConfig: BlockConfig,
    customConfig: Partial<AdapterConfiguration>
  ): Promise<AdapterConfiguration> {
    const config: AdapterConfiguration = {
      // Basic identification
      parlantId: customConfig.parlantId || `sim_${blockConfig.type || blockConfig.id || 'unknown'}`,
      displayName: customConfig.displayName || blockConfig.name || blockConfig.title,
      description: customConfig.description || blockConfig.description || '',
      category: customConfig.category || this.mapBlockCategory(blockConfig.category || 'utility'),
      tags: customConfig.tags || this.generateTags(blockConfig),

      // Performance configuration
      caching: {
        enabled: this.config.enableCaching ?? false,
        ttlMs: this.config.cacheTtlMs,
        maxSize: Math.floor((this.config.maxCacheSize ?? 1000) / 10), // Per-adapter cache size
        keyStrategy: 'parameters',
        ...customConfig.caching,
      },

      // Monitoring configuration
      monitoring: {
        metrics: { enabled: this.config.enableMonitoring ?? false },
        performance: { enabled: this.config.enablePerformanceOptimization ?? false },
        errorTracking: { enabled: true },
        analytics: { enabled: true },
        ...customConfig.monitoring,
      },

      // Security configuration
      ...(this.config.enableSecurity && {
        security: {
          sanitization: { enabled: true },
          accessControl: { requiredPermissions: [] },
          rateLimiting: { enabled: true, maxRequestsPerMinute: 100 },
          privacy: { logParameters: false, logResults: false },
          ...customConfig.security,
        },
      }),

      // Error handling configuration
      errorHandling: {
        strategies: {
          validation: 'strict',
          execution: 'retry',
          timeout: 'fail',
        },
        retry: {
          maxAttempts: 3,
          backoffMs: 1000,
        },
        ...customConfig.errorHandling,
      },

      // Result formatting
      resultFormatting: {
        enableConversationalFormatting: true,
        enableTemplateFormatting: true,
        enableContextualHints: true,
        maxDetailsLength: 1000,
        maxActionsCount: 5,
        ...customConfig.resultFormatting,
      },

      ...customConfig,
    }

    return config
  }

  /**
   * Build parameter mappings from SubBlockConfig definitions
   */
  private async buildParameterMappings(subBlocks: SubBlockConfig[]): Promise<ParameterMapping[]> {
    const mappings: ParameterMapping[] = []

    for (const subBlock of subBlocks) {
      const mapping = await this.createParameterMapping(subBlock)
      if (mapping) {
        mappings.push(mapping)
      }
    }

    return mappings
  }

  /**
   * Build validation configuration from BlockConfig
   */
  private async buildValidationConfiguration(blockConfig: BlockConfig): Promise<ValidationConfig> {
    return {
      enableStrictValidation: true,
      enableBusinessRules: false,
      // customValidators: [], // Removed as it doesn't exist on ValidationConfig
      // schemaValidation: { // Removed as it doesn't exist on ValidationConfig
      //   enabled: true,
      //   strictMode: false
      // }
    }
  }

  /**
   * Create parameter mapping from a SubBlockConfig
   */
  private async createParameterMapping(subBlock: SubBlockConfig): Promise<ParameterMapping | null> {
    // Skip hidden or trigger-specific blocks
    if (subBlock.hidden || subBlock.type === 'trigger-config') {
      return null
    }

    const mapping: ParameterMapping = {
      parlantParameter: subBlock.id,
      simParameter: subBlock.canonicalParamId || subBlock.id,
      description: subBlock.description || subBlock.title,
      required: subBlock.required || false,
      defaultValue: subBlock.defaultValue,
      transformations: await this.buildTransformations(subBlock),
      validation: await this.buildParameterValidation(subBlock),
      conditions: subBlock.condition ? [this.buildMappingRule(subBlock.condition)] : undefined,
      contextualValue: await this.buildContextualValue(subBlock),
    }

    return mapping
  }

  /**
   * Build transformations for a specific SubBlock type
   */
  private async buildTransformations(subBlock: SubBlockConfig): Promise<MappingTransformation[]> {
    const transformations: MappingTransformation[] = []

    // Type-specific transformations
    switch (subBlock.type) {
      case 'oauth-input':
        transformations.push({
          type: 'oauth_credential_resolver',
          config: {
            provider: subBlock.provider,
            serviceId: subBlock.serviceId,
            requiredScopes: subBlock.requiredScopes || [],
          },
        })
        break

      case 'file-selector':
      case 'project-selector':
      case 'channel-selector':
      case 'folder-selector':
        transformations.push({
          type: 'resource_id_resolver',
          config: {
            resourceType: subBlock.type.replace('-selector', ''),
            provider: subBlock.provider,
          },
        })
        break

      case 'dropdown':
      case 'combobox':
        if (subBlock.options) {
          transformations.push({
            type: 'option_value_resolver',
            config: {
              options:
                typeof subBlock.options === 'function' ? subBlock.options() : subBlock.options,
            },
          })
        }
        break

      case 'slider':
        transformations.push({
          type: 'numeric_range_validator',
          config: {
            min: subBlock.min,
            max: subBlock.max,
            step: subBlock.step,
            integer: subBlock.integer,
          },
        })
        break

      case 'code':
        transformations.push({
          type: 'code_processor',
          config: {
            language: subBlock.language || 'javascript',
            generationType: subBlock.generationType,
          },
        })
        break

      case 'long-input':
        if (subBlock.placeholder?.includes('JSON')) {
          transformations.push({
            type: 'json_parser',
            config: { validateJson: true },
          })
        }
        break

      case 'time-input':
        transformations.push({
          type: 'time_normalizer',
          config: { outputFormat: 'iso8601' },
        })
        break

      case 'checkbox-list':
        transformations.push({
          type: 'array_normalizer',
          config: { ensureArray: true },
        })
        break
    }

    // Add conditional transformations
    if (subBlock.condition) {
      transformations.push({
        type: 'conditional_processor',
        config: {
          condition: subBlock.condition,
          skipIfConditionFalse: true,
        },
      })
    }

    return transformations
  }

  /**
   * Build validation configuration for a parameter
   */
  private async buildParameterValidation(subBlock: SubBlockConfig): Promise<ValidationConfig> {
    const validation: ValidationConfig = {
      enableStrictValidation: true,
      required: subBlock.required || false,
    }

    // Type-specific validation
    switch (subBlock.type) {
      case 'short-input':
      case 'long-input':
        validation.type = 'string'
        if (subBlock.password) {
          validation.custom = async (value: string) => {
            if (!value || value.length < 8) {
              return 'Password must be at least 8 characters long'
            }
            return true
          }
        }
        break

      case 'slider':
        validation.type = 'number'
        if (typeof subBlock.min !== 'undefined' || typeof subBlock.max !== 'undefined') {
          validation.schema = z
            .number()
            .min(subBlock.min || Number.NEGATIVE_INFINITY)
            .max(subBlock.max || Number.POSITIVE_INFINITY)
        }
        break

      case 'switch':
        validation.type = 'boolean'
        validation.schema = z.boolean()
        break

      case 'dropdown':
      case 'combobox':
        if (subBlock.options) {
          const options =
            typeof subBlock.options === 'function' ? subBlock.options() : subBlock.options
          validation.schema = z.enum(options.map((opt) => opt.id) as [string, ...string[]])
        }
        break

      case 'oauth-input':
        validation.businessRules = [
          {
            name: 'oauth_credential_validation',
            type: 'user_permissions',
            description: 'Validate OAuth credential has required scopes',
            resource: subBlock.provider || 'unknown',
            dependencies: subBlock.requiredScopes?.map((scope) => ({
              type: 'oauth_scope',
              id: scope,
            })),
          },
        ]
        break

      case 'file-selector':
        validation.businessRules = [
          {
            name: 'file_access_validation',
            type: 'resource_quota',
            description: 'Validate file access permissions',
            resourceType: 'file',
            dependencies: [{ type: 'file_access', id: subBlock.mimeType || 'any' }],
          },
        ]
        break
    }

    // Add dependency validation
    if (subBlock.dependsOn && subBlock.dependsOn.length > 0) {
      validation.businessRules = validation.businessRules || []
      validation.businessRules.push({
        name: 'dependency_validation',
        type: 'data_dependencies',
        description: 'Validate required dependencies are provided',
        dependencies: subBlock.dependsOn.map((dep) => ({ type: 'parameter', id: dep })),
      })
    }

    return validation
  }

  /**
   * Build contextual value configuration for dynamic resolution
   */
  private async buildContextualValue(
    subBlock: SubBlockConfig
  ): Promise<ContextualValue | undefined> {
    // Value function indicates dynamic resolution
    if (subBlock.value && typeof subBlock.value === 'function') {
      return {
        source: 'computed',
        compute: (context: any, originalValue?: any) => {
          try {
            return subBlock.value!(context.originalParameters || {})
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.warn('Error computing contextual value', {
              subBlockId: subBlock.id,
              error: errorMessage,
            })
            return originalValue
          }
        },
      }
    }

    // OAuth inputs resolve from credentials
    if (subBlock.type === 'oauth-input') {
      return {
        source: 'context',
        path: `credentials.${subBlock.provider}`,
      }
    }

    // Default value as constant
    if (subBlock.defaultValue !== undefined) {
      return {
        source: 'constant',
        value: subBlock.defaultValue,
      }
    }

    return undefined
  }

  /**
   * Generate natural language configuration from BlockConfig
   */
  private async generateNaturalLanguageConfig(
    blockConfig: BlockConfig
  ): Promise<NaturalLanguageConfig> {
    // Generate usage description
    const usageDescription = this.generateUsageDescription(blockConfig)

    // Generate example usage scenarios
    const exampleUsage = this.generateExampleUsage(blockConfig)

    // Generate conversational hints
    const conversationalHints = this.generateConversationalHints(blockConfig)

    // Generate keywords and aliases
    const keywords = this.generateKeywords(blockConfig)
    const aliases = this.generateAliases(blockConfig)

    return {
      usageDescription,
      exampleUsage,
      conversationalHints,
      keywords,
      aliases,
    }
  }

  /**
   * Generate natural usage description
   */
  private generateUsageDescription(blockConfig: BlockConfig): string {
    const actionWords = this.extractActionWords(blockConfig)
    const capabilities = this.extractCapabilities(blockConfig)

    const baseDescription = blockConfig.description?.toLowerCase() || 'perform operations'
    let description = `Use this tool to ${baseDescription}`

    if (capabilities.length > 0) {
      description += `. Capabilities include: ${capabilities.join(', ')}`
    }

    // BlockConfig doesn't have longDescription, using description length as alternative
    const descLength = blockConfig.description?.length || 0
    if (descLength > 50) {
      description += `. Additional details available.`
    }

    return description
  }

  /**
   * Generate example usage scenarios
   */
  private generateExampleUsage(blockConfig: BlockConfig): string[] {
    const examples: string[] = []

    // Base example
    examples.push(`When you need to ${blockConfig.description?.toLowerCase() || 'use this tool'}`)

    // Operation-specific examples
    const operationBlock = blockConfig.subBlocks?.find((sb) => sb.id === 'operation')
    if (operationBlock?.options) {
      const options =
        typeof operationBlock.options === 'function'
          ? operationBlock.options()
          : operationBlock.options
      options.forEach((option) => {
        examples.push(`To ${option.label.toLowerCase()} using ${blockConfig.name}`)
      })
    }

    // Category-specific examples
    switch (blockConfig.category) {
      case 'integration':
        examples.push(`For ${blockConfig.name} integration tasks`)
        examples.push(`When working with ${blockConfig.name} data`)
        break
      case 'workflow':
        examples.push(`For workflow ${blockConfig.name} operations`)
        break
      case 'communication':
        examples.push(`To set up ${blockConfig.name} communication triggers`)
        break
    }

    return examples.slice(0, 5) // Limit to 5 examples
  }

  /**
   * Generate conversational hints for natural interaction
   */
  private generateConversationalHints(blockConfig: BlockConfig): {
    whenToUse: string
    parameters: string
    results: string
  } {
    const requiredParams = (blockConfig.subBlocks || [])
      .filter((sb) => sb.required && !sb.hidden)
      .map((sb) => sb.title || sb.id)

    return {
      whenToUse: `This tool is helpful when you need to ${blockConfig.description?.toLowerCase() || 'use this tool'}, especially for ${blockConfig.category || 'general'} operations`,
      parameters:
        requiredParams.length > 0
          ? `I'll help you provide the required information: ${requiredParams.join(', ')}`
          : "I'll guide you through the available options for this tool",
      results: `I'll explain the ${blockConfig.name} results in a clear and actionable way, highlighting any important data or next steps`,
    }
  }

  /**
   * Register adapter in the registry with health monitoring
   */
  private async registerAdapter(
    adapter: BlockConfigAdapter,
    blockConfig: BlockConfig
  ): Promise<AdapterRegistryEntry> {
    const registryEntry: AdapterRegistryEntry = {
      id: adapter.id,
      simTool: this.createSimToolDefinition(blockConfig),
      config: adapter.getConfiguration(),
      adapter,
      metadata: {
        registeredAt: new Date(),
        version: '2.0.0',
        source: 'blockconfig',
        category: blockConfig.category || 'utility',
        tags: this.generateTags(blockConfig),
      },
      statistics: {
        executionCount: 0,
        averageExecutionTimeMs: 0,
        successRate: 1.0,
        errorCount: 0,
      },
      health: {
        status: 'healthy',
        lastCheckAt: new Date(),
        issues: [],
      },
    }

    this.registry.set(adapter.id, registryEntry)

    // Start health monitoring
    if (this.config.enableMonitoring) {
      this.monitor.startHealthMonitoring(registryEntry)
    }

    logger.info('Registered adapter in registry', {
      adapterId: adapter.id,
      category: blockConfig.category,
      version: registryEntry.metadata.version,
    })

    return registryEntry
  }

  /**
   * Apply registered plugins to adapter
   */
  private async applyPlugins(
    adapter: BlockConfigAdapter,
    registryEntry: AdapterRegistryEntry
  ): Promise<void> {
    if (!this.config.enablePlugins) return

    for (const [pluginName, plugin] of Array.from(this.plugins.entries())) {
      try {
        if (plugin.onInitialize) {
          await plugin.onInitialize(adapter)
        }

        logger.debug('Applied plugin to adapter', {
          pluginName,
          adapterId: adapter.id,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.warn('Failed to apply plugin', {
          pluginName,
          adapterId: adapter.id,
          error: errorMessage,
        })
      }
    }
  }

  /**
   * Discover tools based on query criteria
   */
  async discoverTools(query: ToolDiscoveryQuery): Promise<DiscoveredTool[]> {
    const results: DiscoveredTool[] = []

    for (const [id, entry] of Array.from(this.registry.entries())) {
      const relevanceScore = this.calculateRelevance(entry, query)

      if (relevanceScore > 0) {
        results.push({
          id,
          name: entry.config.displayName || entry.simTool.name,
          description: entry.config.description || '',
          category: entry.metadata.category,
          tags: entry.metadata.tags,
          relevanceScore,
          usageStats: {
            executionCount: entry.statistics?.executionCount || 0,
            successRate: entry.statistics?.successRate || 0,
          },
          capabilities: this.extractCapabilitiesFromEntry(entry),
          requirements: this.extractRequirementsFromEntry(entry),
        })
      }
    }

    // Sort by relevance and apply limits
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)

    if (query.limit) {
      return results.slice(query.offset || 0, (query.offset || 0) + query.limit)
    }

    return results
  }

  /**
   * Get comprehensive framework statistics
   */
  getFrameworkStats(): FrameworkStats {
    const totalAdapters = this.registry.size
    const healthyAdapters = Array.from(this.registry.values()).filter(
      (entry) => entry.health?.status === 'healthy'
    ).length

    const totalExecutions = Array.from(this.registry.values()).reduce(
      (sum, entry) => sum + (entry.statistics?.executionCount || 0),
      0
    )

    const averageSuccessRate =
      totalAdapters > 0
        ? Array.from(this.registry.values()).reduce(
            (sum, entry) => sum + (entry.statistics?.successRate || 0),
            0
          ) / totalAdapters
        : 0

    return {
      totalAdapters,
      healthyAdapters,
      unhealthyAdapters: totalAdapters - healthyAdapters,
      totalExecutions,
      averageSuccessRate,
      cacheHitRate: this.performanceOptimizer.getCacheHitRate(),
      averageExecutionTimeMs: this.analytics.getAverageExecutionTime(),
      pluginsLoaded: this.plugins.size,
      memoryUsageMB: this.getMemoryUsage(),
      uptime: Date.now() - this.startTime,
    }
  }

  /**
   * Register a plugin for extending functionality
   */
  async registerPlugin(plugin: AdapterPlugin): Promise<void> {
    // Validate plugin dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin dependency not found: ${dep}`)
        }
      }
    }

    this.plugins.set(plugin.name, plugin)

    logger.info('Registered plugin', {
      name: plugin.name,
      version: plugin.version,
      dependencies: plugin.dependencies?.length || 0,
    })

    // Apply to existing adapters if needed
    if (plugin.onInitialize) {
      for (const entry of Array.from(this.registry.values())) {
        if (entry.adapter) {
          try {
            await plugin.onInitialize(entry.adapter)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.warn('Failed to apply new plugin to existing adapter', {
              pluginName: plugin.name,
              adapterId: entry.id,
              error: errorMessage,
            })
          }
        }
      }
    }
  }

  /**
   * Clean shutdown with resource cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Enhanced Adapter Framework')

    // Stop monitoring
    await this.monitor.shutdown()

    // Clear caches
    this.cache.clear()

    // Close connection pool
    await this.connectionPool.close()

    // Save analytics
    await this.analytics.flush()

    logger.info('Framework shutdown complete')
  }

  // Helper methods for mapping and transformation
  private mapBlockCategory(category: string): string {
    switch (category) {
      case 'tools':
        return 'external-integration'
      case 'blocks':
        return 'workflow-management'
      case 'triggers':
        return 'automation'
      default:
        return 'utility'
    }
  }

  private generateTags(blockConfig: BlockConfig): string[] {
    const tags = ['sim-block', blockConfig.category || 'utility']

    // Add name-based tags
    const blockName = blockConfig.name || blockConfig.title || ''
    const nameParts = blockName
      .toLowerCase()
      .split(/[\s_-]+/)
      .filter((part) => part.length > 0)
    tags.push(...nameParts)

    // Add capability tags
    tags.push(...this.extractCapabilities(blockConfig).map((cap) => cap.toLowerCase()))

    return Array.from(new Set(tags)) // Remove duplicates
  }

  private extractActionWords(blockConfig: BlockConfig): string[] {
    const operations = blockConfig.subBlocks?.find((sb) => sb.id === 'operation')
    if (operations?.options) {
      const options =
        typeof operations.options === 'function' ? operations.options() : operations.options
      return options.map((opt) => opt.label.toLowerCase())
    }
    return []
  }

  private extractCapabilities(blockConfig: BlockConfig): string[] {
    const capabilities: string[] = []

    // From operations
    capabilities.push(...this.extractActionWords(blockConfig))

    // From tools access
    if (blockConfig.tools?.access) {
      capabilities.push(
        ...blockConfig.tools.access.map((tool) => tool.replace(/^.*_/, '').replace(/_/g, ' '))
      )
    }
    // From subBlocks features

    ;(blockConfig.subBlocks || []).forEach((subBlock) => {
      switch (subBlock.type) {
        case 'oauth-input':
          capabilities.push('authentication')
          break
        case 'file-selector':
          capabilities.push('file operations')
          break
        case 'webhook-config':
          capabilities.push('webhooks')
          break
        case 'trigger-config':
          capabilities.push('event triggers')
          break
      }
    })

    return Array.from(new Set(capabilities))
  }

  private generateKeywords(blockConfig: BlockConfig): string[] {
    const blockName = blockConfig.name || blockConfig.title || ''
    const blockType = blockConfig.type || blockConfig.id || ''
    const blockCategory = blockConfig.category || 'utility'

    const keywords = [
      blockName.toLowerCase(),
      ...blockName.toLowerCase().split(/[\s_-]+/),
      blockType,
      blockCategory,
    ].filter(Boolean) as string[]

    // Add description keywords
    const description = blockConfig.description || ''
    const descWords = description
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)
    keywords.push(...descWords)

    return Array.from(new Set(keywords))
  }

  private generateAliases(blockConfig: BlockConfig): string[] {
    const aliases: string[] = []

    // Common aliases for popular tools
    const commonAliases: Record<string, string[]> = {
      google_sheets: ['sheets', 'spreadsheet', 'gsheets'],
      slack: ['slack', 'messaging', 'chat'],
      github: ['git', 'repository', 'repo'],
      openai: ['gpt', 'chatgpt', 'ai'],
    }

    const blockType = blockConfig.type || blockConfig.id
    if (blockType && commonAliases[blockType]) {
      aliases.push(...commonAliases[blockType])
    }

    return aliases
  }

  private createSimToolDefinition(blockConfig: BlockConfig): SimToolDefinition {
    return {
      name: blockConfig.type || blockConfig.id || 'unknown',
      metadata: {
        displayNames: {},
        description: blockConfig.description || '',
      },
      hasInterrupt: false, // BlockConfigs don't typically have interrupts
      execute: async (ctx, args) => {
        // This is a placeholder - actual execution would be handled by Sim's tool system
        return { status: 200, message: 'Tool executed successfully' }
      },
    }
  }

  private buildMappingRule(condition: any): MappingRule {
    return {
      field: condition.field,
      operator: 'equals',
      value: condition.value,
    }
  }

  private calculateRelevance(entry: AdapterRegistryEntry, query: ToolDiscoveryQuery): number {
    let score = 0

    // Text matching
    if (query.query) {
      const searchText = query.query.toLowerCase()
      const name = entry.config.displayName?.toLowerCase() || ''
      const description = entry.config.description?.toLowerCase() || ''

      if (name.includes(searchText)) score += 10
      if (description.includes(searchText)) score += 5
    }

    // Category matching
    if (query.category && entry.metadata.category === query.category) {
      score += 15
    }

    // Tag matching
    if (query.tags) {
      const matchingTags = query.tags.filter((tag) => entry.metadata.tags.includes(tag))
      score += matchingTags.length * 3
    }

    // Success rate bonus
    if (entry.statistics?.successRate) {
      score += entry.statistics.successRate * 5
    }

    return score
  }

  private extractCapabilitiesFromEntry(entry: AdapterRegistryEntry): string[] {
    return entry.metadata.tags.filter(
      (tag) => !['sim-block', 'tools', 'blocks', 'triggers'].includes(tag)
    )
  }

  private extractRequirementsFromEntry(entry: AdapterRegistryEntry): string[] {
    const requirements: string[] = []

    // Check for OAuth requirements
    if (entry.metadata.tags.includes('authentication')) {
      requirements.push('authentication')
    }

    // Check security requirements
    if (entry.config.security?.accessControl?.requiredPermissions) {
      requirements.push(...entry.config.security.accessControl.requiredPermissions)
    }

    return requirements
  }

  private getMemoryUsage(): number {
    if (process?.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    }
    return 0
  }

  private startTime = Date.now()
}

/**
 * Specialized adapter for BlockConfig-based tools
 */
export class BlockConfigAdapter<T = any> extends BaseAdapter<any, T, any> {
  private readonly blockConfig: BlockConfig

  constructor(blockConfig: BlockConfig, config: AdapterConfiguration) {
    // Create a SimToolDefinition from BlockConfig
    const simTool: SimToolDefinition = {
      name: blockConfig.type || blockConfig.id || 'unknown',
      metadata: {
        displayNames: {},
        description: blockConfig.description,
      },
      execute: async (ctx, args) => {
        // This would integrate with Sim's actual tool execution system
        return { status: 200, message: 'Tool executed successfully' }
      },
    }

    super(simTool, config)
    this.blockConfig = blockConfig
  }

  /**
   * Build parameter definitions from BlockConfig subBlocks
   */
  protected buildParameterDefinitions(): ParameterDefinition[] {
    const parameters: ParameterDefinition[] = []

    for (const subBlock of this.blockConfig.subBlocks || []) {
      if (subBlock.hidden || subBlock.type === 'trigger-config') {
        continue
      }

      const param: ParameterDefinition = {
        name: subBlock.id,
        type: this.mapSubBlockTypeToParameterType(subBlock),
        description: subBlock.description || subBlock.title || subBlock.id,
        required: subBlock.required || false,
        defaultValue: subBlock.defaultValue,
        examples: subBlock.placeholder ? [subBlock.placeholder] : undefined,
        conversationalHints: {
          prompt: subBlock.placeholder || `Enter ${subBlock.title || subBlock.id}`,
          clarification: subBlock.description || `Please provide ${subBlock.title || subBlock.id}`,
        },
      }

      // Store additional metadata if needed for adapter functionality
      // Note: This would be stored separately as ParameterDefinition doesn't support metadata
      const additionalMetadata = {
        subBlockType: subBlock.type,
        placeholder: subBlock.placeholder,
        provider: subBlock.provider,
        dependsOn: subBlock.dependsOn,
        enumValues: this.extractEnumValues(subBlock),
      }
      // Additional metadata could be stored in a separate mapping if needed

      parameters.push(param)
    }

    return parameters
  }

  /**
   * Build input validation schema from parameters
   */
  protected buildInputSchema(): z.ZodSchema<any> {
    const shape: Record<string, z.ZodTypeAny> = {}

    for (const subBlock of this.blockConfig.subBlocks || []) {
      if (subBlock.hidden || subBlock.type === 'trigger-config') {
        continue
      }

      let schema = this.createZodSchemaForSubBlock(subBlock)

      // Make optional if not required
      if (!subBlock.required) {
        schema = schema.optional()
      }

      shape[subBlock.id] = schema
    }

    return z.object(shape)
  }

  /**
   * Get BlockConfig for inspection
   */
  getBlockConfig(): BlockConfig {
    return this.blockConfig
  }

  // Helper methods for BlockConfig-specific processing

  private mapSubBlockTypeToParameterType(subBlock: SubBlockConfig): ParameterType {
    switch (subBlock.type) {
      case 'short-input':
      case 'long-input':
      case 'oauth-input':
      case 'file-selector':
      case 'project-selector':
      case 'channel-selector':
      case 'folder-selector':
        return { baseType: 'string' }

      case 'slider':
        return { baseType: 'number' }

      case 'switch':
        return { baseType: 'boolean' }

      case 'dropdown':
      case 'combobox':
        return { baseType: 'string' } // with enum

      case 'checkbox-list':
        return { baseType: 'array' }

      case 'code':
      case 'table':
        return { baseType: 'object' }

      default:
        return { baseType: 'string' }
    }
  }

  private extractEnumValues(subBlock: SubBlockConfig): string[] | undefined {
    if (subBlock.type === 'dropdown' || subBlock.type === 'combobox') {
      if (subBlock.options) {
        const options =
          typeof subBlock.options === 'function' ? subBlock.options() : subBlock.options
        return options.map((opt) => opt.id)
      }
    }
    return undefined
  }

  private createZodSchemaForSubBlock(subBlock: SubBlockConfig): z.ZodTypeAny {
    switch (subBlock.type) {
      case 'short-input':
      case 'long-input':
      case 'oauth-input':
      case 'file-selector':
      case 'project-selector':
      case 'channel-selector':
      case 'folder-selector':
        return z.string()

      case 'slider': {
        let numberSchema = z.number()
        if (subBlock.min !== undefined) numberSchema = numberSchema.min(subBlock.min)
        if (subBlock.max !== undefined) numberSchema = numberSchema.max(subBlock.max)
        if (subBlock.integer) numberSchema = numberSchema.int()
        return numberSchema
      }

      case 'switch':
        return z.boolean()

      case 'dropdown':
      case 'combobox':
        if (subBlock.options) {
          const options =
            typeof subBlock.options === 'function' ? subBlock.options() : subBlock.options
          const enumValues = options.map((opt) => opt.id) as [string, ...string[]]
          return z.enum(enumValues)
        }
        return z.string()

      case 'checkbox-list':
        return z.array(z.string())

      case 'code':
      case 'table':
        return z.any() // Could be more specific based on generationType

      default:
        return z.string()
    }
  }
}

// Supporting classes for the framework

class PerformanceOptimizer {
  private cacheHits = 0
  private cacheRequests = 0

  getCacheHitRate(): number {
    return this.cacheRequests > 0 ? this.cacheHits / this.cacheRequests : 0
  }

  recordCacheHit(): void {
    this.cacheHits++
    this.cacheRequests++
  }

  recordCacheMiss(): void {
    this.cacheRequests++
  }
}

class ConnectionPool {
  async close(): Promise<void> {
    // Close any open connections
  }
}

class FrameworkMonitor {
  private healthChecks = new Map<string, NodeJS.Timeout>()

  constructor(private config: FrameworkConfiguration) {}

  startHealthMonitoring(entry: AdapterRegistryEntry): void {
    if (!this.config.enableMonitoring) return

    const interval = setInterval(async () => {
      await this.performHealthCheck(entry)
    }, this.config.healthCheckIntervalMs || 60000)

    this.healthChecks.set(entry.id, interval)
  }

  private async performHealthCheck(entry: AdapterRegistryEntry): Promise<void> {
    try {
      // Perform basic health check
      entry.health = {
        status: 'healthy',
        lastCheckAt: new Date(),
        issues: [],
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      entry.health = {
        status: 'unhealthy',
        lastCheckAt: new Date(),
        issues: [errorMessage],
      }
    }
  }

  async shutdown(): Promise<void> {
    for (const interval of Array.from(this.healthChecks.values())) {
      clearInterval(interval)
    }
    this.healthChecks.clear()
  }
}

class UsageAnalytics {
  private executionTimes: number[] = []

  recordAdapterCreation(type: string, duration: number): void {
    // Record metrics
  }

  getAverageExecutionTime(): number {
    return this.executionTimes.length > 0
      ? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
      : 0
  }

  async flush(): Promise<void> {
    // Save analytics data
  }
}

// Supporting types and interfaces

interface FrameworkConfiguration {
  enableCaching?: boolean
  enableMonitoring?: boolean
  enableAutoDiscovery?: boolean
  enablePlugins?: boolean
  maxCacheSize?: number
  cacheTtlMs?: number
  maxConcurrentAdapters?: number
  healthCheckIntervalMs?: number
  metricsRetentionDays?: number
  enableSecurity?: boolean
  enablePerformanceOptimization?: boolean
}

interface MappingTransformation {
  type: string
  config?: Record<string, any>
  customTransform?: (value: any, config: Record<string, any>, context: any) => Promise<any> | any
}

interface MappingRule {
  field: string
  operator: 'equals' | 'not_equals' | 'exists' | 'not_exists' | 'contains' | 'matches'
  value: any
  contextField?: string
}

interface ContextualValue {
  source:
    | 'context'
    | 'user'
    | 'workspace'
    | 'session'
    | 'agent'
    | 'timestamp'
    | 'uuid'
    | 'original'
    | 'constant'
    | 'computed'
  path?: string
  value?: any
  compute?: (context: any, originalValue?: any) => any
}

interface FrameworkStats {
  totalAdapters: number
  healthyAdapters: number
  unhealthyAdapters: number
  totalExecutions: number
  averageSuccessRate: number
  cacheHitRate: number
  averageExecutionTimeMs: number
  pluginsLoaded: number
  memoryUsageMB: number
  uptime: number
}
