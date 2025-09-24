/**
 * Universal Tool Adapter System - Quality Validator
 *
 * Comprehensive quality validation system for formatted results,
 * ensuring high standards for conversational presentation.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { FormattedResult, FormatContext } from '../types'

const logger = createLogger('QualityValidator')

/**
 * Quality configuration
 */
export interface QualityConfig {
  minQualityScore: number
  enableQualityValidation: boolean
  fallbackOnLowQuality: boolean
}

/**
 * Quality metrics for validation
 */
interface QualityMetrics {
  completeness: number // 0-1: How complete is the formatted result
  accuracy: number // 0-1: How accurate is the formatting
  readability: number // 0-1: How readable/understandable is the result
  structure: number // 0-1: How well-structured is the content
  metadata: number // 0-1: Quality of metadata and context
  overall: number // 0-1: Overall quality score
}

/**
 * Quality validation rules
 */
interface ValidationRule {
  name: string
  weight: number // Importance weight for this rule
  validate: (result: FormattedResult) => { score: number; issues: string[] }
}

/**
 * Quality validator for formatted results
 */
export class QualityValidator {
  private config: QualityConfig
  private rules: ValidationRule[]

  constructor(config: QualityConfig) {
    this.config = config
    this.rules = this.initializeRules()

    logger.info('QualityValidator initialized', {
      minQualityScore: config.minQualityScore,
      enableValidation: config.enableQualityValidation,
      rulesCount: this.rules.length,
    })
  }

  /**
   * Validate the quality of a formatted result
   */
  async validateQuality(result: FormattedResult): Promise<number> {
    if (!this.config.enableQualityValidation) {
      return 1.0 // Default high quality if validation is disabled
    }

    try {
      const metrics = await this.calculateQualityMetrics(result)
      const issues = this.identifyQualityIssues(result, metrics)

      if (issues.length > 0) {
        logger.debug(`Quality issues found for result:`, {
          format: result.format,
          issueCount: issues.length,
          score: metrics.overall,
          issues: issues.slice(0, 5), // Log first 5 issues
        })
      }

      return metrics.overall

    } catch (error) {
      logger.error('Quality validation failed:', error)
      return 0.5 // Return moderate quality on validation error
    }
  }

  /**
   * Get detailed quality analysis
   */
  async analyzeQuality(result: FormattedResult): Promise<{
    score: number
    metrics: QualityMetrics
    issues: Array<{
      type: 'error' | 'warning' | 'info'
      message: string
      field?: string
      suggestion?: string
    }>
    recommendations: string[]
  }> {
    const metrics = await this.calculateQualityMetrics(result)
    const issues = this.identifyQualityIssues(result, metrics)
    const recommendations = this.generateRecommendations(result, metrics, issues)

    return {
      score: metrics.overall,
      metrics,
      issues,
      recommendations,
    }
  }

  /**
   * Validate that a result meets minimum standards
   */
  meetsMinimumStandards(result: FormattedResult): boolean {
    // Basic structural requirements
    if (!result.format || !result.content) {
      return false
    }

    if (!result.summary || !result.summary.headline) {
      return false
    }

    if (!result.metadata || !result.metadata.formattedAt) {
      return false
    }

    return true
  }

  /**
   * Update validation configuration
   */
  updateConfig(config: Partial<QualityConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('Quality validator configuration updated', config)
  }

  // Private methods

  private async calculateQualityMetrics(result: FormattedResult): Promise<QualityMetrics> {
    let totalWeight = 0
    let weightedScore = 0
    const ruleScores: Record<string, number> = {}

    // Run all validation rules
    for (const rule of this.rules) {
      try {
        const { score } = rule.validate(result)
        ruleScores[rule.name] = score
        weightedScore += score * rule.weight
        totalWeight += rule.weight
      } catch (error) {
        logger.warn(`Validation rule ${rule.name} failed:`, error)
        // Continue with other rules
      }
    }

    const overall = totalWeight > 0 ? weightedScore / totalWeight : 0

    return {
      completeness: this.calculateCompleteness(result),
      accuracy: this.calculateAccuracy(result),
      readability: this.calculateReadability(result),
      structure: this.calculateStructure(result),
      metadata: this.calculateMetadataQuality(result),
      overall: Math.max(0, Math.min(1, overall)),
    }
  }

  private calculateCompleteness(result: FormattedResult): number {
    let score = 0
    let checks = 0

    // Check required fields
    if (result.format) { score++; }
    if (result.content) { score++; }
    if (result.summary?.headline) { score++; }
    if (result.summary?.description) { score++; }
    if (result.metadata?.formattedAt) { score++; }
    checks = 5

    // Check content completeness based on format
    switch (result.content.type) {
      case 'table':
        const tableContent = result.content as any
        if (tableContent.columns?.length > 0) score += 0.5
        if (tableContent.rows?.length > 0) score += 0.5
        checks += 1
        break

      case 'chart':
        const chartContent = result.content as any
        if (chartContent.data?.length > 0) score += 0.5
        if (chartContent.config) score += 0.5
        checks += 1
        break

      case 'json':
        const jsonContent = result.content as any
        if (jsonContent.data !== null && jsonContent.data !== undefined) score++
        checks += 1
        break

      default:
        // Basic content check
        if (result.content.title || (result.content as any).text) score++
        checks += 1
    }

    return checks > 0 ? score / checks : 0
  }

  private calculateAccuracy(result: FormattedResult): number {
    let score = 1.0 // Start with perfect accuracy

    // Check for data consistency
    if (result.originalResult && result.content) {
      // Verify content matches original result structure
      if (!this.verifyDataConsistency(result.originalResult.output, result.content)) {
        score -= 0.3
      }
    }

    // Check for format consistency
    if (result.format !== result.content.type) {
      score -= 0.2
    }

    // Check summary accuracy
    if (result.summary && result.originalResult) {
      if (!this.verifySummaryAccuracy(result.summary, result.originalResult)) {
        score -= 0.1
      }
    }

    return Math.max(0, score)
  }

  private calculateReadability(result: FormattedResult): number {
    let score = 0
    let factors = 0

    // Check headline quality
    if (result.summary?.headline) {
      const headline = result.summary.headline
      if (headline.length >= 10 && headline.length <= 100) score += 0.2
      if (headline.charAt(0).toUpperCase() === headline.charAt(0)) score += 0.1
      factors += 0.3
    }

    // Check description quality
    if (result.summary?.description) {
      const description = result.summary.description
      if (description.length >= 50) score += 0.2
      if (description.split('.').length > 1) score += 0.1 // Multiple sentences
      factors += 0.3
    }

    // Check content structure
    if (result.content) {
      if (result.content.title) score += 0.1
      if (result.content.description) score += 0.1
      factors += 0.2
    }

    // Check highlights and suggestions
    if (result.summary?.highlights?.length > 0) score += 0.1
    if (result.summary?.suggestions?.length > 0) score += 0.1
    factors += 0.2

    return factors > 0 ? score / factors : 0
  }

  private calculateStructure(result: FormattedResult): number {
    let score = 0

    // Basic structure requirements
    if (result.format && result.content && result.summary) {
      score += 0.4
    }

    // Format-specific structure validation
    switch (result.content.type) {
      case 'table':
        const table = result.content as any
        if (table.columns?.length > 0 && table.rows?.length > 0) {
          score += 0.3
          // Check column consistency
          if (table.rows.every((row: any) =>
            table.columns.every((col: any) => col.key in row)
          )) {
            score += 0.2
          }
        }
        break

      case 'chart':
        const chart = result.content as any
        if (chart.data?.length > 0 && chart.config) {
          score += 0.3
          if (chart.chartType && chart.config.xAxis && chart.config.yAxis) {
            score += 0.2
          }
        }
        break

      case 'list':
        const list = result.content as any
        if (list.items?.length > 0) {
          score += 0.3
          if (list.items.every((item: any) => item.id && item.title)) {
            score += 0.2
          }
        }
        break

      default:
        score += 0.3 // Default structure bonus
    }

    // Metadata structure
    if (result.metadata && result.metadata.formattedAt && result.metadata.version) {
      score += 0.1
    }

    return Math.min(1.0, score)
  }

  private calculateMetadataQuality(result: FormattedResult): number {
    let score = 0

    const metadata = result.metadata
    if (!metadata) return 0

    // Required metadata fields
    if (metadata.formattedAt) score += 0.2
    if (metadata.version) score += 0.1
    if (typeof metadata.processingTime === 'number') score += 0.1

    // Quality score presence
    if (typeof metadata.qualityScore === 'number') {
      score += 0.1
      // Reasonable quality score range
      if (metadata.qualityScore >= 0 && metadata.qualityScore <= 1) {
        score += 0.1
      }
    }

    // Additional metadata enhancements
    if (result.representations && result.representations.length > 0) score += 0.2
    if (result.summary?.highlights && result.summary.highlights.length > 0) score += 0.1
    if (result.summary?.suggestions && result.summary.suggestions.length > 0) score += 0.1

    return score
  }

  private verifyDataConsistency(originalData: any, content: any): boolean {
    if (!originalData || !content) return false

    // Basic type consistency checks
    if (Array.isArray(originalData)) {
      // Should be formatted as table, list, or chart
      return ['table', 'list', 'chart', 'card'].includes(content.type)
    }

    if (typeof originalData === 'object') {
      // Object data can be formatted as various types
      return true
    }

    if (typeof originalData === 'string') {
      // String data should be text or markdown
      return ['text', 'markdown', 'code'].includes(content.type)
    }

    return true // Allow other types
  }

  private verifySummaryAccuracy(summary: any, originalResult: any): boolean {
    if (!summary.headline || !originalResult) return false

    // Check if headline reflects the result status
    const isSuccess = originalResult.success
    const hasError = originalResult.error

    if (isSuccess && summary.headline.toLowerCase().includes('error')) {
      return false
    }

    if (hasError && !summary.headline.toLowerCase().includes('error') &&
        !summary.headline.toLowerCase().includes('failed')) {
      return false
    }

    return true
  }

  private identifyQualityIssues(
    result: FormattedResult,
    metrics: QualityMetrics
  ): Array<{
    type: 'error' | 'warning' | 'info'
    message: string
    field?: string
    suggestion?: string
  }> {
    const issues: any[] = []

    // Critical issues (errors)
    if (metrics.completeness < 0.5) {
      issues.push({
        type: 'error',
        message: 'Result is incomplete - missing essential fields',
        suggestion: 'Ensure all required fields (format, content, summary) are present',
      })
    }

    if (metrics.accuracy < 0.6) {
      issues.push({
        type: 'error',
        message: 'Result accuracy is poor - data may be inconsistent',
        suggestion: 'Verify that formatted content matches original tool result',
      })
    }

    // Quality warnings
    if (metrics.readability < 0.7) {
      issues.push({
        type: 'warning',
        message: 'Result readability could be improved',
        suggestion: 'Improve headline and description clarity',
      })
    }

    if (metrics.structure < 0.6) {
      issues.push({
        type: 'warning',
        message: 'Result structure needs improvement',
        suggestion: 'Ensure proper formatting for the selected result type',
      })
    }

    // Informational suggestions
    if (!result.summary?.highlights?.length) {
      issues.push({
        type: 'info',
        message: 'No highlights provided',
        suggestion: 'Add key highlights to improve result presentation',
      })
    }

    if (!result.summary?.suggestions?.length) {
      issues.push({
        type: 'info',
        message: 'No follow-up suggestions provided',
        suggestion: 'Add relevant follow-up actions to enhance user experience',
      })
    }

    return issues
  }

  private generateRecommendations(
    result: FormattedResult,
    metrics: QualityMetrics,
    issues: any[]
  ): string[] {
    const recommendations: string[] = []

    // Based on overall score
    if (metrics.overall < 0.5) {
      recommendations.push('Consider using a different formatter for better results')
    }

    // Based on specific metrics
    if (metrics.completeness < 0.7) {
      recommendations.push('Ensure all formatting fields are properly populated')
    }

    if (metrics.readability < 0.7) {
      recommendations.push('Improve summary headlines and descriptions for better readability')
    }

    if (metrics.structure < 0.7) {
      recommendations.push('Review format-specific structure requirements')
    }

    // Based on issues
    const errorCount = issues.filter(i => i.type === 'error').length
    if (errorCount > 0) {
      recommendations.push('Address critical quality errors before using this result')
    }

    // Format-specific recommendations
    switch (result.format) {
      case 'table':
        if (!(result.content as any).columns?.length) {
          recommendations.push('Define proper column structure for table format')
        }
        break

      case 'chart':
        if (!(result.content as any).config) {
          recommendations.push('Provide chart configuration for better visualization')
        }
        break

      case 'text':
        if (!(result.content as any).text?.length > 100) {
          recommendations.push('Consider using a more structured format for complex data')
        }
        break
    }

    return recommendations.slice(0, 5) // Limit to 5 recommendations
  }

  private initializeRules(): ValidationRule[] {
    return [
      {
        name: 'basic_structure',
        weight: 0.3,
        validate: (result) => {
          let score = 0
          const issues: string[] = []

          if (result.format) score += 0.25
          else issues.push('Missing format')

          if (result.content) score += 0.25
          else issues.push('Missing content')

          if (result.summary) score += 0.25
          else issues.push('Missing summary')

          if (result.metadata) score += 0.25
          else issues.push('Missing metadata')

          return { score, issues }
        },
      },
      {
        name: 'content_quality',
        weight: 0.25,
        validate: (result) => {
          let score = 0
          const issues: string[] = []

          if (result.content.type === result.format) {
            score += 0.3
          } else {
            issues.push('Content type mismatch with format')
          }

          if (result.content.title) score += 0.2
          if (result.content.description) score += 0.2

          // Format-specific validation
          switch (result.content.type) {
            case 'table':
              const table = result.content as any
              if (table.columns?.length > 0) score += 0.15
              if (table.rows?.length > 0) score += 0.15
              break
            case 'text':
              const text = result.content as any
              if (text.text && text.text.length > 10) score += 0.3
              break
            default:
              score += 0.3
          }

          return { score, issues }
        },
      },
      {
        name: 'summary_quality',
        weight: 0.25,
        validate: (result) => {
          let score = 0
          const issues: string[] = []

          if (result.summary?.headline) {
            score += 0.4
            if (result.summary.headline.length >= 10) score += 0.1
          } else {
            issues.push('Missing headline')
          }

          if (result.summary?.description) {
            score += 0.3
            if (result.summary.description.length >= 50) score += 0.1
          } else {
            issues.push('Missing description')
          }

          if (result.summary?.highlights?.length > 0) score += 0.05
          if (result.summary?.suggestions?.length > 0) score += 0.05

          return { score, issues }
        },
      },
      {
        name: 'metadata_completeness',
        weight: 0.2,
        validate: (result) => {
          let score = 0
          const issues: string[] = []

          if (result.metadata?.formattedAt) score += 0.3
          else issues.push('Missing formatted timestamp')

          if (result.metadata?.version) score += 0.2
          else issues.push('Missing version')

          if (typeof result.metadata?.processingTime === 'number') score += 0.2
          if (typeof result.metadata?.qualityScore === 'number') score += 0.3

          return { score, issues }
        },
      },
    ]
  }
}