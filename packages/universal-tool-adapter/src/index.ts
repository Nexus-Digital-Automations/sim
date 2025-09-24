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

export {
  AutoDiscoverySystem,
  createAutoDiscoverySystem,
  extractBlockConfigFromFile,
  validateBlockConfig,
} from './config/auto-discovery-system'
export { BaseAdapter } from './core/base-adapter'
// Core framework components
export { BlockConfigAdapter, EnhancedAdapterFramework } from './core/enhanced-adapter-framework'
// Error types
export { AdapterError, ExecutionError, ValidationError } from './errors/adapter-errors'
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
  }

  /**
   * Initialize the complete system
   */
  async initialize(): Promise<void> {
    // Initialize plugins first (they might be needed by other systems)
    await this.plugins.initialize()

    // Initialize auto-discovery
    await this.discovery.performFullDiscovery()

    // System is ready
    console.log('Universal Tool Adapter System initialized successfully')
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
  async executeAdapter(adapterId: string, context: any, args: any): Promise<any> {
    // Execute with performance optimization
    const result = await this.performance.optimizedExecute(
      adapterId,
      context,
      args,
      async (id, ctx, params) => {
        const adapter = await this.registry.get(id)
        if (!adapter) {
          throw new Error(`Adapter not found: ${id}`)
        }
        return adapter.execute(ctx, params)
      }
    )

    // Record in analytics
    this.analytics.recordExecution(adapterId, context, args, result)

    return result
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
}

interface SystemStatus {
  framework: any
  registry: any
  performance: any
  analytics: any
  plugins: any
  testing: any
  discovery: any
}

// Default export for convenience
export default UniversalToolAdapterSystem
