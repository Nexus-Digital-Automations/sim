/**
 * Universal Tool Adapter System - JSON Formatter
 *
 * Advanced JSON formatter with intelligent structure analysis, expandable views,
 * and schema detection for better data presentation.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ToolResponse } from '@/tools/types'
import type {
  ResultFormatter,
  FormatContext,
  FormattedResult,
  JsonContent,
  ResultFormat,
} from '../types'

const logger = createLogger('JsonFormatter')

/**
 * Advanced JSON formatter for structured data presentation
 */
export class JsonFormatter implements ResultFormatter {
  id = 'json_formatter'
  name = 'JSON Formatter'
  description = 'Displays structured data with expandable JSON trees and schema analysis'
  supportedFormats: ResultFormat[] = ['json']
  priority = 150 // Medium-high priority for structured data

  toolCompatibility = {
    preferredTools: [
      'http_request',
      'function_execute',
      'openai_embeddings',
      'pinecone_search_vector',
      'qdrant_search',
      'knowledge_search',
    ],
    outputTypes: ['object', 'array'],
    excludedTools: [
      'mail_send',
      'sms_send',
      'vision',
      'thinking',
    ],
  }

  /**
   * Check if this formatter can handle the result
   */
  canFormat(result: ToolResponse, context: FormatContext): boolean {
    if (!result.success || !result.output) {
      return false
    }

    const output = result.output

    // JSON formatter is great for complex structured data
    if (typeof output === 'object' && output !== null) {
      // Prefer JSON for deeply nested objects
      if (this.getObjectDepth(output) > 2) {
        return true
      }

      // Good for objects with mixed data types
      if (this.hasMixedDataTypes(output)) {
        return true
      }

      // Great for API responses
      if (this.looksLikeApiResponse(output)) {
        return true
      }
    }

    // Also handle arrays of mixed objects
    if (Array.isArray(output) && output.length > 0) {
      const firstItem = output[0]
      if (typeof firstItem === 'object' && firstItem !== null) {
        // If objects have different structures, JSON is better than table
        if (!this.hasConsistentStructure(output)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Format the tool result into JSON presentation
   */
  async format(result: ToolResponse, context: FormatContext): Promise<FormattedResult> {
    const startTime = Date.now()

    try {
      logger.debug(`Formatting result as JSON for tool: ${context.toolId}`)

      // Generate JSON content
      const jsonContent = await this.generateJsonContent(result.output, context)

      // Generate summary
      const summary = await this.generateSummary(result, context, jsonContent)

      // Create additional representations
      const representations = await this.createRepresentations(jsonContent, result)

      const processingTime = Date.now() - startTime

      return {
        originalResult: result,
        format: 'json',
        content: jsonContent,
        summary,
        representations,
        metadata: {
          formattedAt: new Date().toISOString(),
          processingTime,
          version: '1.0.0',
          qualityScore: await this.calculateQualityScore(jsonContent, result.output),
        },
      }

    } catch (error) {
      logger.error('JSON formatting failed:', error)
      throw new Error(`JSON formatting failed: ${(error as Error).message}`)
    }
  }

  /**
   * Generate natural language summary for JSON data
   */
  async generateSummary(
    result: ToolResponse,
    context: FormatContext,
    jsonContent?: JsonContent
  ): Promise<{
    headline: string
    description: string
    highlights: string[]
    suggestions: string[]
  }> {
    try {
      const toolName = context.toolConfig.name || context.toolId
      const data = result.output

      // Analyze the data structure
      const analysis = this.analyzeDataStructure(data)

      // Generate headline
      const headline = this.generateHeadline(toolName, analysis)

      // Generate description
      const description = this.generateDescription(analysis, context)

      // Generate highlights
      const highlights = this.generateHighlights(analysis, data)

      // Generate suggestions
      const suggestions = this.generateSuggestions(analysis, context)

      return {
        headline,
        description,
        highlights,
        suggestions,
      }

    } catch (error) {
      logger.error('JSON summary generation failed:', error)

      return {
        headline: `${context.toolConfig.name || context.toolId} returned structured data`,
        description: 'The tool returned structured data in JSON format. Use the expandable tree view to explore the details.',
        highlights: [],
        suggestions: ['Expand sections to view detailed information', 'Use the search function to find specific values'],
      }
    }
  }

  // Private methods

  private async generateJsonContent(data: any, context: FormatContext): Promise<JsonContent> {
    // Generate schema analysis
    const schema = this.generateSchema(data)

    // Determine display configuration
    const displayHints = this.generateDisplayHints(data, context)

    // Create highlighted fields for important data
    const highlightFields = this.identifyImportantFields(data)

    return {
      type: 'json',
      title: `${context.toolConfig.name || context.toolId} - Structured Data`,
      description: this.generateDataDescription(data),
      data,
      schema,
      displayHints: {
        expandable: true,
        maxDepth: displayHints.maxDepth,
        highlightFields,
      },
    }
  }

  private generateSchema(data: any, depth = 0): Record<string, any> {
    if (depth > 5) return { type: 'unknown' } // Prevent infinite recursion

    if (data === null) return { type: 'null' }
    if (data === undefined) return { type: 'undefined' }

    const type = Array.isArray(data) ? 'array' : typeof data

    const schema: any = { type }

    switch (type) {
      case 'object':
        schema.properties = {}
        for (const [key, value] of Object.entries(data)) {
          schema.properties[key] = this.generateSchema(value, depth + 1)
        }
        schema.required = Object.keys(data).filter(key => data[key] !== undefined)
        break

      case 'array':
        if (data.length > 0) {
          // Analyze first few items to determine array item schema
          const itemSchemas = data.slice(0, 5).map(item => this.generateSchema(item, depth + 1))
          schema.items = this.mergeSchemas(itemSchemas)
        }
        schema.length = data.length
        break

      case 'string':
        schema.format = this.detectStringFormat(data)
        schema.length = data.length
        break

      case 'number':
        schema.format = Number.isInteger(data) ? 'integer' : 'float'
        break

      default:
        // Boolean, etc.
        break
    }

    return schema
  }

  private generateDisplayHints(data: any, context: FormatContext): {
    maxDepth: number
    expandable: boolean
  } {
    const depth = this.getObjectDepth(data)
    const displayMode = context.displayMode || 'detailed'

    let maxDepth: number

    switch (displayMode) {
      case 'compact':
        maxDepth = Math.min(2, depth)
        break
      case 'summary':
        maxDepth = Math.min(1, depth)
        break
      case 'detailed':
      default:
        maxDepth = Math.min(4, depth)
        break
    }

    return {
      maxDepth,
      expandable: depth > maxDepth,
    }
  }

  private identifyImportantFields(data: any): string[] {
    const importantFields: string[] = []

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      // Common important field names
      const importantKeys = [
        'id', 'name', 'title', 'email', 'status', 'type', 'url',
        'created', 'updated', 'date', 'time', 'error', 'message',
        'success', 'total', 'count', 'results'
      ]

      for (const key of Object.keys(data)) {
        if (importantKeys.some(important => key.toLowerCase().includes(important))) {
          importantFields.push(key)
        }
      }

      // Also highlight fields with simple values (not nested objects)
      for (const [key, value] of Object.entries(data)) {
        if (this.isSimpleValue(value) && importantFields.length < 10) {
          if (!importantFields.includes(key)) {
            importantFields.push(key)
          }
        }
      }
    }

    return importantFields.slice(0, 8) // Limit to 8 highlighted fields
  }

  private analyzeDataStructure(data: any): {
    type: string
    depth: number
    fieldCount: number
    arrayLength?: number
    hasNestedObjects: boolean
    hasArrays: boolean
    complexityScore: number
  } {
    const type = Array.isArray(data) ? 'array' : typeof data
    const depth = this.getObjectDepth(data)
    let fieldCount = 0
    let arrayLength = undefined
    let hasNestedObjects = false
    let hasArrays = false

    if (Array.isArray(data)) {
      arrayLength = data.length
      fieldCount = data.length
      hasArrays = true
      hasNestedObjects = data.some(item => typeof item === 'object' && item !== null)
    } else if (typeof data === 'object' && data !== null) {
      fieldCount = Object.keys(data).length
      hasNestedObjects = Object.values(data).some(value => typeof value === 'object' && value !== null && !Array.isArray(value))
      hasArrays = Object.values(data).some(Array.isArray)
    }

    // Calculate complexity score (0-10)
    let complexityScore = 0
    complexityScore += Math.min(depth, 5) // Depth contribution (max 5)
    complexityScore += Math.min(fieldCount / 10, 3) // Field count contribution (max 3)
    if (hasNestedObjects) complexityScore += 1
    if (hasArrays) complexityScore += 1

    return {
      type,
      depth,
      fieldCount,
      arrayLength,
      hasNestedObjects,
      hasArrays,
      complexityScore,
    }
  }

  private generateHeadline(toolName: string, analysis: any): string {
    if (analysis.type === 'array') {
      return `${toolName} returned ${analysis.arrayLength} item${analysis.arrayLength === 1 ? '' : 's'}`
    }

    if (analysis.type === 'object') {
      const complexity = analysis.complexityScore > 6 ? 'complex' : 'structured'
      return `${toolName} returned ${complexity} data with ${analysis.fieldCount} field${analysis.fieldCount === 1 ? '' : 's'}`
    }

    return `${toolName} returned ${analysis.type} data`
  }

  private generateDescription(analysis: any, context: FormatContext): string {
    let description = ''

    if (analysis.type === 'array') {
      description = `The result contains an array with ${analysis.arrayLength} item${analysis.arrayLength === 1 ? '' : 's'}. `
      if (analysis.hasNestedObjects) {
        description += 'Each item contains structured object data. '
      }
    } else if (analysis.type === 'object') {
      description = `The result contains a structured object with ${analysis.fieldCount} field${analysis.fieldCount === 1 ? '' : 's'}. `
      if (analysis.hasNestedObjects) {
        description += 'It includes nested objects for detailed information. '
      }
      if (analysis.hasArrays) {
        description += 'Some fields contain arrays of data. '
      }
    }

    // Add depth information
    if (analysis.depth > 2) {
      description += `The data has ${analysis.depth} level${analysis.depth === 1 ? '' : 's'} of nesting. `
    }

    // Add usage suggestions
    description += 'Use the expandable tree view to explore the structure and find specific information.'

    return description
  }

  private generateHighlights(analysis: any, data: any): string[] {
    const highlights: string[] = []

    // Structure highlights
    if (analysis.type === 'array') {
      highlights.push(`${analysis.arrayLength} item${analysis.arrayLength === 1 ? '' : 's'} in array`)
    } else if (analysis.type === 'object') {
      highlights.push(`${analysis.fieldCount} field${analysis.fieldCount === 1 ? '' : 's'} in object`)
    }

    // Complexity highlights
    if (analysis.depth > 3) {
      highlights.push(`${analysis.depth} levels deep`)
    }

    if (analysis.hasNestedObjects && analysis.hasArrays) {
      highlights.push('Complex nested structure')
    } else if (analysis.hasNestedObjects) {
      highlights.push('Contains nested objects')
    } else if (analysis.hasArrays) {
      highlights.push('Contains arrays')
    }

    // Data-specific highlights
    if (typeof data === 'object' && data !== null) {
      if (data.total || data.count) {
        highlights.push(`Total count: ${data.total || data.count}`)
      }
      if (data.status) {
        highlights.push(`Status: ${data.status}`)
      }
      if (data.id) {
        highlights.push(`ID: ${data.id}`)
      }
    }

    return highlights.slice(0, 3)
  }

  private generateSuggestions(analysis: any, context: FormatContext): string[] {
    const suggestions: string[] = []

    // Navigation suggestions
    if (analysis.depth > 2) {
      suggestions.push('Expand sections gradually to avoid information overload')
    } else {
      suggestions.push('Click on expandable sections to view detailed information')
    }

    // Tool-specific suggestions
    if (context.toolId.includes('search') || context.toolId.includes('query')) {
      suggestions.push('Use this data to refine future searches')
    }

    if (context.toolId.includes('api') || context.toolId.includes('http')) {
      suggestions.push('Reference the schema for future API calls')
    }

    // Data usage suggestions
    if (analysis.type === 'array' && analysis.arrayLength > 5) {
      suggestions.push('Consider using table view for better data overview')
    }

    if (analysis.hasNestedObjects) {
      suggestions.push('Extract specific fields for use in other tools')
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push('Use the search function to find specific values')
      suggestions.push('Copy individual values or entire sections as needed')
    }

    return suggestions.slice(0, 3)
  }

  private generateDataDescription(data: any): string {
    const analysis = this.analyzeDataStructure(data)

    if (analysis.type === 'array') {
      return `Array containing ${analysis.arrayLength} item${analysis.arrayLength === 1 ? '' : 's'}`
    }

    if (analysis.type === 'object') {
      return `Object with ${analysis.fieldCount} field${analysis.fieldCount === 1 ? '' : 's'}`
    }

    return `${analysis.type.charAt(0).toUpperCase() + analysis.type.slice(1)} data`
  }

  private async createRepresentations(
    jsonContent: JsonContent,
    result: ToolResponse
  ): Promise<FormattedResult['representations']> {
    const representations = []

    // Add table representation if data is suitable
    if (this.isSuitableForTable(jsonContent.data)) {
      representations.push({
        format: 'table' as ResultFormat,
        content: this.convertToTable(jsonContent.data),
        label: 'Table View',
        priority: 175,
      })
    }

    // Add text representation
    representations.push({
      format: 'text' as ResultFormat,
      content: {
        type: 'text' as const,
        title: 'Readable Summary',
        text: this.convertToText(jsonContent.data),
        format: 'rich',
      },
      label: 'Text Summary',
      priority: 100,
    })

    // Add code representation for developers
    representations.push({
      format: 'code' as ResultFormat,
      content: {
        type: 'code' as const,
        title: 'JSON Code',
        code: JSON.stringify(jsonContent.data, null, 2),
        language: 'json',
        lineNumbers: true,
      },
      label: 'Code View',
      priority: 125,
    })

    return representations
  }

  // Utility methods

  private getObjectDepth(obj: any): number {
    if (typeof obj !== 'object' || obj === null) return 0

    let maxDepth = 1

    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        const depth = 1 + this.getObjectDepth(value)
        maxDepth = Math.max(maxDepth, depth)
      }
    }

    return maxDepth
  }

  private hasMixedDataTypes(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) return false

    const types = new Set(Object.values(obj).map(value => typeof value))
    return types.size > 2 // More than 2 different types
  }

  private looksLikeApiResponse(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) return false

    const apiFields = ['data', 'results', 'items', 'response', 'payload', 'meta', 'pagination', 'status', 'error']
    const objKeys = Object.keys(obj).map(k => k.toLowerCase())

    return apiFields.some(field => objKeys.includes(field))
  }

  private hasConsistentStructure(array: any[]): boolean {
    if (array.length < 2) return true

    const firstKeys = Object.keys(array[0] || {}).sort()
    return array.every(item =>
      typeof item === 'object' &&
      item !== null &&
      Object.keys(item).sort().join(',') === firstKeys.join(',')
    )
  }

  private isSimpleValue(value: any): boolean {
    return typeof value !== 'object' || value === null
  }

  private detectStringFormat(str: string): string {
    if (!isNaN(Date.parse(str))) return 'date-time'
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return 'email'
    if (/^https?:\/\//.test(str)) return 'url'
    if (/^\d+$/.test(str)) return 'numeric'
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return 'uuid'

    return 'text'
  }

  private mergeSchemas(schemas: any[]): any {
    if (schemas.length === 0) return { type: 'unknown' }
    if (schemas.length === 1) return schemas[0]

    // Find the most common type
    const types = schemas.map(s => s.type)
    const typeCount = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const mostCommonType = Object.keys(typeCount).reduce((a, b) =>
      typeCount[a] > typeCount[b] ? a : b
    )

    const baseSchema = { type: mostCommonType }

    // Merge properties for objects
    if (mostCommonType === 'object') {
      const allProps = new Set()
      schemas.forEach(schema => {
        if (schema.properties) {
          Object.keys(schema.properties).forEach(prop => allProps.add(prop))
        }
      })

      baseSchema.properties = {}
      for (const prop of allProps) {
        const propSchemas = schemas
          .filter(s => s.properties && s.properties[prop])
          .map(s => s.properties[prop])
        baseSchema.properties[prop] = this.mergeSchemas(propSchemas)
      }
    }

    return baseSchema
  }

  private isSuitableForTable(data: any): boolean {
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0]
      return typeof firstItem === 'object' && firstItem !== null
    }

    if (typeof data === 'object' && data !== null) {
      const values = Object.values(data)
      return values.some(Array.isArray)
    }

    return false
  }

  private convertToTable(data: any): any {
    // Basic conversion - in a real implementation, this would use the TableFormatter
    if (Array.isArray(data)) {
      return {
        type: 'table',
        rows: data,
        columns: this.extractTableColumns(data),
      }
    }

    return { type: 'table', rows: [], columns: [] }
  }

  private extractTableColumns(data: any[]): any[] {
    if (data.length === 0) return []

    const firstItem = data[0]
    if (typeof firstItem !== 'object' || firstItem === null) {
      return [{ key: 'value', label: 'Value' }]
    }

    return Object.keys(firstItem).map(key => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
    }))
  }

  private convertToText(data: any): string {
    // Convert JSON to readable text summary
    const analysis = this.analyzeDataStructure(data)

    let text = `This ${analysis.type} contains ${analysis.fieldCount} main element${analysis.fieldCount === 1 ? '' : 's'}.\n\n`

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const entries = Object.entries(data).slice(0, 10)
      for (const [key, value] of entries) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
        const formattedValue = this.formatValueForText(value)
        text += `${formattedKey}: ${formattedValue}\n`
      }

      if (Object.keys(data).length > 10) {
        text += `\n... and ${Object.keys(data).length - 10} more fields.`
      }
    } else if (Array.isArray(data)) {
      text += `Array contains ${data.length} items.\n\n`
      if (data.length > 0) {
        text += `First item: ${this.formatValueForText(data[0])}\n`
        if (data.length > 1) {
          text += `Last item: ${this.formatValueForText(data[data.length - 1])}\n`
        }
      }
    }

    return text
  }

  private formatValueForText(value: any): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return `"${value.length > 50 ? value.substring(0, 50) + '...' : value}"`
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'boolean') return value.toString()
    if (Array.isArray(value)) return `Array(${value.length})`
    if (typeof value === 'object') return `Object(${Object.keys(value).length} fields)`

    return String(value)
  }

  private async calculateQualityScore(jsonContent: JsonContent, originalData: any): Promise<number> {
    let score = 0.8 // Base score for JSON formatting

    // Adjust based on content quality
    if (jsonContent.schema) score += 0.1
    if (jsonContent.displayHints?.highlightFields.length > 0) score += 0.05
    if (this.getObjectDepth(originalData) > 1) score += 0.05

    return Math.min(1.0, score)
  }
}