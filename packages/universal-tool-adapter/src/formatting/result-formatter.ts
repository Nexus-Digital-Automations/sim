import type {
  ConversationalHint,
  FormattingTemplate,
  NaturalLanguageConfig,
  ResultFormatting,
  ToolRunResult as SimToolResult,
} from '../types/adapter-interfaces'
import type {
  ConversationalResult,
  ParlantExecutionContext,
  ParlantToolResult,
} from '../types/parlant-interfaces'
import { createLogger } from '../utils/logger'

const logger = createLogger('ResultFormatter')

/**
 * Result formatting strategies for different data types
 */
export class FormattingStrategies {
  /**
   * Format simple string results
   */
  static formatString(
    value: string,
    context: ParlantExecutionContext,
    hints?: ConversationalHint
  ): ConversationalResult {
    if (!value || value.trim().length === 0) {
      return {
        summary: 'No result returned from the tool.',
        suggestion: 'The tool completed but did not return any data.',
      }
    }

    // Handle different string patterns
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return {
        summary: 'Generated a web link for you.',
        details: `Link: ${value}`,
        actions: ['Open link', 'Copy link'],
      }
    }

    if (value.includes('\n') || value.length > 200) {
      return {
        summary: 'Retrieved detailed information.',
        details: value.length > 500 ? `${value.substring(0, 500)}...` : value,
        suggestion:
          value.length > 500
            ? 'The full response is quite long. Would you like me to break it down?'
            : undefined,
      }
    }

    return {
      summary: value,
      suggestion: hints?.results,
    }
  }

  /**
   * Format numerical results with context
   */
  static formatNumber(
    value: number,
    context: ParlantExecutionContext,
    hints?: ConversationalHint,
    unit?: string
  ): ConversationalResult {
    let formattedValue = value.toString()

    // Format large numbers with commas
    if (Math.abs(value) >= 1000) {
      formattedValue = value.toLocaleString()
    }

    // Add unit if provided
    if (unit) {
      formattedValue = `${formattedValue} ${unit}`
    }

    // Provide context based on value
    const summary = `Result: ${formattedValue}`
    let suggestion: string | undefined

    if (value === 0) {
      suggestion =
        'The result is zero. This might indicate no matches were found or the operation had no effect.'
    } else if (value < 0) {
      suggestion = 'The negative result might indicate an error condition or deficit.'
    } else if (value >= 1000000) {
      suggestion = 'This is quite a large number. Would you like me to break down what this means?'
    }

    return { summary, suggestion }
  }

  /**
   * Format array/list results
   */
  static formatArray(
    value: any[],
    context: ParlantExecutionContext,
    hints?: ConversationalHint
  ): ConversationalResult {
    if (value.length === 0) {
      return {
        summary: 'No items found.',
        suggestion:
          'The search or operation did not return any results. You might want to try different parameters.',
      }
    }

    if (value.length === 1) {
      return {
        summary: 'Found 1 item.',
        details: typeof value[0] === 'string' ? value[0] : JSON.stringify(value[0]),
        actions: ['View details', 'Use this item'],
      }
    }

    const summary = `Found ${value.length} items.`
    let details: string

    if (value.every((item) => typeof item === 'string')) {
      // List of strings
      details =
        value.length <= 5
          ? value.join(', ')
          : `${value.slice(0, 5).join(', ')}, and ${value.length - 5} more`
    } else {
      // Complex objects
      details = `Items of type: ${typeof value[0]}`
      if (value[0] && typeof value[0] === 'object') {
        const keys = Object.keys(value[0])
        details += `. Each item has: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`
      }
    }

    return {
      summary,
      details,
      suggestion:
        value.length > 10
          ? 'There are quite a few results. Would you like me to help you filter or sort them?'
          : undefined,
      actions: ['View all', 'Filter results', 'Sort results'],
    }
  }

  /**
   * Format object results with key insights
   */
  static formatObject(
    value: Record<string, any>,
    context: ParlantExecutionContext,
    hints?: ConversationalHint
  ): ConversationalResult {
    const keys = Object.keys(value)

    if (keys.length === 0) {
      return {
        summary: 'Retrieved empty object.',
        suggestion: 'The operation completed but returned no data.',
      }
    }

    // Check for common object patterns
    if ('id' in value && 'name' in value) {
      return {
        summary: `Retrieved: ${value.name} (ID: ${value.id})`,
        details: FormattingStrategies.formatObjectDetails(value, ['id', 'name']),
        actions: ['View details', 'Edit', 'Delete'],
      }
    }

    if ('success' in value || 'status' in value) {
      const success = value.success ?? (value.status === 'success' || value.status === 200)
      return {
        summary: success ? 'Operation completed successfully.' : 'Operation encountered an issue.',
        details: FormattingStrategies.formatObjectDetails(value),
        suggestion: success
          ? 'Everything went well!'
          : 'You might want to check the details for more information.',
      }
    }

    if ('count' in value || 'total' in value) {
      const count = value.count ?? value.total
      return {
        summary: `Found ${count} items.`,
        details: FormattingStrategies.formatObjectDetails(value, ['count', 'total']),
        actions: count > 0 ? ['View items', 'Filter', 'Export'] : ['Try different search'],
      }
    }

    // Generic object formatting
    return {
      summary: `Retrieved object with ${keys.length} properties.`,
      details: FormattingStrategies.formatObjectDetails(value),
      actions: ['View all properties', 'Export data'],
    }
  }

  /**
   * Format object details for display
   */
  private static formatObjectDetails(obj: Record<string, any>, excludeKeys: string[] = []): string {
    const entries = Object.entries(obj)
      .filter(([key]) => !excludeKeys.includes(key))
      .slice(0, 5) // Limit to first 5 properties

    return entries
      .map(([key, value]) => {
        if (value === null || value === undefined) {
          return `${key}: (empty)`
        }
        if (typeof value === 'string' && value.length > 50) {
          return `${key}: ${value.substring(0, 50)}...`
        }
        if (typeof value === 'object') {
          return `${key}: [object]`
        }
        return `${key}: ${value}`
      })
      .join('\n')
  }

  /**
   * Format error results with helpful guidance
   */
  static formatError(
    error: any,
    context: ParlantExecutionContext,
    hints?: ConversationalHint
  ): ConversationalResult {
    const summary = 'The tool encountered an error.'
    let details: string | undefined
    let suggestion: string | undefined

    if (typeof error === 'string') {
      details = error
    } else if (error && typeof error === 'object') {
      if (error instanceof Error ? error.message : String(error)) {
        details = error.message
      } else {
        details = JSON.stringify(error, null, 2)
      }
    }

    // Provide contextual suggestions based on error patterns
    if (details) {
      const lowerDetails = details.toLowerCase()

      if (lowerDetails.includes('not found') || lowerDetails.includes('404')) {
        suggestion =
          'The requested resource was not found. Please check if the ID or name is correct.'
      } else if (lowerDetails.includes('unauthorized') || lowerDetails.includes('403')) {
        suggestion =
          'You might not have permission to access this resource. Please check your authentication.'
      } else if (lowerDetails.includes('rate limit') || lowerDetails.includes('429')) {
        suggestion = "You've hit a rate limit. Please wait a moment before trying again."
      } else if (lowerDetails.includes('network') || lowerDetails.includes('timeout')) {
        suggestion = 'There was a network issue. Please check your connection and try again.'
      } else if (lowerDetails.includes('validation') || lowerDetails.includes('invalid')) {
        suggestion =
          'There was an issue with the provided parameters. Please check the values and try again.'
      } else {
        suggestion = 'Please try again, or contact support if the problem persists.'
      }
    }

    return {
      summary,
      details,
      suggestion: suggestion || hints?.results,
      actions: ['Try again', 'Check parameters', 'Get help'],
    }
  }

  /**
   * Format file or media results
   */
  static formatFile(
    fileInfo: any,
    context: ParlantExecutionContext,
    hints?: ConversationalHint
  ): ConversationalResult {
    if (typeof fileInfo === 'string') {
      // File path or URL
      const isUrl = fileInfo.startsWith('http://') || fileInfo.startsWith('https://')
      const fileName = isUrl ? fileInfo.split('/').pop() : fileInfo.split('/').pop()

      return {
        summary: `File ready: ${fileName}`,
        details: isUrl ? `Available at: ${fileInfo}` : `Location: ${fileInfo}`,
        actions: isUrl ? ['Download', 'Open', 'Share'] : ['Open', 'Copy path'],
      }
    }

    if (fileInfo && typeof fileInfo === 'object') {
      const name = fileInfo.name || fileInfo.filename || 'Unknown file'
      const size = fileInfo.size ? FormattingStrategies.formatFileSize(fileInfo.size) : undefined
      const type = fileInfo.type || fileInfo.mimeType || undefined

      let details = `Name: ${name}`
      if (size) details += `\nSize: ${size}`
      if (type) details += `\nType: ${type}`

      return {
        summary: `File processed: ${name}`,
        details,
        actions: ['Download', 'Share', 'View properties'],
      }
    }

    return {
      summary: 'File operation completed.',
      suggestion: hints?.results,
    }
  }

  /**
   * Format file size for human readability
   */
  private static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
  }
}

/**
 * Template-based result formatting with variable substitution
 */
export class TemplateFormatter {
  /**
   * Apply template formatting with variable substitution
   */
  static formatWithTemplate(
    data: any,
    template: FormattingTemplate,
    context: ParlantExecutionContext
  ): ConversationalResult {
    const variables = {
      ...context.variables,
      result: data,
      timestamp: new Date().toLocaleString(),
      user: context.userId,
      workspace: context.workspaceId,
    }

    const summary = TemplateFormatter.substituteVariables(template.summary, variables, data)
    const details = template.details
      ? TemplateFormatter.substituteVariables(template.details, variables, data)
      : undefined
    const suggestion = template.suggestion
      ? TemplateFormatter.substituteVariables(template.suggestion, variables, data)
      : undefined

    return {
      summary,
      details,
      suggestion,
      actions: template.actions,
    }
  }

  /**
   * Substitute template variables with actual values
   */
  private static substituteVariables(
    template: string,
    variables: Record<string, any>,
    data: any
  ): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      // Try variables first
      let value = TemplateFormatter.getNestedValue(variables, path)

      // Fall back to data
      if (value === undefined) {
        value = TemplateFormatter.getNestedValue(data, path)
      }

      // Return formatted value or original placeholder
      if (value !== undefined) {
        return typeof value === 'object' ? JSON.stringify(value) : String(value)
      }

      return match // Keep original placeholder if no value found
    })
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }
}

/**
 * Main Result Formatter
 *
 * Orchestrates the conversion of Sim tool results into conversational,
 * context-aware Parlant tool results.
 */
export class ResultFormatter {
  private readonly config: ResultFormatting

  constructor(config: ResultFormatting = {}) {
    this.config = {
      enableConversationalFormatting: true,
      enableTemplateFormatting: true,
      enableContextualHints: true,
      maxDetailsLength: 1000,
      ...config,
    }

    logger.info('Result formatter initialized', this.config)
  }

  /**
   * Format Sim tool result for Parlant consumption
   */
  public async formatSimResult(
    simResult: SimToolResult,
    context: ParlantExecutionContext,
    naturalLanguage: NaturalLanguageConfig
  ): Promise<ParlantToolResult> {
    const startTime = Date.now()

    try {
      // Determine result type
      const resultType = this.determineResultType(simResult)

      // Format based on status and data
      const parlantResult = await this.formatByType(simResult, resultType, context, naturalLanguage)

      // Apply post-processing
      const finalResult = this.postProcessResult(parlantResult, context)

      const duration = Date.now() - startTime
      logger.debug('Result formatting completed', {
        duration,
        resultType,
        hasConversational: !!finalResult.conversational,
      })

      return finalResult
    } catch (error) {
      logger.error('Result formatting failed', { error: error instanceof Error ? error.message : String(error) })

      // Return safe fallback result
      return {
        type: 'error',
        message: 'Result formatting failed',
        data: simResult,
        conversational: {
          summary: 'The tool completed but there was an issue formatting the response.',
          suggestion: 'The raw result is available in the data field.',
        },
      }
    }
  }

  /**
   * Determine the type of result for appropriate formatting
   */
  private determineResultType(simResult: SimToolResult): 'success' | 'error' | 'partial' {
    // Check status code
    if (simResult.status >= 200 && simResult.status < 300) {
      return 'success'
    }

    if (simResult.status >= 400) {
      return 'error'
    }

    // Check for partial success indicators
    if (simResult.status >= 300 || simResult.data?.partial) {
      return 'partial'
    }

    return 'success'
  }

  /**
   * Format result based on its type and content
   */
  private async formatByType(
    simResult: SimToolResult,
    resultType: 'success' | 'error' | 'partial',
    context: ParlantExecutionContext,
    naturalLanguage: NaturalLanguageConfig
  ): Promise<ParlantToolResult> {
    const conversationalHints = naturalLanguage.conversationalHints

    // Handle error results
    if (resultType === 'error') {
      const conversational = FormattingStrategies.formatError(
        simResult.message || simResult.data,
        context,
        conversationalHints
      )

      return {
        type: 'error',
        message: simResult.message || 'Tool execution failed',
        data: simResult.data,
        conversational,
        metadata: { statusCode: simResult.status },
      }
    }

    // Handle success and partial results
    const data = simResult.data ?? simResult.message
    const conversational = this.formatDataForConversation(data, context, conversationalHints)

    return {
      type: resultType,
      message: simResult.message,
      data: simResult.data,
      conversational,
      metadata: {
        statusCode: simResult.status,
        formattedAt: new Date().toISOString(),
      },
    }
  }

  /**
   * Format data for conversational presentation
   */
  private formatDataForConversation(
    data: any,
    context: ParlantExecutionContext,
    hints?: ConversationalHint
  ): ConversationalResult {
    if (!this.config.enableConversationalFormatting) {
      return {
        summary: 'Tool execution completed.',
        details: data ? JSON.stringify(data) : undefined,
      }
    }

    // Check for custom template formatting
    if (this.config.templates && this.config.enableTemplateFormatting) {
      const template = this.findMatchingTemplate(data, context)
      if (template) {
        return TemplateFormatter.formatWithTemplate(data, template, context)
      }
    }

    // Apply strategy-based formatting
    if (data === null || data === undefined) {
      return {
        summary: 'Tool completed successfully.',
        suggestion: 'No additional data was returned.',
      }
    }

    if (typeof data === 'string') {
      return FormattingStrategies.formatString(data, context, hints)
    }

    if (typeof data === 'number') {
      return FormattingStrategies.formatNumber(data, context, hints)
    }

    if (Array.isArray(data)) {
      return FormattingStrategies.formatArray(data, context, hints)
    }

    if (typeof data === 'object') {
      // Check for file-like objects
      if (this.isFileResult(data)) {
        return FormattingStrategies.formatFile(data, context, hints)
      }

      return FormattingStrategies.formatObject(data, context, hints)
    }

    // Fallback for other types
    return {
      summary: `Tool returned: ${typeof data}`,
      details: String(data),
      suggestion: hints?.results,
    }
  }

  /**
   * Find matching template for data
   */
  private findMatchingTemplate(
    data: any,
    context: ParlantExecutionContext
  ): FormattingTemplate | undefined {
    if (!this.config.templates) {
      return undefined
    }

    // Simple template matching based on data properties
    for (const template of this.config.templates) {
      if (template.condition) {
        try {
          const matches =
            typeof template.condition === 'function'
              ? template.condition(data, context)
              : this.evaluateTemplateCondition(template.condition, data, context)

          if (matches) {
            return template
          }
        } catch (error) {
          logger.warn('Template condition evaluation failed', { error: error instanceof Error ? error.message : String(error) })
        }
      }
    }

    return undefined
  }

  /**
   * Evaluate template condition
   */
  private evaluateTemplateCondition(
    condition: any,
    data: any,
    context: ParlantExecutionContext
  ): boolean {
    // Simple condition evaluation - could be much more sophisticated
    if (condition.hasProperty) {
      return data && typeof data === 'object' && condition.hasProperty in data
    }

    if (condition.dataType) {
      return typeof data === condition.dataType
    }

    if (condition.contextValue) {
      const contextValue = context[condition.contextValue as keyof ParlantExecutionContext]
      return contextValue === condition.expectedValue
    }

    return false
  }

  /**
   * Check if data represents a file result
   */
  private isFileResult(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false
    }

    // Common file result patterns
    const fileIndicators = ['filename', 'name', 'size', 'type', 'mimeType', 'url', 'path']
    return fileIndicators.some((indicator) => indicator in data)
  }

  /**
   * Post-process result for final cleanup and validation
   */
  private postProcessResult(
    result: ParlantToolResult,
    context: ParlantExecutionContext
  ): ParlantToolResult {
    // Truncate details if too long
    if (
      result.conversational?.details &&
      result.conversational.details.length > this.config.maxDetailsLength!
    ) {
      result.conversational.details = `${result.conversational.details.substring(0, this.config.maxDetailsLength!)}...`
    }

    // Add contextual actions if none provided
    if (result.conversational && !result.conversational.actions) {
      result.conversational.actions = this.generateContextualActions(result, context)
    }

    // Ensure message is set
    if (!result.message && result.conversational?.summary) {
      result.message = result.conversational.summary
    }

    return result
  }

  /**
   * Generate contextual actions based on result
   */
  private generateContextualActions(
    result: ParlantToolResult,
    context: ParlantExecutionContext
  ): string[] {
    const actions: string[] = []

    // Common actions based on result type
    if (result.type === 'success') {
      actions.push('Continue')

      if (result.data) {
        actions.push('View raw data')
        if (Array.isArray(result.data)) {
          actions.push('Export results')
        }
      }
    } else if (result.type === 'error') {
      actions.push('Try again', 'Get help')
    }

    // Context-specific actions
    if (context.type === 'chat') {
      actions.push('Ask follow-up question')
    }

    return actions.slice(0, 4) // Limit to 4 actions
  }

  // Utility methods for configuration and testing

  /**
   * Update formatting configuration
   */
  public updateConfig(newConfig: Partial<ResultFormatting>): void {
    Object.assign(this.config, newConfig)
    logger.debug('Result formatter configuration updated')
  }

  /**
   * Get current configuration
   */
  public getConfig(): ResultFormatting {
    return { ...this.config }
  }

  /**
   * Test formatting with sample data
   */
  public async testFormatting(
    sampleData: any,
    context: ParlantExecutionContext
  ): Promise<ConversationalResult> {
    const mockSimResult: SimToolResult = {
      status: 200,
      data: sampleData,
    }

    const mockNaturalLanguage: NaturalLanguageConfig = {
      usageDescription: 'Test tool',
      exampleUsage: ['Test'],
      conversationalHints: {
        whenToUse: 'For testing',
        parameters: 'Test parameters',
        results: 'Test results',
      },
    }

    const result = await this.formatSimResult(mockSimResult, context, mockNaturalLanguage)
    return result.conversational || { summary: 'Test completed' }
  }

  /**
   * Add custom formatting template
   */
  public addTemplate(template: FormattingTemplate): void {
    if (!this.config.templates) {
      this.config.templates = []
    }
    this.config.templates.push(template)
    logger.debug('Added custom formatting template')
  }

  /**
   * Remove formatting template
   */
  public removeTemplate(name: string): boolean {
    if (!this.config.templates) {
      return false
    }

    const index = this.config.templates.findIndex((t) => t.name === name)
    if (index !== -1) {
      this.config.templates.splice(index, 1)
      logger.debug(`Removed formatting template: ${name}`)
      return true
    }

    return false
  }
}
