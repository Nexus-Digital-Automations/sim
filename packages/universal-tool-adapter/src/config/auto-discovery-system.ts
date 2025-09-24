/**
 * Automatic Tool Discovery System
 *
 * Comprehensive system for automatically discovering, configuring, and registering
 * Sim BlockConfig tools into the Universal Tool Adapter framework.
 *
 * @author Claude Code Framework Architecture Agent
 * @version 2.0.0
 */

import { readdir, readFile, stat } from 'fs/promises'
import { join, extname, basename } from 'path'
import { watch, FSWatcher } from 'fs'
import EventEmitter from 'events'

import type {
  BlockConfig,
  SubBlockConfig,
  BlockCategory
} from '@/blocks/types'

import type {
  AdapterConfiguration,
  AdapterRegistryEntry,
  ToolDiscoveryQuery,
  DiscoveredTool
} from '../types/adapter-interfaces'

import { EnhancedAdapterFramework } from '../core/enhanced-adapter-framework'
import { EnhancedAdapterRegistry } from '../registry/enhanced-adapter-registry'
import { createLogger } from '../utils/logger'

const logger = createLogger('AutoDiscoverySystem')

/**
 * Automatic discovery and registration system for Sim tools
 */
export class AutoDiscoverySystem extends EventEmitter {

  // Core dependencies
  private readonly framework: EnhancedAdapterFramework
  private readonly registry: EnhancedAdapterRegistry

  // Configuration
  private readonly config: AutoDiscoveryConfig

  // Discovery state
  private readonly discoveredBlocks = new Map<string, BlockConfigEntry>()
  private readonly watchedPaths = new Map<string, FSWatcher>()
  private readonly discoveryQueue = new Set<string>()

  // Processing state
  private isDiscovering = false
  private lastDiscoveryRun = 0
  private discoveryStats: DiscoveryStats = {
    totalScanned: 0,
    successfulRegistrations: 0,
    failedRegistrations: 0,
    duplicatesSkipped: 0,
    lastRunTime: 0
  }

  constructor(
    framework: EnhancedAdapterFramework,
    registry: EnhancedAdapterRegistry,
    config: AutoDiscoveryConfig = {}
  ) {
    super()

    this.framework = framework
    this.registry = registry

    this.config = {
      // Default configuration
      enabled: true,
      scanPaths: [
        './apps/sim/blocks/blocks',
        './packages/sim-blocks',
        './blocks'
      ],
      scanInterval: 60000, // 1 minute
      watchForChanges: true,
      autoRegister: true,
      includePatterns: ['**/*.ts', '**/*.js'],
      excludePatterns: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
      maxConcurrentScans: 5,
      maxFileSize: 1024 * 1024, // 1MB
      retryFailedScans: true,
      retryDelay: 30000, // 30 seconds
      validationStrict: false,
      enableCaching: true,
      cacheTtl: 300000, // 5 minutes
      ...config
    }

    if (this.config.enabled) {
      this.initialize()
    }

    logger.info('Auto Discovery System initialized', {
      enabled: this.config.enabled,
      scanPaths: this.config.scanPaths.length,
      autoRegister: this.config.autoRegister,
      watchForChanges: this.config.watchForChanges
    })
  }

  /**
   * Initialize the discovery system
   */
  private async initialize(): Promise<void> {
    try {
      // Perform initial discovery
      await this.performFullDiscovery()

      // Set up periodic scanning
      if (this.config.scanInterval > 0) {
        setInterval(async () => {
          await this.performIncrementalDiscovery()
        }, this.config.scanInterval)
      }

      // Set up file watching
      if (this.config.watchForChanges) {
        await this.setupFileWatching()
      }

      logger.info('Auto discovery system started successfully')

    } catch (error) {
      logger.error('Failed to initialize auto discovery system', {
        error: error.message
      })
      throw error
    }
  }

  /**
   * Perform full discovery scan
   */
  async performFullDiscovery(): Promise<DiscoveryResult> {
    if (this.isDiscovering) {
      logger.warn('Discovery already in progress')
      return this.getLastDiscoveryResult()
    }

    this.isDiscovering = true
    const startTime = Date.now()

    logger.info('Starting full discovery scan', {
      scanPaths: this.config.scanPaths,
      patterns: this.config.includePatterns
    })

    try {
      const result = await this.scanAllPaths()

      this.lastDiscoveryRun = Date.now()
      this.discoveryStats.lastRunTime = this.lastDiscoveryRun - startTime

      this.emit('discovery:completed', result)

      logger.info('Full discovery completed', {
        duration: result.durationMs,
        scanned: result.scannedFiles,
        discovered: result.discoveredBlocks,
        registered: result.registeredAdapters,
        errors: result.errors.length
      })

      return result

    } catch (error) {
      logger.error('Full discovery failed', { error: error.message })
      this.emit('discovery:error', error)
      throw error

    } finally {
      this.isDiscovering = false
    }
  }

  /**
   * Perform incremental discovery for changed files
   */
  async performIncrementalDiscovery(): Promise<DiscoveryResult> {
    if (this.isDiscovering || this.discoveryQueue.size === 0) {
      return this.getEmptyDiscoveryResult()
    }

    this.isDiscovering = true
    const startTime = Date.now()

    logger.debug('Starting incremental discovery', {
      queuedFiles: this.discoveryQueue.size
    })

    try {
      const filesToProcess = Array.from(this.discoveryQueue)
      this.discoveryQueue.clear()

      const result = await this.processFiles(filesToProcess)

      this.lastDiscoveryRun = Date.now()
      this.discoveryStats.lastRunTime = this.lastDiscoveryRun - startTime

      this.emit('discovery:incremental', result)

      logger.debug('Incremental discovery completed', {
        processed: filesToProcess.length,
        discovered: result.discoveredBlocks,
        registered: result.registeredAdapters
      })

      return result

    } catch (error) {
      logger.error('Incremental discovery failed', { error: error.message })
      throw error

    } finally {
      this.isDiscovering = false
    }
  }

  /**
   * Scan all configured paths
   */
  private async scanAllPaths(): Promise<DiscoveryResult> {
    const startTime = Date.now()
    const result: DiscoveryResult = {
      durationMs: 0,
      scannedFiles: 0,
      discoveredBlocks: 0,
      registeredAdapters: 0,
      errors: [],
      blocks: []
    }

    // Discover files in all scan paths
    const allFiles: string[] = []
    for (const scanPath of this.config.scanPaths) {
      try {
        const files = await this.discoverFiles(scanPath)
        allFiles.push(...files)
      } catch (error) {
        logger.warn('Failed to scan path', {
          path: scanPath,
          error: error.message
        })
        result.errors.push({
          type: 'path_scan_error',
          message: `Failed to scan ${scanPath}: ${error.message}`,
          path: scanPath
        })
      }
    }

    // Process discovered files
    const processResult = await this.processFiles(allFiles)

    result.durationMs = Date.now() - startTime
    result.scannedFiles = allFiles.length
    result.discoveredBlocks = processResult.discoveredBlocks
    result.registeredAdapters = processResult.registeredAdapters
    result.errors.push(...processResult.errors)
    result.blocks = processResult.blocks

    // Update stats
    this.discoveryStats.totalScanned += result.scannedFiles
    this.discoveryStats.successfulRegistrations += result.registeredAdapters
    this.discoveryStats.failedRegistrations += result.errors.length

    return result
  }

  /**
   * Discover files matching patterns in a directory
   */
  private async discoverFiles(scanPath: string): Promise<string[]> {
    const files: string[] = []

    try {
      await this.scanDirectory(scanPath, files)
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
      logger.debug('Scan path does not exist', { path: scanPath })
    }

    return files
  }

  /**
   * Recursively scan directory for matching files
   */
  private async scanDirectory(dirPath: string, files: string[]): Promise<void> {
    try {
      const entries = await readdir(dirPath)

      for (const entry of entries) {
        const fullPath = join(dirPath, entry)
        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          // Check if directory should be excluded
          if (!this.shouldExcludePath(fullPath)) {
            await this.scanDirectory(fullPath, files)
          }
        } else if (stats.isFile()) {
          // Check if file matches patterns and size limits
          if (
            this.matchesIncludePatterns(fullPath) &&
            !this.shouldExcludePath(fullPath) &&
            stats.size <= this.config.maxFileSize
          ) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to read directory', {
        path: dirPath,
        error: error.message
      })
    }
  }

  /**
   * Process discovered files to extract BlockConfigs
   */
  private async processFiles(filePaths: string[]): Promise<DiscoveryResult> {
    const result: DiscoveryResult = {
      durationMs: 0,
      scannedFiles: filePaths.length,
      discoveredBlocks: 0,
      registeredAdapters: 0,
      errors: [],
      blocks: []
    }

    const startTime = Date.now()

    // Process files in batches to control concurrency
    const batchSize = this.config.maxConcurrentScans
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize)

      const batchPromises = batch.map(async filePath => {
        try {
          return await this.processFile(filePath)
        } catch (error) {
          logger.debug('Failed to process file', {
            path: filePath,
            error: error.message
          })
          return null
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)

      for (let j = 0; j < batchResults.length; j++) {
        const batchResult = batchResults[j]
        const filePath = batch[j]

        if (batchResult.status === 'fulfilled' && batchResult.value) {
          const blockResult = batchResult.value
          result.blocks.push(blockResult)
          result.discoveredBlocks++

          // Auto-register if enabled
          if (this.config.autoRegister) {
            try {
              await this.registerBlockConfig(blockResult)
              result.registeredAdapters++
            } catch (error) {
              result.errors.push({
                type: 'registration_error',
                message: `Failed to register ${blockResult.blockConfig.type}: ${error.message}`,
                path: filePath,
                blockType: blockResult.blockConfig.type
              })
            }
          }

        } else if (batchResult.status === 'rejected') {
          result.errors.push({
            type: 'processing_error',
            message: `Failed to process ${filePath}: ${batchResult.reason.message}`,
            path: filePath
          })
        }
      }
    }

    result.durationMs = Date.now() - startTime
    return result
  }

  /**
   * Process a single file to extract BlockConfig
   */
  private async processFile(filePath: string): Promise<BlockConfigEntry | null> {
    logger.debug('Processing file', { path: filePath })

    try {
      // Read file content
      const content = await readFile(filePath, 'utf-8')

      // Parse BlockConfig from file
      const blockConfig = await this.extractBlockConfig(filePath, content)

      if (!blockConfig) {
        return null
      }

      // Validate BlockConfig
      if (this.config.validationStrict) {
        this.validateBlockConfig(blockConfig)
      }

      // Create entry
      const entry: BlockConfigEntry = {
        filePath,
        blockConfig,
        lastModified: (await stat(filePath)).mtime,
        discovered: new Date(),
        hash: this.generateHash(content)
      }

      // Store in cache
      this.discoveredBlocks.set(blockConfig.type, entry)

      return entry

    } catch (error) {
      logger.debug('Error processing file', {
        path: filePath,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Extract BlockConfig from file content
   */
  private async extractBlockConfig(filePath: string, content: string): Promise<BlockConfig | null> {
    // For TypeScript/JavaScript files, we need to evaluate the exports
    if (extname(filePath).match(/\.[tj]sx?$/)) {
      return this.extractFromTSJS(filePath, content)
    }

    // For JSON files, parse directly
    if (extname(filePath) === '.json') {
      return this.extractFromJSON(content)
    }

    return null
  }

  /**
   * Extract BlockConfig from TypeScript/JavaScript file
   */
  private async extractFromTSJS(filePath: string, content: string): Promise<BlockConfig | null> {
    try {
      // Look for BlockConfig export patterns
      const patterns = [
        /export\s+const\s+(\w+)Block\s*:\s*BlockConfig/,
        /export\s+const\s+(\w+)\s*:\s*BlockConfig/,
        /const\s+(\w+)Block\s*:\s*BlockConfig.*?export.*?\1Block/s,
        /export\s+default.*?BlockConfig/
      ]

      let blockName = ''
      let hasBlockConfig = false

      for (const pattern of patterns) {
        const match = content.match(pattern)
        if (match) {
          blockName = match[1] || basename(filePath, extname(filePath))
          hasBlockConfig = true
          break
        }
      }

      if (!hasBlockConfig) {
        return null
      }

      // For now, we'll use dynamic import if possible
      // In a real implementation, this would need more sophisticated parsing
      // or integration with the TypeScript compiler API

      try {
        // Attempt dynamic import (this requires the file to be properly exported)
        const module = await import(filePath)

        // Look for BlockConfig exports
        for (const [key, value] of Object.entries(module)) {
          if (this.isBlockConfig(value)) {
            return value as BlockConfig
          }
        }

        // Check default export
        if (this.isBlockConfig(module.default)) {
          return module.default as BlockConfig
        }

      } catch (importError) {
        // If dynamic import fails, use static analysis
        logger.debug('Dynamic import failed, using static analysis', {
          path: filePath,
          error: importError.message
        })

        return this.parseBlockConfigStatic(content, blockName)
      }

    } catch (error) {
      logger.debug('Failed to extract BlockConfig from TS/JS file', {
        path: filePath,
        error: error.message
      })
    }

    return null
  }

  /**
   * Extract BlockConfig from JSON file
   */
  private extractFromJSON(content: string): BlockConfig | null {
    try {
      const parsed = JSON.parse(content)

      if (this.isBlockConfig(parsed)) {
        return parsed as BlockConfig
      }

    } catch (error) {
      logger.debug('Failed to parse JSON BlockConfig', { error: error.message })
    }

    return null
  }

  /**
   * Static analysis to parse BlockConfig from TypeScript content
   */
  private parseBlockConfigStatic(content: string, blockName: string): BlockConfig | null {
    // This is a simplified static parser
    // A full implementation would use the TypeScript compiler API

    try {
      // Extract the BlockConfig object using regex
      const blockConfigPattern = new RegExp(
        `${blockName}Block\\s*:\\s*BlockConfig\\s*=\\s*({[\\s\\S]*?})\\s*(?:export|$)`,
        'i'
      )

      const match = content.match(blockConfigPattern)
      if (!match) {
        return null
      }

      // This is a very basic attempt to parse the object
      // In practice, you'd want to use a proper AST parser
      const objectContent = match[1]

      // For now, we'll return a minimal BlockConfig structure
      // This would need to be much more sophisticated in a real implementation
      return this.createMinimalBlockConfig(blockName, content)

    } catch (error) {
      logger.debug('Static parsing failed', { error: error.message })
      return null
    }
  }

  /**
   * Create a minimal BlockConfig from available information
   */
  private createMinimalBlockConfig(blockName: string, content: string): BlockConfig {
    // Extract basic information using regex patterns
    const typeMatch = content.match(/type:\s*['"`]([^'"`]+)['"`]/)
    const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/)
    const descMatch = content.match(/description:\s*['"`]([^'"`]+)['"`]/)
    const categoryMatch = content.match(/category:\s*['"`]([^'"`]+)['"`]/)

    return {
      type: typeMatch?.[1] || blockName.toLowerCase().replace('block', ''),
      name: nameMatch?.[1] || blockName,
      description: descMatch?.[1] || `${blockName} tool`,
      category: (categoryMatch?.[1] || 'tools') as BlockCategory,
      bgColor: '#6366f1', // Default color
      icon: () => null as any, // Placeholder icon
      subBlocks: [],
      tools: { access: [] },
      inputs: {},
      outputs: {}
    }
  }

  /**
   * Check if an object is a valid BlockConfig
   */
  private isBlockConfig(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.type === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.description === 'string' &&
      typeof obj.category === 'string' &&
      Array.isArray(obj.subBlocks) &&
      obj.tools &&
      Array.isArray(obj.tools.access) &&
      typeof obj.inputs === 'object' &&
      typeof obj.outputs === 'object'
    )
  }

  /**
   * Validate BlockConfig structure
   */
  private validateBlockConfig(blockConfig: BlockConfig): void {
    const errors: string[] = []

    // Required fields validation
    if (!blockConfig.type) errors.push('Missing type field')
    if (!blockConfig.name) errors.push('Missing name field')
    if (!blockConfig.description) errors.push('Missing description field')
    if (!blockConfig.category) errors.push('Missing category field')

    // SubBlocks validation
    if (!Array.isArray(blockConfig.subBlocks)) {
      errors.push('subBlocks must be an array')
    } else {
      blockConfig.subBlocks.forEach((subBlock, index) => {
        if (!subBlock.id) errors.push(`SubBlock ${index} missing id`)
        if (!subBlock.type) errors.push(`SubBlock ${index} missing type`)
      })
    }

    // Tools validation
    if (!blockConfig.tools) {
      errors.push('Missing tools configuration')
    } else if (!Array.isArray(blockConfig.tools.access)) {
      errors.push('tools.access must be an array')
    }

    if (errors.length > 0) {
      throw new Error(`BlockConfig validation failed: ${errors.join(', ')}`)
    }
  }

  /**
   * Register a discovered BlockConfig as an adapter
   */
  private async registerBlockConfig(entry: BlockConfigEntry): Promise<void> {
    try {
      // Create adapter configuration
      const adapterConfig = await this.createAdapterConfiguration(entry.blockConfig)

      // Create adapter using framework
      const adapter = await this.framework.createAdapterFromBlockConfig(
        entry.blockConfig,
        adapterConfig
      )

      logger.info('Successfully registered BlockConfig adapter', {
        type: entry.blockConfig.type,
        name: entry.blockConfig.name,
        category: entry.blockConfig.category
      })

    } catch (error) {
      logger.error('Failed to register BlockConfig adapter', {
        type: entry.blockConfig.type,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Create adapter configuration for a BlockConfig
   */
  private async createAdapterConfiguration(blockConfig: BlockConfig): Promise<Partial<AdapterConfiguration>> {
    return {
      parlantId: `autodiscovered_${blockConfig.type}`,
      displayName: blockConfig.name,
      description: blockConfig.description,
      category: this.mapBlockCategory(blockConfig.category),
      tags: [
        'autodiscovered',
        blockConfig.category,
        blockConfig.type,
        ...this.extractTagsFromBlockConfig(blockConfig)
      ],
      caching: {
        enabled: this.config.enableCaching,
        ttlMs: this.config.cacheTtl
      }
    }
  }

  /**
   * Setup file watching for automatic updates
   */
  private async setupFileWatching(): Promise<void> {
    for (const scanPath of this.config.scanPaths) {
      try {
        const watcher = watch(scanPath, { recursive: true }, (eventType, filename) => {
          if (!filename) return

          const fullPath = join(scanPath, filename)

          // Check if file matches our patterns
          if (
            this.matchesIncludePatterns(fullPath) &&
            !this.shouldExcludePath(fullPath)
          ) {
            logger.debug('File change detected', { path: fullPath, event: eventType })

            // Add to discovery queue
            this.discoveryQueue.add(fullPath)

            // Emit change event
            this.emit('file:changed', { path: fullPath, event: eventType })
          }
        })

        this.watchedPaths.set(scanPath, watcher)

        logger.debug('Set up file watching', { path: scanPath })

      } catch (error) {
        logger.warn('Failed to setup file watching', {
          path: scanPath,
          error: error.message
        })
      }
    }
  }

  /**
   * Check if file matches include patterns
   */
  private matchesIncludePatterns(filePath: string): boolean {
    return this.config.includePatterns.some(pattern =>
      this.matchesGlob(filePath, pattern)
    )
  }

  /**
   * Check if path should be excluded
   */
  private shouldExcludePath(path: string): boolean {
    return this.config.excludePatterns.some(pattern =>
      this.matchesGlob(path, pattern)
    )
  }

  /**
   * Simple glob pattern matching
   */
  private matchesGlob(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')

    const regex = new RegExp(regexPattern)
    return regex.test(path)
  }

  /**
   * Map BlockConfig category to adapter category
   */
  private mapBlockCategory(category: string): string {
    switch (category) {
      case 'tools': return 'external-integration'
      case 'blocks': return 'workflow-management'
      case 'triggers': return 'automation'
      default: return 'utility'
    }
  }

  /**
   * Extract additional tags from BlockConfig
   */
  private extractTagsFromBlockConfig(blockConfig: BlockConfig): string[] {
    const tags: string[] = []

    // Add tags based on subBlocks
    blockConfig.subBlocks.forEach(subBlock => {
      if (subBlock.type === 'oauth-input') tags.push('oauth', 'authentication')
      if (subBlock.type === 'file-selector') tags.push('files')
      if (subBlock.type === 'webhook-config') tags.push('webhooks')
      if (subBlock.provider) tags.push(subBlock.provider)
    })

    // Add tags from tools
    blockConfig.tools.access.forEach(tool => {
      const parts = tool.split('_')
      tags.push(...parts)
    })

    return [...new Set(tags)] // Remove duplicates
  }

  /**
   * Generate hash for content comparison
   */
  private generateHash(content: string): string {
    // Simple hash function for content comparison
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }

  /**
   * Get discovery statistics
   */
  getDiscoveryStats(): DiscoveryStats {
    return { ...this.discoveryStats }
  }

  /**
   * Get all discovered blocks
   */
  getDiscoveredBlocks(): BlockConfigEntry[] {
    return Array.from(this.discoveredBlocks.values())
  }

  /**
   * Force rediscovery of a specific file
   */
  async rediscoverFile(filePath: string): Promise<boolean> {
    try {
      const result = await this.processFile(filePath)
      if (result) {
        if (this.config.autoRegister) {
          await this.registerBlockConfig(result)
        }
        return true
      }
      return false
    } catch (error) {
      logger.error('Failed to rediscover file', {
        path: filePath,
        error: error.message
      })
      return false
    }
  }

  /**
   * Clean shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down auto discovery system')

    // Close file watchers
    for (const [path, watcher] of this.watchedPaths) {
      try {
        watcher.close()
        logger.debug('Closed file watcher', { path })
      } catch (error) {
        logger.warn('Error closing file watcher', {
          path,
          error: error.message
        })
      }
    }

    this.watchedPaths.clear()
    this.discoveryQueue.clear()

    logger.info('Auto discovery system shutdown complete')
  }

  // Helper methods

  private getLastDiscoveryResult(): DiscoveryResult {
    return {
      durationMs: this.discoveryStats.lastRunTime,
      scannedFiles: 0,
      discoveredBlocks: this.discoveredBlocks.size,
      registeredAdapters: this.discoveryStats.successfulRegistrations,
      errors: [],
      blocks: Array.from(this.discoveredBlocks.values())
    }
  }

  private getEmptyDiscoveryResult(): DiscoveryResult {
    return {
      durationMs: 0,
      scannedFiles: 0,
      discoveredBlocks: 0,
      registeredAdapters: 0,
      errors: [],
      blocks: []
    }
  }
}

// Supporting interfaces and types

interface AutoDiscoveryConfig {
  enabled?: boolean
  scanPaths?: string[]
  scanInterval?: number
  watchForChanges?: boolean
  autoRegister?: boolean
  includePatterns?: string[]
  excludePatterns?: string[]
  maxConcurrentScans?: number
  maxFileSize?: number
  retryFailedScans?: boolean
  retryDelay?: number
  validationStrict?: boolean
  enableCaching?: boolean
  cacheTtl?: number
}

interface BlockConfigEntry {
  filePath: string
  blockConfig: BlockConfig
  lastModified: Date
  discovered: Date
  hash: string
}

interface DiscoveryResult {
  durationMs: number
  scannedFiles: number
  discoveredBlocks: number
  registeredAdapters: number
  errors: DiscoveryError[]
  blocks: BlockConfigEntry[]
}

interface DiscoveryError {
  type: 'path_scan_error' | 'processing_error' | 'registration_error' | 'validation_error'
  message: string
  path?: string
  blockType?: string
}

interface DiscoveryStats {
  totalScanned: number
  successfulRegistrations: number
  failedRegistrations: number
  duplicatesSkipped: number
  lastRunTime: number
}

/**
 * Factory function to create a configured auto discovery system
 */
export function createAutoDiscoverySystem(
  framework: EnhancedAdapterFramework,
  registry: EnhancedAdapterRegistry,
  config?: AutoDiscoveryConfig
): AutoDiscoverySystem {
  return new AutoDiscoverySystem(framework, registry, config)
}

/**
 * Utility function to validate BlockConfig structure
 */
export function validateBlockConfig(blockConfig: any): blockConfig is BlockConfig {
  const discovery = new AutoDiscoverySystem(
    {} as EnhancedAdapterFramework,
    {} as EnhancedAdapterRegistry,
    { enabled: false }
  )

  return (discovery as any).isBlockConfig(blockConfig)
}

/**
 * Utility function to extract BlockConfigs from file content
 */
export async function extractBlockConfigFromFile(filePath: string): Promise<BlockConfig | null> {
  const discovery = new AutoDiscoverySystem(
    {} as EnhancedAdapterFramework,
    {} as EnhancedAdapterRegistry,
    { enabled: false }
  )

  try {
    const content = await readFile(filePath, 'utf-8')
    return await (discovery as any).extractBlockConfig(filePath, content)
  } catch (error) {
    logger.error('Failed to extract BlockConfig from file', {
      path: filePath,
      error: error.message
    })
    return null
  }
}