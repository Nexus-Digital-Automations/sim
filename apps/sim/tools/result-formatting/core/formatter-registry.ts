/**
 * Universal Tool Adapter System - Formatter Registry
 *
 * Manages registration and discovery of result formatters and processors.
 * Provides intelligent matching based on tool compatibility and result types.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ToolResponse } from '@/tools/types'
import type {
  ResultFormatter,
  ResultProcessor,
  FormatContext,
  ResultFormat,
} from '../types'

const logger = createLogger('FormatterRegistry')

/**
 * Central registry for result formatters and processors
 */
export class FormatterRegistry {
  private formatters = new Map<string, ResultFormatter>()
  private processors = new Map<string, ResultProcessor>()
  private formatIndex = new Map<ResultFormat, Set<string>>()
  private toolIndex = new Map<string, Set<string>>()

  constructor() {
    logger.info('FormatterRegistry initialized')
  }

  /**
   * Register a new formatter
   */
  register(formatter: ResultFormatter): void {
    if (this.formatters.has(formatter.id)) {
      logger.warn(`Formatter ${formatter.id} is already registered, replacing`)
    }

    // Validate formatter
    this.validateFormatter(formatter)

    // Store formatter
    this.formatters.set(formatter.id, formatter)

    // Update format index
    for (const format of formatter.supportedFormats) {
      if (!this.formatIndex.has(format)) {
        this.formatIndex.set(format, new Set())
      }
      this.formatIndex.get(format)!.add(formatter.id)
    }

    // Update tool index
    if (formatter.toolCompatibility?.preferredTools) {
      for (const toolId of formatter.toolCompatibility.preferredTools) {
        if (!this.toolIndex.has(toolId)) {
          this.toolIndex.set(toolId, new Set())
        }
        this.toolIndex.get(toolId)!.add(formatter.id)
      }
    }

    logger.info(`Registered formatter: ${formatter.id}`, {
      supportedFormats: formatter.supportedFormats,
      priority: formatter.priority,
    })
  }

  /**
   * Register a new processor
   */
  registerProcessor(processor: ResultProcessor): void {
    if (this.processors.has(processor.id)) {
      logger.warn(`Processor ${processor.id} is already registered, replacing`)
    }

    this.processors.set(processor.id, processor)
    logger.info(`Registered processor: ${processor.id}`)
  }

  /**
   * Unregister a formatter
   */
  unregister(formatterId: string): boolean {
    const formatter = this.formatters.get(formatterId)
    if (!formatter) {
      return false
    }

    // Remove from main registry
    this.formatters.delete(formatterId)

    // Remove from format index
    for (const format of formatter.supportedFormats) {
      const formatSet = this.formatIndex.get(format)
      if (formatSet) {
        formatSet.delete(formatterId)
        if (formatSet.size === 0) {
          this.formatIndex.delete(format)
        }
      }
    }

    // Remove from tool index
    if (formatter.toolCompatibility?.preferredTools) {
      for (const toolId of formatter.toolCompatibility.preferredTools) {
        const toolSet = this.toolIndex.get(toolId)
        if (toolSet) {
          toolSet.delete(formatterId)
          if (toolSet.size === 0) {
            this.toolIndex.delete(toolId)
          }
        }
      }
    }

    logger.info(`Unregistered formatter: ${formatterId}`)
    return true
  }

  /**
   * Get formatter by ID
   */
  getFormatter(id: string): ResultFormatter | undefined {
    return this.formatters.get(id)
  }

  /**
   * Get all formatters for a specific format
   */
  getFormattersByFormat(format: ResultFormat): ResultFormatter[] {
    const formatterIds = this.formatIndex.get(format) || new Set()
    return Array.from(formatterIds)
      .map(id => this.formatters.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * Get the best formatter for a specific format
   */
  getFormatterByFormat(format: ResultFormat): ResultFormatter | undefined {
    const formatters = this.getFormattersByFormat(format)
    return formatters[0] // Highest priority formatter
  }

  /**
   * Get formatters compatible with a specific tool
   */
  getFormattersByTool(toolId: string): ResultFormatter[] {
    const formatterIds = this.toolIndex.get(toolId) || new Set()
    const directFormatters = Array.from(formatterIds)
      .map(id => this.formatters.get(id)!)
      .filter(Boolean)

    // Also include formatters that don't exclude this tool
    const allFormatters = Array.from(this.formatters.values())
    const compatibleFormatters = allFormatters.filter(formatter => {
      const excluded = formatter.toolCompatibility?.excludedTools || []
      return !excluded.includes(toolId)
    })

    // Combine and deduplicate
    const combined = new Map<string, ResultFormatter>()
    for (const formatter of [...directFormatters, ...compatibleFormatters]) {
      combined.set(formatter.id, formatter)
    }

    return Array.from(combined.values()).sort((a, b) => {
      // Prefer tool-specific formatters
      const aIsTool = formatter => formatter.toolCompatibility?.preferredTools?.includes(toolId)
      const bIsTool = formatter => formatter.toolCompatibility?.preferredTools?.includes(toolId)

      if (aIsTool(a) && !bIsTool(b)) return -1
      if (!aIsTool(a) && bIsTool(b)) return 1

      // Then sort by priority
      return b.priority - a.priority
    })
  }

  /**
   * Get compatible formatters for a result and context
   */
  getCompatibleFormatters(
    result: ToolResponse,
    context: FormatContext
  ): ResultFormatter[] {
    const allFormatters = Array.from(this.formatters.values())

    return allFormatters
      .filter(formatter => {
        try {
          return formatter.canFormat(result, context)
        } catch (error) {
          logger.warn(`Formatter ${formatter.id} threw error in canFormat:`, error)
          return false
        }
      })
      .sort((a, b) => {
        // Multi-criteria sorting
        let score = 0

        // 1. Tool-specific preference
        const aPreferred = a.toolCompatibility?.preferredTools?.includes(context.toolId) || false
        const bPreferred = b.toolCompatibility?.preferredTools?.includes(context.toolId) || false
        if (aPreferred && !bPreferred) score -= 1000
        if (!aPreferred && bPreferred) score += 1000

        // 2. Output type compatibility
        if (a.toolCompatibility?.outputTypes && b.toolCompatibility?.outputTypes) {
          const outputType = this.detectOutputType(result)
          const aHasOutputType = a.toolCompatibility.outputTypes.includes(outputType)
          const bHasOutputType = b.toolCompatibility.outputTypes.includes(outputType)
          if (aHasOutputType && !bHasOutputType) score -= 100
          if (!aHasOutputType && bHasOutputType) score += 100
        }

        // 3. Priority
        score += (b.priority - a.priority) * 10

        return score
      })
  }

  /**
   * Get processor by ID
   */
  getProcessor(id: string): ResultProcessor | undefined {
    return this.processors.get(id)
  }

  /**
   * Get all processors sorted by priority
   */
  getProcessors(): ResultProcessor[] {
    return Array.from(this.processors.values()).sort((a, b) => b.priority - a.priority)
  }

  /**
   * Get supported formats across all formatters
   */
  getSupportedFormats(): ResultFormat[] {
    return Array.from(this.formatIndex.keys())
  }

  /**
   * Get formatter statistics
   */
  getStatistics(): {
    totalFormatters: number
    totalProcessors: number
    formatCoverage: Record<ResultFormat, number>
    toolCoverage: Record<string, number>
    averagePriority: number
  } {
    const formatters = Array.from(this.formatters.values())

    const formatCoverage: Record<string, number> = {}
    const toolCoverage: Record<string, number> = {}

    for (const formatter of formatters) {
      // Format coverage
      for (const format of formatter.supportedFormats) {
        formatCoverage[format] = (formatCoverage[format] || 0) + 1
      }

      // Tool coverage
      const preferredTools = formatter.toolCompatibility?.preferredTools || []
      for (const toolId of preferredTools) {
        toolCoverage[toolId] = (toolCoverage[toolId] || 0) + 1
      }
    }

    const averagePriority = formatters.reduce((sum, f) => sum + f.priority, 0) / formatters.length

    return {
      totalFormatters: this.formatters.size,
      totalProcessors: this.processors.size,
      formatCoverage: formatCoverage as Record<ResultFormat, number>,
      toolCoverage,
      averagePriority: averagePriority || 0,
    }
  }

  /**
   * Get formatter count
   */
  getFormatterCount(): number {
    return this.formatters.size
  }

  /**
   * Get processor count
   */
  getProcessorCount(): number {
    return this.processors.size
  }

  /**
   * Health check for the registry
   */
  healthCheck(): { healthy: boolean; details: Record<string, any> } {
    try {
      const stats = this.getStatistics()
      const hasBasicFormatters = ['text', 'json', 'table'].every(format =>
        this.formatIndex.has(format as ResultFormat)
      )

      return {
        healthy: stats.totalFormatters > 0 && hasBasicFormatters,
        details: {
          ...stats,
          hasBasicFormatters,
          registrySize: this.formatters.size,
        },
      }
    } catch (error) {
      return {
        healthy: false,
        details: { error: (error as Error).message },
      }
    }
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.formatters.clear()
    this.processors.clear()
    this.formatIndex.clear()
    this.toolIndex.clear()
    logger.info('Registry cleared')
  }

  // Private methods

  private validateFormatter(formatter: ResultFormatter): void {
    if (!formatter.id) {
      throw new Error('Formatter must have an id')
    }

    if (!formatter.name) {
      throw new Error('Formatter must have a name')
    }

    if (!formatter.supportedFormats || formatter.supportedFormats.length === 0) {
      throw new Error('Formatter must support at least one format')
    }

    if (typeof formatter.canFormat !== 'function') {
      throw new Error('Formatter must implement canFormat method')
    }

    if (typeof formatter.format !== 'function') {
      throw new Error('Formatter must implement format method')
    }

    if (typeof formatter.generateSummary !== 'function') {
      throw new Error('Formatter must implement generateSummary method')
    }

    if (typeof formatter.priority !== 'number') {
      throw new Error('Formatter must have a numeric priority')
    }
  }

  private detectOutputType(result: ToolResponse): string {
    if (!result.success || !result.output) {
      return 'error'
    }

    const output = result.output

    // Basic type detection
    if (Array.isArray(output)) {
      return 'array'
    }

    if (typeof output === 'string') {
      return 'string'
    }

    if (typeof output === 'number') {
      return 'number'
    }

    if (typeof output === 'boolean') {
      return 'boolean'
    }

    if (typeof output === 'object' && output !== null) {
      // More specific object type detection
      if (output.hasOwnProperty('data') && Array.isArray(output.data)) {
        return 'tabular'
      }

      if (output.hasOwnProperty('url') || output.hasOwnProperty('base64')) {
        return 'file'
      }

      if (output.hasOwnProperty('results') && Array.isArray(output.results)) {
        return 'search'
      }

      return 'object'
    }

    return 'unknown'
  }
}