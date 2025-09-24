/**
 * Universal Tool Adapter System - Result Formatting
 *
 * Main export hub for the comprehensive result formatting system
 */

// Core service and registry
export { ResultFormatterService } from './core/formatter-service'
export { FormatterRegistry } from './core/formatter-registry'
export { ResultCache } from './core/result-cache'
export { ResultAnalyticsService } from './core/analytics-service'
export { QualityValidator } from './core/quality-validator'

// Formatters
export * from './formatters'

// Components
export * from './components'

// Types
export * from './types'

// Default service instance for easy usage
import { ResultFormatterService } from './core/formatter-service'
import {
  TextFormatter,
  TableFormatter,
  ChartFormatter,
  CardFormatter,
  ImageFormatter,
} from './formatters'

// Create and configure default service with all formatters
export const defaultFormatterService = new ResultFormatterService({
  defaultFormat: 'text',
  defaultDisplayMode: 'detailed',
  cache: {
    enabled: true,
    ttl: 3600,
    maxEntries: 1000,
    compressionEnabled: true,
  },
  analytics: {
    enabled: true,
    trackUserInteractions: true,
    retentionPeriod: 30,
  },
  features: {
    aiSummaries: true,
    smartFormatDetection: true,
    adaptiveDisplayMode: true,
    realtimeUpdates: false,
  },
})

// Register all built-in formatters
defaultFormatterService.registerFormatter(new TextFormatter())
defaultFormatterService.registerFormatter(new TableFormatter())
defaultFormatterService.registerFormatter(new ChartFormatter())
defaultFormatterService.registerFormatter(new CardFormatter())
defaultFormatterService.registerFormatter(new ImageFormatter())

/**
 * Utility function for quick result formatting
 */
export async function formatToolResult(
  result: any,
  toolConfig: any,
  context?: Partial<any>
) {
  return await defaultFormatterService.formatResult(result, toolConfig, context)
}