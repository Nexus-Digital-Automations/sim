/**
 * Configuration Management for Tool Adapters
 *
 * Provides flexible configuration system for tool adapters with:
 * - Workspace-specific overrides
 * - User-specific preferences
 * - Dynamic configuration updates
 * - Environment-based defaults
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { AdapterConfiguration, GlobalAdapterConfig, ToolConfig } from './types'

const logger = createLogger('AdapterConfiguration')

export class ConfigurationManager {
  private config: AdapterConfiguration
  private workspaceConfigs = new Map<string, Partial<AdapterConfiguration>>()
  private userConfigs = new Map<string, Partial<AdapterConfiguration>>()

  constructor(initialConfig?: Partial<AdapterConfiguration>) {
    this.config = this.mergeWithDefaults(initialConfig || {})
  }

  /**
   * Get configuration for a specific tool
   */
  getToolConfig(toolName: string, workspaceId?: string, userId?: string): ToolConfig {
    let config = this.config.tools[toolName] || this.getDefaultToolConfig()

    // Apply workspace-specific overrides
    if (workspaceId && this.workspaceConfigs.has(workspaceId)) {
      const workspaceConfig = this.workspaceConfigs.get(workspaceId)!
      if (workspaceConfig.tools?.[toolName]) {
        config = this.mergeToolConfigs(config, workspaceConfig.tools[toolName])
      }
    }

    // Apply user-specific overrides
    if (userId && this.userConfigs.has(userId)) {
      const userConfig = this.userConfigs.get(userId)!
      if (userConfig.tools?.[toolName]) {
        config = this.mergeToolConfigs(config, userConfig.tools[toolName])
      }
    }

    return config
  }

  /**
   * Get global configuration with context-specific overrides
   */
  getGlobalConfig(workspaceId?: string, userId?: string): GlobalAdapterConfig {
    let config = { ...this.config.global }

    // Apply workspace overrides
    if (workspaceId && this.workspaceConfigs.has(workspaceId)) {
      const workspaceConfig = this.workspaceConfigs.get(workspaceId)!
      if (workspaceConfig.global) {
        config = this.mergeGlobalConfigs(config, workspaceConfig.global)
      }
    }

    // Apply user overrides
    if (userId && this.userConfigs.has(userId)) {
      const userConfig = this.userConfigs.get(userId)!
      if (userConfig.global) {
        config = this.mergeGlobalConfigs(config, userConfig.global)
      }
    }

    return config
  }

  /**
   * Update global configuration
   */
  updateGlobalConfig(updates: Partial<GlobalAdapterConfig>): void {
    this.config.global = this.mergeGlobalConfigs(this.config.global, updates)
    logger.info('Updated global configuration', { updates })
  }

  /**
   * Update tool-specific configuration
   */
  updateToolConfig(toolName: string, updates: Partial<ToolConfig>): void {
    if (!this.config.tools[toolName]) {
      this.config.tools[toolName] = this.getDefaultToolConfig()
    }
    this.config.tools[toolName] = this.mergeToolConfigs(this.config.tools[toolName], updates)
    logger.info('Updated tool configuration', { toolName, updates })
  }

  /**
   * Set workspace-specific configuration
   */
  setWorkspaceConfig(workspaceId: string, config: Partial<AdapterConfiguration>): void {
    this.workspaceConfigs.set(workspaceId, config)
    logger.info('Set workspace configuration', { workspaceId })
  }

  /**
   * Set user-specific configuration
   */
  setUserConfig(userId: string, config: Partial<AdapterConfiguration>): void {
    this.userConfigs.set(userId, config)
    logger.info('Set user configuration', { userId })
  }

  /**
   * Enable/disable a specific tool
   */
  setToolEnabled(toolName: string, enabled: boolean, workspaceId?: string, userId?: string): void {
    const update = { enabled }

    if (workspaceId) {
      const workspaceConfig = this.workspaceConfigs.get(workspaceId) || {}
      if (!workspaceConfig.tools) workspaceConfig.tools = {}
      workspaceConfig.tools[toolName] = { ...workspaceConfig.tools[toolName], ...update }
      this.workspaceConfigs.set(workspaceId, workspaceConfig)
    } else if (userId) {
      const userConfig = this.userConfigs.get(userId) || {}
      if (!userConfig.tools) userConfig.tools = {}
      userConfig.tools[toolName] = { ...userConfig.tools[toolName], ...update }
      this.userConfigs.set(userId, userConfig)
    } else {
      this.updateToolConfig(toolName, update)
    }

    logger.info('Tool enabled/disabled', { toolName, enabled, workspaceId, userId })
  }

  /**
   * Get all enabled tools for a context
   */
  getEnabledTools(workspaceId?: string, userId?: string): string[] {
    return Object.entries(this.config.tools)
      .filter(([toolName]) => {
        const config = this.getToolConfig(toolName, workspaceId, userId)
        return config.enabled
      })
      .map(([toolName]) => toolName)
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate global config
    const global = this.config.global
    if (global.caching.default_ttl_seconds <= 0) {
      errors.push('Cache TTL must be positive')
    }
    if (global.rate_limiting.default_requests_per_minute <= 0) {
      warnings.push('Rate limiting disabled with zero requests per minute')
    }

    // Validate tool configs
    for (const [toolName, toolConfig] of Object.entries(this.config.tools)) {
      if (toolConfig.performance_overrides?.estimated_duration_ms !== undefined) {
        if (toolConfig.performance_overrides.estimated_duration_ms < 0) {
          errors.push(`Tool ${toolName} has negative estimated duration`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  /**
   * Export current configuration
   */
  exportConfiguration(): AdapterConfiguration {
    return JSON.parse(JSON.stringify(this.config))
  }

  /**
   * Import configuration
   */
  importConfiguration(config: AdapterConfiguration): void {
    const validation = this.validateImportedConfig(config)
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors?.join(', ')}`)
    }

    this.config = config
    logger.info('Imported configuration')
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.config = this.getDefaultConfiguration()
    this.workspaceConfigs.clear()
    this.userConfigs.clear()
    logger.info('Reset configuration to defaults')
  }

  /**
   * Private helper methods
   */
  private mergeWithDefaults(config: Partial<AdapterConfiguration>): AdapterConfiguration {
    const defaults = this.getDefaultConfiguration()
    return {
      global: { ...defaults.global, ...config.global },
      tools: { ...defaults.tools, ...config.tools },
    }
  }

  private getDefaultConfiguration(): AdapterConfiguration {
    return {
      global: {
        default_permission_level: 'workspace',
        performance_monitoring: true,
        caching: {
          enabled: true,
          default_ttl_seconds: 300,
          max_cache_size_mb: 100,
        },
        rate_limiting: {
          enabled: true,
          default_requests_per_minute: 60,
          default_concurrent_limit: 5,
        },
        error_handling: {
          retry_attempts: 3,
          retry_backoff_ms: 1000,
          include_stack_traces: false,
        },
      },
      tools: {},
    }
  }

  private getDefaultToolConfig(): ToolConfig {
    return {
      enabled: true,
    }
  }

  private mergeToolConfigs(base: ToolConfig, override: Partial<ToolConfig>): ToolConfig {
    return {
      ...base,
      ...override,
      config: { ...base.config, ...override.config },
      performance_overrides: { ...base.performance_overrides, ...override.performance_overrides },
      custom_descriptions: { ...base.custom_descriptions, ...override.custom_descriptions },
    }
  }

  private mergeGlobalConfigs(
    base: GlobalAdapterConfig,
    override: Partial<GlobalAdapterConfig>
  ): GlobalAdapterConfig {
    return {
      ...base,
      ...override,
      caching: { ...base.caching, ...override.caching },
      rate_limiting: { ...base.rate_limiting, ...override.rate_limiting },
      error_handling: { ...base.error_handling, ...override.error_handling },
    }
  }

  private validateImportedConfig(config: any): ValidationResult {
    const errors: string[] = []

    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object')
      return { valid: false, errors }
    }

    if (!config.global || typeof config.global !== 'object') {
      errors.push('Global configuration is required')
    }

    if (!config.tools || typeof config.tools !== 'object') {
      errors.push('Tools configuration is required')
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined }
  }
}

interface ValidationResult {
  valid: boolean
  errors?: string[]
  warnings?: string[]
}

// Environment-based configuration loading
export function loadConfigurationFromEnvironment(): Partial<AdapterConfiguration> {
  const config: Partial<AdapterConfiguration> = {
    global: {},
  }

  // Load from environment variables
  if (process.env.ADAPTER_CACHE_ENABLED === 'false') {
    config.global!.caching = { ...config.global!.caching, enabled: false }
  }

  if (process.env.ADAPTER_RATE_LIMIT_ENABLED === 'false') {
    config.global!.rate_limiting = { ...config.global!.rate_limiting, enabled: false }
  }

  const defaultRpm = Number.parseInt(process.env.ADAPTER_DEFAULT_RATE_LIMIT_RPM || '60')
  if (!Number.isNaN(defaultRpm)) {
    config.global!.rate_limiting = {
      ...config.global!.rate_limiting,
      default_requests_per_minute: defaultRpm,
    }
  }

  return config
}

// Global configuration manager instance
export const globalConfigurationManager = new ConfigurationManager(
  loadConfigurationFromEnvironment()
)
