/**
 * Universal Tool Adapter System - Factory Utilities
 *
 * Factory functions for creating and configuring the result formatting system
 * with sensible defaults and easy customization options.
 */

import { ResultFormatterService } from '../core/formatter-service'
import { TextFormatter } from '../formatters/text-formatter'
import { TableFormatter } from '../formatters/table-formatter'
import { JsonFormatter } from '../formatters/json-formatter'
// Note: Other formatters will be imported when they're created

import type { ResultFormattingConfig } from '../types'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('FormatterFactory')

/**
 * Default configuration for the result formatting system
 */
const DEFAULT_CONFIG: ResultFormattingConfig = {
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

/**
 * Create a pre-configured result formatter service with default settings
 */
export function createDefaultFormatterService(
  config?: Partial<ResultFormattingConfig>
): ResultFormatterService {
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    cache: { ...DEFAULT_CONFIG.cache, ...config?.cache },
    performance: { ...DEFAULT_CONFIG.performance, ...config?.performance },
    quality: { ...DEFAULT_CONFIG.quality, ...config?.quality },
    analytics: { ...DEFAULT_CONFIG.analytics, ...config?.analytics },
    features: { ...DEFAULT_CONFIG.features, ...config?.features },
  }

  const service = new ResultFormatterService(finalConfig)

  // Register default formatters
  registerDefaultFormatters(service)

  logger.info('Created default formatter service with configuration', {
    formatters: service.registry?.getFormatterCount?.() || 'unknown',
    cacheEnabled: finalConfig.cache.enabled,
    analyticsEnabled: finalConfig.analytics.enabled,
  })

  return service
}

/**
 * Register all built-in formatters with the service
 */
export function registerDefaultFormatters(service: ResultFormatterService): void {
  const formatters = [
    new TextFormatter(),
    new TableFormatter(),
    new JsonFormatter(),
    // Note: Other formatters will be added when they're implemented
  ]

  for (const formatter of formatters) {
    try {
      service.registerFormatter(formatter)
      logger.debug(`Registered formatter: ${formatter.name}`)
    } catch (error) {
      logger.error(`Failed to register formatter ${formatter.name}:`, error)
    }
  }

  logger.info(`Registered ${formatters.length} default formatters`)
}

/**
 * Create a lightweight formatter service for basic usage
 */
export function createLightweightFormatterService(): ResultFormatterService {
  const lightweightConfig: Partial<ResultFormattingConfig> = {
    cache: {
      enabled: false,
      ttl: 0,
      maxEntries: 0,
      compressionEnabled: false,
    },
    analytics: {
      enabled: false,
      trackUserInteractions: false,
      retentionPeriod: 0,
    },
    quality: {
      minQualityScore: 0.5,
      enableQualityValidation: false,
      fallbackOnLowQuality: true,
    },
    features: {
      aiSummaries: false,
      smartFormatDetection: true,
      adaptiveDisplayMode: false,
      realtimeUpdates: false,
    },
  }

  return createDefaultFormatterService(lightweightConfig)
}

/**
 * Create a high-performance formatter service for production use
 */
export function createProductionFormatterService(): ResultFormatterService {
  const productionConfig: Partial<ResultFormattingConfig> = {
    cache: {
      enabled: true,
      ttl: 7200, // 2 hours
      maxEntries: 5000,
      compressionEnabled: true,
    },
    performance: {
      maxProcessingTime: 15000, // 15 seconds
      concurrentFormatters: 5,
      retryAttempts: 3,
    },
    quality: {
      minQualityScore: 0.8,
      enableQualityValidation: true,
      fallbackOnLowQuality: true,
    },
    analytics: {
      enabled: true,
      trackUserInteractions: true,
      retentionPeriod: 90, // 3 months
    },
    features: {
      aiSummaries: true,
      smartFormatDetection: true,
      adaptiveDisplayMode: true,
      realtimeUpdates: true,
    },
  }

  return createDefaultFormatterService(productionConfig)
}

/**
 * Create a development formatter service with debug features
 */
export function createDevelopmentFormatterService(): ResultFormatterService {
  const developmentConfig: Partial<ResultFormattingConfig> = {
    cache: {
      enabled: true,
      ttl: 300, // 5 minutes (short for testing)
      maxEntries: 100,
      compressionEnabled: false, // Easier debugging
    },
    performance: {
      maxProcessingTime: 60000, // 1 minute (generous for debugging)
      concurrentFormatters: 2,
      retryAttempts: 1,
    },
    quality: {
      minQualityScore: 0.5, // Lower threshold for testing
      enableQualityValidation: true,
      fallbackOnLowQuality: false, // Fail fast in development
    },
    analytics: {
      enabled: true,
      trackUserInteractions: true,
      retentionPeriod: 7, // 1 week
    },
    features: {
      aiSummaries: true,
      smartFormatDetection: true,
      adaptiveDisplayMode: true,
      realtimeUpdates: true,
    },
  }

  return createDefaultFormatterService(developmentConfig)
}

/**
 * Configuration presets for different environments
 */
export const FORMATTER_PRESETS = {
  default: DEFAULT_CONFIG,
  lightweight: {
    ...DEFAULT_CONFIG,
    cache: { enabled: false, ttl: 0, maxEntries: 0, compressionEnabled: false },
    analytics: { enabled: false, trackUserInteractions: false, retentionPeriod: 0 },
  },
  production: {
    ...DEFAULT_CONFIG,
    cache: { enabled: true, ttl: 7200, maxEntries: 5000, compressionEnabled: true },
    performance: { maxProcessingTime: 15000, concurrentFormatters: 5, retryAttempts: 3 },
    quality: { minQualityScore: 0.8, enableQualityValidation: true, fallbackOnLowQuality: true },
    analytics: { enabled: true, trackUserInteractions: true, retentionPeriod: 90 },
  },
  development: {
    ...DEFAULT_CONFIG,
    cache: { enabled: true, ttl: 300, maxEntries: 100, compressionEnabled: false },
    quality: { minQualityScore: 0.5, enableQualityValidation: true, fallbackOnLowQuality: false },
    analytics: { enabled: true, trackUserInteractions: true, retentionPeriod: 7 },
  },
} as const

/**
 * Get configuration for a specific environment
 */
export function getPresetConfig(preset: keyof typeof FORMATTER_PRESETS): ResultFormattingConfig {
  return FORMATTER_PRESETS[preset]
}

/**
 * Validate configuration before creating service
 */
export function validateConfig(config: ResultFormattingConfig): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Cache validation
  if (config.cache.enabled && config.cache.maxEntries <= 0) {
    errors.push('Cache max entries must be greater than 0 when cache is enabled')
  }

  if (config.cache.ttl < 0) {
    errors.push('Cache TTL cannot be negative')
  }

  // Performance validation
  if (config.performance.maxProcessingTime <= 0) {
    errors.push('Max processing time must be greater than 0')
  }

  if (config.performance.concurrentFormatters <= 0) {
    errors.push('Concurrent formatters count must be greater than 0')
  }

  if (config.performance.concurrentFormatters > 10) {
    warnings.push('High concurrent formatters count may impact performance')
  }

  // Quality validation
  if (config.quality.minQualityScore < 0 || config.quality.minQualityScore > 1) {
    errors.push('Quality score must be between 0 and 1')
  }

  // Analytics validation
  if (config.analytics.enabled && config.analytics.retentionPeriod <= 0) {
    warnings.push('Analytics retention period should be greater than 0 when analytics is enabled')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}