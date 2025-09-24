/**
 * Universal Tool Adapter System - Core Formatter Service
 *
 * Central service that orchestrates result formatting, manages formatters,
 * and provides the main API for converting tool results into conversational formats.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ToolResponse, ToolConfig } from '@/tools/types'
import type {
  ResultFormatter,
  ResultProcessor,
  FormatContext,
  FormattedResult,
  ResultFormat,
  ResultFormattingConfig,
  ResultCacheEntry,
  ResultAnalytics,
} from '../types'
import { ResultCache } from './result-cache'
import { ResultAnalyticsService } from './analytics-service'
import { FormatterRegistry } from './formatter-registry'
import { QualityValidator } from './quality-validator'

const logger = createLogger('ResultFormatterService')

/**
 * Core service for result formatting with comprehensive features
 */
export class ResultFormatterService {
  private registry: FormatterRegistry
  private cache: ResultCache
  private analytics: ResultAnalyticsService
  private validator: QualityValidator
  private config: ResultFormattingConfig

  constructor(config?: Partial<ResultFormattingConfig>) {
    this.config = this.mergeWithDefaults(config)

    this.registry = new FormatterRegistry()
    this.cache = new ResultCache(this.config.cache)
    this.analytics = new ResultAnalyticsService(this.config.analytics)
    this.validator = new QualityValidator(this.config.quality)

    logger.info('ResultFormatterService initialized', {
      cacheEnabled: this.config.cache.enabled,
      analyticsEnabled: this.config.analytics.enabled,
      defaultFormat: this.config.defaultFormat,
    })
  }

  /**
   * Main formatting method - processes a tool result into conversational format
   */
  async formatResult(
    result: ToolResponse,
    toolConfig: ToolConfig,
    context: Partial<FormatContext> = {}
  ): Promise<FormattedResult> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()

    logger.info(`[${requestId}] Starting result formatting for tool: ${toolConfig.id}`)

    try {
      // Build complete context
      const formatContext = this.buildFormatContext(result, toolConfig, context)

      // Check cache first
      const cacheKey = this.generateCacheKey(result, formatContext)
      if (this.config.cache.enabled) {
        const cached = await this.cache.get(cacheKey)
        if (cached) {
          logger.info(`[${requestId}] Cache hit for result formatting`)
          this.analytics.recordCacheHit(toolConfig.id)
          return cached
        }
      }

      // Select appropriate formatter
      const formatter = await this.selectFormatter(result, formatContext)
      if (!formatter) {
        throw new Error(`No suitable formatter found for tool: ${toolConfig.id}`)
      }

      logger.info(`[${requestId}] Selected formatter: ${formatter.id}`)

      // Format the result
      const formattedResult = await this.executeFormatting(
        formatter,
        result,
        formatContext,
        requestId
      )

      // Validate quality if enabled
      if (this.config.quality.enableQualityValidation) {
        const qualityScore = await this.validator.validateQuality(formattedResult)
        formattedResult.metadata.qualityScore = qualityScore

        if (qualityScore < this.config.quality.minQualityScore) {
          logger.warn(`[${requestId}] Low quality score: ${qualityScore}`)

          if (this.config.quality.fallbackOnLowQuality) {
            // Try fallback formatter
            const fallbackFormatter = await this.selectFallbackFormatter(result, formatContext)
            if (fallbackFormatter) {
              logger.info(`[${requestId}] Using fallback formatter: ${fallbackFormatter.id}`)
              const fallbackResult = await this.executeFormatting(
                fallbackFormatter,
                result,
                formatContext,
                requestId
              )
              fallbackResult.metadata.qualityScore = await this.validator.validateQuality(fallbackResult)
              return fallbackResult
            }
          }
        }
      }

      // Process through registered processors
      const processedResult = await this.applyProcessors(formattedResult, formatContext)

      // Cache the result
      if (this.config.cache.enabled) {
        await this.cache.set(cacheKey, processedResult)
      }

      // Record analytics
      const processingTime = Date.now() - startTime
      this.analytics.recordFormatting(
        toolConfig.id,
        processedResult.format,
        processingTime,
        processedResult.metadata.qualityScore
      )

      logger.info(`[${requestId}] Result formatting completed in ${processingTime}ms`)
      return processedResult

    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error(`[${requestId}] Result formatting failed:`, error)

      // Record error analytics
      this.analytics.recordError(toolConfig.id, error as Error)

      // Return fallback formatted result
      return this.createFallbackResult(result, toolConfig, error as Error, processingTime)
    }
  }

  /**
   * Format multiple results in batch
   */
  async formatResults(
    results: Array<{ result: ToolResponse; toolConfig: ToolConfig; context?: Partial<FormatContext> }>
  ): Promise<FormattedResult[]> {
    const startTime = Date.now()
    logger.info(`Starting batch formatting for ${results.length} results`)

    try {
      // Process in parallel with concurrency limit
      const concurrencyLimit = this.config.performance.concurrentFormatters
      const chunks = this.chunkArray(results, concurrencyLimit)
      const formattedResults: FormattedResult[] = []

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(({ result, toolConfig, context }) =>
            this.formatResult(result, toolConfig, context)
          )
        )
        formattedResults.push(...chunkResults)
      }

      const totalTime = Date.now() - startTime
      logger.info(`Batch formatting completed in ${totalTime}ms`)

      return formattedResults
    } catch (error) {
      logger.error('Batch formatting failed:', error)
      throw error
    }
  }

  /**
   * Get available formats for a specific tool result
   */
  async getAvailableFormats(
    result: ToolResponse,
    toolConfig: ToolConfig,
    context: Partial<FormatContext> = {}
  ): Promise<Array<{ format: ResultFormat; formatter: string; priority: number }>> {
    const formatContext = this.buildFormatContext(result, toolConfig, context)
    const formatters = this.registry.getCompatibleFormatters(result, formatContext)

    return formatters.map(formatter => ({
      format: formatter.supportedFormats[0], // Primary format
      formatter: formatter.name,
      priority: formatter.priority,
    })).sort((a, b) => b.priority - a.priority)
  }

  /**
   * Preview format without full processing
   */
  async previewFormat(
    result: ToolResponse,
    toolConfig: ToolConfig,
    targetFormat: ResultFormat,
    context: Partial<FormatContext> = {}
  ): Promise<Partial<FormattedResult>> {
    const formatContext = this.buildFormatContext(result, toolConfig, context)
    const formatter = this.registry.getFormatterByFormat(targetFormat)

    if (!formatter || !formatter.canFormat(result, formatContext)) {
      throw new Error(`Cannot preview format ${targetFormat} for this result`)
    }

    // Generate summary only for preview
    const summary = await formatter.generateSummary(result, formatContext)

    return {
      format: targetFormat,
      summary,
      metadata: {
        formattedAt: new Date().toISOString(),
        processingTime: 0,
        version: '1.0.0',
        qualityScore: 0,
      },
    }
  }

  /**
   * Register a new formatter
   */
  registerFormatter(formatter: ResultFormatter): void {
    this.registry.register(formatter)
    logger.info(`Registered new formatter: ${formatter.id}`)
  }

  /**
   * Register a new processor
   */
  registerProcessor(processor: ResultProcessor): void {
    this.registry.registerProcessor(processor)
    logger.info(`Registered new processor: ${processor.id}`)
  }

  /**
   * Get analytics data
   */
  async getAnalytics(): Promise<ResultAnalytics> {
    return this.analytics.getAnalytics()
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear()
    logger.info('Result formatting cache cleared')
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ResultFormattingConfig>): void {
    this.config = this.mergeWithDefaults(config, this.config)
    logger.info('Configuration updated', config)
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: Record<string, any>
  }> {
    try {
      const cacheHealth = await this.cache.healthCheck()
      const registryHealth = this.registry.healthCheck()

      const issues = []
      if (!cacheHealth.healthy) issues.push('cache')
      if (!registryHealth.healthy) issues.push('registry')

      return {
        status: issues.length === 0 ? 'healthy' : issues.length === 1 ? 'degraded' : 'unhealthy',
        details: {
          cache: cacheHealth,
          registry: registryHealth,
          formatters: this.registry.getFormatterCount(),
          processors: this.registry.getProcessorCount(),
        },
      }
    } catch (error) {
      logger.error('Health check failed:', error)
      return {
        status: 'unhealthy',
        details: { error: (error as Error).message },
      }
    }
  }

  // Private methods

  private mergeWithDefaults(
    config?: Partial<ResultFormattingConfig>,
    existing?: ResultFormattingConfig
  ): ResultFormattingConfig {
    const defaults: ResultFormattingConfig = {
      defaultFormat: 'text',
      defaultDisplayMode: 'detailed',
      cache: {
        enabled: true,
        ttl: 3600, // 1 hour
        maxEntries: 1000,
        compressionEnabled: true,
      },
      performance: {
        maxProcessingTime: 30000, // 30 seconds
        concurrentFormatters: 3,
        retryAttempts: 2,
      },
      quality: {
        minQualityScore: 0.7,
        enableQualityValidation: true,
        fallbackOnLowQuality: true,
      },
      analytics: {
        enabled: true,
        trackUserInteractions: true,
        retentionPeriod: 30, // 30 days
      },
      features: {
        aiSummaries: true,
        smartFormatDetection: true,
        adaptiveDisplayMode: true,
        realtimeUpdates: false,
      },
    }

    return {
      ...defaults,
      ...existing,
      ...config,
      cache: { ...defaults.cache, ...existing?.cache, ...config?.cache },
      performance: { ...defaults.performance, ...existing?.performance, ...config?.performance },
      quality: { ...defaults.quality, ...existing?.quality, ...config?.quality },
      analytics: { ...defaults.analytics, ...existing?.analytics, ...config?.analytics },
      features: { ...defaults.features, ...existing?.features, ...config?.features },
    }
  }

  private buildFormatContext(
    result: ToolResponse,
    toolConfig: ToolConfig,
    context: Partial<FormatContext>
  ): FormatContext {
    return {
      toolId: toolConfig.id,
      toolConfig,
      displayMode: context.displayMode || this.config.defaultDisplayMode,
      targetAudience: context.targetAudience || 'general',
      locale: context.locale || 'en-US',
      timezone: context.timezone || 'UTC',
      ...context,
    }
  }

  private async selectFormatter(
    result: ToolResponse,
    context: FormatContext
  ): Promise<ResultFormatter | null> {
    const formatters = this.registry.getCompatibleFormatters(result, context)

    if (formatters.length === 0) {
      return null
    }

    // Sort by priority and return the best match
    formatters.sort((a, b) => b.priority - a.priority)
    return formatters[0]
  }

  private async selectFallbackFormatter(
    result: ToolResponse,
    context: FormatContext
  ): Promise<ResultFormatter | null> {
    // Get all formatters except the one that failed
    const formatters = this.registry.getCompatibleFormatters(result, context)

    // Find a simple text formatter as fallback
    const textFormatter = formatters.find(f => f.supportedFormats.includes('text'))
    return textFormatter || null
  }

  private async executeFormatting(
    formatter: ResultFormatter,
    result: ToolResponse,
    context: FormatContext,
    requestId: string
  ): Promise<FormattedResult> {
    const startTime = Date.now()

    try {
      const formatted = await Promise.race([
        formatter.format(result, context),
        this.createTimeoutPromise(this.config.performance.maxProcessingTime),
      ])

      const processingTime = Date.now() - startTime
      formatted.metadata.processingTime = processingTime

      logger.info(`[${requestId}] Formatting completed with ${formatter.id} in ${processingTime}ms`)
      return formatted
    } catch (error) {
      logger.error(`[${requestId}] Formatting failed with ${formatter.id}:`, error)
      throw error
    }
  }

  private async applyProcessors(
    result: FormattedResult,
    context: FormatContext
  ): Promise<FormattedResult> {
    const processors = this.registry.getProcessors()
    let processedResult = result

    for (const processor of processors) {
      try {
        processedResult = await processor.process(processedResult, context)
      } catch (error) {
        logger.warn(`Processor ${processor.id} failed:`, error)
        // Continue with other processors
      }
    }

    return processedResult
  }

  private generateCacheKey(result: ToolResponse, context: FormatContext): string {
    const keyData = {
      toolId: context.toolId,
      resultHash: this.hashObject(result.output),
      displayMode: context.displayMode,
      targetAudience: context.targetAudience,
      locale: context.locale,
    }
    return this.hashObject(keyData)
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').substring(0, 32)
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Formatting timeout')), timeout)
    })
  }

  private createFallbackResult(
    result: ToolResponse,
    toolConfig: ToolConfig,
    error: Error,
    processingTime: number
  ): FormattedResult {
    return {
      originalResult: result,
      format: 'text',
      content: {
        type: 'text',
        text: result.success ? JSON.stringify(result.output, null, 2) : result.error || 'Unknown error',
        format: 'plain',
      },
      summary: {
        headline: result.success ? `${toolConfig.name} completed` : `${toolConfig.name} failed`,
        description: result.success
          ? 'The tool executed successfully but result formatting failed'
          : result.error || 'The tool execution failed',
        highlights: [],
        suggestions: result.success ? ['Review the raw output below'] : ['Check the error message and try again'],
      },
      representations: [],
      metadata: {
        formattedAt: new Date().toISOString(),
        processingTime,
        version: '1.0.0',
        qualityScore: 0.1, // Very low quality for fallback
      },
      errors: [
        {
          type: 'formatting_error',
          message: error.message,
        },
      ],
    }
  }
}