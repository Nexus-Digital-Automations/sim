/**
 * Plugin System for Universal Tool Adapter
 *
 * Extensible plugin architecture for creating custom adapters, middleware,
 * transformations, and integrations with the Universal Tool Adapter framework.
 *
 * @author Claude Code Framework Architecture Agent
 * @version 2.0.0
 */

import { EventEmitter } from 'events'
import { readdir, readFile, stat } from 'fs/promises'
import { extname, join } from 'path'
import type { AdapterPlugin, ExtensionPoint } from '../types/adapter-interfaces'
import { createLogger } from '../utils/logger'

const logger = createLogger('PluginSystem')

/**
 * Comprehensive plugin system for extending adapter functionality
 */
export class PluginSystem extends EventEmitter {
  // Plugin registry and management
  private readonly plugins = new Map<string, RegisteredPlugin>()
  private readonly extensionPoints = new Map<string, ExtensionPoint>()
  private readonly pluginDependencies = new Map<string, Set<string>>()

  // Middleware stacks for different extension points
  private readonly middlewareStacks = new Map<string, PluginMiddleware[]>()

  // Plugin loading and validation
  private readonly pluginLoaders = new Map<string, PluginLoader>()
  private readonly pluginValidator: PluginValidator

  // Configuration
  private readonly config: PluginSystemConfig

  // Runtime state
  private isInitialized = false
  private loadingInProgress = false

  constructor(config: PluginSystemConfig = {}) {
    super()

    this.config = {
      // Default configuration
      pluginPaths: ['./plugins', './adapters/plugins', './node_modules/@sim/adapter-plugins'],
      autoLoadPlugins: true,
      strictMode: false,
      enableHotReload: false,
      maxPlugins: 100,
      pluginTimeout: 30000, // 30 seconds
      sandboxPlugins: false,
      allowUnsafePlugins: false,
      validateSignatures: false,
      enableMetrics: true,
      ...config,
    }

    // Initialize plugin validator
    this.pluginValidator = new PluginValidator(this.config)

    // Initialize built-in extension points
    this.initializeExtensionPoints()

    // Initialize plugin loaders
    this.initializePluginLoaders()

    logger.info('Plugin System initialized', {
      pluginPaths: this.config.pluginPaths?.length || 0,
      autoLoad: this.config.autoLoadPlugins,
      strictMode: this.config.strictMode,
      sandboxing: this.config.sandboxPlugins,
    })
  }

  /**
   * Initialize the plugin system and auto-load plugins
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    logger.info('Initializing plugin system')

    try {
      // Auto-load plugins if enabled
      if (this.config.autoLoadPlugins) {
        await this.autoLoadPlugins()
      }

      // Initialize middleware stacks
      this.buildMiddlewareStacks()

      // Setup hot reload if enabled
      if (this.config.enableHotReload) {
        await this.setupHotReload()
      }

      this.isInitialized = true

      logger.info('Plugin system initialized successfully', {
        loadedPlugins: this.plugins.size,
        extensionPoints: this.extensionPoints.size,
      })

      this.emit('system:initialized', {
        pluginCount: this.plugins.size,
        extensionPointCount: this.extensionPoints.size,
      })
    } catch (error) {
      logger.error('Failed to initialize plugin system', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Register a plugin with the system
   */
  async registerPlugin(plugin: AdapterPlugin): Promise<void> {
    if (this.plugins.size >= (this.config.maxPlugins || 100)) {
      throw new Error(`Maximum number of plugins (${this.config.maxPlugins || 100}) exceeded`)
    }

    logger.info('Registering plugin', {
      name: plugin.name,
      version: plugin.version,
    })

    // Validate plugin
    const validationResult = await this.pluginValidator.validate(plugin)
    if (!validationResult.valid) {
      const error = new Error(`Plugin validation failed: ${validationResult.errors.join(', ')}`)
      logger.error('Plugin validation failed', {
        plugin: plugin.name,
        errors: validationResult.errors,
      })
      throw error
    }

    // Check for naming conflicts
    if (this.plugins.has(plugin.name)) {
      if (this.config.strictMode) {
        throw new Error(`Plugin with name '${plugin.name}' already registered`)
      }
      logger.warn('Overwriting existing plugin', { name: plugin.name })
      await this.unregisterPlugin(plugin.name)
    }

    // Validate dependencies
    if (plugin.dependencies) {
      for (const dependency of plugin.dependencies) {
        if (!this.plugins.has(dependency)) {
          throw new Error(`Plugin dependency '${dependency}' not found`)
        }
      }
    }

    // Create registered plugin entry
    const registeredPlugin: RegisteredPlugin = {
      plugin,
      registeredAt: new Date(),
      enabled: true,
      statistics: {
        executionCount: 0,
        errorCount: 0,
        averageExecutionTime: 0,
        lastExecuted: undefined,
      },
      sandbox: this.config.sandboxPlugins ? await this.createPluginSandbox(plugin) : undefined,
    }

    // Initialize plugin
    try {
      if (plugin.onInitialize) {
        await this.executePluginHook(registeredPlugin, 'onInitialize', [], 'Plugin initialization')
      }

      // Register plugin
      this.plugins.set(plugin.name, registeredPlugin)

      // Update dependency tracking
      if (plugin.dependencies) {
        this.pluginDependencies.set(plugin.name, new Set(plugin.dependencies))
      }

      // Rebuild middleware stacks
      this.buildMiddlewareStacks()

      this.emit('plugin:registered', {
        name: plugin.name,
        version: plugin.version,
      })

      logger.info('Plugin registered successfully', {
        name: plugin.name,
        version: plugin.version,
        dependencies: plugin.dependencies?.length || 0,
      })
    } catch (error) {
      logger.error('Failed to initialize plugin', {
        plugin: plugin.name,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Unregister a plugin from the system
   */
  async unregisterPlugin(pluginName: string): Promise<boolean> {
    const registeredPlugin = this.plugins.get(pluginName)
    if (!registeredPlugin) {
      return false
    }

    logger.info('Unregistering plugin', { name: pluginName })

    try {
      // Check if other plugins depend on this one
      const dependents = this.findDependentPlugins(pluginName)
      if (dependents.length > 0 && this.config.strictMode) {
        throw new Error(
          `Cannot unregister plugin '${pluginName}': required by ${dependents.join(', ')}`
        )
      }

      // Disable plugin first
      registeredPlugin.enabled = false

      // Run cleanup hook
      if (registeredPlugin.plugin.onCleanup) {
        await this.executePluginHook(registeredPlugin, 'onCleanup', [], 'Plugin cleanup')
      }

      // Cleanup sandbox if exists
      if (registeredPlugin.sandbox) {
        await this.cleanupPluginSandbox(registeredPlugin.sandbox)
      }

      // Remove from registry
      this.plugins.delete(pluginName)
      this.pluginDependencies.delete(pluginName)

      // Rebuild middleware stacks
      this.buildMiddlewareStacks()

      this.emit('plugin:unregistered', { name: pluginName })

      logger.info('Plugin unregistered successfully', { name: pluginName })

      return true
    } catch (error) {
      logger.error('Failed to unregister plugin', {
        plugin: pluginName,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Enable or disable a plugin
   */
  async setPluginEnabled(pluginName: string, enabled: boolean): Promise<void> {
    const registeredPlugin = this.plugins.get(pluginName)
    if (!registeredPlugin) {
      throw new Error(`Plugin '${pluginName}' not found`)
    }

    if (registeredPlugin.enabled === enabled) {
      return // Already in desired state
    }

    logger.info('Changing plugin enabled state', {
      plugin: pluginName,
      enabled,
    })

    if (enabled) {
      // Check dependencies when enabling
      if (registeredPlugin.plugin.dependencies) {
        for (const dependency of registeredPlugin.plugin.dependencies) {
          const depPlugin = this.plugins.get(dependency)
          if (!depPlugin || !depPlugin.enabled) {
            throw new Error(
              `Cannot enable plugin '${pluginName}': dependency '${dependency}' is not enabled`
            )
          }
        }
      }
    } else {
      // Check dependents when disabling
      const dependents = this.findDependentPlugins(pluginName).filter((dep) => {
        const depPlugin = this.plugins.get(dep)
        return depPlugin?.enabled
      })

      if (dependents.length > 0 && this.config.strictMode) {
        throw new Error(
          `Cannot disable plugin '${pluginName}': required by enabled plugins ${dependents.join(', ')}`
        )
      }
    }

    registeredPlugin.enabled = enabled
    this.buildMiddlewareStacks()

    this.emit('plugin:toggled', {
      name: pluginName,
      enabled,
    })
  }

  /**
   * Execute plugin hooks for a specific extension point
   */
  async executeExtensionPoint(extensionPoint: string, context: any, args: any[]): Promise<any[]> {
    const middlewares = this.middlewareStacks.get(extensionPoint) || []
    const results: any[] = []

    for (const middleware of middlewares) {
      const registeredPlugin = this.plugins.get(middleware.pluginName)
      if (!registeredPlugin || !registeredPlugin.enabled) {
        continue
      }

      try {
        const startTime = Date.now()

        const result = await this.executePluginHook(
          registeredPlugin,
          middleware.hookName as keyof AdapterPlugin,
          args,
          `Extension point: ${extensionPoint}`
        )

        const duration = Date.now() - startTime
        this.updatePluginStatistics(registeredPlugin, duration, true)

        if (result !== undefined) {
          results.push(result)
        }
      } catch (error) {
        this.updatePluginStatistics(registeredPlugin, 0, false)

        logger.error('Plugin hook execution failed', {
          plugin: middleware.pluginName,
          extensionPoint,
          hook: middleware.hookName,
          error: error instanceof Error ? error.message : String(error),
        })

        this.emit('plugin:error', {
          plugin: middleware.pluginName,
          extensionPoint,
          error: error instanceof Error ? error.message : String(error),
        })

        // Continue with other plugins unless in strict mode
        if (this.config.strictMode) {
          throw error
        }
      }
    }

    return results
  }

  /**
   * Create a custom extension point
   */
  registerExtensionPoint(extensionPoint: ExtensionPoint): void {
    if (this.extensionPoints.has(extensionPoint.name)) {
      if (this.config.strictMode) {
        throw new Error(`Extension point '${extensionPoint.name}' already registered`)
      }
      logger.warn('Overwriting existing extension point', {
        name: extensionPoint.name,
      })
    }

    this.extensionPoints.set(extensionPoint.name, extensionPoint)
    this.buildMiddlewareStacks()

    logger.info('Registered extension point', {
      name: extensionPoint.name,
      type: extensionPoint.type,
    })
  }

  /**
   * Load plugins from filesystem
   */
  async loadPluginsFromPath(pluginPath: string): Promise<LoadResult> {
    logger.info('Loading plugins from path', { path: pluginPath })

    const result: LoadResult = {
      loaded: 0,
      failed: 0,
      errors: [],
    }

    try {
      const pluginFiles = await this.discoverPluginFiles(pluginPath)

      for (const filePath of pluginFiles) {
        try {
          const plugin = await this.loadPluginFromFile(filePath)
          if (plugin) {
            await this.registerPlugin(plugin)
            result.loaded++
          }
        } catch (error) {
          result.failed++
          result.errors.push({
            file: filePath,
            error: error instanceof Error ? error.message : String(error),
          })

          logger.warn('Failed to load plugin', {
            file: filePath,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      logger.error('Failed to scan plugin path', {
        path: pluginPath,
        error: error instanceof Error ? error.message : String(error),
      })
      result.errors.push({
        file: pluginPath,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return result
  }

  /**
   * Get plugin information and statistics
   */
  getPluginInfo(pluginName?: string): PluginInfo | PluginInfo[] {
    if (pluginName) {
      const registeredPlugin = this.plugins.get(pluginName)
      if (!registeredPlugin) {
        throw new Error(`Plugin '${pluginName}' not found`)
      }

      return this.buildPluginInfo(registeredPlugin)
    }

    // Return all plugins
    return Array.from(this.plugins.values()).map((p) => this.buildPluginInfo(p))
  }

  /**
   * Get system statistics and health information
   */
  getSystemStats(): PluginSystemStats {
    const pluginStats = Array.from(this.plugins.values())
    const enabledCount = pluginStats.filter((p) => p.enabled).length

    return {
      totalPlugins: this.plugins.size,
      enabledPlugins: enabledCount,
      disabledPlugins: this.plugins.size - enabledCount,
      extensionPoints: this.extensionPoints.size,
      totalExecutions: pluginStats.reduce((sum, p) => sum + p.statistics.executionCount, 0),
      totalErrors: pluginStats.reduce((sum, p) => sum + p.statistics.errorCount, 0),
      averageExecutionTime: this.calculateAverageExecutionTime(pluginStats),
      memoryUsage: this.getPluginMemoryUsage(),
      hotReloadEnabled: this.config.enableHotReload || false,
    }
  }

  /**
   * Graceful shutdown with plugin cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down plugin system')

    try {
      // Disable all plugins
      for (const [pluginName, registeredPlugin] of Array.from(this.plugins)) {
        if (registeredPlugin.enabled) {
          registeredPlugin.enabled = false
        }

        // Run cleanup hooks
        if (registeredPlugin.plugin.onCleanup) {
          try {
            await this.executePluginHook(
              registeredPlugin,
              'onCleanup',
              [],
              'System shutdown cleanup'
            )
          } catch (error) {
            logger.warn('Plugin cleanup failed during shutdown', {
              plugin: pluginName,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }

        // Cleanup sandboxes
        if (registeredPlugin.sandbox) {
          await this.cleanupPluginSandbox(registeredPlugin.sandbox)
        }
      }

      // Clear all data
      this.plugins.clear()
      this.extensionPoints.clear()
      this.pluginDependencies.clear()
      this.middlewareStacks.clear()

      this.isInitialized = false

      logger.info('Plugin system shutdown complete')
    } catch (error) {
      logger.error('Error during plugin system shutdown', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  // Private implementation methods

  private async autoLoadPlugins(): Promise<void> {
    this.loadingInProgress = true

    try {
      const loadResults: LoadResult[] = []

      for (const pluginPath of this.config.pluginPaths || []) {
        try {
          const result = await this.loadPluginsFromPath(pluginPath)
          loadResults.push(result)
        } catch (error) {
          logger.warn('Failed to load plugins from path', {
            path: pluginPath,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      const totalLoaded = loadResults.reduce((sum, r) => sum + r.loaded, 0)
      const totalFailed = loadResults.reduce((sum, r) => sum + r.failed, 0)

      logger.info('Auto-load plugins completed', {
        totalLoaded,
        totalFailed,
        paths: this.config.pluginPaths?.length || 0,
      })
    } finally {
      this.loadingInProgress = false
    }
  }

  private async discoverPluginFiles(pluginPath: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await readdir(pluginPath)

      for (const entry of entries) {
        const fullPath = join(pluginPath, entry)
        const stats = await stat(fullPath)

        if (stats.isFile() && this.isPluginFile(fullPath)) {
          files.push(fullPath)
        } else if (stats.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.discoverPluginFiles(fullPath)
          files.push(...subFiles)
        }
      }
    } catch (error) {
      if ((error as any)?.code !== 'ENOENT') {
        throw error
      }
    }

    return files
  }

  private isPluginFile(filePath: string): boolean {
    const ext = extname(filePath)
    const validExtensions = ['.js', '.ts', '.mjs']
    const filename = filePath.toLowerCase()

    return (
      validExtensions.includes(ext) && (filename.includes('plugin') || filename.includes('adapter'))
    )
  }

  private async loadPluginFromFile(filePath: string): Promise<AdapterPlugin | null> {
    const ext = extname(filePath)
    const loader = this.pluginLoaders.get(ext) || this.pluginLoaders.get('default')

    if (!loader) {
      throw new Error(`No plugin loader available for file type: ${ext}`)
    }

    return loader(filePath)
  }

  private initializeExtensionPoints(): void {
    const coreExtensionPoints: ExtensionPoint[] = [
      {
        name: 'adapter:beforeExecution',
        description: 'Called before adapter execution',
        type: 'hook',
        parameters: [
          {
            name: 'context',
            type: 'ParlantExecutionContext',
            required: true,
            description: 'Execution context',
          },
          { name: 'args', type: 'any', required: true, description: 'Execution arguments' },
        ],
      },
      {
        name: 'adapter:afterExecution',
        description: 'Called after adapter execution',
        type: 'hook',
        parameters: [
          {
            name: 'context',
            type: 'ParlantExecutionContext',
            required: true,
            description: 'Execution context',
          },
          {
            name: 'result',
            type: 'AdapterExecutionResult',
            required: true,
            description: 'Execution result',
          },
        ],
      },
      {
        name: 'adapter:onError',
        description: 'Called when adapter execution fails',
        type: 'hook',
        parameters: [
          { name: 'error', type: 'Error', required: true, description: 'Error that occurred' },
          {
            name: 'context',
            type: 'ParlantExecutionContext',
            required: true,
            description: 'Execution context',
          },
        ],
      },
      {
        name: 'parameter:mapping',
        description: 'Transform parameter mappings',
        type: 'filter',
        parameters: [
          { name: 'params', type: 'any', required: true, description: 'Parameters to transform' },
          { name: 'context', type: 'any', required: true, description: 'Mapping context' },
        ],
        returnType: 'any',
      },
      {
        name: 'result:formatting',
        description: 'Format execution results',
        type: 'filter',
        parameters: [
          { name: 'result', type: 'any', required: true, description: 'Result to format' },
          { name: 'context', type: 'any', required: true, description: 'Formatting context' },
        ],
        returnType: 'any',
      },
    ]

    for (const extensionPoint of coreExtensionPoints) {
      this.extensionPoints.set(extensionPoint.name, extensionPoint)
    }
  }

  private initializePluginLoaders(): void {
    // JavaScript/TypeScript loader
    this.pluginLoaders.set('.js', async (filePath: string) => {
      const module = await import(filePath)
      return this.extractPluginFromModule(module)
    })

    this.pluginLoaders.set('.ts', async (filePath: string) => {
      // For TypeScript, would need compilation or ts-node
      const module = await import(filePath)
      return this.extractPluginFromModule(module)
    })

    this.pluginLoaders.set('.mjs', async (filePath: string) => {
      const module = await import(filePath)
      return this.extractPluginFromModule(module)
    })

    // JSON configuration loader
    this.pluginLoaders.set('.json', async (filePath: string) => {
      const content = await readFile(filePath, 'utf-8')
      const config = JSON.parse(content)
      return this.createPluginFromConfig(config)
    })

    // Default loader
    this.pluginLoaders.set('default', this.pluginLoaders.get('.js')!)
  }

  private extractPluginFromModule(module: any): AdapterPlugin | null {
    // Look for plugin export
    if (module.plugin && this.isValidPlugin(module.plugin)) {
      return module.plugin
    }

    // Look for default export
    if (module.default && this.isValidPlugin(module.default)) {
      return module.default
    }

    // Look for named exports that look like plugins
    for (const [key, value] of Object.entries(module)) {
      if (key.toLowerCase().includes('plugin') && this.isValidPlugin(value)) {
        return value as AdapterPlugin
      }
    }

    return null
  }

  private isValidPlugin(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.name === 'string' &&
      typeof obj.version === 'string'
    )
  }

  private createPluginFromConfig(config: any): AdapterPlugin | null {
    if (!config.name || !config.version) {
      return null
    }

    // Create plugin from configuration
    const plugin: AdapterPlugin = {
      name: config.name,
      version: config.version,
      description: config.description,
      config: config.config || {},
      dependencies: config.dependencies || [],
    }

    // Add hooks if defined in config
    if (config.hooks) {
      Object.assign(plugin, config.hooks)
    }

    return plugin
  }

  private buildMiddlewareStacks(): void {
    this.middlewareStacks.clear()

    // Build middleware stacks for each extension point
    for (const extensionPointName of Array.from(this.extensionPoints.keys())) {
      const middlewares: PluginMiddleware[] = []

      for (const [pluginName, registeredPlugin] of Array.from(this.plugins)) {
        if (!registeredPlugin.enabled) continue

        const plugin = registeredPlugin.plugin
        let hookName: keyof AdapterPlugin | undefined

        // Map extension points to plugin hooks
        switch (extensionPointName) {
          case 'adapter:beforeExecution':
            hookName = 'onBeforeExecution'
            break
          case 'adapter:afterExecution':
            hookName = 'onAfterExecution'
            break
          case 'adapter:onError':
            hookName = 'onError'
            break
          case 'parameter:mapping':
            hookName = 'onParameterMapping'
            break
          case 'result:formatting':
            hookName = 'onResultFormatting'
            break
        }

        if (hookName && plugin[hookName]) {
          middlewares.push({
            pluginName,
            hookName,
            priority: plugin.priority || 0,
          })
        }
      }

      // Sort by priority (higher priority first)
      middlewares.sort((a, b) => b.priority - a.priority)

      this.middlewareStacks.set(extensionPointName, middlewares)
    }
  }

  private async executePluginHook(
    registeredPlugin: RegisteredPlugin,
    hookName: keyof AdapterPlugin,
    args: any[],
    context: string
  ): Promise<any> {
    const plugin = registeredPlugin.plugin
    const hook = plugin[hookName] as (...args: any[]) => any

    if (typeof hook !== 'function') {
      return undefined
    }

    const timeout = this.config.pluginTimeout
    let timeoutHandle: NodeJS.Timeout | undefined

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Plugin hook timeout: ${hookName} in ${plugin.name}`))
        }, timeout)
      })

      // Execute hook with timeout
      const executionPromise = registeredPlugin.sandbox
        ? this.executeInSandbox(registeredPlugin.sandbox, hook, args)
        : hook.apply(plugin, args)

      const result = await Promise.race([executionPromise, timeoutPromise])

      // Clear timeout
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }

      return result
    } catch (error) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }

      logger.error('Plugin hook execution error', {
        plugin: plugin.name,
        hook: hookName,
        context,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  }

  private findDependentPlugins(pluginName: string): string[] {
    const dependents: string[] = []

    for (const [name, dependencies] of Array.from(this.pluginDependencies)) {
      if (dependencies.has(pluginName)) {
        dependents.push(name)
      }
    }

    return dependents
  }

  private async createPluginSandbox(plugin: AdapterPlugin): Promise<PluginSandbox> {
    // Create isolated execution environment for plugin
    // This is a simplified implementation
    return {
      id: `sandbox_${plugin.name}_${Date.now()}`,
      plugin: plugin.name,
      context: {},
      restrictions: {
        allowFileSystem: false,
        allowNetwork: false,
        allowProcessExecution: false,
        memoryLimitMB: 50,
      },
    }
  }

  private async cleanupPluginSandbox(sandbox: PluginSandbox): Promise<void> {
    // Cleanup sandbox resources
    logger.debug('Cleaning up plugin sandbox', { id: sandbox.id })
  }

  private async executeInSandbox(
    sandbox: PluginSandbox,
    hook: (...args: any[]) => any,
    args: any[]
  ): Promise<any> {
    // Execute plugin hook in sandboxed environment
    // This is a simplified implementation
    return hook.apply(null, args)
  }

  private async setupHotReload(): Promise<void> {
    // Setup file watching for hot reload
    logger.info('Hot reload not implemented in this version')
  }

  private updatePluginStatistics(
    registeredPlugin: RegisteredPlugin,
    duration: number,
    success: boolean
  ): void {
    const stats = registeredPlugin.statistics

    stats.executionCount++
    stats.lastExecuted = new Date()

    if (success) {
      // Update average execution time using exponential moving average
      const alpha = 0.1
      stats.averageExecutionTime = stats.averageExecutionTime * (1 - alpha) + duration * alpha
    } else {
      stats.errorCount++
    }
  }

  private buildPluginInfo(registeredPlugin: RegisteredPlugin): PluginInfo {
    const plugin = registeredPlugin.plugin

    return {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      enabled: registeredPlugin.enabled,
      registeredAt: registeredPlugin.registeredAt,
      dependencies: plugin.dependencies || [],
      statistics: { ...registeredPlugin.statistics },
      sandbox: !!registeredPlugin.sandbox,
      hasHooks: {
        onInitialize: !!plugin.onInitialize,
        onBeforeExecution: !!plugin.onBeforeExecution,
        onAfterExecution: !!plugin.onAfterExecution,
        onParameterMapping: !!plugin.onParameterMapping,
        onResultFormatting: !!plugin.onResultFormatting,
        onError: !!plugin.onError,
      },
    }
  }

  private calculateAverageExecutionTime(pluginStats: RegisteredPlugin[]): number {
    const validStats = pluginStats.filter((p) => p.statistics.executionCount > 0)
    if (validStats.length === 0) return 0

    const totalTime = validStats.reduce((sum, p) => sum + p.statistics.averageExecutionTime, 0)
    return totalTime / validStats.length
  }

  private getPluginMemoryUsage(): number {
    // Would calculate actual plugin memory usage
    return 0 // Placeholder
  }
}

class PluginValidator {
  constructor(private config: PluginSystemConfig) {}

  async validate(plugin: AdapterPlugin): Promise<ValidationResult> {
    const errors: string[] = []

    // Basic validation
    if (!plugin.name) {
      errors.push('Plugin name is required')
    } else if (typeof plugin.name !== 'string') {
      errors.push('Plugin name must be a string')
    }

    if (!plugin.version) {
      errors.push('Plugin version is required')
    } else if (typeof plugin.version !== 'string') {
      errors.push('Plugin version must be a string')
    }

    // Version format validation
    if (plugin.version && !this.isValidVersion(plugin.version)) {
      errors.push('Plugin version must follow semantic versioning (e.g., 1.0.0)')
    }

    // Hook validation
    this.validateHooks(plugin, errors)

    // Dependency validation
    if (plugin.dependencies) {
      if (!Array.isArray(plugin.dependencies)) {
        errors.push('Plugin dependencies must be an array')
      } else {
        for (const dep of plugin.dependencies) {
          if (typeof dep !== 'string') {
            errors.push('Plugin dependency names must be strings')
          }
        }
      }
    }

    // Security validation if enabled
    if (this.config.validateSignatures) {
      const signatureValid = await this.validatePluginSignature(plugin)
      if (!signatureValid) {
        errors.push('Plugin signature validation failed')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private isValidVersion(version: string): boolean {
    // Simple semantic version check
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(version)
  }

  private validateHooks(plugin: AdapterPlugin, errors: string[]): void {
    const hookNames: (keyof AdapterPlugin)[] = [
      'onInitialize',
      'onBeforeExecution',
      'onAfterExecution',
      'onParameterMapping',
      'onResultFormatting',
      'onError',
    ]

    for (const hookName of hookNames) {
      const hook = plugin[hookName]
      if (hook && typeof hook !== 'function') {
        errors.push(`Plugin hook '${hookName}' must be a function`)
      }
    }
  }

  private async validatePluginSignature(plugin: AdapterPlugin): Promise<boolean> {
    // Plugin signature validation would be implemented here
    return true // Placeholder
  }
}

// Supporting interfaces and types

interface PluginSystemConfig {
  pluginPaths?: string[]
  autoLoadPlugins?: boolean
  strictMode?: boolean
  enableHotReload?: boolean
  maxPlugins?: number
  pluginTimeout?: number
  sandboxPlugins?: boolean
  allowUnsafePlugins?: boolean
  validateSignatures?: boolean
  enableMetrics?: boolean
}

interface RegisteredPlugin {
  plugin: AdapterPlugin
  registeredAt: Date
  enabled: boolean
  statistics: PluginStatistics
  sandbox?: PluginSandbox
}

interface PluginStatistics {
  executionCount: number
  errorCount: number
  averageExecutionTime: number
  lastExecuted?: Date
}

interface PluginSandbox {
  id: string
  plugin: string
  context: any
  restrictions: {
    allowFileSystem: boolean
    allowNetwork: boolean
    allowProcessExecution: boolean
    memoryLimitMB: number
  }
}

interface PluginMiddleware {
  pluginName: string
  hookName: keyof AdapterPlugin
  priority: number
}

interface LoadResult {
  loaded: number
  failed: number
  errors: Array<{
    file: string
    error: string
  }>
}

interface PluginInfo {
  name: string
  version: string
  description?: string
  enabled: boolean
  registeredAt: Date
  dependencies: string[]
  statistics: PluginStatistics
  sandbox: boolean
  hasHooks: {
    onInitialize: boolean
    onBeforeExecution: boolean
    onAfterExecution: boolean
    onParameterMapping: boolean
    onResultFormatting: boolean
    onError: boolean
  }
}

interface PluginSystemStats {
  totalPlugins: number
  enabledPlugins: number
  disabledPlugins: number
  extensionPoints: number
  totalExecutions: number
  totalErrors: number
  averageExecutionTime: number
  memoryUsage: number
  hotReloadEnabled: boolean
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

type PluginLoader = (filePath: string) => Promise<AdapterPlugin | null>

// Extend AdapterPlugin interface for priority
declare module '../types/adapter-interfaces' {
  interface AdapterPlugin {
    priority?: number
    onCleanup?: () => Promise<void> | void
  }
}
