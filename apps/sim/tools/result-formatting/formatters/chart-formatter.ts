/**
 * Universal Tool Adapter System - Chart Formatter
 *
 * Intelligent chart formatter that converts numerical data into visual representations
 * with automatic chart type selection and interactive visualization capabilities.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ToolResponse } from '@/tools/types'
import type {
  ResultFormatter,
  FormatContext,
  FormattedResult,
  ChartContent,
  ResultFormat,
} from '../types'

const logger = createLogger('ChartFormatter')

/**
 * Smart chart formatter for data visualization
 */
export class ChartFormatter implements ResultFormatter {
  id = 'chart_formatter'
  name = 'Chart Formatter'
  description = 'Converts numerical data into interactive charts and visualizations'
  supportedFormats: ResultFormat[] = ['chart']
  priority = 80 // High priority for numerical data

  toolCompatibility = {
    preferredTools: [
      'analytics',
      'metrics',
      'financial_data',
      'sales_report',
      'performance_data',
      'statistics',
      'survey_results',
    ],
    outputTypes: ['array', 'object'],
  }

  /**
   * Check if this formatter can handle the result
   */
  canFormat(result: ToolResponse, context: FormatContext): boolean {
    if (!result.success || !result.output) return false

    const output = result.output
    const numericalData = this.extractNumericalData(output)

    return numericalData !== null && numericalData.length >= 2
  }

  /**
   * Format the tool result into chart presentation
   */
  async format(result: ToolResponse, context: FormatContext): Promise<FormattedResult> {
    const startTime = Date.now()

    try {
      logger.debug(`Formatting result as chart for tool: ${context.toolId}`)

      // Extract and analyze numerical data
      const numericalData = this.extractNumericalData(result.output)
      if (!numericalData || numericalData.length < 2) {
        throw new Error('Insufficient numerical data for chart visualization')
      }

      // Generate chart content
      const chartContent = await this.generateChartContent(numericalData, context)

      // Generate summary
      const summary = await this.generateSummary(result, context)

      // Create additional representations
      const representations = [
        {
          format: 'table' as ResultFormat,
          content: {
            type: 'table' as const,
            columns: this.generateTableColumns(numericalData),
            rows: numericalData,
            title: 'Data Table',
            description: 'Chart data in tabular format',
          },
          label: 'Table View',
          priority: 70,
        },
        {
          format: 'text' as ResultFormat,
          content: {
            type: 'text' as const,
            text: this.generateDataSummaryText(numericalData, chartContent),
            title: 'Data Summary',
            description: 'Statistical summary of the data',
          },
          label: 'Summary',
          priority: 50,
        },
      ]

      const processingTime = Date.now() - startTime

      return {
        originalResult: result,
        format: 'chart',
        content: chartContent,
        summary,
        representations,
        metadata: {
          formattedAt: new Date().toISOString(),
          processingTime,
          version: '1.0.0',
          qualityScore: await this.calculateQualityScore(chartContent, numericalData),
        },
      }

    } catch (error) {
      logger.error('Chart formatting failed:', error)
      throw new Error(`Chart formatting failed: ${(error as Error).message}`)
    }
  }

  /**
   * Generate natural language summary
   */
  async generateSummary(result: ToolResponse, context: FormatContext): Promise<{
    headline: string
    description: string
    highlights: string[]
    suggestions: string[]
  }> {
    try {
      const numericalData = this.extractNumericalData(result.output)
      const stats = this.calculateStatistics(numericalData || [])
      const chartType = this.selectOptimalChartType(numericalData || [])

      const toolName = context.toolConfig.name || context.toolId

      return {
        headline: `${toolName} data visualized as ${chartType} chart`,
        description: `Generated ${chartType} visualization from ${numericalData?.length || 0} data points. ${this.generateStatsDescription(stats)}`,
        highlights: this.extractDataHighlights(stats),
        suggestions: this.generateChartSuggestions(chartType, stats, context),
      }

    } catch (error) {
      logger.error('Chart summary generation failed:', error)

      return {
        headline: `${context.toolConfig.name || context.toolId} data visualization`,
        description: 'The tool returned numerical data that has been visualized as a chart.',
        highlights: [],
        suggestions: ['Analyze the chart patterns', 'Switch between different chart types for different perspectives'],
      }
    }
  }

  // Private methods

  private extractNumericalData(output: any): Record<string, any>[] | null {
    if (Array.isArray(output)) {
      return this.processArrayData(output)
    }

    if (typeof output === 'object' && output !== null) {
      // Check for common data container patterns
      const dataKeys = ['data', 'results', 'values', 'metrics', 'stats', 'series']
      for (const key of dataKeys) {
        if (Array.isArray(output[key])) {
          const processed = this.processArrayData(output[key])
          if (processed) return processed
        }
      }

      // Check if the object itself contains numerical data
      const processed = this.processObjectData(output)
      if (processed && processed.length > 1) return processed
    }

    return null
  }

  private processArrayData(data: any[]): Record<string, any>[] | null {
    if (data.length < 2) return null

    // Check if items are objects with numerical fields
    const objectItems = data.filter(item => typeof item === 'object' && item !== null)
    if (objectItems.length >= data.length * 0.8) {
      const processed = this.extractNumericalFields(objectItems)
      return processed.length >= 2 ? processed : null
    }

    // Check if items are numbers with implicit x-axis
    const numericalItems = data.filter(item => typeof item === 'number')
    if (numericalItems.length >= data.length * 0.8) {
      return numericalItems.map((value, index) => ({
        x: index + 1,
        y: value,
        label: `Point ${index + 1}`,
      }))
    }

    // Check for key-value pairs
    if (data.every(item => Array.isArray(item) && item.length === 2)) {
      return data.map(([key, value]) => ({
        x: key,
        y: typeof value === 'number' ? value : parseFloat(String(value)) || 0,
        label: String(key),
      }))
    }

    return null
  }

  private processObjectData(data: Record<string, any>): Record<string, any>[] | null {
    const entries = Object.entries(data)
    const numericalEntries = entries.filter(([_, value]) =>
      typeof value === 'number' || !isNaN(parseFloat(String(value)))
    )

    if (numericalEntries.length < 2) return null

    return numericalEntries.map(([key, value]) => ({
      x: key,
      y: typeof value === 'number' ? value : parseFloat(String(value)),
      label: this.humanizeKey(key),
    }))
  }

  private extractNumericalFields(items: Record<string, any>[]): Record<string, any>[] {
    if (items.length === 0) return []

    // Find numerical fields
    const firstItem = items[0]
    const numericalFields = Object.keys(firstItem).filter(key =>
      items.some(item => typeof item[key] === 'number')
    )

    if (numericalFields.length === 0) return []

    // Find categorical field for x-axis
    const categoricalFields = Object.keys(firstItem).filter(key =>
      !numericalFields.includes(key) &&
      items.every(item => item[key] !== null && item[key] !== undefined)
    )

    const xField = categoricalFields[0] || 'index'
    const yField = numericalFields[0]

    return items.map((item, index) => ({
      x: xField === 'index' ? index + 1 : item[xField],
      y: typeof item[yField] === 'number' ? item[yField] : parseFloat(String(item[yField])) || 0,
      label: String(xField === 'index' ? `Item ${index + 1}` : item[xField]),
      ...Object.fromEntries(
        numericalFields.slice(1, 4).map(field => [
          field,
          typeof item[field] === 'number' ? item[field] : parseFloat(String(item[field])) || 0
        ])
      ),
    }))
  }

  private selectOptimalChartType(data: Record<string, any>[]): ChartContent['chartType'] {
    if (data.length === 0) return 'bar'

    // Analyze data characteristics
    const hasTimeData = this.hasTimeSeriesData(data)
    const hasCategoricalX = this.hasCategoricalXAxis(data)
    const dataCount = data.length
    const numericalFields = this.getNumericalFields(data)

    // Decision tree for chart type selection
    if (hasTimeData) {
      return 'line' // Time series data works best with line charts
    }

    if (numericalFields.length >= 2 && dataCount <= 50) {
      return 'scatter' // Multiple dimensions with reasonable data points
    }

    if (hasCategoricalX && dataCount <= 20) {
      return this.hasMultipleSeries(data) ? 'bar' : 'pie' // Pie for single series with few categories
    }

    if (dataCount > 100) {
      return 'histogram' // Large datasets work better as histograms
    }

    // Default to bar chart
    return 'bar'
  }

  private async generateChartContent(data: Record<string, any>[], context: FormatContext): Promise<ChartContent> {
    const chartType = this.selectOptimalChartType(data)
    const config = this.generateChartConfig(data, chartType, context)

    return {
      type: 'chart',
      title: `${context.toolConfig.name || context.toolId} Visualization`,
      description: `${chartType} chart showing ${data.length} data points`,
      chartType,
      data,
      config,
      dimensions: {
        width: 800,
        height: 400,
      },
    }
  }

  private generateChartConfig(data: Record<string, any>[], chartType: ChartContent['chartType'], context: FormatContext) {
    const numericalFields = this.getNumericalFields(data)
    const hasMultipleSeries = numericalFields.length > 1

    const config: ChartContent['config'] = {
      xAxis: 'x',
      yAxis: numericalFields[0] || 'y',
      colors: this.generateColorPalette(hasMultipleSeries ? numericalFields.length : 1),
      legend: hasMultipleSeries || chartType === 'pie',
      tooltips: true,
      responsive: true,
    }

    // Chart-specific configurations
    if (hasMultipleSeries && chartType !== 'pie') {
      config.yAxis = numericalFields.slice(0, 3) // Limit to 3 series for readability
    }

    if (this.hasCategoricalXAxis(data)) {
      config.groupBy = 'label'
    }

    return config
  }

  private generateTableColumns(data: Record<string, any>[]) {
    if (data.length === 0) return []

    const keys = Object.keys(data[0])
    return keys.map(key => ({
      key,
      label: this.humanizeKey(key),
      type: this.determineColumnType(data, key),
      sortable: true,
      filterable: true,
    }))
  }

  private calculateStatistics(data: Record<string, any>[]) {
    if (data.length === 0) return {}

    const numericalFields = this.getNumericalFields(data)
    const stats: Record<string, any> = {}

    numericalFields.forEach(field => {
      const values = data.map(item => item[field]).filter(v => typeof v === 'number')
      if (values.length > 0) {
        stats[field] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, v) => sum + v, 0) / values.length,
          count: values.length,
        }
      }
    })

    stats.totalDataPoints = data.length
    return stats
  }

  private generateStatsDescription(stats: Record<string, any>): string {
    if (!stats.totalDataPoints) return ''

    const descriptions: string[] = []

    Object.entries(stats).forEach(([key, value]) => {
      if (key !== 'totalDataPoints' && value && typeof value === 'object') {
        const range = value.max - value.min
        descriptions.push(`${this.humanizeKey(key)} ranges from ${value.min} to ${value.max}`)
      }
    })

    return descriptions.slice(0, 2).join(', ') + '.'
  }

  private extractDataHighlights(stats: Record<string, any>): string[] {
    const highlights: string[] = []

    if (stats.totalDataPoints) {
      highlights.push(`${stats.totalDataPoints} data points`)
    }

    // Find the field with highest variance
    let maxVarianceField = ''
    let maxVariance = 0

    Object.entries(stats).forEach(([key, value]) => {
      if (key !== 'totalDataPoints' && value && typeof value === 'object') {
        const variance = value.max - value.min
        if (variance > maxVariance) {
          maxVariance = variance
          maxVarianceField = key
        }
      }
    })

    if (maxVarianceField) {
      highlights.push(`Highest variation in ${this.humanizeKey(maxVarianceField)}`)
    }

    return highlights.slice(0, 3)
  }

  private generateChartSuggestions(chartType: string, stats: Record<string, any>, context: FormatContext): string[] {
    const suggestions: string[] = []

    // Chart type specific suggestions
    switch (chartType) {
      case 'line':
        suggestions.push('Look for trends and patterns over time')
        suggestions.push('Identify peaks and valleys in the data')
        break

      case 'bar':
        suggestions.push('Compare values across different categories')
        suggestions.push('Identify the highest and lowest performing items')
        break

      case 'pie':
        suggestions.push('Analyze the distribution and proportions')
        suggestions.push('Focus on the largest segments')
        break

      case 'scatter':
        suggestions.push('Look for correlations between variables')
        suggestions.push('Identify outliers and clusters')
        break

      default:
        suggestions.push('Analyze the data patterns and trends')
    }

    // Generic suggestions
    suggestions.push('Try different chart types for alternative perspectives')

    return suggestions.slice(0, 3)
  }

  private generateDataSummaryText(data: Record<string, any>[], chartContent: ChartContent): string {
    const stats = this.calculateStatistics(data)
    let text = `Data Summary for ${chartContent.chartType} chart:\n\n`

    text += `Total data points: ${data.length}\n`
    text += `Chart type: ${chartContent.chartType}\n\n`

    // Statistical summary
    Object.entries(stats).forEach(([key, value]) => {
      if (key !== 'totalDataPoints' && value && typeof value === 'object') {
        text += `${this.humanizeKey(key)}:\n`
        text += `  Min: ${value.min}\n`
        text += `  Max: ${value.max}\n`
        text += `  Average: ${value.avg.toFixed(2)}\n`
        text += `  Count: ${value.count}\n\n`
      }
    })

    return text
  }

  // Utility methods

  private hasTimeSeriesData(data: Record<string, any>[]): boolean {
    if (data.length === 0) return false

    return data.some(item => {
      const xValue = item.x || item.date || item.time || item.timestamp
      return xValue && !isNaN(Date.parse(String(xValue)))
    })
  }

  private hasCategoricalXAxis(data: Record<string, any>[]): boolean {
    if (data.length === 0) return false

    return data.some(item => {
      const xValue = item.x
      return typeof xValue === 'string' && isNaN(parseFloat(xValue))
    })
  }

  private hasMultipleSeries(data: Record<string, any>[]): boolean {
    if (data.length === 0) return false

    const numericalFields = this.getNumericalFields(data)
    return numericalFields.length > 1
  }

  private getNumericalFields(data: Record<string, any>[]): string[] {
    if (data.length === 0) return []

    const firstItem = data[0]
    return Object.keys(firstItem).filter(key =>
      key !== 'x' && key !== 'label' &&
      data.some(item => typeof item[key] === 'number')
    )
  }

  private determineColumnType(data: Record<string, any>[], key: string): string {
    const values = data.map(item => item[key]).filter(v => v !== null && v !== undefined)

    if (values.every(v => typeof v === 'number')) return 'number'
    if (values.every(v => typeof v === 'boolean')) return 'boolean'
    if (values.some(v => !isNaN(Date.parse(String(v))))) return 'date'

    return 'string'
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim()
  }

  private generateColorPalette(count: number): string[] {
    const colors = [
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#8B5CF6', // Purple
      '#F97316', // Orange
      '#14B8A6', // Teal
      '#F43F5E', // Pink
    ]

    return colors.slice(0, Math.max(count, 8))
  }

  private async calculateQualityScore(content: ChartContent, data: Record<string, any>[]): Promise<number> {
    let score = 0.7 // Base score for chart formatting

    // Data quality factors
    if (data.length > 5) score += 0.1 // Sufficient data points
    if (data.length > 20) score += 0.05 // Good data size

    // Configuration quality
    if (content.config.tooltips) score += 0.05
    if (content.config.legend) score += 0.05
    if (content.config.responsive) score += 0.05

    return Math.min(1.0, score)
  }
}