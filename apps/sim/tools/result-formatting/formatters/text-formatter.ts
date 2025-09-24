/**
 * Universal Tool Adapter System - Text Formatter
 *
 * Sophisticated text formatter that converts tool results into natural language
 * presentations with intelligent content analysis and conversational summaries.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ToolResponse } from '@/tools/types'
import type {
  ResultFormatter,
  FormatContext,
  FormattedResult,
  TextContent,
  ResultFormat,
} from '../types'

const logger = createLogger('TextFormatter')

/**
 * Advanced text formatter for natural language result presentation
 */
export class TextFormatter implements ResultFormatter {
  id = 'text_formatter'
  name = 'Text Formatter'
  description = 'Converts tool results into readable text with natural language summaries'
  supportedFormats: ResultFormat[] = ['text']
  priority = 100 // High priority as a fundamental formatter

  toolCompatibility = {
    preferredTools: [
      'thinking',
      'mail_send',
      'sms_send',
      'vision',
      'http_request',
      'file_parse',
    ],
    outputTypes: ['string', 'object', 'error'],
  }

  /**
   * Check if this formatter can handle the result
   */
  canFormat(result: ToolResponse, context: FormatContext): boolean {
    // Text formatter is universal - can handle any result
    return true
  }

  /**
   * Format the tool result into text presentation
   */
  async format(result: ToolResponse, context: FormatContext): Promise<FormattedResult> {
    const startTime = Date.now()

    try {
      logger.debug(`Formatting result as text for tool: ${context.toolId}`)

      // Generate text content
      const textContent = await this.generateTextContent(result, context)

      // Generate summary
      const summary = await this.generateSummary(result, context)

      // Create additional representations
      const representations = [
        {
          format: 'json' as ResultFormat,
          content: {
            type: 'json' as const,
            data: result.output,
            title: 'Raw Output',
            description: 'Original tool response data',
          },
          label: 'Raw Data',
          priority: 50,
        },
      ]

      // Add markdown representation for rich text
      if (this.isRichText(textContent.text)) {
        representations.push({
          format: 'markdown' as ResultFormat,
          content: {
            type: 'markdown' as const,
            markdown: this.convertToMarkdown(textContent.text),
            title: textContent.title,
            description: 'Formatted as markdown',
          },
          label: 'Markdown View',
          priority: 75,
        })
      }

      const processingTime = Date.now() - startTime

      return {
        originalResult: result,
        format: 'text',
        content: textContent,
        summary,
        representations,
        metadata: {
          formattedAt: new Date().toISOString(),
          processingTime,
          version: '1.0.0',
          qualityScore: await this.calculateQualityScore(textContent, result),
        },
      }

    } catch (error) {
      logger.error('Text formatting failed:', error)
      throw new Error(`Text formatting failed: ${(error as Error).message}`)
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
      const toolName = context.toolConfig.name || context.toolId

      // Generate headline based on result status
      const headline = await this.generateHeadline(result, context)

      // Generate description
      const description = await this.generateDescription(result, context)

      // Extract highlights
      const highlights = await this.extractHighlights(result, context)

      // Generate suggestions
      const suggestions = await this.generateSuggestions(result, context)

      return {
        headline,
        description,
        highlights,
        suggestions,
      }

    } catch (error) {
      logger.error('Summary generation failed:', error)

      // Fallback summary
      return {
        headline: result.success
          ? `${context.toolConfig.name || context.toolId} completed successfully`
          : `${context.toolConfig.name || context.toolId} encountered an error`,
        description: result.success
          ? 'The tool executed and returned results.'
          : result.error || 'An error occurred during execution.',
        highlights: [],
        suggestions: result.success ? ['Review the results below'] : ['Check the error and try again'],
      }
    }
  }

  // Private methods

  private async generateTextContent(result: ToolResponse, context: FormatContext): Promise<TextContent> {
    const toolName = context.toolConfig.name || context.toolId

    if (!result.success) {
      return {
        type: 'text',
        title: `${toolName} - Error`,
        text: this.formatErrorText(result, context),
        format: 'rich',
        wordCount: this.countWords(result.error || 'Unknown error'),
      }
    }

    // Format successful result based on output type
    const outputType = this.detectOutputType(result.output)
    const formattedText = await this.formatByOutputType(result.output, outputType, context)

    return {
      type: 'text',
      title: `${toolName} - Results`,
      text: formattedText,
      format: 'rich',
      wordCount: this.countWords(formattedText),
    }
  }

  private formatErrorText(result: ToolResponse, context: FormatContext): string {
    const toolName = context.toolConfig.name || context.toolId
    let text = `${toolName} encountered an error:\n\n`

    if (result.error) {
      text += `Error: ${result.error}\n\n`
    }

    // Add timing information if available
    if (result.timing) {
      text += `Execution time: ${result.timing.duration}ms\n`
      text += `Started: ${new Date(result.timing.startTime).toLocaleString()}\n`
      text += `Ended: ${new Date(result.timing.endTime).toLocaleString()}\n`
    }

    // Add any available output for debugging
    if (result.output && typeof result.output === 'object') {
      text += `\nAdditional details:\n${JSON.stringify(result.output, null, 2)}`
    }

    return text
  }

  private async formatByOutputType(output: any, outputType: string, context: FormatContext): Promise<string> {
    switch (outputType) {
      case 'string':
        return this.formatStringOutput(output, context)

      case 'array':
        return this.formatArrayOutput(output, context)

      case 'object':
        return this.formatObjectOutput(output, context)

      case 'number':
        return this.formatNumberOutput(output, context)

      case 'boolean':
        return this.formatBooleanOutput(output, context)

      case 'null':
      case 'undefined':
        return 'No results returned.'

      default:
        return this.formatGenericOutput(output, context)
    }
  }

  private formatStringOutput(output: string, context: FormatContext): string {
    // Check if it's structured data in string form
    try {
      const parsed = JSON.parse(output)
      return this.formatObjectOutput(parsed, context)
    } catch {
      // It's plain text
      return output
    }
  }

  private formatArrayOutput(output: any[], context: FormatContext): string {
    if (output.length === 0) {
      return 'No items found.'
    }

    const toolName = context.toolConfig.name || context.toolId
    let text = `${toolName} returned ${output.length} item${output.length === 1 ? '' : 's'}:\n\n`

    // Format first few items in detail
    const maxDetailedItems = Math.min(5, output.length)

    for (let i = 0; i < maxDetailedItems; i++) {
      const item = output[i]
      text += `${i + 1}. ${this.formatSingleItem(item)}\n`
    }

    // Summarize remaining items
    if (output.length > maxDetailedItems) {
      text += `\n... and ${output.length - maxDetailedItems} more item${output.length - maxDetailedItems === 1 ? '' : 's'}.`
    }

    return text
  }

  private formatObjectOutput(output: Record<string, any>, context: FormatContext): string {
    const keys = Object.keys(output)

    if (keys.length === 0) {
      return 'Empty result returned.'
    }

    let text = ''

    // Check for common patterns
    if (this.isSearchResult(output)) {
      text = this.formatSearchResult(output)
    } else if (this.isListResult(output)) {
      text = this.formatListResult(output)
    } else if (this.isStatusResult(output)) {
      text = this.formatStatusResult(output)
    } else {
      text = this.formatGenericObject(output, context)
    }

    return text
  }

  private formatNumberOutput(output: number, context: FormatContext): string {
    const toolName = context.toolConfig.name || context.toolId

    // Add context based on tool type
    if (context.toolId.includes('count') || context.toolId.includes('sum')) {
      return `Total: ${output.toLocaleString()}`
    }

    return `${toolName} returned: ${output.toLocaleString()}`
  }

  private formatBooleanOutput(output: boolean, context: FormatContext): string {
    const toolName = context.toolConfig.name || context.toolId
    return `${toolName} result: ${output ? 'Yes' : 'No'}`
  }

  private formatGenericOutput(output: any, context: FormatContext): string {
    if (output === null || output === undefined) {
      return 'No result returned.'
    }

    return JSON.stringify(output, null, 2)
  }

  private formatSingleItem(item: any): string {
    if (typeof item === 'string') {
      return item
    }

    if (typeof item === 'object' && item !== null) {
      // Try to extract meaningful fields
      const title = item.title || item.name || item.subject || item.id
      const description = item.description || item.summary || item.content

      if (title && description) {
        return `${title}: ${description}`
      }
      if (title) {
        return title
      }
      if (description) {
        return description
      }

      // Fallback to key-value pairs
      const entries = Object.entries(item).slice(0, 3)
      return entries.map(([key, value]) => `${key}: ${value}`).join(', ')
    }

    return String(item)
  }

  private isSearchResult(output: any): boolean {
    return (
      output.hasOwnProperty('results') ||
      output.hasOwnProperty('items') ||
      output.hasOwnProperty('hits') ||
      output.hasOwnProperty('data')
    )
  }

  private isListResult(output: any): boolean {
    const listKeys = ['list', 'items', 'entries', 'records']
    return listKeys.some(key => output.hasOwnProperty(key))
  }

  private isStatusResult(output: any): boolean {
    return (
      output.hasOwnProperty('status') ||
      output.hasOwnProperty('success') ||
      output.hasOwnProperty('message')
    )
  }

  private formatSearchResult(output: any): string {
    const results = output.results || output.items || output.hits || output.data || []
    const total = output.total || output.count || results.length

    let text = `Found ${total} result${total === 1 ? '' : 's'}:\n\n`

    if (Array.isArray(results)) {
      const maxResults = Math.min(5, results.length)
      for (let i = 0; i < maxResults; i++) {
        text += `${i + 1}. ${this.formatSingleItem(results[i])}\n`
      }

      if (results.length > maxResults) {
        text += `\n... and ${results.length - maxResults} more result${results.length - maxResults === 1 ? '' : 's'}.`
      }
    }

    return text
  }

  private formatListResult(output: any): string {
    const listKey = ['list', 'items', 'entries', 'records'].find(key => output.hasOwnProperty(key))
    if (!listKey) return this.formatGenericObject(output, {} as FormatContext)

    const items = output[listKey]
    if (!Array.isArray(items)) {
      return `${listKey}: ${items}`
    }

    return this.formatArrayOutput(items, {} as FormatContext)
  }

  private formatStatusResult(output: any): string {
    let text = ''

    if (output.message) {
      text += `${output.message}\n\n`
    }

    if (output.status) {
      text += `Status: ${output.status}\n`
    }

    if (output.success !== undefined) {
      text += `Success: ${output.success ? 'Yes' : 'No'}\n`
    }

    // Add other fields
    const excludedKeys = new Set(['message', 'status', 'success'])
    const otherKeys = Object.keys(output).filter(key => !excludedKeys.has(key))

    if (otherKeys.length > 0) {
      text += '\nAdditional details:\n'
      for (const key of otherKeys.slice(0, 5)) {
        text += `${key}: ${output[key]}\n`
      }
    }

    return text
  }

  private formatGenericObject(output: Record<string, any>, context: FormatContext): string {
    const entries = Object.entries(output)
    const maxEntries = Math.min(10, entries.length)

    let text = ''

    for (let i = 0; i < maxEntries; i++) {
      const [key, value] = entries[i]
      const formattedKey = this.humanizeKey(key)
      const formattedValue = this.formatValue(value)
      text += `${formattedKey}: ${formattedValue}\n`
    }

    if (entries.length > maxEntries) {
      text += `\n... and ${entries.length - maxEntries} more field${entries.length - maxEntries === 1 ? '' : 's'}.`
    }

    return text
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
      .trim()
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'N/A'
    }

    if (typeof value === 'string') {
      return value.length > 100 ? value.substring(0, 100) + '...' : value
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.length <= 3
          ? `[${value.join(', ')}]`
          : `[${value.slice(0, 3).join(', ')}, ... +${value.length - 3} more]`
      }
      return `{${Object.keys(value).length} fields}`
    }

    return String(value)
  }

  private detectOutputType(output: any): string {
    if (output === null) return 'null'
    if (output === undefined) return 'undefined'
    if (Array.isArray(output)) return 'array'

    return typeof output
  }

  private async generateHeadline(result: ToolResponse, context: FormatContext): Promise<string> {
    const toolName = context.toolConfig.name || context.toolId

    if (!result.success) {
      return `${toolName} failed with an error`
    }

    // Generate context-aware headlines
    if (context.toolId.includes('search')) {
      const output = result.output
      const count = this.extractCount(output)
      return count !== null
        ? `Found ${count} result${count === 1 ? '' : 's'} for your search`
        : `Search completed successfully`
    }

    if (context.toolId.includes('send') || context.toolId.includes('write')) {
      return `${toolName} sent successfully`
    }

    if (context.toolId.includes('read') || context.toolId.includes('get')) {
      return `${toolName} retrieved data successfully`
    }

    if (context.toolId.includes('create') || context.toolId.includes('add')) {
      return `${toolName} created successfully`
    }

    if (context.toolId.includes('update') || context.toolId.includes('edit')) {
      return `${toolName} updated successfully`
    }

    if (context.toolId.includes('delete') || context.toolId.includes('remove')) {
      return `${toolName} deleted successfully`
    }

    return `${toolName} completed successfully`
  }

  private async generateDescription(result: ToolResponse, context: FormatContext): Promise<string> {
    const toolDescription = context.toolConfig.description || 'Performed the requested operation'

    if (!result.success) {
      return `The tool encountered an error: ${result.error || 'Unknown error occurred'}. ${toolDescription}.`
    }

    // Generate context-aware descriptions
    const output = result.output
    const outputSummary = this.summarizeOutput(output)

    let description = `${toolDescription}. `

    if (outputSummary) {
      description += outputSummary
    } else {
      description += 'The operation completed successfully.'
    }

    // Add timing context if significant
    if (result.timing && result.timing.duration > 1000) {
      description += ` (Took ${Math.round(result.timing.duration / 1000)} seconds)`
    }

    return description
  }

  private async extractHighlights(result: ToolResponse, context: FormatContext): Promise<string[]> {
    const highlights: string[] = []

    if (!result.success) {
      return highlights // No highlights for failed results
    }

    const output = result.output

    // Extract highlights based on output content
    if (typeof output === 'object' && output !== null) {
      // Look for important fields
      if (output.total || output.count) {
        const count = output.total || output.count
        highlights.push(`Total items: ${count.toLocaleString()}`)
      }

      if (output.status) {
        highlights.push(`Status: ${output.status}`)
      }

      if (output.url) {
        highlights.push(`Resource URL: ${output.url}`)
      }

      if (output.id) {
        highlights.push(`ID: ${output.id}`)
      }

      // Extract from arrays
      if (Array.isArray(output) && output.length > 0) {
        highlights.push(`${output.length} item${output.length === 1 ? '' : 's'} returned`)
      }

      // Extract from search results
      if (output.results && Array.isArray(output.results)) {
        highlights.push(`${output.results.length} result${output.results.length === 1 ? '' : 's'} found`)
      }
    }

    // Add performance highlight if significant
    if (result.timing && result.timing.duration < 1000) {
      highlights.push(`Fast execution (${result.timing.duration}ms)`)
    }

    return highlights.slice(0, 3) // Limit to 3 highlights
  }

  private async generateSuggestions(result: ToolResponse, context: FormatContext): Promise<string[]> {
    const suggestions: string[] = []

    if (!result.success) {
      suggestions.push('Check the error message and retry the operation')
      suggestions.push('Verify the tool parameters are correct')
      return suggestions
    }

    const output = result.output

    // Context-aware suggestions
    if (context.toolId.includes('search')) {
      suggestions.push('Refine your search criteria for more specific results')
      if (this.extractCount(output) === 0) {
        suggestions.push('Try different search terms')
      }
    }

    if (context.toolId.includes('create') || context.toolId.includes('add')) {
      suggestions.push('Review the created item')
      suggestions.push('Configure additional properties if needed')
    }

    if (context.toolId.includes('get') || context.toolId.includes('read')) {
      suggestions.push('Use this data in other tools or workflows')
      if (Array.isArray(output)) {
        suggestions.push('Filter or process the results further')
      }
    }

    // Generic suggestions based on output
    if (typeof output === 'object' && output !== null) {
      if (output.id) {
        suggestions.push('Use this ID to reference the item in future operations')
      }
      if (output.url) {
        suggestions.push('Visit the URL to view or modify the resource')
      }
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push('Review the results and take appropriate action')
      suggestions.push('Use the data in subsequent workflow steps')
    }

    return suggestions.slice(0, 3) // Limit to 3 suggestions
  }

  private extractCount(output: any): number | null {
    if (typeof output === 'number') {
      return output
    }

    if (typeof output === 'object' && output !== null) {
      const countFields = ['total', 'count', 'length', 'size']
      for (const field of countFields) {
        if (typeof output[field] === 'number') {
          return output[field]
        }
      }

      // Check arrays
      if (Array.isArray(output)) {
        return output.length
      }

      if (output.results && Array.isArray(output.results)) {
        return output.results.length
      }
    }

    return null
  }

  private summarizeOutput(output: any): string {
    if (output === null || output === undefined) {
      return 'No data returned.'
    }

    if (typeof output === 'string') {
      return output.length > 100
        ? `Returned text (${output.length} characters).`
        : `Returned: "${output}".`
    }

    if (typeof output === 'number') {
      return `Returned value: ${output.toLocaleString()}.`
    }

    if (typeof output === 'boolean') {
      return `Result: ${output ? 'Yes' : 'No'}.`
    }

    if (Array.isArray(output)) {
      return `Returned ${output.length} item${output.length === 1 ? '' : 's'}.`
    }

    if (typeof output === 'object') {
      const keys = Object.keys(output)
      return `Returned object with ${keys.length} field${keys.length === 1 ? '' : 's'}.`
    }

    return 'Data returned successfully.'
  }

  private isRichText(text: string): boolean {
    // Check if text would benefit from markdown formatting
    return (
      text.includes('\n\n') || // Multiple paragraphs
      text.includes('* ') || // List items
      text.includes('http') || // URLs
      text.includes('`') || // Code
      text.length > 300 // Long text
    )
  }

  private convertToMarkdown(text: string): string {
    // Basic text to markdown conversion
    let markdown = text

    // Convert URLs to links
    markdown = markdown.replace(
      /(https?:\/\/[^\s]+)/g,
      '[$1]($1)'
    )

    // Convert simple lists
    markdown = markdown.replace(
      /^(\d+)\. /gm,
      '$1. '
    )

    return markdown
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length
  }

  private async calculateQualityScore(content: TextContent, result: ToolResponse): Promise<number> {
    let score = 0.8 // Base score for text formatting

    // Adjust based on content quality
    if (content.title && content.title.length > 5) score += 0.1
    if (content.wordCount > 10) score += 0.05
    if (result.success) score += 0.05

    return Math.min(1.0, score)
  }
}