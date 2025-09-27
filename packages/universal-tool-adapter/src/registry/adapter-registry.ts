/**
 * Universal Tool Adapter - Registry System
 *
 * Central registry for managing tool adapters with extensible patterns,
 * dynamic loading, health monitoring, and configuration management.
 *
 * @author Claude Code Adapter Pattern Design Agent
 * @version 1.0.0
 */

import type { BaseAdapter } from '../core/base-adapter'
import { AdapterError, ConfigurationError, RegistryError } from '../errors/adapter-errors'
import type {
  AdapterConfiguration,
  AdapterMigration,
  AdapterPlugin,
  AdapterRegistryEntry,
  SimToolDefinition,
  VersionCompatibility,
} from '../types/adapter-interfaces'
import type {
  ParlantTool,
  RecommendationContext,
  ToolDiscovery,
  ToolRecommendation,
  ToolSearchQuery,
  ToolSearchResult,
} from '../types/parlant-interfaces'
import { createLogger } from '../utils/logger'
import { ConcreteAdapter } from './concrete-adapter'

const logger = createLogger('AdapterRegistry')

/**
 * Registry configuration
 */
export interface RegistryConfig {
  // Storage configuration
  storage: {
    type: 'memory' | 'database' | 'redis' | 'file'
    connectionString?: string
    options?: Record<string, any>
  }

  // Plugin system
  plugins: {
    enabled: boolean
    autoDiscovery?: boolean
    pluginDirectories?: string[]
    allowDynamicLoading?: boolean
  }

  // Health monitoring
  healthMonitoring: {
    enabled: boolean
    checkIntervalMs?: number
    healthCheckTimeout?: number
    unhealthyThreshold?: number
  }

  // Performance optimization
  caching: {
    enabled: boolean
    cacheTtlMs?: number
    maxCacheSize?: number
  }

  // Security and compliance
  security: {
    requireSignedPlugins?: boolean
    allowedSources?: string[]
    sandboxPlugins?: boolean
  }

  // Analytics and telemetry
  analytics: {
    enabled: boolean
    trackUsage?: boolean
    trackPerformance?: boolean
    reportingEndpoint?: string
  }
}

/**
 * Plugin manager for extensible adapter functionality
 */
export class PluginManager {
  private plugins: Map<string, AdapterPlugin> = new Map()
  private pluginDependencies: Map<string, string[]> = new Map()

  constructor(private config: RegistryConfig['plugins']) {
    logger.info('Plugin manager initialized', { enabled: config.enabled })
  }

  /**
   * Register a plugin with the system
   */
  async registerPlugin(plugin: AdapterPlugin): Promise<void> {
    logger.debug(`Registering plugin: ${plugin.name}`)

    // Validate plugin structure
    this.validatePlugin(plugin)

    // Check dependencies
    if (plugin.dependencies) {
      const missingDeps = plugin.dependencies.filter((dep) => !this.plugins.has(dep))
      if (missingDeps.length > 0) {
        throw new RegistryError(
          `Plugin ${plugin.name} has missing dependencies: ${missingDeps.join(', ')}`,
          'register',
          { plugin: plugin.name, missingDeps }
        )
      }
    }

    // Initialize plugin
    if (plugin.onInitialize) {
      await plugin.onInitialize(null) // Adapter instance would be passed here
    }

    this.plugins.set(plugin.name, plugin)
    if (plugin.dependencies) {
      this.pluginDependencies.set(plugin.name, plugin.dependencies)
    }

    logger.info(`Plugin registered: ${plugin.name} v${plugin.version}`)
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName)
    if (!plugin) {
      return false
    }

    // Check for dependent plugins
    const dependents = Array.from(this.pluginDependencies.entries())
      .filter(([_, deps]) => deps.includes(pluginName))
      .map(([name]) => name)

    if (dependents.length > 0) {
      throw new RegistryError(
        `Cannot unregister plugin ${pluginName}: dependencies exist (${dependents.join(', ')})`,
        'unregister',
        { plugin: pluginName, dependents }
      )
    }

    this.plugins.delete(pluginName)
    this.pluginDependencies.delete(pluginName)

    logger.info(`Plugin unregistered: ${pluginName}`)
    return true
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): AdapterPlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): AdapterPlugin | undefined {
    return this.plugins.get(name)
  }

  /**
   * Execute plugin hooks for a specific extension point
   */
  async executeHooks(extensionPoint: string, context: any, data?: any): Promise<any> {
    const results: any[] = []

    for (const plugin of this.plugins.values()) {
      const hookMethod = this.getHookMethod(plugin, extensionPoint)
      if (hookMethod) {
        try {
          const result = await hookMethod(context, data)
          if (result !== undefined) {
            results.push(result)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          logger.error(`Plugin hook failed: ${plugin.name}.${extensionPoint}`, {
            error: errorMessage,
          })
          // Continue with other plugins
        }
      }
    }

    return results
  }

  /**
   * Get hook method from plugin
   */
  private getHookMethod(
    plugin: AdapterPlugin,
    extensionPoint: string
  ): ((...args: any[]) => any) | undefined {
    const hookMap: Record<string, string> = {
      before_execution: 'onBeforeExecution',
      after_execution: 'onAfterExecution',
      parameter_mapping: 'onParameterMapping',
      result_formatting: 'onResultFormatting',
      error: 'onError',
    }

    const methodName = hookMap[extensionPoint]
    return methodName
      ? (plugin[methodName as keyof AdapterPlugin] as ((...args: any[]) => any) | undefined)
      : undefined
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: AdapterPlugin): void {
    if (!plugin.name || !plugin.version) {
      throw new ConfigurationError('Plugin must have name and version')
    }

    if (this.plugins.has(plugin.name)) {
      throw new RegistryError(`Plugin already registered: ${plugin.name}`, 'register', {
        plugin: plugin.name,
      })
    }

    // Additional validation could be added here
  }

  /**
   * Auto-discover plugins from configured directories
   */
  async autoDiscoverPlugins(): Promise<void> {
    if (!this.config.autoDiscovery || !this.config.pluginDirectories) {
      return
    }

    logger.info('Starting plugin auto-discovery')

    for (const directory of this.config.pluginDirectories) {
      try {
        await this.discoverPluginsInDirectory(directory)
      } catch (error) {
        logger.warn(`Plugin discovery failed for directory: ${directory}`, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  /**
   * Discover plugins in a specific directory
   */
  private async discoverPluginsInDirectory(directory: string): Promise<void> {
    // This would implement file system scanning for plugin files
    // For now, it's a placeholder
    logger.debug(`Scanning directory for plugins: ${directory}`)
  }
}

/**
 * Health monitor for adapter registry
 */
export class HealthMonitor {
  private healthChecks: Map<string, () => Promise<boolean>> = new Map()
  private healthHistory: Map<string, Array<{ timestamp: Date; healthy: boolean }>> = new Map()
  private monitoringInterval?: NodeJS.Timeout

  constructor(private config: RegistryConfig['healthMonitoring']) {
    if (config.enabled) {
      this.startMonitoring()
    }
  }

  /**
   * Register a health check for an adapter
   */
  registerHealthCheck(adapterId: string, healthCheck: () => Promise<boolean>): void {
    this.healthChecks.set(adapterId, healthCheck)
    this.healthHistory.set(adapterId, [])
    logger.debug(`Health check registered for adapter: ${adapterId}`)
  }

  /**
   * Unregister health check
   */
  unregisterHealthCheck(adapterId: string): void {
    this.healthChecks.delete(adapterId)
    this.healthHistory.delete(adapterId)
  }

  /**
   * Check health of a specific adapter
   */
  async checkHealth(adapterId: string): Promise<boolean> {
    const healthCheck = this.healthChecks.get(adapterId)
    if (!healthCheck) {
      return true // Assume healthy if no check registered
    }

    try {
      const healthy = await Promise.race([
        healthCheck(),
        new Promise<boolean>((_, reject) =>
          setTimeout(
            () => reject(new Error('Health check timeout')),
            this.config.healthCheckTimeout || 5000
          )
        ),
      ])

      this.recordHealthCheck(adapterId, healthy)
      return healthy
    } catch (error) {
      logger.warn(`Health check failed for adapter: ${adapterId}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      this.recordHealthCheck(adapterId, false)
      return false
    }
  }

  /**
   * Check health of all registered adapters
   */
  async checkAllHealth(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()

    const checks = Array.from(this.healthChecks.keys()).map(async (adapterId) => {
      const healthy = await this.checkHealth(adapterId)
      results.set(adapterId, healthy)
    })

    await Promise.all(checks)
    return results
  }

  /**
   * Get health status for an adapter
   */
  getHealthStatus(
    adapterId: string
  ): { current: boolean; history: Array<{ timestamp: Date; healthy: boolean }> } | null {
    const history = this.healthHistory.get(adapterId)
    if (!history || history.length === 0) {
      return null
    }

    return {
      current: history[history.length - 1].healthy,
      history: [...history],
    }
  }

  /**
   * Get overall health statistics
   */
  getHealthStatistics(): {
    total: number
    healthy: number
    unhealthy: number
    healthyPercentage: number
  } {
    const total = this.healthChecks.size
    let healthy = 0

    for (const adapterId of this.healthChecks.keys()) {
      const status = this.getHealthStatus(adapterId)
      if (status?.current) {
        healthy++
      }
    }

    return {
      total,
      healthy,
      unhealthy: total - healthy,
      healthyPercentage: total > 0 ? (healthy / total) * 100 : 100,
    }
  }

  /**
   * Start continuous health monitoring
   */
  private startMonitoring(): void {
    const intervalMs = this.config.checkIntervalMs || 60000 // Default 1 minute

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAllHealth()
      } catch (error) {
        logger.error('Health monitoring cycle failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }, intervalMs)

    logger.info('Health monitoring started', { intervalMs })
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
      logger.info('Health monitoring stopped')
    }
  }

  /**
   * Record a health check result
   */
  private recordHealthCheck(adapterId: string, healthy: boolean): void {
    const history = this.healthHistory.get(adapterId)
    if (!history) {
      return
    }

    history.push({ timestamp: new Date(), healthy })

    // Keep only recent history (last 100 checks)
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }
  }
}

/**
 * Migration manager for adapter versioning
 */
export class MigrationManager {
  private migrations: Map<string, AdapterMigration[]> = new Map()

  /**
   * Register a migration for an adapter
   */
  registerMigration(adapterId: string, migration: AdapterMigration): void {
    let adapterMigrations = this.migrations.get(adapterId)
    if (!adapterMigrations) {
      adapterMigrations = []
      this.migrations.set(adapterId, adapterMigrations)
    }

    adapterMigrations.push(migration)
    adapterMigrations.sort((a, b) => a.fromVersion.localeCompare(b.fromVersion))

    logger.debug(
      `Migration registered for adapter: ${adapterId} (${migration.fromVersion} -> ${migration.toVersion})`
    )
  }

  /**
   * Get available migrations for an adapter
   */
  getMigrations(adapterId: string): AdapterMigration[] {
    return this.migrations.get(adapterId) || []
  }

  /**
   * Find migration path between versions
   */
  findMigrationPath(adapterId: string, fromVersion: string, toVersion: string): AdapterMigration[] {
    const migrations = this.getMigrations(adapterId)
    const path: AdapterMigration[] = []
    let currentVersion = fromVersion

    while (currentVersion !== toVersion) {
      const nextMigration = migrations.find((m) => m.fromVersion === currentVersion)
      if (!nextMigration) {
        throw new RegistryError(
          `No migration path found from ${fromVersion} to ${toVersion} for adapter ${adapterId}`,
          'lookup',
          { adapterId, fromVersion, toVersion }
        )
      }

      path.push(nextMigration)
      currentVersion = nextMigration.toVersion
    }

    return path
  }

  /**
   * Execute migration path
   */
  async executeMigrations(
    adapterId: string,
    data: any,
    migrationPath: AdapterMigration[]
  ): Promise<any> {
    let migratedData = data

    for (const migration of migrationPath) {
      logger.info(
        `Executing migration: ${adapterId} ${migration.fromVersion} -> ${migration.toVersion}`
      )

      try {
        // Execute configuration migration if available
        if (migration.configMigration) {
          migratedData.config = migration.configMigration(migratedData.config)
        }

        // Execute data migration if available
        if (migration.dataMigration) {
          migratedData.data = migration.dataMigration(migratedData.data)
        }

        // Validate migration result
        if (migration.validate && !migration.validate(migratedData)) {
          throw new Error(
            `Migration validation failed: ${migration.fromVersion} -> ${migration.toVersion}`
          )
        }
      } catch (error) {
        logger.error(
          `Migration failed: ${adapterId} ${migration.fromVersion} -> ${migration.toVersion}`,
          {
            error: error instanceof Error ? error.message : String(error),
          }
        )

        // Attempt rollback if available
        if (migration.rollback) {
          try {
            migratedData = migration.rollback(migratedData)
            logger.info(`Migration rolled back successfully`)
          } catch (rollbackError) {
            logger.error(`Migration rollback failed`, {
              error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
            })
          }
        }

        throw error
      }
    }

    return migratedData
  }

  /**
   * Check version compatibility
   */
  checkCompatibility(
    adapterId: string,
    currentVersion: string,
    targetVersion: string
  ): VersionCompatibility {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check if migration path exists
    try {
      this.findMigrationPath(adapterId, currentVersion, targetVersion)
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error))
    }

    // Version compatibility logic would go here
    const compatible = issues.length === 0

    if (!compatible) {
      recommendations.push('Consider updating to an intermediate version first')
      recommendations.push('Check documentation for breaking changes')
    }

    return {
      adapterVersion: currentVersion,
      simVersion: 'unknown', // Would be determined dynamically
      parlantVersion: 'unknown', // Would be determined dynamically
      compatible,
      issues,
      recommendations,
    }
  }
}

/**
 * Main adapter registry with extensibility and configuration management
 */
export class AdapterRegistry implements ToolDiscovery {
  private adapters: Map<string, AdapterRegistryEntry> = new Map()
  private pluginManager: PluginManager
  private healthMonitor: HealthMonitor
  private migrationManager: any // TODO: Add proper MigrationManager type
  private cache?: Map<string, { data: any; timestamp: Date }>

  constructor(private config: RegistryConfig) {
    this.pluginManager = new PluginManager(config.plugins)
    this.healthMonitor = new HealthMonitor(config.healthMonitoring)
    this.migrationManager = new MigrationManager()

    if (config.caching.enabled) {
      this.cache = new Map()
      this.startCacheCleanup()
    }

    logger.info('Adapter registry initialized', {
      pluginsEnabled: config.plugins.enabled,
      healthMonitoringEnabled: config.healthMonitoring.enabled,
      cachingEnabled: config.caching.enabled,
    })
  }

  /**
   * Register a new adapter with the registry
   */
  async registerAdapter(simTool: SimToolDefinition, config: AdapterConfiguration): Promise<void> {
    const adapterId = config.parlantId || `sim_${simTool.name}`

    logger.debug(`Registering adapter: ${adapterId}`)

    // Check if adapter already exists
    if (this.adapters.has(adapterId)) {
      throw new RegistryError(`Adapter already registered: ${adapterId}`, 'register', { adapterId })
    }

    // Create registry entry
    const entry: AdapterRegistryEntry = {
      id: adapterId,
      simTool,
      config,
      metadata: {
        registeredAt: new Date(),
        version: '1.0.0',
        source: 'sim',
        category: config.category || 'utility',
        tags: config.tags || [],
      },
      statistics: {
        executionCount: 0,
        averageExecutionTimeMs: 0,
        successRate: 100,
        errorCount: 0,
      },
      health: {
        status: 'healthy',
        lastCheckAt: new Date(),
        issues: [],
      },
    }

    // Execute plugin hooks
    if (this.config.plugins.enabled) {
      await this.pluginManager.executeHooks('adapter_register', { adapterId, entry })
    }

    // Store adapter entry
    this.adapters.set(adapterId, entry)

    // Register health check if monitoring is enabled
    if (this.config.healthMonitoring.enabled) {
      this.healthMonitor.registerHealthCheck(adapterId, async () => {
        // Basic health check - ensure adapter can be instantiated
        try {
          const adapter = await this.getAdapter(adapterId)
          return adapter !== null
        } catch {
          return false
        }
      })
    }

    logger.info(`Adapter registered successfully: ${adapterId}`)
  }

  /**
   * Unregister an adapter
   */
  async unregisterAdapter(adapterId: string): Promise<boolean> {
    const entry = this.adapters.get(adapterId)
    if (!entry) {
      return false
    }

    // Execute plugin hooks
    if (this.config.plugins.enabled) {
      await this.pluginManager.executeHooks('adapter_unregister', { adapterId, entry })
    }

    // Cleanup health monitoring
    this.healthMonitor.unregisterHealthCheck(adapterId)

    // Remove from registry
    this.adapters.delete(adapterId)

    // Clear cache entries
    if (this.cache) {
      for (const [key] of this.cache) {
        if (key.startsWith(`${adapterId}:`)) {
          this.cache.delete(key)
        }
      }
    }

    logger.info(`Adapter unregistered: ${adapterId}`)
    return true
  }

  /**
   * Get an adapter instance (lazy-loaded)
   */
  async getAdapter(adapterId: string): Promise<BaseAdapter | null> {
    const entry = this.adapters.get(adapterId)
    if (!entry) {
      return null
    }

    // Return cached adapter instance if available
    if (entry.adapter) {
      return entry.adapter
    }

    // Create new adapter instance
    try {
      entry.adapter = new ConcreteAdapter(entry.simTool, entry.config)
      logger.debug(`Adapter instance created: ${adapterId}`)
      return entry.adapter
    } catch (error) {
      logger.error(`Failed to create adapter instance: ${adapterId}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw new AdapterError(
        `Failed to create adapter: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Get registry entry for an adapter
   */
  getAdapterEntry(adapterId: string): AdapterRegistryEntry | undefined {
    return this.adapters.get(adapterId)
  }

  /**
   * List all registered adapters
   */
  listAdapters(filter?: {
    category?: string
    tags?: string[]
    source?: string
    healthy?: boolean
  }): AdapterRegistryEntry[] {
    let adapters = Array.from(this.adapters.values())

    if (filter) {
      adapters = adapters.filter((adapter) => {
        if (filter.category && adapter.metadata.category !== filter.category) {
          return false
        }

        if (filter.tags && !filter.tags.some((tag) => adapter.metadata.tags.includes(tag))) {
          return false
        }

        if (filter.source && adapter.metadata.source !== filter.source) {
          return false
        }

        if (
          filter.healthy !== undefined &&
          (adapter.health?.status === 'healthy') !== filter.healthy
        ) {
          return false
        }

        return true
      })
    }

    return adapters
  }

  /**
   * Update adapter statistics
   */
  updateStatistics(
    adapterId: string,
    execution: {
      success: boolean
      durationMs: number
    }
  ): void {
    const entry = this.adapters.get(adapterId)
    if (!entry || !entry.statistics) {
      return
    }

    const stats = entry.statistics

    // Update execution count
    stats.executionCount++

    // Update average execution time
    stats.averageExecutionTimeMs =
      (stats.averageExecutionTimeMs * (stats.executionCount - 1) + execution.durationMs) /
      stats.executionCount

    // Update success rate
    if (!execution.success) {
      stats.errorCount++
    }
    stats.successRate = ((stats.executionCount - stats.errorCount) / stats.executionCount) * 100

    // Update last used timestamp
    stats.lastUsed = new Date()
  }

  // Implementation of ToolDiscovery interface

  /**
   * Search for tools by query
   */
  async search(query: ToolSearchQuery): Promise<ToolSearchResult[]> {
    const cacheKey = `search:${JSON.stringify(query)}`

    // Check cache first
    if (this.cache) {
      const cached = this.getCachedData(cacheKey)
      if (cached) {
        return cached as ToolSearchResult[]
      }
    }

    const results: ToolSearchResult[] = []
    const adapters = this.listAdapters({
      category: query.category,
      tags: query.tags,
    })

    for (const entry of adapters) {
      const adapter = await this.getAdapter(entry.id)
      if (!adapter) continue

      // Calculate relevance score
      const relevance = this.calculateRelevance(entry, query)
      if (relevance > 0) {
        results.push({
          tool: adapter as ParlantTool,
          relevanceScore: relevance,
          matchedFields: [], // Would be populated based on matching logic
          usageStats: entry.statistics
            ? {
                executionCount: entry.statistics.executionCount,
                successRate: entry.statistics.successRate,
                lastUsed: entry.statistics.lastUsed?.toISOString() || '',
              }
            : undefined,
        })
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)

    // Apply pagination
    const start = query.offset || 0
    const end = start + (query.limit || 50)
    const paginatedResults = results.slice(start, end)

    // Cache results
    if (this.cache) {
      this.setCachedData(cacheKey, paginatedResults)
    }

    return paginatedResults
  }

  /**
   * Get tool by ID
   */
  async getTool(id: string): Promise<ParlantTool | null> {
    return (await this.getAdapter(id)) as ParlantTool | null
  }

  /**
   * Get tools by category
   */
  async getToolsByCategory(category: string): Promise<ParlantTool[]> {
    const adapters = this.listAdapters({ category })
    const tools: ParlantTool[] = []

    for (const entry of adapters) {
      const adapter = await this.getAdapter(entry.id)
      if (adapter) {
        tools.push(adapter as ParlantTool)
      }
    }

    return tools
  }

  /**
   * Get recommended tools for context
   */
  async getRecommendations(context: RecommendationContext): Promise<ToolRecommendation[]> {
    // Implementation would analyze context and provide relevant recommendations
    const recommendations: ToolRecommendation[] = []

    // This is a simplified implementation
    const popularAdapters = this.listAdapters()
      .sort((a, b) => (b.statistics?.executionCount || 0) - (a.statistics?.executionCount || 0))
      .slice(0, 5)

    for (const entry of popularAdapters) {
      const adapter = await this.getAdapter(entry.id)
      if (adapter) {
        recommendations.push({
          tool: adapter as ParlantTool,
          confidence: 0.8,
          reason: 'Popular tool with high usage',
          category: 'popular',
        })
      }
    }

    return recommendations
  }

  /**
   * Get tools with specific capabilities
   */
  async getToolsByCapabilities(capabilities: string[]): Promise<ParlantTool[]> {
    const tools: ParlantTool[] = []
    const adapters = this.listAdapters()

    for (const entry of adapters) {
      // Check if adapter has required capabilities
      const hasCapabilities = capabilities.every(
        (cap) =>
          entry.metadata.tags.includes(cap) || entry.config.naturalLanguage?.keywords?.includes(cap)
      )

      if (hasCapabilities) {
        const adapter = await this.getAdapter(entry.id)
        if (adapter) {
          tools.push(adapter as ParlantTool)
        }
      }
    }

    return tools
  }

  // Plugin management methods

  /**
   * Register a plugin with the registry
   */
  async registerPlugin(plugin: AdapterPlugin): Promise<void> {
    await this.pluginManager.registerPlugin(plugin)
  }

  /**
   * Get registered plugins
   */
  getPlugins(): AdapterPlugin[] {
    return this.pluginManager.getPlugins()
  }

  // Health and monitoring methods

  /**
   * Get health status of adapters
   */
  async getHealthStatus(): Promise<Map<string, boolean>> {
    return this.healthMonitor.checkAllHealth()
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalAdapters: number
    healthyAdapters: number
    categories: Record<string, number>
    totalExecutions: number
    averageSuccessRate: number
  } {
    const adapters = Array.from(this.adapters.values())
    const categories: Record<string, number> = {}
    let totalExecutions = 0
    let totalSuccessRate = 0

    for (const adapter of adapters) {
      // Count by category
      const category = adapter.metadata.category
      categories[category] = (categories[category] || 0) + 1

      // Sum statistics
      if (adapter.statistics) {
        totalExecutions += adapter.statistics.executionCount
        totalSuccessRate += adapter.statistics.successRate
      }
    }

    const healthStats = this.healthMonitor.getHealthStatistics()

    return {
      totalAdapters: adapters.length,
      healthyAdapters: healthStats.healthy,
      categories,
      totalExecutions,
      averageSuccessRate: adapters.length > 0 ? totalSuccessRate / adapters.length : 100,
    }
  }

  // Private utility methods

  /**
   * Calculate relevance score for search
   */
  private calculateRelevance(entry: AdapterRegistryEntry, query: ToolSearchQuery): number {
    let score = 0

    // Text matching (simplified)
    if (query.query) {
      const searchTerm = query.query.toLowerCase()
      if (entry.id.toLowerCase().includes(searchTerm)) score += 10
      if (entry.config.description?.toLowerCase().includes(searchTerm)) score += 5
      if (entry.metadata.tags.some((tag) => tag.toLowerCase().includes(searchTerm))) score += 3
    }

    // Category matching
    if (query.category && entry.metadata.category === query.category) {
      score += 20
    }

    // Tag matching
    if (query.tags) {
      const matchedTags = query.tags.filter((tag) => entry.metadata.tags.includes(tag))
      score += matchedTags.length * 5
    }

    // Boost popular tools
    if (entry.statistics && entry.statistics.executionCount > 10) {
      score += Math.log(entry.statistics.executionCount)
    }

    // Boost healthy tools
    if (entry.health?.status === 'healthy') {
      score += 2
    }

    return score
  }

  /**
   * Get cached data
   */
  private getCachedData(key: string): any | null {
    if (!this.cache) return null

    const cached = this.cache.get(key)
    if (!cached) return null

    const ttlMs = this.config.caching.cacheTtlMs || 300000 // 5 minutes default
    const isExpired = Date.now() - cached.timestamp.getTime() > ttlMs

    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  /**
   * Set cached data
   */
  private setCachedData(key: string, data: any): void {
    if (!this.cache) return

    // Check cache size limit
    const maxSize = this.config.caching.maxCacheSize || 1000
    if (this.cache.size >= maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: new Date(),
    })
  }

  /**
   * Start cache cleanup process
   */
  private startCacheCleanup(): void {
    if (!this.cache) return

    setInterval(() => {
      if (!this.cache) return

      const ttlMs = this.config.caching.cacheTtlMs || 300000
      const now = Date.now()

      for (const [key, cached] of this.cache.entries()) {
        if (now - cached.timestamp.getTime() > ttlMs) {
          this.cache.delete(key)
        }
      }
    }, 60000) // Cleanup every minute
  }

  /**
   * Shutdown the registry and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.healthMonitor.stopMonitoring()

    if (this.cache) {
      this.cache.clear()
    }

    logger.info('Adapter registry shut down')
  }
}
