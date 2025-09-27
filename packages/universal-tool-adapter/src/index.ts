/**
 * Universal Tool Adapter Framework - Main Entry Point
 *
 * Complete framework for transforming Sim BlockConfig definitions into
 * Parlant-compatible tools with natural language interfaces, performance
 * optimization, monitoring, and comprehensive testing capabilities.
 *
 * @author Claude Code Framework Architecture Agent
 * @version 2.0.0
 */

// Internal imports for the UniversalToolAdapterSystem class
import { AutoDiscoverySystem } from './config/auto-discovery-system'
import {
  type BlockConfigAdapter,
  EnhancedAdapterFramework,
} from './core/enhanced-adapter-framework'
import {
  type IntelligenceConfiguration,
  IntelligenceIntegrationLayer,
} from './enhanced-intelligence/intelligence-integration-layer'
import { AnalyticsSystem } from './monitoring/analytics-system'
import { PerformanceOptimizationEngine } from './performance/optimization-engine'
import { PluginSystem } from './plugins/plugin-system'
import { EnhancedAdapterRegistry } from './registry/enhanced-adapter-registry'
import { AdapterTestFramework } from './testing/test-framework'
import type { AdapterExecutionResult } from './types/adapter-interfaces'
import { EnhancedValidationEngine } from './validation/enhanced-validation-engine'

export {
  AutoDiscoverySystem,
  createAutoDiscoverySystem,
  extractBlockConfigFromFile,
  validateBlockConfig,
} from './config/auto-discovery-system'
export { BaseAdapter } from './core/base-adapter'
// Core framework components
export {
  BlockConfigAdapter,
  EnhancedAdapterFramework,
} from './core/enhanced-adapter-framework'
export {
  adaptSchemaToContext,
  BaseContextualAdapter,
  ContextualAdapterRegistry,
  createContextualAdapterRegistry,
  DomainSpecificAdapter,
  RoleBasedAdapter,
  SkillLevelAdapter,
} from './enhanced-intelligence/contextual-adapters'
export { ContextualRecommendationEngine } from './enhanced-intelligence/contextual-recommendation-engine'
export {
  createEnhancedRegistryWrapper,
  DEFAULT_ENHANCED_WRAPPER_CONFIG,
  EnhancedRegistryWrapper,
  type EnhancedRegistryWrapperConfig,
} from './enhanced-intelligence/enhanced-registry-wrapper'
// Enhanced Intelligence Components
export {
  checkIntelligenceCapabilities,
  createFullyIntelligentAdapter,
  createIntelligenceEnhancedAdapter,
  type IntelligenceConfiguration,
  IntelligenceIntegrationLayer,
} from './enhanced-intelligence/intelligence-integration-layer'
export { IntelligentTemplateEngine } from './enhanced-intelligence/intelligent-template-engine'
export { NaturalLanguageDescriptionFramework } from './enhanced-intelligence/natural-language-description-framework'
export { NLPProcessor } from './enhanced-intelligence/nlp-processor'
// Natural Language Framework Integration
export {
  DEFAULT_REGISTRY_INTEGRATION_CONFIG,
  type EnhancedDiscoveredTool,
  type EnhancedToolDiscoveryQuery,
  NaturalLanguageRegistryIntegration,
  type RegistryIntegrationConfig,
  type SemanticSearchResult,
} from './enhanced-intelligence/registry-integration'
export {
  createSemanticSearchEngine,
  DEFAULT_SEMANTIC_SEARCH_CONFIG,
  type EnhancedSearchQuery,
  type EnhancedSemanticSearchResult,
  type SearchFeedback,
  type SemanticSearchConfig,
  SemanticSearchEngine,
} from './enhanced-intelligence/semantic-search-engine'
export { EnhancedToolIntelligenceEngine } from './enhanced-intelligence/tool-intelligence-engine'
export { ComprehensiveToolErrorManager } from './error-handling/comprehensive-error-manager'
// Error types
export {
  AdapterError,
  ExecutionError,
  ValidationError,
} from './errors/adapter-errors'
export { ResultFormatter } from './formatting/result-formatter'
export { ParameterMapper } from './mapping/parameter-mapper'
// Monitoring and analytics
export { AnalyticsSystem } from './monitoring/analytics-system'
// Performance optimization
export { PerformanceOptimizationEngine } from './performance/optimization-engine'
// Plugin system
export { PluginSystem } from './plugins/plugin-system'
// Registry and discovery
export { EnhancedAdapterRegistry } from './registry/enhanced-adapter-registry'
// Testing framework
export { AdapterTestFramework } from './testing/test-framework'
// Types and interfaces
export type * from './types/adapter-interfaces'
export type * from './types/parlant-interfaces'
// Utilities
export { createLogger } from './utils/logger'
// Validation and parameter processing
export { EnhancedValidationEngine } from './validation/enhanced-validation-engine'
export { ValidationEngine } from './validation/validation-engine'

/**
 * Complete Universal Tool Adapter System
 *
 * Orchestrates all framework components for comprehensive tool adaptation
 * with enhanced intelligence capabilities
 */
export class UniversalToolAdapterSystem {
  // Core components
  public readonly framework: EnhancedAdapterFramework
  public readonly registry: EnhancedAdapterRegistry
  public readonly discovery: AutoDiscoverySystem
  public readonly validation: EnhancedValidationEngine
  public readonly performance: PerformanceOptimizationEngine
  public readonly plugins: PluginSystem
  public readonly analytics: AnalyticsSystem
  public readonly testing: AdapterTestFramework

  // Enhanced Intelligence layer (optional)
  public readonly intelligence?: IntelligenceIntegrationLayer

  constructor(config: UniversalAdapterConfig = {}) {
    // Initialize core framework
    this.framework = new EnhancedAdapterFramework(config.framework)
    this.registry = new EnhancedAdapterRegistry(config.registry)

    // Initialize validation engine
    this.validation = new EnhancedValidationEngine(config.validation)

    // Initialize performance optimization
    this.performance = new PerformanceOptimizationEngine(config.performance)

    // Initialize plugin system
    this.plugins = new PluginSystem(config.plugins)

    // Initialize analytics
    this.analytics = new AnalyticsSystem(config.analytics)

    // Initialize auto-discovery
    this.discovery = new AutoDiscoverySystem(this.framework, this.registry, config.discovery)

    // Initialize testing framework
    this.testing = new AdapterTestFramework(this.framework, config.testing)

    // Initialize intelligence layer if configured
    if (config.enableIntelligence !== false) {
      this.intelligence = new IntelligenceIntegrationLayer(this.registry, config.intelligence)
    }
  }

  /**
   * Initialize the complete system
   */
  async initialize(): Promise<void> {
    // Initialize plugins first (they might be needed by other systems)
    await this.plugins.initialize()

    // Initialize intelligence layer if available
    if (this.intelligence) {
      await this.intelligence.initialize()
    }

    // Initialize auto-discovery
    await this.discovery.performFullDiscovery()

    // System is ready
    console.log('Universal Tool Adapter System initialized successfully', {
      intelligenceEnabled: !!this.intelligence,
    })
  }

  /**
   * Create adapter from BlockConfig with full system integration
   */
  async createAdapter(blockConfig: any, customConfig?: any): Promise<BlockConfigAdapter> {
    const adapter = await this.framework.createAdapterFromBlockConfig(blockConfig, customConfig)

    // Record in analytics
    this.analytics.recordAdapterRegistration({
      id: adapter.id,
      simTool: adapter.getSimTool(),
      config: adapter.getConfiguration(),
      adapter,
      metadata: {
        registeredAt: new Date(),
        version: '2.0.0',
        source: 'api',
        category: blockConfig.category || 'utility',
        tags: [blockConfig.type, blockConfig.category],
      },
      statistics: {
        executionCount: 0,
        averageExecutionTimeMs: 0,
        successRate: 1.0,
        errorCount: 0,
      },
      health: {
        status: 'healthy' as const,
        lastCheckAt: new Date(),
        issues: [],
      },
    })

    return adapter
  }

  /**
   * Execute adapter with full monitoring and optimization
   */
  async executeAdapter(
    adapterId: string,
    context: any,
    args: any,
    userContext?: any
  ): Promise<any> {
    // Use intelligence-enhanced execution if available
    if (this.intelligence) {
      return this.intelligence.executeWithIntelligence(adapterId, context, args, userContext)
    }

    // Execute with performance optimization
    const result = await this.performance.optimizedExecute(
      adapterId,
      context,
      args,
      async (id: string, ctx: any, params: any): Promise<AdapterExecutionResult> => {
        const startedAt = new Date()
        const adapter = await this.registry.get(id)
        if (!adapter) {
          throw new Error(`Adapter not found: ${id}`)
        }

        try {
          // Execute the adapter and get ParlantToolResult
          const parlantResult = await adapter.execute(ctx, params)
          const completedAt = new Date()

          // Transform ParlantToolResult to AdapterExecutionResult
          const adapterResult: AdapterExecutionResult = {
            success: parlantResult.type === 'success',
            executionId: ctx.executionId || `${id}_${Date.now()}`,
            toolId: id,
            startedAt,
            completedAt,
            durationMs: completedAt.getTime() - startedAt.getTime(),
            data: parlantResult.data,
            metadata: parlantResult.metadata || {},
            warnings: parlantResult.warnings,
            notices: parlantResult.notices,
          }

          // Handle errors
          if (parlantResult.type === 'error' || parlantResult.error) {
            adapterResult.success = false
            adapterResult.error = {
              type: parlantResult.error?.type || 'execution_error',
              message: parlantResult.error?.message || parlantResult.message || 'Unknown error',
              code: parlantResult.error?.code,
              details: parlantResult.error?.details,
              recoverable: parlantResult.error?.recoverable ?? false,
            }
          }

          // Transform follow-up suggestions
          if (parlantResult.followUp?.suggestedActions) {
            adapterResult.suggestions = parlantResult.followUp.suggestedActions.map((action) => ({
              type: action.type,
              message: action.description || action.label,
              action: action.id,
              priority: action.priority || 'medium',
            }))
          }

          return adapterResult
        } catch (error: any) {
          const completedAt = new Date()
          return {
            success: false,
            executionId: ctx.executionId || `${id}_${Date.now()}`,
            toolId: id,
            startedAt,
            completedAt,
            durationMs: completedAt.getTime() - startedAt.getTime(),
            error: {
              type: 'execution_error',
              message: error.message || 'Adapter execution failed',
              details: error.stack || error,
              recoverable: false,
            },
          }
        }
      }
    )

    // Record in analytics
    this.analytics.recordExecution(adapterId, context, args, result)

    return result
  }

  /**
   * Discover tools with intelligence enhancement
   */
  async discoverTools(query: any, userContext?: any): Promise<any> {
    if (this.intelligence) {
      return this.intelligence.discoverWithIntelligence(query, userContext)
    }

    return this.registry.discover(query)
  }

  /**
   * Get intelligent tool description
   */
  async getToolDescription(
    toolId: string,
    userContext?: any,
    complexityLevel?: 'brief' | 'detailed' | 'expert'
  ): Promise<any> {
    if (this.intelligence) {
      return this.intelligence.getToolDescription(toolId, userContext, complexityLevel)
    }

    return null
  }

  /**
   * Get contextual recommendations
   */
  async getRecommendations(request: any): Promise<any> {
    if (this.intelligence) {
      return this.intelligence.getContextualRecommendations(request)
    }

    return []
  }

  /**
   * Record feedback for intelligence improvement
   */
  async recordFeedback(toolId: string, feedback: any): Promise<void> {
    if (this.intelligence) {
      await this.intelligence.recordIntelligenceFeedback(toolId, feedback)
    }
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): SystemStatus {
    return {
      framework: this.framework.getFrameworkStats(),
      registry: this.registry.getStatistics(),
      performance: this.performance.getPerformanceStats(),
      analytics: this.analytics.getRealTimeMetrics(),
      plugins: this.plugins.getSystemStats(),
      testing: this.testing.getTestStatistics(),
      discovery: this.discovery.getDiscoveryStats(),
      intelligence: this.intelligence?.getIntelligenceMetrics(),
    }
  }

  /**
   * Graceful system shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Universal Tool Adapter System...')

    // Shutdown in reverse order
    await this.testing.cleanup()
    await this.discovery.shutdown()
    await this.analytics.shutdown()

    // Shutdown intelligence layer if available
    if (this.intelligence) {
      await this.intelligence.shutdown()
    }

    await this.plugins.shutdown()
    await this.performance.shutdown()
    await this.registry.shutdown()
    await this.framework.shutdown()

    console.log('Universal Tool Adapter System shutdown complete')
  }
}

/**
 * Factory function to create a pre-configured system
 */
export function createUniversalAdapterSystem(
  config?: UniversalAdapterConfig
): UniversalToolAdapterSystem {
  return new UniversalToolAdapterSystem(config)
}

/**
 * Quick setup function for common use cases
 */
export async function quickSetup(
  options: QuickSetupOptions = {}
): Promise<UniversalToolAdapterSystem> {
  const system = new UniversalToolAdapterSystem({
    framework: {
      enableCaching: options.enableCaching ?? true,
      enableMonitoring: options.enableMonitoring ?? true,
      enableAutoDiscovery: options.enableAutoDiscovery ?? true,
    },
    registry: {
      healthCheckIntervalMs: options.healthCheckInterval ?? 60000,
    },
    performance: {
      caching: {
        execution: { enabled: options.enableCaching ?? true },
      },
    },
    plugins: {
      autoLoadPlugins: options.enablePlugins ?? true,
    },
    analytics: {
      enableAlerting: options.enableAlerting ?? true,
    },
    discovery: {
      enabled: options.enableAutoDiscovery ?? true,
      scanPaths: options.scanPaths || ['./blocks', './adapters'],
    },
    // Intelligence configuration
    enableIntelligence: options.enableIntelligence ?? true,
    intelligence: {
      enableNaturalLanguageDescriptions: options.intelligenceFeatures?.naturalLanguage ?? true,
      enableContextualRecommendations:
        options.intelligenceFeatures?.contextualRecommendations ?? true,
      enableIntelligentErrorHandling:
        options.intelligenceFeatures?.intelligentErrorHandling ?? true,
      enablePerformanceOptimization: true,
    },
  })

  if (options.initialize !== false) {
    await system.initialize()
  }

  return system
}

// Configuration interfaces
interface UniversalAdapterConfig {
  framework?: any
  registry?: any
  validation?: any
  performance?: any
  plugins?: any
  analytics?: any
  discovery?: any
  testing?: any
  // Intelligence integration
  enableIntelligence?: boolean
  intelligence?: IntelligenceConfiguration
}

interface QuickSetupOptions {
  enableCaching?: boolean
  enableMonitoring?: boolean
  enableAutoDiscovery?: boolean
  enablePlugins?: boolean
  enableAlerting?: boolean
  healthCheckInterval?: number
  scanPaths?: string[]
  initialize?: boolean
  // Intelligence features
  enableIntelligence?: boolean
  intelligenceFeatures?: {
    naturalLanguage?: boolean
    contextualRecommendations?: boolean
    intelligentErrorHandling?: boolean
  }
}

interface SystemStatus {
  framework: any
  registry: any
  performance: any
  analytics: any
  plugins: any
  testing: any
  discovery: any
  intelligence?: any
}

// Default export for convenience
export default UniversalToolAdapterSystem
